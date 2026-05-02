'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-3' });
const ddbClient = DynamoDBDocumentClient.from(client);

const TABLE_LOCATIONS = 'wl-locations';
const TABLE_USERS = 'wl-users';
const TABLE_MAGIC_LINKS = 'wl-magic-links';
const TABLE_REVOCATIONS = 'wl-token-revocations';

module.exports = { ddbClient, TABLE_LOCATIONS, TABLE_USERS, TABLE_MAGIC_LINKS, TABLE_REVOCATIONS };
