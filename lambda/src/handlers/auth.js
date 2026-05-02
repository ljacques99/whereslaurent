'use strict';

const { v4: uuidv4 } = require('uuid');
const { GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbClient, TABLE_USERS, TABLE_MAGIC_LINKS, TABLE_REVOCATIONS } = require('../lib/dynamodb');
const { signToken, invalidateRevocationCache } = require('../lib/jwt');
const { sendMagicLink } = require('../lib/ses');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://whereslaurent.vercel.app';
const MAGIC_LINK_TTL_SECONDS = 15 * 60; // 15 minutes

async function handleMagicLink(body) {
  const { email } = body || {};
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
  }

  // Check user exists
  const userResult = await ddbClient.send(new GetCommand({
    TableName: TABLE_USERS,
    Key: { email },
  }));

  if (!userResult.Item) {
    // Return success anyway to avoid enumeration
    return { statusCode: 200, body: JSON.stringify({ message: 'If your email is registered, you will receive a magic link' }) };
  }

  const token = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const expires_at = now + MAGIC_LINK_TTL_SECONDS;

  await ddbClient.send(new PutCommand({
    TableName: TABLE_MAGIC_LINKS,
    Item: {
      token,
      email,
      expires_at,
      used: false,
      created_at: now,
    },
  }));

  const result = await sendMagicLink(email, token, FRONTEND_URL);

  const response = { message: 'Magic link sent' };
  if (result.devLink) {
    response.devLink = result.devLink;
  }

  return { statusCode: 200, body: JSON.stringify(response) };
}

async function handleVerify(queryParams) {
  const token = queryParams?.token;
  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Token is required' }) };
  }

  const result = await ddbClient.send(new GetCommand({
    TableName: TABLE_MAGIC_LINKS,
    Key: { token },
  }));

  const item = result.Item;
  if (!item) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  const now = Math.floor(Date.now() / 1000);
  if (item.expires_at < now) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Token has expired' }) };
  }

  if (item.used) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Token has already been used' }) };
  }

  // Mark as used
  await ddbClient.send(new UpdateCommand({
    TableName: TABLE_MAGIC_LINKS,
    Key: { token },
    UpdateExpression: 'SET #used = :used',
    ExpressionAttributeNames: { '#used': 'used' },
    ExpressionAttributeValues: { ':used': true },
  }));

  // Get user role
  const userResult = await ddbClient.send(new GetCommand({
    TableName: TABLE_USERS,
    Key: { email: item.email },
  }));

  if (!userResult.Item) {
    return { statusCode: 401, body: JSON.stringify({ error: 'User not found' }) };
  }

  const jwtToken = signToken(item.email, userResult.Item.role);

  return {
    statusCode: 200,
    body: JSON.stringify({
      token: jwtToken,
      email: item.email,
      role: userResult.Item.role,
    }),
  };
}

async function handleRevokeAll(user) {
  const revocation_id = uuidv4();
  const revoked_at = Math.floor(Date.now() / 1000);

  await ddbClient.send(new PutCommand({
    TableName: TABLE_REVOCATIONS,
    Item: {
      revocation_id,
      revoked_at,
      revoked_by: user.email,
    },
  }));

  invalidateRevocationCache();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'All sessions have been revoked',
      revoked_at,
    }),
  };
}

module.exports = { handleMagicLink, handleVerify, handleRevokeAll };
