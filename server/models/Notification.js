const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    read: { type: Boolean, default: false }, // false = unread
    data: { type: mongoose.Schema.Types.Mixed, default: {} } // For storing orderId, link, etc.
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
