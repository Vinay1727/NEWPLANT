const { sendWithRetry, FROM } = require('./sendgridClient');

async function sendOtpEmail(email, otp) {
    const msg = {
        to: email,
        from: FROM,
        subject: '🔐 Your OTP for JeevaLeaf',
        html: `
      <h2>JeevaLeaf Password Verification</h2>
      <p>Your OTP is:</p>
      <h1 style="letter-spacing:4px">${otp}</h1>
      <p>Valid for <strong>10 minutes</strong>.</p>
    `
    };

    return await sendWithRetry(msg, 'OTP');
}

module.exports = { sendOtpEmail };
