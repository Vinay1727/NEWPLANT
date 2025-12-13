const sgMail = require('@sendgrid/mail');

if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY not set');
} else {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM = process.env.SENDGRID_FROM;

async function sendWithRetry(msg, context = 'EMAIL') {
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`📧 [${context}] Attempt ${attempt} → ${msg.to}`);
            await sgMail.send(msg);
            console.log(`✅ [${context}] Email sent → ${msg.to}`);
            return true;
        } catch (err) {
            console.error(`❌ [${context}] Attempt ${attempt} failed:`, err.message);

            if (attempt === MAX_RETRIES) {
                console.error(`🚨 [${context}] FINAL FAILURE → ${msg.to}`);
                return false;
            }

            await new Promise(r => setTimeout(r, 1000 * attempt)); // backoff
        }
    }
}

module.exports = { sendWithRetry, FROM };
