import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

interface DriverLocation {
  driverId: number;
  latitude: number;
  longitude: number;
}

interface Booking {
  id: number;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  status: string;
}


async function testDriverMatching() {
  console.log('🚗 Testing Driver-Customer Matching System\n');

  try {
    console.log('1. Creating test booking...');
    const bookingData = {
      start_latitude: -1.2921,
      start_longitude: 36.8219,
      end_latitude: -1.3183,
      end_longitude: 36.8169,
      pickup_time: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    };

    const bookingResponse = await axios.post(`${API_BASE_URL}/bookings`, bookingData);
    const booking: Booking = bookingResponse.data;
    console.log(`✅ Booking created with ID: ${booking.id}`);
    console.log(`📍 Pickup location: ${booking.start_latitude}, ${booking.start_longitude}`);

    console.log('\n2. Updating driver locations...');
    const driverLocations: DriverLocation[] = [
      { driverId: 1, latitude: -1.2900, longitude: 36.8200 }, // 0.3km away
      { driverId: 2, latitude: -1.2950, longitude: 36.8250 }, // 0.5km away
      { driverId: 3, latitude: -1.2800, longitude: 36.8300 }, // 1.5km away
    ];

    for (const location of driverLocations) {
      console.log(`📍 Driver ${location.driverId} at: ${location.latitude}, ${location.longitude}`);
    }

    console.log('\n3. Finding nearby drivers...');
    const nearbyDriversResponse = await axios.get(
      `${API_BASE_URL}/bookings/${booking.id}/nearby-drivers?maxRadiusKm=2&maxResults=5`
    );
    
    console.log(`Found ${nearbyDriversResponse.data.length} nearby drivers:`);
    nearbyDriversResponse.data.forEach((driver: any, index: number) => {
      console.log(`  ${index + 1}. Driver ${driver.driverId} - ${driver.distance.toFixed(2)}km away (${driver.estimatedTimeToPickup}min)`);
    });

    console.log('\n4. Auto-assigning nearest driver...');
    const assignedResponse = await axios.post(
      `${API_BASE_URL}/bookings/${booking.id}/auto-assign`
    );
    
    console.log(`✅ Driver ${assignedResponse.data.driver.driver_id} assigned to booking ${booking.id}`);
    console.log(`📋 Booking status: ${assignedResponse.data.status}`);

    console.log('\n5. Checking driver availability...');
    const newNearbyDrivers = await axios.get(
      `${API_BASE_URL}/bookings/${booking.id}/nearby-drivers`
    );
    console.log(`Available drivers after assignment: ${newNearbyDrivers.data.length}`);

  } catch (error) {
    console.error('❌ Error testing driver matching:', error.response?.data || error.message);
  }
}


function testDistanceCalculation() {
  console.log('\n📏 Testing Distance Calculation\n');

  const { calculateDistance } = require('../common/distance.utils');

  const coord1 = { lat: -1.2921, lon: 36.8219 }; // Nairobi CBD
  const coord2 = { lat: -1.3183, lon: 36.8169 }; // Westlands

  const distance = calculateDistance(coord1.lat, coord1.lon, coord2.lat, coord2.lon);
  console.log(`Distance between CBD and Westlands: ${distance.toFixed(2)} km`);
}

if (require.main === module) {
  console.log('🚀 Starting Driver Matching Tests...\n');
  
  testDistanceCalculation();
  
  console.log('\n⚠️  Note: Make sure the server is running on http://localhost:3000');
  console.log('Starting API tests in 3 seconds...\n');
  
  setTimeout(() => {
    testDriverMatching();
  }, 3000);
}

export { testDriverMatching, testDistanceCalculation };
