require('dotenv').config();
const { sendOtpEmail } = require('./mail/sendOtpEmail');
const { sendOrderEmail } = require('./mail/sendOrderEmail');
const { sendStatusEmail } = require('./mail/sendStatusEmail');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const User = require('./models/User');
const Order = require('./models/Order');
const Message = require('./models/Message');
const Plant = require('./models/Plant');
const Review = require('./models/Review');
const Otp = require('./models/Otp');
const Notification = require('./models/Notification');
const { syncCSVToDatabase, resyncCSV, watchCSVFile, stopWatchingCSVFile, CSV_PATHS } = require('./utils/csvSync');
const { getStatusEmailHTML } = require('./utils/emailTemplates');

const app = express();
const PORT = process.env.PORT || 4000;

// Generate invoice PDF buffer for an order
function generateInvoiceBuffer(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const left = doc.x;
      const right = doc.page.width - doc.page.margins.right;
      const usableWidth = right - left;

      // Top header: logo left, company info center-left, QR & invoice box right
      const logoPath = path.resolve(__dirname, '..', 'src', 'assets', 'logo2.jpg');
      if (fs.existsSync(logoPath)) {
        try { doc.image(logoPath, left, doc.y, { width: 90, height: 90 }); } catch (e) { console.warn('Logo embed failed', e.message); }
      }

      // Company details (mimic attached layout)
      const companyX = left + 100;
      doc.fontSize(14).fillColor('#000').text('Suri Consumer Private Limited', companyX, doc.y - 4);
      doc.fontSize(8).fillColor('#222').text('Ship-from Address: Suriwarehousings Pvt. Ltd., Hadbast No. 23, Village Sampka, Tehsil Faridnagar, District - Gurgaon, Haryana - 122015', companyX, doc.y + 10, { width: usableWidth - 220 });
      doc.moveDown(0.1);
      doc.fontSize(9).fillColor('#000').text('GSTIN - 06ABCDS9580N1ZL', companyX, doc.y + 2);

      // Right-side invoice box (with QR placeholder above)
      const boxW = 220;
      const boxX = right - boxW;
      // QR placeholder
      doc.rect(boxX, left, 80, 80).stroke('#000');
      // Invoice box
      doc.rect(boxX + 90, left + 6, boxW - 90, 60).stroke('#000');
      doc.fontSize(9).fillColor('#000').text('Invoice Number #', boxX + 95, left + 12);
      doc.fontSize(11).fillColor('#000').text(order.invoiceNumber || `INV${String(order._id).slice(-8)}`, boxX + 95, left + 30);

      doc.moveDown(2);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke('#000');

      // Meta and Bill/Ship columns
      const metaY = doc.y + 8;
      doc.fontSize(9).fillColor('#000').text(`Order ID: ${order._id}`, left, metaY);
      doc.fontSize(9).fillColor('#000').text(`Order Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}`, left + 200, metaY);
      doc.fontSize(9).fillColor('#000').text(`Invoice Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}`, left + 380, metaY);

      doc.moveDown(1.2);

      // Bill To / Ship To columns (two columns)
      const halfW = (usableWidth - 10) / 2;
      const billTop = doc.y;
      doc.fontSize(9).fillColor('#000').text('Bill To:', left, billTop);
      doc.fontSize(9).fillColor('#333').text(order.deliveryName || 'N/A', left, doc.y + 12);
      doc.fontSize(8).fillColor('#555').text(order.deliveryAddress || 'N/A', left, doc.y + 26, { width: halfW });

      doc.fontSize(9).fillColor('#000').text('Ship To:', left + halfW + 10, billTop);
      doc.fontSize(9).fillColor('#333').text(order.deliveryName || 'N/A', left + halfW + 10, doc.y + 12);
      doc.fontSize(8).fillColor('#555').text(order.deliveryAddress || 'N/A', left + halfW + 10, doc.y + 26, { width: halfW });

      doc.moveDown(2);

      // Table header matching attached image columns
      const tableTop = doc.y;
      const cols = {
        product: left,
        title: left + 110,
        qty: left + 330,
        gross: left + 370,
        discount: left + 440,
        taxable: left + 520,
        sgst: left + 590,
        cgst: left + 650,
        total: left + 710
      };

      doc.fontSize(8.5).fillColor('#000').text('Product', cols.product, tableTop);
      doc.text('Title', cols.title, tableTop);
      doc.text('Qty', cols.qty, tableTop, { width: 30, align: 'right' });
      doc.text('Gross Amount ₹', cols.gross, tableTop, { width: 60, align: 'right' });
      doc.text('Discounts / Coupons ₹', cols.discount, tableTop, { width: 60, align: 'right' });
      doc.text('Taxable Value ₹', cols.taxable, tableTop, { width: 60, align: 'right' });
      doc.text('SGST ₹', cols.sgst, tableTop, { width: 40, align: 'right' });
      doc.text('CGST ₹', cols.cgst, tableTop, { width: 40, align: 'right' });
      doc.text('Total ₹', cols.total, tableTop, { width: 60, align: 'right' });

      doc.moveDown(0.5);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke('#ccc');

      const items = Array.isArray(order.items) ? order.items : [];
      let itemsCount = 0;
      items.forEach((it) => {
        itemsCount += 1;
        const prod = it.sku || it.name || 'Product';
        const title = it.title || it.name || '';
        const qty = Number(it.quantity || 1);
        const price = Number(it.price || it.salePrice || 0);
        const gross = price * qty;
        const discount = Number(it.discount || 0) || 0;
        const taxable = gross - discount;
        const sgst = Number(((order.tax || 0) / 2).toFixed(2)) || 0;
        const cgst = sgst;
        const rowTotal = taxable + sgst + cgst;

        const rowY = doc.y + 6;
        doc.fontSize(8.5).fillColor('#222').text(prod, cols.product, rowY, { width: 100 });
        doc.text(title, cols.title, rowY, { width: 200 });
        doc.text(String(qty), cols.qty, rowY, { width: 30, align: 'right' });
        doc.text(gross.toFixed(2), cols.gross, rowY, { width: 60, align: 'right' });
        doc.text(discount.toFixed(2), cols.discount, rowY, { width: 60, align: 'right' });
        doc.text(taxable.toFixed(2), cols.taxable, rowY, { width: 60, align: 'right' });
        doc.text(sgst.toFixed(2), cols.sgst, rowY, { width: 40, align: 'right' });
        doc.text(cgst.toFixed(2), cols.cgst, rowY, { width: 40, align: 'right' });
        doc.text(rowTotal.toFixed(2), cols.total, rowY, { width: 60, align: 'right' });

        doc.moveDown(1);
      });

      // Totals
      doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke('#ccc');
      doc.moveDown(0.4);
      const totalsY = doc.y;
      doc.fontSize(9).fillColor('#000').text('Total', cols.product, totalsY);
      doc.text(String(itemsCount), cols.qty, totalsY, { width: 30, align: 'right' });
      doc.text(`${Number(order.subtotal || 0).toFixed(2)}`, cols.gross, totalsY, { width: 60, align: 'right' });
      doc.text(`${Number(order.discount || 0).toFixed(2)}`, cols.discount, totalsY, { width: 60, align: 'right' });
      doc.text(`${Number(order.taxable || order.subtotal || 0).toFixed(2)}`, cols.taxable, totalsY, { width: 60, align: 'right' });
      const halfTax = Number(((order.tax || 0) / 2).toFixed(2));
      doc.text(`${(halfTax || 0).toFixed(2)}`, cols.sgst, totalsY, { width: 40, align: 'right' });
      doc.text(`${(halfTax || 0).toFixed(2)}`, cols.cgst, totalsY, { width: 40, align: 'right' });
      doc.text(`${Number(order.total || 0).toFixed(2)}`, cols.total, totalsY, { width: 60, align: 'right' });

      doc.moveDown(2);

      // Grand total box right aligned
      doc.fontSize(12).fillColor('#000').text('Grand Total', left + usableWidth - 240, doc.y);
      doc.fontSize(14).fillColor('#000').text(`₹${Number(order.total || 0).toFixed(2)}`, left + usableWidth - 80, doc.y - 2, { align: 'right' });

      doc.moveDown(3);
      // Signature
      doc.fontSize(9).fillColor('#000').text('Authorized Signatory', left + usableWidth - 220, doc.y);
      doc.moveTo(left + usableWidth - 260, doc.y + 18).lineTo(left + usableWidth - 80, doc.y + 18).stroke('#000');

      // Footer: returns policy and contact
      doc.moveTo(left, doc.page.height - 120).lineTo(right, doc.page.height - 120).stroke('#eee');
      doc.fontSize(7.5).fillColor('#444').text('Returns Policy: At Flipkart we try to deliver perfectly each and every time. But in the off-chance that you need to return the item, please do so with the original Brand box/price tag, original packing and invoice. The goods sold are intended for end user consumption and not for resale.', left + 10, doc.page.height - 110, { width: usableWidth - 20 });
      doc.fontSize(7.5).fillColor('#666').text('Contact Flipkart: 044-45614700 | 044-67415800 | www.flipkart.com/helpcentre', left + 10, doc.page.height - 50, { width: usableWidth - 20 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

app.use(cors());
app.use(express.json());

// Payment gateway removed: using simple mock flows for card/upi/netbanking/cod

const MONGO_URI = process.env.MONGO_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-prod";

async function start() {
  if (!MONGO_URI) {
    console.warn('Warning: MONGO_URI not set. Set environment variable to connect to MongoDB.');
  }

  try {
    if (MONGO_URI) await mongoose.connect(MONGO_URI, { autoIndex: true });
    console.log('Connected to MongoDB (if MONGO_URI provided)');

    // Sync CSV data to database on startup for all known categories
    try {
      console.log('🔄 Starting CSV to database sync for categories:', Object.keys(CSV_PATHS).join(', '));
      const categories = Object.keys(CSV_PATHS);
      const results = await Promise.all(categories.map(cat => syncCSVToDatabase(cat).catch(err => ({ success: false, message: err && err.message ? err.message : String(err) }))));
      console.log('CSV Sync Results:');
      categories.forEach((cat, i) => console.log(` - ${cat}:`, results[i]));
    } catch (err) {
      console.error('Error during initial CSV sync:', err);
    }

    // Start watching CSV files for real-time updates
    watchCSVFile();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }

  // Helper: Generate OTP
  function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Request Password Reset (sends OTP)
  app.post('/api/request-password-reset', async (req, res) => {
    try {
      const { email } = req.body;
      console.log(`🔄 Password reset requested for email: ${email}`);

      if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        console.log(`❌ No user found for email: ${email}`);
        return res.status(404).json({ success: false, message: 'No account found with this email' });
      }

      // Generate OTP
      const otp = generateOTP();
      console.log(`🔐 Generated OTP for ${email}: ${otp}`);

      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to database
      await Otp.findOneAndUpdate(
        { email: email.toLowerCase() },
        { email: email.toLowerCase(), otpHash, expiresAt },
        { upsert: true, new: true }
      );
      console.log(`✅ OTP saved to database for ${email}`);

      // Send OTP via email
      const sent = await sendOtpEmail(email, otp);
      if (!sent) {
        console.log(`⚠️ WARNING: Email send failed for ${email}`);
        console.log(`⚠️ DEBUG: OTP for ${email} is: ${otp}`);
        console.log(`⚠️ For testing only - OTP saved to database but email delivery failed`);
        // In dev mode, still allow continuation
        return res.json({
          success: true,
          message: '⚠️ OTP generated (email delivery failed - check server logs)',
          email,
          debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
        });
      }

      console.log(`✅ OTP request successful for ${email}`);
      return res.json({ success: true, message: 'OTP sent to your email', email });
    } catch (err) {
      console.error('❌ Error in password reset request:', err);
      return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  });

  // Verify OTP and Reset Password
  app.post('/api/verify-otp', async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: 'Missing required fields' });

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const otpRecord = await Otp.findOne({ email: email.toLowerCase() });
      if (!otpRecord) return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new one.' });

      // Check if OTP has expired
      if (new Date() > otpRecord.expiresAt) {
        await Otp.deleteOne({ email: email.toLowerCase() });
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
      }

      // Verify OTP
      const otpValid = await bcrypt.compare(otp, otpRecord.otpHash);
      if (!otpValid) return res.status(400).json({ success: false, message: 'Invalid OTP' });

      // Update password
      const hashed = await bcrypt.hash(newPassword, 10);
      user.password = hashed;
      await user.save();

      // Delete used OTP
      await Otp.deleteOne({ email: email.toLowerCase() });

      return res.json({ success: true, message: 'Password reset successful. Please login with your new password.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Request OTP for Signup (new account creation flow)
  app.post('/api/request-otp', async (req, res) => {
    try {
      const { email } = req.body;
      console.log(`🔄 OTP requested for signup - Email: ${email}`);

      if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

      // Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        console.log(`❌ Email already registered: ${email}`);
        return res.status(400).json({ success: false, message: 'Email already registered. Please login instead.' });
      }

      // Generate OTP
      const otp = generateOTP();
      console.log(`🔐 Generated OTP for signup ${email}: ${otp}`);

      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to database
      await Otp.findOneAndUpdate(
        { email: email.toLowerCase() },
        { email: email.toLowerCase(), otpHash, expiresAt },
        { upsert: true, new: true }
      );
      console.log(`✅ OTP saved to database for signup ${email}`);

      // Send OTP via email
      const sent = await sendOtpEmail(email, otp);

      // For development: if email fails but OTP is saved, still proceed and log the OTP
      if (!sent) {
        console.log(`⚠️ WARNING: Email send failed for ${email}`);
        console.log(`⚠️ DEBUG: OTP for ${email} is: ${otp}`);
        console.log(`⚠️ For testing only - OTP saved to database but email delivery failed`);
        // In dev mode, still allow continuation - user can manually use the OTP shown in logs
        return res.json({
          success: true,
          message: '⚠️ OTP generated (email delivery failed - check server logs)',
          email,
          debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
        });
      }

      console.log(`✅ OTP signup request successful for ${email}`);
      return res.json({ success: true, message: 'OTP sent! Please check your inbox and SPAM folder.', email });
    } catch (err) {
      console.error('❌ Error in OTP signup request:', err);
      return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  });

  // Verify OTP for Signup (and create account)
  app.post('/api/verify-otp-signup', async (req, res) => {
    try {
      const { email, otp, name, password } = req.body;
      if (!email || !otp || !name || !password) return res.status(400).json({ success: false, message: 'Missing required fields' });

      console.log(`🔄 Verifying OTP for signup - Email: ${email}, Name: ${name}`);

      // Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered. Please login instead.' });
      }

      const otpRecord = await Otp.findOne({ email: email.toLowerCase() });
      if (!otpRecord) return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new one.' });

      // Check if OTP has expired
      if (new Date() > otpRecord.expiresAt) {
        await Otp.deleteOne({ email: email.toLowerCase() });
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
      }

      // Verify OTP
      const otpValid = await bcrypt.compare(otp, otpRecord.otpHash);
      if (!otpValid) return res.status(400).json({ success: false, message: 'Invalid OTP' });

      // Create new user
      const hashed = await bcrypt.hash(password, 10);
      const user = new User({ name, email: email.toLowerCase(), password: hashed });
      await user.save();

      // Delete used OTP
      await Otp.deleteOne({ email: email.toLowerCase() });

      // Generate token
      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      const out = user.toObject();
      delete out.password;

      console.log(`✅ User created successfully via OTP: ${email}`);
      return res.json({ success: true, message: 'Account created successfully', token, user: out });
    } catch (err) {
      console.error('❌ Error in OTP signup verification:', err);
      return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  });

  // Also add alias endpoint for /api/verify-reset-token (used in forgot password flow)
  app.post('/api/verify-reset-token', async (req, res) => {
    try {
      const { email, token, newPassword } = req.body;
      if (!email || !token || !newPassword) return res.status(400).json({ success: false, message: 'Missing required fields' });

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const otpRecord = await Otp.findOne({ email: email.toLowerCase() });
      if (!otpRecord) return res.status(400).json({ success: false, message: 'Token not found or expired. Please request a new one.' });

      // Check if OTP has expired
      if (new Date() > otpRecord.expiresAt) {
        await Otp.deleteOne({ email: email.toLowerCase() });
        return res.status(400).json({ success: false, message: 'Token has expired. Please request a new one.' });
      }

      // Verify token (OTP)
      const tokenValid = await bcrypt.compare(token, otpRecord.otpHash);
      if (!tokenValid) return res.status(400).json({ success: false, message: 'Invalid token' });

      // Update password
      const hashed = await bcrypt.hash(newPassword, 10);
      user.password = hashed;
      await user.save();

      // Delete used token
      await Otp.deleteOne({ email: email.toLowerCase() });

      console.log(`✅ Password reset via token successful for ${email}`);
      return res.json({ success: true, message: 'Password reset successful. Please login with your new password.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  });

  // Signup
  // Signup - MODIFIED: Now triggers OTP flow instead of direct creation
  app.post('/api/signup', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

      // Check if user already exists
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ success: false, message: 'Email already registered. Please login.' });

      // Instead of creating user directly, we generate an OTP and ask client to verify

      // 1. Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      // 2. Save OTP (upsert)
      await Otp.findOneAndUpdate(
        { email: email.toLowerCase() },
        { email: email.toLowerCase(), otpHash, expiresAt },
        { upsert: true, new: true }
      );

      // 3. Send OTP Email
      await sendOtpEmail(email, otp);

      // 4. Return special response telling frontend to switch to OTP mode
      // The frontend must handle `requiresOtp: true` to show the OTP input dialog
      return res.json({
        success: true,
        message: 'Please verify your email. OTP sent to your inbox/spam.',
        requiresOtp: true,
        email
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Login
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(400).json({ success: false, message: 'Invalid credentials' });

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      const out = user.toObject();
      delete out.password;
      return res.json({ success: true, token, user: out });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Protected test route
  app.get('/api/me', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ success: false, message: 'Missing token' });
      const token = auth.split(' ')[1];
      const data = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(data.id).select('-password');
      return res.json({ success: true, user });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  });

  // Update current user's profile (protected)
  app.put('/api/me', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ success: false, message: 'Missing token' });
      const token = auth.split(' ')[1];
      const data = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(data.id);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

      // Only allow updating specific fields
      const allowed = [
        'name', 'email', 'phone', 'profilePhoto', 'addresses', 'defaultAddressId',
        'paymentMethods', 'defaultPaymentId', 'walletBalance', 'twoFAEnabled'
      ];

      for (let key of allowed) {
        if (req.body[key] !== undefined) {
          user[key] = req.body[key];
        }
      }

      // handle password change separately
      if (req.body.password) {
        const hashed = await bcrypt.hash(req.body.password, 10);
        user.password = hashed;
      }

      await user.save();
      const out = user.toObject();
      delete out.password;
      return res.json({ success: true, user: out });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Create Order (protected)
  app.post('/api/orders', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ success: false, message: 'Missing token' });
      const token = auth.split(' ')[1];
      const data = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(data.id);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

      const { items, paymentMethod } = req.body;
      const { deliveryName, deliveryPhone, deliveryEmail, deliveryAddress, deliveryLocation } = req.body;
      console.log('📦 New order - Email:', deliveryEmail);
      if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'No items provided' });

      // sanitize incoming items to expected schema
      const sanitizedItems = items.map((it) => ({
        productId: it.productId !== undefined ? it.productId : (it.id || null),
        name: it.name || '',
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1,
        emoji: it.emoji || '',
        image: it.image || '',
        currency: it.currency || ''
      }));

      const subtotal = sanitizedItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
      const tax = +(subtotal * 0.1).toFixed(2);
      const shipping = sanitizedItems.length > 0 ? 5 : 0;
      const total = +(subtotal + tax + shipping).toFixed(2);

      // determine initial payment and order status
      let paymentStatus = 'pending';
      let status = 'pending';
      const pm = (paymentMethod || 'cod').toLowerCase();
      // Cash-on-delivery: payment is pending but order moves to processing immediately
      if (pm === 'cod') {
        paymentStatus = 'pending';
        status = 'processing';
      }
      // other methods start as pending payment and pending processing

      const order = new Order({
        user: user._id,
        items: sanitizedItems,
        subtotal,
        tax,
        shipping,
        total,
        paymentMethod: pm,
        paymentStatus,
        status,
        deliveryName: deliveryName || '',
        deliveryPhone: deliveryPhone || '',
        deliveryEmail: deliveryEmail || '',
        deliveryAddress: deliveryAddress || '',
        deliveryLocation: deliveryLocation || ''
      });
      await order.save();

      // Send order confirmation email (Awaited to ensure execution on Render)
      // Send order confirmation email (via SendGrid)
      try {
        await sendOrderEmail(order);
        console.log(`✅ Order email sent via SendGrid to ${order.deliveryEmail}`);
      } catch (e) {
        console.error('❌ Order email failed:', e.message);
      }

      return res.json({ success: true, orderId: order._id, order });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Contact form: store a message (public)
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, phone, message } = req.body;
      if (!name || !message) return res.status(400).json({ success: false, message: 'Name and message are required' });

      const msg = new Message({ name, email: email || '', phone: phone || '', message });
      await msg.save();
      return res.json({ success: true, message: 'Message received' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Get user's own orders (protected)
  app.get('/api/my-orders', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ success: false, message: 'Missing token' });
      const token = auth.split(' ')[1];
      const data = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(data.id);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

      const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(100);
      return res.json({ success: true, orders });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Get User Notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ success: false, message: 'Missing token' });
      const token = auth.split(' ')[1];
      const data = jwt.verify(token, JWT_SECRET);

      const notifications = await Notification.find({ user: data.id }).sort({ createdAt: -1 }).limit(50);
      const unreadCount = await Notification.countDocuments({ user: data.id, read: false });

      return res.json({ success: true, notifications, unreadCount });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Mark all notifications as read
  app.put('/api/notifications/read-all', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ success: false, message: 'Missing token' });
      const token = auth.split(' ')[1];
      const data = jwt.verify(token, JWT_SECRET);

      await Notification.updateMany({ user: data.id, read: false }, { read: true });
      return res.json({ success: true, message: 'All marked as read' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Mark single notification as read
  app.put('/api/notifications/:id/read', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ success: false, message: 'Missing token' });
      const token = auth.split(' ')[1];
      const data = jwt.verify(token, JWT_SECRET);

      const notif = await Notification.findOne({ _id: req.params.id, user: data.id });
      if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });

      notif.read = true;
      await notif.save();
      return res.json({ success: true, notification: notif });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Submit a review for an order (protected) - only allowed when order.status === 'delivered' and owner
  app.post('/api/orders/:id/review', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ success: false, message: 'Missing token' });
      const token = auth.split(' ')[1];
      const data = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(data.id);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (order.user.toString() !== user._id.toString()) return res.status(403).json({ success: false, message: 'Forbidden' });
      if ((order.status || '').toLowerCase() !== 'delivered') return res.status(400).json({ success: false, message: 'Can only review delivered orders' });

      const { rating, text, productId } = req.body;
      const r = Number(rating || 0);
      if (!r || r < 1 || r > 5) return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });

      // Prevent duplicate review for same order by same user
      const exists = await Review.findOne({ user: user._id, order: order._id });
      if (exists) return res.status(400).json({ success: false, message: 'You have already reviewed this order' });

      const review = new Review({ user: user._id, order: order._id, productId: productId || null, rating: r, text: text || '' });
      await review.save();

      return res.json({ success: true, review });
    } catch (err) {
      console.error('Review submit error:', err && err.message ? err.message : err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Get latest customer reviews (public)
  app.get('/api/reviews', async (req, res) => {
    try {
      const limit = Math.min(100, Number(req.query.limit) || 20);
      const reviews = await Review.find().sort({ createdAt: -1 }).limit(limit).populate('user', 'name profilePhoto');
      const out = reviews.map(r => ({
        id: r._id,
        name: r.user?.name || 'Customer',
        avatar: r.user?.profilePhoto || null,
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt,
        verified: !!r.verified
      }));
      return res.json({ success: true, reviews: out });
    } catch (err) {
      console.error('Fetch reviews error:', err && err.message ? err.message : err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Get an order by id (protected, only owner)
  app.get('/api/orders/:id', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ success: false, message: 'Missing token' });
      const token = auth.split(' ')[1];
      const data = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(data.id);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (order.user.toString() !== user._id.toString()) return res.status(403).json({ success: false, message: 'Forbidden' });

      return res.json({ success: true, order });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // --- Plant Routes ---

  // Get all indoor plants (from CSV sync)
  app.get('/api/plants/indoor', async (req, res) => {
    try {
      const plants = await Plant.find({ category: 'indoor' }).sort({ createdAt: -1 });
      return res.json({ success: true, plants });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Get plants by category
  app.get('/api/plants/:category', async (req, res) => {
    try {
      const { category } = req.params;
      const validCategories = ['indoor', 'flowering', 'outdoor', 'planters', 'care-kits'];

      if (!validCategories.includes(category)) {
        return res.status(400).json({ success: false, message: 'Invalid category' });
      }

      const plants = await Plant.find({ category }).sort({ createdAt: -1 });
      return res.json({ success: true, plants, category });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Get single plant by ID
  app.get('/api/plants/detail/:id', async (req, res) => {
    try {
      const plant = await Plant.findById(req.params.id);
      if (!plant) return res.status(404).json({ success: false, message: 'Plant not found' });
      return res.json({ success: true, plant });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Search plants by name
  app.get('/api/plants/search/:query', async (req, res) => {
    try {
      const { query } = req.params;
      const plants = await Plant.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      }).limit(20);
      return res.json({ success: true, plants, query });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // --- Admin Routes ---
  const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

  // helper middleware to require admin
  async function requireAdmin(req, res, next) {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ success: false, message: 'Missing token' });
      const token = auth.split(' ')[1];
      const data = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(data.id);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });
      if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
      req.admin = user;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  }

  // Create admin user via secret (useful for first-time setup)
  app.post('/api/admin/make-admin', async (req, res) => {
    try {
      const { email, secret } = req.body;
      if (!ADMIN_SECRET) return res.status(500).json({ success: false, message: 'Admin secret not configured on server' });
      if (!secret || secret !== ADMIN_SECRET) return res.status(403).json({ success: false, message: 'Invalid admin secret' });
      if (!email) return res.status(400).json({ success: false, message: 'Email required' });
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      user.role = 'admin';
      await user.save();
      return res.json({ success: true, message: 'User promoted to admin', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.get('/api/admin/orders', requireAdmin, async (req, res) => {
    try {
      const orders = await Order.find().populate('user', 'name email role').sort({ createdAt: -1 }).limit(200);
      return res.json({ success: true, orders });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Admin: Analytics summary (protected)
  app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
    try {
      // Basic summary metrics
      const totalOrders = await Order.countDocuments();
      const totalUsers = await User.countDocuments();

      const revenueAgg = await Order.aggregate([
        { $group: { _id: null, revenue: { $sum: { $ifNull: ["$total", 0] } } } }
      ]);
      const totalRevenue = (revenueAgg[0] && revenueAgg[0].revenue) || 0;

      const ordersByStatus = await Order.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);

      const paymentsByStatus = await Order.aggregate([
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } }
      ]);

      const topProducts = await Order.aggregate([
        { $unwind: "$items" },
        { $group: { _id: "$items.name", qty: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } },
        { $sort: { qty: -1 } },
        { $limit: 10 }
      ]);

      const dailyOrders = await Order.aggregate([
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 }, revenue: { $sum: { $ifNull: ["$total", 0] } } } },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ]);

      const lowStockItems = await Plant.find({ stock: { $lte: 5 } }).select('name stock').limit(50);

      return res.json({
        success: true,
        summary: { totalOrders, totalUsers, totalRevenue },
        ordersByStatus,
        paymentsByStatus,
        topProducts,
        dailyOrders,
        lowStockItems
      });
    } catch (err) {
      console.error('Analytics fetch error:', err && err.message ? err.message : err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.get('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    try {
      const order = await Order.findById(req.params.id).populate('user', 'name email role');
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      return res.json({ success: true, order });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.post('/api/admin/orders/:id/update', requireAdmin, async (req, res) => {
    try {
      const { status, paymentStatus } = req.body;
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      const oldStatus = order.status;
      if (status) order.status = status;
      if (paymentStatus) order.paymentStatus = paymentStatus;
      await order.save();

      // Create notification for the user
      if (status && status !== oldStatus) {
        try {
          const notifTitle = `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`;
          const notifMsg = `Your order #${order._id.toString().slice(-6)} has been ${status}.`;
          let type = 'info';
          if (status === 'delivered') type = 'success';
          if (status === 'cancelled' || status === 'returned') type = 'error';
          if (status === 'shipped') type = 'info';

          await Notification.create({
            user: order.user,
            title: notifTitle,
            message: notifMsg,
            type,
            data: { orderId: order._id }
          });
          console.log(`🔔 Notification created for User ${order.user}: ${notifTitle}`);
        } catch (nErr) {
          console.error('Failed to create notification', nErr);
        }
      }

      // Send status update email to customer
      // Send status update email to customer via SendGrid
      if (status && status !== oldStatus && order.deliveryEmail) {
        try {
          const statusMessages = {
            'processing': { subject: '🔄 Your Order is Being Processed', message: 'Your order is being processed and will be shipped soon.' },
            'shipped': { subject: '📦 Your Order Has Been Shipped!', message: 'Great news! Your order has been shipped and is on the way to you.' },
            'delivered': { subject: '✅ Your Order Has Been Delivered!', message: 'Your order has been successfully delivered. Thank you for shopping with us!' },
            'cancelled': { subject: '❌ Your Order Has Been Cancelled', message: 'Your order has been cancelled. If you have any questions, please contact us.' }
          };

          const statusInfo = statusMessages[status] || { subject: `Order Status Updated: ${status}`, message: 'Your order status has been updated.' };
          const html = getStatusEmailHTML(statusInfo, order, status);

          let buffer = null;
          // If the order is delivered, generate the invoice PDF
          if (status === 'delivered') {
            try {
              buffer = await generateInvoiceBuffer(order);
              console.log(`📎 Generated invoice PDF for order ${order._id}`);
            } catch (pdfErr) {
              console.error('❌ Error generating invoice PDF:', pdfErr.message);
            }
          }

          await sendStatusEmail(order, status, html, buffer);
          console.log(`✅ Status email sent via SendGrid to ${order.deliveryEmail}`);
        } catch (e) {
          console.error('❌ Status email failed:', e.message);
        }
      }

      return res.json({ success: true, order });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(200);
      return res.json({ success: true, users });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Admin: Resync CSV to database
  app.post('/api/admin/plants/resync-csv', requireAdmin, async (req, res) => {
    try {
      const result = await resyncCSV();
      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  });

  // Admin: Get all plants (for management)
  app.get('/api/admin/plants', requireAdmin, async (req, res) => {
    try {
      const plants = await Plant.find().sort({ createdAt: -1 }).limit(200);
      return res.json({ success: true, plants });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Admin: Create/Add a plant manually (non-CSV)
  app.post('/api/admin/plants', requireAdmin, async (req, res) => {
    try {
      const { name, category, salePrice, oldPrice, description, imageUrl } = req.body;

      if (!name || !category || !salePrice) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const plant = new Plant({
        name,
        category,
        salePrice,
        oldPrice,
        description,
        imageUrl,
        syncedFrom: 'manual'
      });

      await plant.save();
      return res.json({ success: true, message: 'Plant added', plant });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  });

  // Admin: Update a plant
  app.post('/api/admin/plants/:id/update', requireAdmin, async (req, res) => {
    try {
      const { name, category, salePrice, oldPrice, description, imageUrl } = req.body;
      const plant = await Plant.findById(req.params.id);

      if (!plant) return res.status(404).json({ success: false, message: 'Plant not found' });

      // Only allow updating manual plants, not CSV synced ones
      if (plant.syncedFrom === 'csv') {
        return res.status(403).json({ success: false, message: 'Cannot edit CSV synced plants. Update the CSV file and resync.' });
      }

      if (name) plant.name = name;
      if (category) plant.category = category;
      if (salePrice) plant.salePrice = salePrice;
      if (oldPrice !== undefined) plant.oldPrice = oldPrice;
      if (description) plant.description = description;
      if (imageUrl) plant.imageUrl = imageUrl;

      await plant.save();
      return res.json({ success: true, message: 'Plant updated', plant });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  });

  // Admin: Delete a plant
  app.post('/api/admin/plants/:id/delete', requireAdmin, async (req, res) => {
    try {
      const plant = await Plant.findById(req.params.id);

      if (!plant) return res.status(404).json({ success: false, message: 'Plant not found' });

      // Only allow deleting manual plants, not CSV synced ones
      if (plant.syncedFrom === 'csv') {
        return res.status(403).json({ success: false, message: 'Cannot delete CSV synced plants. Update the CSV file and resync.' });
      }

      await Plant.findByIdAndDelete(req.params.id);
      return res.json({ success: true, message: 'Plant deleted' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  });

  // Admin: list messages
  app.get('/api/admin/messages', requireAdmin, async (req, res) => {
    try {
      const messages = await Message.find().sort({ createdAt: -1 }).limit(500);
      return res.json({ success: true, messages });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Admin: get single message
  app.get('/api/admin/messages/:id', requireAdmin, async (req, res) => {
    try {
      const m = await Message.findById(req.params.id);
      if (!m) return res.status(404).json({ success: false, message: 'Message not found' });
      return res.json({ success: true, message: m });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Admin: mark message as read/unread or delete
  app.post('/api/admin/messages/:id/mark-read', requireAdmin, async (req, res) => {
    try {
      const { read } = req.body;
      const m = await Message.findById(req.params.id);
      if (!m) return res.status(404).json({ success: false, message: 'Message not found' });
      m.read = !!read;
      await m.save();
      return res.json({ success: true, message: m });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.post('/api/admin/messages/:id/delete', requireAdmin, async (req, res) => {
    try {
      const m = await Message.findById(req.params.id);
      if (!m) return res.status(404).json({ success: false, message: 'Message not found' });
      await m.remove();
      return res.json({ success: true, message: 'Deleted' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Legacy Razorpay endpoint removed. Use `/api/orders/:id/confirm-payment` to mark orders paid

  // Confirm payment for an order (protected) - mock endpoint to mark order as paid
  app.post('/api/orders/:id/confirm-payment', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ success: false, message: 'Missing token' });
      const token = auth.split(' ')[1];
      const data = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(data.id);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (order.user.toString() !== user._id.toString()) return res.status(403).json({ success: false, message: 'Forbidden' });

      order.paymentStatus = 'paid';
      order.status = 'processing';
      await order.save();

      return res.json({ success: true, orderId: order._id, order });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });



  const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    stopWatchingCSVFile();
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    stopWatchingCSVFile();
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

start();
