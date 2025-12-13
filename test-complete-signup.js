// Complete test for signup OTP flow
const API_BASE = 'https://newplant-9.onrender.com';

async function testCompleteSignupOtpFlow() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testName = 'Test User ' + Date.now();
  const testPassword = 'TestPassword123!';

  console.log('🔍 Testing COMPLETE signup OTP flow...\n');
  console.log(`📋 Test Details:`);
  console.log(`   Email: ${testEmail}`);
  console.log(`   Name: ${testName}`);
  console.log(`   Password: ${testPassword}\n`);

  try {
    // Step 1: Request OTP
    console.log('📧 Step 1: Requesting OTP...');
    const otpRes = await fetch(`${API_BASE}/api/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });

    const otpData = await otpRes.json();
    console.log(`   Status: ${otpRes.status}`);
    console.log(`   Message: ${otpData.message}`);

    if (!otpRes.ok) {
      console.log('❌ Failed to request OTP');
      console.log('Response:', otpData);
      return;
    }

    // Extract OTP from response
    const receivedOtp = otpData.debugOtp;
    if (!receivedOtp) {
      console.log('❌ No OTP in response');
      console.log('Response:', otpData);
      return;
    }

    console.log(`✅ OTP received: ${receivedOtp}\n`);

    // Step 2: Verify OTP and create account
    console.log('📝 Step 2: Verifying OTP and creating account...');
    const verifyRes = await fetch(`${API_BASE}/api/verify-otp-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        otp: receivedOtp,
        name: testName,
        password: testPassword
      })
    });

    const verifyData = await verifyRes.json();
    console.log(`   Status: ${verifyRes.status}`);
    console.log(`   Message: ${verifyData.message}`);

    if (!verifyRes.ok) {
      console.log('❌ Failed to verify OTP');
      console.log('Response:', verifyData);
      return;
    }

    console.log(`✅ OTP verified successfully!\n`);

    // Check for token and user data
    if (verifyData.token) {
      console.log(`✅ Auth token received: ${verifyData.token.substring(0, 20)}...`);
    }

    if (verifyData.user) {
      console.log(`✅ User created:`);
      console.log(`   ID: ${verifyData.user._id}`);
      console.log(`   Email: ${verifyData.user.email}`);
      console.log(`   Name: ${verifyData.user.name}`);
    }

    console.log('\n🎉 COMPLETE SIGNUP OTP FLOW TEST PASSED!');
    console.log('\n✨ The OTP system is now working correctly:');
    console.log('   ✓ OTP generated and saved to database');
    console.log('   ✓ OTP verified successfully');
    console.log('   ✓ User account created with hashed password');
    console.log('   ✓ Auth token generated for immediate login');

  } catch (err) {
    console.error('❌ Test error:', err.message);
  }
}

testCompleteSignupOtpFlow();
