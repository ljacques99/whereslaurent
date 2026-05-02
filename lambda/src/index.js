'use strict';

const { verifyToken } = require('./lib/jwt');
const { handleMagicLink, handleVerify, handleRevokeAll } = require('./handlers/auth');
const { handleGetLocations, handleCreateLocation, handleUpdateLocation, handleDeleteLocation } = require('./handlers/locations');
const { handleGetUsers, handleCreateUser, handleUpdateUser, handleDeleteUser } = require('./handlers/users');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://whereslaurent.vercel.app';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function response(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

async function getAuthUser(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  try {
    return await verifyToken(token);
  } catch (err) {
    return null;
  }
}

function parseBody(event) {
  try {
    if (!event.body) return {};
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return {};
  }
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return response(204, '');
  }

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const rawPath = event.rawPath || event.path || '/';
  const queryParams = event.queryStringParameters || {};
  const body = parseBody(event);

  // Normalize path: remove trailing slash
  const path = rawPath.replace(/\/$/, '') || '/';

  console.log(`${method} ${path}`);

  try {
    // ========================
    // AUTH ROUTES (public)
    // ========================
    if (method === 'POST' && path === '/auth/magic-link') {
      return addCors(await handleMagicLink(body));
    }

    if (method === 'GET' && path === '/auth/verify') {
      return addCors(await handleVerify(queryParams));
    }

    // ========================
    // AUTH ROUTES (admin)
    // ========================
    if (method === 'POST' && path === '/auth/revoke-all') {
      const user = await getAuthUser(event);
      if (!user || user.role !== 'admin') {
        return response(401, { error: 'Unauthorized' });
      }
      return addCors(await handleRevokeAll(user));
    }

    // ========================
    // LOCATIONS ROUTES
    // ========================
    if (method === 'GET' && path === '/locations') {
      const user = await getAuthUser(event);
      return addCors(await handleGetLocations(user?.role === 'admin'));
    }

    if (method === 'GET' && path === '/locations/all') {
      const user = await getAuthUser(event);
      if (!user || user.role !== 'admin') {
        return response(401, { error: 'Unauthorized' });
      }
      return addCors(await handleGetLocations(true));
    }

    if (method === 'POST' && path === '/locations') {
      const user = await getAuthUser(event);
      if (!user || user.role !== 'admin') {
        return response(401, { error: 'Unauthorized' });
      }
      return addCors(await handleCreateLocation(body));
    }

    // Match /locations/:id for PUT and DELETE
    const locationMatch = path.match(/^\/locations\/(.+)$/);
    if (locationMatch) {
      const id = decodeURIComponent(locationMatch[1]);

      if (method === 'PUT') {
        const user = await getAuthUser(event);
        if (!user || user.role !== 'admin') {
          return response(401, { error: 'Unauthorized' });
        }
        return addCors(await handleUpdateLocation(id, body));
      }

      if (method === 'DELETE') {
        const user = await getAuthUser(event);
        if (!user || user.role !== 'admin') {
          return response(401, { error: 'Unauthorized' });
        }
        return addCors(await handleDeleteLocation(id));
      }
    }

    // ========================
    // USERS ROUTES (admin)
    // ========================
    if (method === 'GET' && path === '/users') {
      const user = await getAuthUser(event);
      if (!user || user.role !== 'admin') {
        return response(401, { error: 'Unauthorized' });
      }
      return addCors(await handleGetUsers());
    }

    if (method === 'POST' && path === '/users') {
      const user = await getAuthUser(event);
      if (!user || user.role !== 'admin') {
        return response(401, { error: 'Unauthorized' });
      }
      return addCors(await handleCreateUser(body));
    }

    // Match /users/:email for PUT and DELETE
    const userMatch = path.match(/^\/users\/(.+)$/);
    if (userMatch) {
      const targetEmail = decodeURIComponent(userMatch[1]);

      if (method === 'PUT') {
        const user = await getAuthUser(event);
        if (!user || user.role !== 'admin') {
          return response(401, { error: 'Unauthorized' });
        }
        return addCors(await handleUpdateUser(targetEmail, body));
      }

      if (method === 'DELETE') {
        const user = await getAuthUser(event);
        if (!user || user.role !== 'admin') {
          return response(401, { error: 'Unauthorized' });
        }
        return addCors(await handleDeleteUser(targetEmail, user.email));
      }
    }

    // ========================
    // Health check
    // ========================
    if (method === 'GET' && path === '/health') {
      return response(200, { status: 'ok', timestamp: new Date().toISOString() });
    }

    return response(404, { error: 'Not found' });
  } catch (err) {
    console.error('Unhandled error:', err);
    return response(500, { error: 'Internal server error' });
  }
};

function addCors(result) {
  return {
    ...result,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...(result.headers || {}),
    },
  };
}
