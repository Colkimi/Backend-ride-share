# Driver Location Simulation

This document explains how to use the driver location simulation feature.

## Overview

The driver location simulation allows you to test location updates for drivers without needing a real driver app. It includes:

1. **API Endpoint**: `POST /driver/:driverId/location` - Manually update a driver's location
2. **Simulation Script**: Automatically cycles through predefined coordinates

## API Endpoint

### Update Driver Location
```http
POST /driver/:driverId/location
Content-Type: application/json

{
  "latitude": -1.2921,
  "longitude": 36.8219
}
```

**Response:**
```json
{
  "message": "Location updated successfully",
  "location": {
    "latitude": -1.2921,
    "longitude": 36.8219,
    "lastUpdate": 1640995200000
  }
}
```

## Simulation Script

### Usage

Start the simulation with default settings (driver ID 1, 5-second intervals):
```bash
npm run simulate:driver
```

Specify custom driver ID and interval:
```bash
npm run simulate:driver -- 2 3000
```

Or use ts-node directly:
```bash
npx ts-node scripts/simulate-driver-location.ts 3 2000
```

### Parameters
- **driverId**: The ID of the driver to simulate (default: 1)
- **intervalMs**: Time between updates in milliseconds (default: 5000)

### Route
The simulation follows a predefined route through Nairobi:
1. Nairobi CBD → Kenyatta Avenue → University Way → Ngong Road → Yaya Center → Junction Mall → Dagoretti Corner → Karen → Hardy → Langata → and back

## Testing

1. Start your NestJS application:
   ```bash
   npm run start:dev
   ```

2. In another terminal, start the simulation:
   ```bash
   npm run simulate:driver
   ```

3. Check your frontend to see location updates in real-time

## Customization

To use different coordinates, modify the `ROUTE_COORDINATES` array in `scripts/simulate-driver-location.ts`.

For authentication, add your JWT token to the axios headers in the simulation script.
