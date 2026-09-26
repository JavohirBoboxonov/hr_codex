const axios = require('axios');
const mongoose = require('mongoose');

const API_URL = 'http://localhost:5001/api';

async function runE2E() {
  console.log('--- E2E Backend Test ---');
  let token = '';

  try {
    // Connect to DB directly to verify user
    await mongoose.connect('mongodb://127.0.0.1:27017/hrlodex');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const VerificationCode = mongoose.model('VerificationCode', new mongoose.Schema({}, { strict: false }));

    const email = `e2e${Date.now()}@test.com`;
    console.log('Registering', email);

    // 1. Register
    await axios.post(`${API_URL}/auth/register`, {
      fullName: 'E2E Employer',
      email,
      password: 'password123'
    });
    console.log('✅ Registered');

    // 2. Verify directly
    const verification = await VerificationCode.findOne({ email, type: 'register' });
    if (!verification) throw new Error('Verification code not found in DB');

    const verifyRes = await axios.post(`${API_URL}/auth/verify-email`, {
      email,
      code: verification.code
    });
    console.log('✅ Verified:', verifyRes.data.message);

    // 3. Select Role
    const roleRes = await axios.post(`${API_URL}/auth/select-role`, {
      email,
      role: 'employer'
    });
    console.log('✅ Role Selected:', roleRes.data.message);
    token = roleRes.data.data.token;

    // 4. Create Job
    const jobRes = await axios.post(`${API_URL}/jobs`, {
      title: "Backend Engineer",
      department: "IT",
      role: "Backend",
      description: "Node.js dev",
      experienceLevel: "Mid",
      requiredSkills: ["Node.js", "MongoDB"],
      interviewType: "TEXT",
      interviewCategory: "TECHNICAL",
      interviewMode: "INSTANT",
      visibility: "PUBLIC",
      sourceLanguage: "uz",
      resumeRequired: false,
      questions: [{ id: "q1", text: "What is Node.js?", category: "Tech", answerType: "TEXT", difficulty: "Mid" }],
      status: "Active"
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Job Created:', jobRes.data.data.title);
    const job = jobRes.data.data;

    // 5. Register Candidate
    const candidateEmail = `cand${Date.now()}@test.com`;
    console.log('Registering candidate', candidateEmail);
    await axios.post(`${API_URL}/auth/register`, {
      fullName: 'Test Candidate',
      email: candidateEmail,
      password: 'password123'
    });
    
    const candVerification = await VerificationCode.findOne({ email: candidateEmail, type: 'register' });
    await axios.post(`${API_URL}/auth/verify-email`, { email: candidateEmail, code: candVerification.code });
    const candRoleRes = await axios.post(`${API_URL}/auth/select-role`, { email: candidateEmail, role: 'candidate' });
    const candToken = candRoleRes.data.data.token;
    console.log('✅ Candidate registered and verified');

    // 6. Apply to Job
    const applyRes = await axios.post(`${API_URL}/public/jobs/${job.id}/apply`, {
      name: "Test Candidate",
      email: candidateEmail,
      phone: "+998901234567",
      experienceYears: 2
    }, {
      headers: { Authorization: `Bearer ${candToken}` }
    });
    console.log('✅ Applied to Job:', applyRes.data.message);
    const application = applyRes.data.data;

    // 7. Start Session
    const startRes = await axios.post(`${API_URL}/public/sessions/start`, {
      jobId: job.id,
      applicationId: application._id,
      language: "uz"
    }, {
      headers: { Authorization: `Bearer ${candToken}` }
    });
    console.log('✅ Session Started:', startRes.data.data.id);
    const session = startRes.data.data;

    // 8. Complete Session
    console.log('Completing session (AI evaluation may take a few seconds)...');
    try {
      const completeRes = await axios.patch(`${API_URL}/public/sessions/${session.id}/complete`, {
        answers: [{ questionId: "q1", questionText: "What is Node.js?", text: "Node.js bu server tomonida ishlovchi JS muhiti." }],
        skipAiEvaluation: false
      }, {
        headers: { Authorization: `Bearer ${candToken}` }
      });
      console.log('✅ Session Completed with AI evaluation!');
    } catch(e) {
      console.log('❌ Session Completion Error:', e.response?.data || e.message);
    }

  } catch (error) {
    console.error('❌ E2E Error:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    console.log('--- E2E Test End ---');
  }
}

runE2E();
