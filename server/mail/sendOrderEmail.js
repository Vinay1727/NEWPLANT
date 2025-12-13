const { sendWithRetry, FROM } = require('./sendgridClient');

async function sendOrderEmail(order) {
    const itemsHtml = order.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td>${i.quantity}</td>
      <td>₹${i.price}</td>
    </tr>
  `).join('');

    const msg = {
        to: order.deliveryEmail,
        from: FROM,
        subject: `✅ Order Confirmed – #${order._id.toString().slice(-6)}`,
        html: `
      <h2>Thank you for your order!</h2>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <table border="1" cellpadding="8">${itemsHtml}</table>
      <h3>Total: ₹${order.total}</h3>
    `
    };

    return await sendWithRetry(msg, 'ORDER_CONFIRMATION');
}

module.exports = { sendOrderEmail };
