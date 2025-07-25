# Driver-Customer Matching System

This document describes the new driver-customer matching functionality implemented in the ride-sharing application.

## Overview

The system enables real-time matching of available drivers to customer bookings based on geographic proximity using the Haversine distance formula.

## Features

### 1. Real-time Location Updates
- Drivers can update their location via WebSocket
- Location updates are stored with timestamps
- Only recent updates (within 5 minutes) are considered for matching

### 2. Distance Calculation
- Uses Haversine formula for accurate great-circle distance calculation
- Configurable search radius (default: 5km)
- Returns distance in kilometers

### 3. Driver Availability
- Drivers can set their availability status
- Only available drivers are included in matching
- Automatic availability update when assigned to booking

### 4. Smart Matching Algorithm
- Finds nearest available drivers within radius
- Sorts by distance (closest first)
- Includes estimated time to pickup
- Configurable maximum results

## API Endpoints

### Get Nearby Drivers
```http
GET /bookings/:id/nearby-drivers?maxRadiusKm=5&maxResults=10
```

**Response:**
```json
[
  {
    "driverId": 123,
    "latitude": -1.2921,
    "longitude": 36.8219,
    "distance": 1.5,
    "lastUpdate": 1703123456789,
    "estimatedTimeToPickup": 5,
    "routeInstructions": [
      "1. Head west on Main Street (0.5km, ~2min)",
      "2. Turn left onto First Avenue (1.2km, ~3min)"
    ],
    "totalDistance": 2100,
    "totalDuration": 300
  }
]
```

### Assign Specific Driver
```http
POST /bookings/:id/assign-driver
Content-Type: application/json

{
  "bookingId": 123,
  "driverId": 456
}
```

### Auto-assign Nearest Driver
```http
POST /bookings/:id/auto-assign
```

### Get Route Instructions for Driver
```http
GET /bookings/:id/route-instructions
```

**Response:**
```json
{
  "bookingId": 123,
  "pickupLocation": {
    "latitude": -1.2921,
    "longitude": 36.8219
  },
  "dropoffLocation": {
    "latitude": -1.3183,
    "longitude": 36.8169
  },
  "instructions": [
    "1. Head west on Kenyatta Avenue (0.8km, ~2min)",
    "2. Turn right onto Moi Avenue (1.2km, ~3min)",
    "3. Continue straight to reach destination (0.5km, ~1min)"
  ],
  "totalDistance": 2500,
  "totalDuration": 360,
  "estimatedArrival": "2024-01-15T14:30:00.000Z"
}
```

## Usage Examples

### 1. Update Driver Location (WebSocket)
```typescript
// Client-side WebSocket connection
const socket = io('http://localhost:3000');
socket.emit('updateLocation', {
  driverId: 123,
  latitude: -1.2921,
  longitude: 36.8219
});
```

### 2. Find Nearby Drivers
```typescript
// Using the API
const response = await fetch('/bookings/123/nearby-drivers?maxRadiusKm=3');
const drivers = await response.json();
```

### 3. Auto-assign Driver
```typescript
const response = await fetch('/bookings/123/auto-assign', {
  method: 'POST'
});
const assignedBooking = await response.json();
```

## Configuration

### Environment Variables
- `REDIS_HOST`: Redis server host (default: localhost)
- `REDIS_PORT`: Redis server port (default: 6379)

### Default Values
- Maximum search radius: 5km
- Maximum results: 10 drivers
- Location update timeout: 5 minutes
- Average driving speed: 30 km/h (for ETA calculation)

## Testing

### Run Tests
```bash
# Start the development server
npm run start:dev

# Run the test script
npx ts-node src/scripts/test-driver-matching.ts
```

### Manual Testing
1. Create a booking with pickup coordinates
2. Update driver locations via WebSocket
3. Use the API endpoints to find and assign drivers

## Database Schema Updates

### Driver Entity
- Added `isAvailable` boolean field to track driver availability

### Location Entity
- Added `lastUpdate` timestamp field for tracking location freshness

## Error Handling

- **404 Not Found**: Booking or driver not found
- **400 Bad Request**: Invalid parameters or driver not available
- **500 Internal Server Error**: Server-side issues

## Performance Considerations

- Uses Redis caching for frequently accessed data
- Efficient database queries with proper indexing
- Configurable search radius to balance accuracy vs. performance
- Location updates throttled to prevent excessive database writes

## Future Enhancements

- Driver rating integration in matching algorithm
- Traffic-aware ETA calculations
- Batch matching for multiple bookings
- Driver preference settings (max distance, trip types)
- Real-time driver tracking for customers
- Push notifications for driver assignments
