const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

async function testAll() {
  console.log('--- API Test Start ---');
  let token = '';

  try {
    // 1. Status
    const status = await axios.get(`${API_URL}/`);
    console.log('✅ Server Status:', status.data.message);

    // 2. Register
    const email = `test${Date.now()}@test.com`;
    console.log('Testing Registration with', email);
    let regRes;
    try {
      regRes = await axios.post(`${API_URL}/auth/register`, {
        fullName: 'Test User',
        email,
        password: 'password123'
      });
      console.log('✅ Register:', regRes.data.message);
    } catch(e) {
      console.log('❌ Register Error:', e.response?.data || e.message);
      return;
    }

    // Email needs verification, let's bypass by trying to login? 
    // We can't easily login without verification unless the backend allows it.
    // Let's try to verify with mock code if there's any?
    try {
      const verRes = await axios.post(`${API_URL}/auth/verify-email`, {
        email,
        code: '123456' // Guessing it might be hardcoded in dev, or it will fail
      });
      console.log('✅ Verify:', verRes.data);
      token = verRes.data.data.token;
    } catch(e) {
      console.log('❌ Verify Error:', e.response?.data || e.message);
      // Let's check DB directly to get the code or update verified status
    }

  } catch (error) {
    console.error('❌ General Error:', error.response?.data || error.message);
  }
}

testAll();
