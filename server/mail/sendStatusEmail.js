const { sendWithRetry, FROM } = require('./sendgridClient');

async function sendStatusEmail(order, status, html, pdfBuffer = null) {
    const msg = {
        to: order.deliveryEmail,
        from: FROM,
        subject: `📦 Order ${status.toUpperCase()} – #${order._id.toString().slice(-6)}`,
        html
    };

    if (pdfBuffer) {
        msg.attachments = [{
            content: pdfBuffer.toString('base64'),
            filename: `invoice-${order._id}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
        }];
    }

    return await sendWithRetry(msg, 'ORDER_STATUS');
}

module.exports = { sendStatusEmail };
