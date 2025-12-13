require('dotenv').config(); // Defaults to .env in CWD
const nodemailer = require('nodemailer');

async function verifySMTP() {
    console.log('--- SMTP Verification Test ---');
    // Log partially masked values for verification
    console.log('Host:', process.env.SMTP_HOST);
    console.log('Port:', process.env.SMTP_PORT);
    console.log('User:', process.env.SMTP_USER);

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ Missing SMTP environment variables.');
        console.log('Current CWD:', process.cwd());
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465 || String(process.env.SMTP_SECURE) === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    try {
        console.log('Attempting to connect to SMTP server...');
        await transporter.verify();
        console.log('✅ SMTP Connection Successful! Credentials are valid.');
    } catch (error) {
        console.error('❌ SMTP Connection Failed:', error.message);
        if (error.response) console.error('Server Response:', error.response);
    }
}

verifySMTP();
