import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

const driverId = parseInt(process.argv[2]) || 1;
const latitude = parseFloat(process.argv[3]) || -1.2921;
const longitude = parseFloat(process.argv[4]) || 36.8219;

async function testDriverLocation() {
  console.log(`🧪 Testing driver location update...`);
  console.log(`Driver ID: ${driverId}`);
  console.log(`Coordinates: ${latitude}, ${longitude}`);
  console.log('');

  try {
    const response = await axios.post(
      `${BASE_URL}/driver/${driverId}/location`,
      {
        latitude,
        longitude,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.AUTH_TOKEN && { 'Authorization': `Bearer ${process.env.AUTH_TOKEN}` })
        },
      }
    );

    console.log('✅ Success!');
    console.log('Response:', response.data);
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testDriverLocation().catch(console.error);
