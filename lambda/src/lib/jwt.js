'use strict';

const jwt = require('jsonwebtoken');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbClient, TABLE_REVOCATIONS } = require('./dynamodb');

const JWT_SECRET = process.env.JWT_SECRET || 'wl-super-secret-jwt-key-change-in-prod-2026';
const TOKEN_EXPIRY = '7d';

// In-memory cache for last revocation timestamp
let revocationCache = null;
let revocationCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

async function getLastRevocationTimestamp() {
  const now = Date.now();
  if (revocationCache !== null && (now - revocationCacheTime) < CACHE_TTL_MS) {
    return revocationCache;
  }

  try {
    const result = await ddbClient.send(new ScanCommand({
      TableName: TABLE_REVOCATIONS,
    }));

    const items = result.Items || [];
    if (items.length === 0) {
      revocationCache = 0;
    } else {
      // Find the most recent revocation
      const sorted = items.sort((a, b) => (b.revoked_at || 0) - (a.revoked_at || 0));
      revocationCache = sorted[0].revoked_at || 0;
    }
    revocationCacheTime = now;
    return revocationCache;
  } catch (err) {
    console.error('Error fetching revocation timestamp:', err);
    return 0;
  }
}

function invalidateRevocationCache() {
  revocationCache = null;
  revocationCacheTime = 0;
}

function signToken(email, role) {
  const issued_at = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { email, role, issued_at },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check against revocation timestamp
    const lastRevocation = await getLastRevocationTimestamp();
    if (lastRevocation > 0 && decoded.issued_at < lastRevocation) {
      throw new Error('Token has been revoked');
    }

    return decoded;
  } catch (err) {
    throw err;
  }
}

module.exports = { signToken, verifyToken, getLastRevocationTimestamp, invalidateRevocationCache };
