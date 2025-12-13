// Test the signup OTP flow
const API_BASE = 'https://newplant-9.onrender.com';

async function testSignupOtpFlow() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testName = 'Test User';
  const testPassword = 'TestPassword123!';

  console.log('🔍 Testing signup OTP flow...\n');
  console.log(`Email: ${testEmail}`);
  console.log(`Name: ${testName}`);
  console.log(`Password: ${testPassword}\n`);

  try {
    // Step 1: Request OTP
    console.log('📧 Step 1: Requesting OTP...');
    const otpRes = await fetch(`${API_BASE}/api/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });

    const otpData = await otpRes.json();
    console.log(`Status: ${otpRes.status}`);
    console.log(`Response:`, otpData);

    if (!otpRes.ok) {
      console.log('❌ Failed to request OTP');
      return;
    }

    console.log('✅ OTP request successful!\n');

    // Step 2: Verify OTP (using hardcoded OTP for testing - in real flow user enters it from email)
    console.log('📝 Step 2: Verifying OTP...');
    console.log('⚠️  Note: In production, user enters OTP from email');
    console.log('💡 For testing, check server logs for generated OTP and enter it here manually\n');

    // Extract OTP from server logs - for now just log what we need to do
    console.log('📋 Next steps:');
    console.log('1. Check the server console for the OTP that was generated');
    console.log('2. In the UI, enter email: ' + testEmail);
    console.log('3. Click "Send OTP"');
    console.log('4. Enter the OTP from email');
    console.log('5. Enter name: ' + testName);
    console.log('6. Enter password: ' + testPassword);
    console.log('7. Click "Verify OTP"');
    console.log('8. You should be logged in with token stored in localStorage');

  } catch (err) {
    console.error('❌ Test error:', err.message);
  }
}

testSignupOtpFlow();
