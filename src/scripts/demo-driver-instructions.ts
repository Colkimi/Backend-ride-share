/**
 * Demo script showing how drivers can get route instructions
 * This demonstrates the new route instruction functionality
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

/**
 * Demo the route instructions functionality for drivers
 */
async function demoDriverInstructions() {
  console.log('🗺️  Driver Route Instructions Demo\n');

  try {
    // Step 1: Create a test booking
    console.log('1. Creating test booking...');
    const bookingData = {
      start_latitude: -1.2921, // Nairobi CBD
      start_longitude: 36.8219,
      end_latitude: -1.3183,   // Westlands
      end_longitude: 36.8169,
      pickup_time: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    };

    const bookingResponse = await axios.post(`${API_BASE_URL}/bookings`, bookingData);
    const booking = bookingResponse.data;
    console.log(`✅ Booking created with ID: ${booking.id}`);

    // Step 2: Get route instructions for the driver
    console.log('\n2. Getting route instructions for driver...');
    const instructionsResponse = await axios.get(
      `${API_BASE_URL}/bookings/${booking.id}/route-instructions`
    );
    
    const routeInfo = instructionsResponse.data;
    
    console.log('\n📍 Route Details:');
    console.log(`   From: ${routeInfo.pickupLocation.latitude}, ${routeInfo.pickupLocation.longitude}`);
    console.log(`   To: ${routeInfo.dropoffLocation.latitude}, ${routeInfo.dropoffLocation.longitude}`);
    console.log(`   Total Distance: ${(routeInfo.totalDistance / 1000).toFixed(1)} km`);
    console.log(`   Total Duration: ${Math.round(routeInfo.totalDuration / 60)} minutes`);
    console.log(`   Estimated Arrival: ${new Date(routeInfo.estimatedArrival).toLocaleTimeString()}`);

    console.log('\n🧭 Step-by-step Instructions:');
    routeInfo.instructions.forEach((instruction: string, index: number) => {
      console.log(`   ${instruction}`);
    });

    // Step 3: Show how this integrates with driver assignment
    console.log('\n3. Getting nearby drivers with route info...');
    const nearbyDriversResponse = await axios.get(
      `${API_BASE_URL}/bookings/${booking.id}/nearby-drivers?maxRadiusKm=5&maxResults=3`
    );
    
    console.log('\n🚗 Nearby Drivers with Route Instructions:');
    nearbyDriversResponse.data.forEach((driver: any, index: number) => {
      console.log(`\n   Driver ${index + 1} (ID: ${driver.driverId})`);
      console.log(`   Distance to pickup: ${driver.distance.toFixed(1)} km`);
      console.log(`   Estimated pickup time: ${driver.estimatedTimeToPickup} minutes`);
      console.log(`   Route to destination: ${(driver.totalDistance / 1000).toFixed(1)} km, ${Math.round(driver.totalDuration / 60)} minutes`);
      console.log(`   Instructions preview: ${driver.routeInstructions[0] || 'No instructions available'}`);
    });

  } catch (error) {
    console.error('❌ Error in demo:', error.response?.data || error.message);
  }
}

/**
 * Format instructions for console display
 */
function formatInstructions(instructions: string[]): string {
  return instructions.map((instruction, index) => 
    `   ${index + 1}. ${instruction}`
  ).join('\n');
}

/**
 * Example of how a driver app would use this
 */
async function driverAppExample() {
  console.log('\n📱 Driver App Integration Example\n');
  
  console.log('When a driver is assigned a booking:');
  console.log('1. App calls GET /bookings/:id/route-instructions');
  console.log('2. Driver sees step-by-step navigation');
  console.log('3. Real-time updates via WebSocket for traffic');
  console.log('4. Voice guidance using instruction text');
  
  console.log('\nSample driver notification:');
  console.log('   🔔 New booking assigned!');
  console.log('   📍 Pickup: CBD, Nairobi');
  console.log('   📍 Dropoff: Westlands, Nairobi');
  console.log('   🕐 ETA: 12 minutes');
  console.log('   🧭 Next: Head west on Kenyatta Avenue');
}

// Run the demo
if (require.main === module) {
  console.log('🚀 Starting Driver Instructions Demo...\n');
  
  demoDriverInstructions()
    .then(() => driverAppExample())
    .catch(console.error);
}

export { demoDriverInstructions, driverAppExample };
