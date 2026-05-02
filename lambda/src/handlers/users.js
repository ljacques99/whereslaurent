'use strict';

const { GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbClient, TABLE_USERS } = require('../lib/dynamodb');

async function handleGetUsers() {
  const result = await ddbClient.send(new ScanCommand({ TableName: TABLE_USERS }));
  const items = (result.Items || []).sort((a, b) => a.email.localeCompare(b.email));
  return { statusCode: 200, body: JSON.stringify(items) };
}

async function handleCreateUser(body) {
  const { email, role } = body || {};

  if (!email || !role) {
    return { statusCode: 400, body: JSON.stringify({ error: 'email and role are required' }) };
  }

  if (!['admin', 'visitor'].includes(role)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'role must be admin or visitor' }) };
  }

  // Check if user already exists
  const existing = await ddbClient.send(new GetCommand({
    TableName: TABLE_USERS,
    Key: { email },
  }));

  if (existing.Item) {
    return { statusCode: 409, body: JSON.stringify({ error: 'User already exists' }) };
  }

  const item = {
    email,
    role,
    created_at: new Date().toISOString(),
  };

  await ddbClient.send(new PutCommand({ TableName: TABLE_USERS, Item: item }));

  return { statusCode: 201, body: JSON.stringify(item) };
}

async function handleUpdateUser(email, body) {
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
  }

  const { role } = body || {};

  if (!role || !['admin', 'visitor'].includes(role)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'role must be admin or visitor' }) };
  }

  const result = await ddbClient.send(new UpdateCommand({
    TableName: TABLE_USERS,
    Key: { email },
    UpdateExpression: 'SET #role = :role, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#role': 'role',
      '#updated_at': 'updated_at',
    },
    ExpressionAttributeValues: {
      ':role': role,
      ':updated_at': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  }));

  return { statusCode: 200, body: JSON.stringify(result.Attributes) };
}

async function handleDeleteUser(email, currentUserEmail) {
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
  }

  if (email === currentUserEmail) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cannot delete your own account' }) };
  }

  await ddbClient.send(new DeleteCommand({
    TableName: TABLE_USERS,
    Key: { email },
  }));

  return { statusCode: 200, body: JSON.stringify({ message: 'User deleted' }) };
}

module.exports = { handleGetUsers, handleCreateUser, handleUpdateUser, handleDeleteUser };
