'use strict';

const { v4: uuidv4 } = require('uuid');
const { GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbClient, TABLE_LOCATIONS } = require('../lib/dynamodb');

// City coordinates lookup table
const CITY_COORDS = {
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'New York': { lat: 40.7128, lng: -74.0060 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'Madrid': { lat: 40.4168, lng: -3.7038 },
  'Rome': { lat: 41.9028, lng: 12.4964 },
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Brussels': { lat: 50.8503, lng: 4.3517 },
  'Zurich': { lat: 47.3769, lng: 8.5417 },
  'Geneva': { lat: 46.2044, lng: 6.1432 },
  'Montreal': { lat: 45.5017, lng: -73.5673 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Bangkok': { lat: 13.7563, lng: 100.5018 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  'Seoul': { lat: 37.5665, lng: 126.9780 },
  'Shanghai': { lat: 31.2304, lng: 121.4737 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Cape Town': { lat: -33.9249, lng: 18.4241 },
  'São Paulo': { lat: -23.5505, lng: -46.6333 },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
  'Mexico City': { lat: 19.4326, lng: -99.1332 },
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Vancouver': { lat: 49.2827, lng: -123.1207 },
  'Dublin': { lat: 53.3498, lng: -6.2603 },
  'Lisbon': { lat: 38.7223, lng: -9.1393 },
  'Vienna': { lat: 48.2082, lng: 16.3738 },
  'Prague': { lat: 50.0755, lng: 14.4378 },
  'Warsaw': { lat: 52.2297, lng: 21.0122 },
  'Stockholm': { lat: 59.3293, lng: 18.0686 },
  'Oslo': { lat: 59.9139, lng: 10.7522 },
  'Copenhagen': { lat: 55.6761, lng: 12.5683 },
  'Helsinki': { lat: 60.1699, lng: 24.9384 },
  'Athens': { lat: 37.9838, lng: 23.7275 },
  'Istanbul': { lat: 41.0082, lng: 28.9784 },
  'Cairo': { lat: 30.0444, lng: 31.2357 },
  'Nairobi': { lat: -1.2921, lng: 36.8219 },
  'Lagos': { lat: 6.5244, lng: 3.3792 },
  'Casablanca': { lat: 33.5731, lng: -7.5898 },
  'Marrakech': { lat: 31.6295, lng: -7.9811 },
  'Tunis': { lat: 36.8190, lng: 10.1658 },
  'Beirut': { lat: 33.8938, lng: 35.5018 },
  'Tel Aviv': { lat: 32.0853, lng: 34.7818 },
  'Riyadh': { lat: 24.7136, lng: 46.6753 },
  'Abu Dhabi': { lat: 24.4539, lng: 54.3773 },
  'Doha': { lat: 25.2854, lng: 51.5310 },
  'Karachi': { lat: 24.8607, lng: 67.0011 },
  'Delhi': { lat: 28.6139, lng: 77.2090 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Jakarta': { lat: -6.2088, lng: 106.8456 },
  'Kuala Lumpur': { lat: 3.1390, lng: 101.6869 },
  'Manila': { lat: 14.5995, lng: 120.9842 },
  'Ho Chi Minh City': { lat: 10.8231, lng: 106.6297 },
  'Hanoi': { lat: 21.0285, lng: 105.8542 },
  'Taipei': { lat: 25.0330, lng: 121.5654 },
  'Osaka': { lat: 34.6937, lng: 135.5023 },
  'Kyoto': { lat: 35.0116, lng: 135.7681 },
  'Auckland': { lat: -36.8509, lng: 174.7645 },
  'Melbourne': { lat: -37.8136, lng: 144.9631 },
  'Brisbane': { lat: -27.4698, lng: 153.0251 },
  'Perth': { lat: -31.9505, lng: 115.8605 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 },
  'Milan': { lat: 45.4654, lng: 9.1859 },
  'Munich': { lat: 48.1351, lng: 11.5820 },
  'Frankfurt': { lat: 50.1109, lng: 8.6821 },
  'Zurich': { lat: 47.3769, lng: 8.5417 },
  'Lyon': { lat: 45.7640, lng: 4.8357 },
  'Nice': { lat: 43.7102, lng: 7.2620 },
  'Marseille': { lat: 43.2965, lng: 5.3698 },
  'Bordeaux': { lat: 44.8378, lng: -0.5792 },
  'Nantes': { lat: 47.2184, lng: -1.5536 },
  'Strasbourg': { lat: 48.5734, lng: 7.7521 },
  'Lille': { lat: 50.6292, lng: 3.0573 },
  'Rennes': { lat: 48.1173, lng: -1.6778 },
  'Toulouse': { lat: 43.6047, lng: 1.4442 },
};

function getCoordsForCity(city) {
  return CITY_COORDS[city] || null;
}

function getTodayString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

async function handleGetLocations(isAdmin) {
  const result = await ddbClient.send(new ScanCommand({ TableName: TABLE_LOCATIONS }));
  const today = getTodayString();
  let items = result.Items || [];

  if (!isAdmin) {
    // Only show present and future locations
    items = items.filter(loc => loc.departure_date >= today || loc.arrival_date >= today);
  }

  // Sort by arrival_date
  items.sort((a, b) => a.arrival_date.localeCompare(b.arrival_date));

  return { statusCode: 200, body: JSON.stringify(items) };
}

async function handleCreateLocation(body) {
  const { city, country, arrival_date, departure_date, lat, lng } = body || {};

  if (!city || !country || !arrival_date || !departure_date) {
    return { statusCode: 400, body: JSON.stringify({ error: 'city, country, arrival_date, departure_date are required' }) };
  }

  const coords = getCoordsForCity(city);
  const item = {
    id: uuidv4(),
    city,
    country,
    arrival_date,
    departure_date,
    lat: lat ?? (coords ? coords.lat : null),
    lng: lng ?? (coords ? coords.lng : null),
    created_at: new Date().toISOString(),
  };

  await ddbClient.send(new PutCommand({ TableName: TABLE_LOCATIONS, Item: item }));

  return { statusCode: 201, body: JSON.stringify(item) };
}

async function handleUpdateLocation(id, body) {
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Location ID is required' }) };
  }

  const { city, country, arrival_date, departure_date, lat, lng } = body || {};

  const updateExpressions = [];
  const expressionNames = {};
  const expressionValues = {};

  if (city !== undefined) {
    updateExpressions.push('#city = :city');
    expressionNames['#city'] = 'city';
    expressionValues[':city'] = city;
  }
  if (country !== undefined) {
    updateExpressions.push('#country = :country');
    expressionNames['#country'] = 'country';
    expressionValues[':country'] = country;
  }
  if (arrival_date !== undefined) {
    updateExpressions.push('#arrival_date = :arrival_date');
    expressionNames['#arrival_date'] = 'arrival_date';
    expressionValues[':arrival_date'] = arrival_date;
  }
  if (departure_date !== undefined) {
    updateExpressions.push('#departure_date = :departure_date');
    expressionNames['#departure_date'] = 'departure_date';
    expressionValues[':departure_date'] = departure_date;
  }
  if (lat !== undefined) {
    updateExpressions.push('#lat = :lat');
    expressionNames['#lat'] = 'lat';
    expressionValues[':lat'] = lat;
  }
  if (lng !== undefined) {
    updateExpressions.push('#lng = :lng');
    expressionNames['#lng'] = 'lng';
    expressionValues[':lng'] = lng;
  }

  // Auto-update coords if city changed and no explicit coords
  if (city && lat === undefined && lng === undefined) {
    const coords = getCoordsForCity(city);
    if (coords) {
      updateExpressions.push('#lat = :lat, #lng = :lng');
      expressionNames['#lat'] = 'lat';
      expressionNames['#lng'] = 'lng';
      expressionValues[':lat'] = coords.lat;
      expressionValues[':lng'] = coords.lng;
    }
  }

  updateExpressions.push('#updated_at = :updated_at');
  expressionNames['#updated_at'] = 'updated_at';
  expressionValues[':updated_at'] = new Date().toISOString();

  const result = await ddbClient.send(new UpdateCommand({
    TableName: TABLE_LOCATIONS,
    Key: { id },
    UpdateExpression: 'SET ' + updateExpressions.join(', '),
    ExpressionAttributeNames: expressionNames,
    ExpressionAttributeValues: expressionValues,
    ReturnValues: 'ALL_NEW',
  }));

  return { statusCode: 200, body: JSON.stringify(result.Attributes) };
}

async function handleDeleteLocation(id) {
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Location ID is required' }) };
  }

  await ddbClient.send(new DeleteCommand({
    TableName: TABLE_LOCATIONS,
    Key: { id },
  }));

  return { statusCode: 200, body: JSON.stringify({ message: 'Location deleted' }) };
}

module.exports = { handleGetLocations, handleCreateLocation, handleUpdateLocation, handleDeleteLocation };
