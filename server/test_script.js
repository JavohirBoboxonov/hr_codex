const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Boshladik ---');
  let token = '';
  let jobId = '';
  let applicationId = '';

  try {
    // 1. Status check
    const status = await axios.get('http://localhost:5001/api/');
    console.log('✅ Server ishlavotti:', status.data.message);

    // 2. Register
    const email = `test${Date.now()}@test.com`;
    console.log('Test email:', email);
    try {
      const regRes = await axios.post(`${API_URL}/auth/register`, {
        fullName: 'Test User',
        email,
        password: 'password123'
      });
      console.log('✅ Register:', regRes.data.message);
    } catch(e) {
      console.log('❌ Register Error:', e.response?.data || e.message);
    }

    // Email tasdiqlash uchun baza kerak, shuning uchun tepadagi qadamda ro'yxatdan o'tganimiz bilan tasdiqlay olmaymiz (kod emailga ketadi).
    // Yechim: Biz mock kod ishlatamiz yoki bazaga to'g'ridan-to'g'ri bog'lanamiz. 
    // Lekin hozir API ochiqliklarini test qilyapmiz, masalan login:
    
  } catch (error) {
    console.error('❌ General Error:', error.response?.data || error.message);
  }
}

runTests();
