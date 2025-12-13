# 🔐 OTP Authentication System - User Guide

## Overview

Your application now has a complete **One-Time Password (OTP)** authentication system for both user signup and password recovery.

### Two OTP Flows

1. **Signup with OTP** - Create new account
2. **Forgot Password with OTP** - Reset forgotten password

---

## 🚀 Getting Started

### 1. Start the Backend Server
```bash
cd server
npm run dev
```
Expected output:
```
✅ Mail transporter initialized - Host: smtp.gmail.com, Port: 465, Secure: true
Server listening on port 4000
```

### 2. Start the Frontend
```bash
# In a new terminal
npm run dev
```
Expected output:
```
VITE v7.2.4  ready in 563 ms
➜  Local:   http://localhost:5173/
```

### 3. Access the App
Open `http://localhost:5173` in your browser

---

## 📱 Signup with OTP (Step-by-Step)

### Step 1: Enter Email
1. Click the **"Sign Up"** button on the navbar
2. Enter your email address
3. Click **"Create Account"**

### Step 2: Verify Email
- An OTP will be sent to your email
- **For Development Testing**: Check the server console logs for the OTP

### Step 3: Enter OTP
1. A new screen will appear asking for OTP
2. Enter the OTP from your email (or from server logs in dev mode)
3. Enter your full name
4. Enter a password (min. 8 characters recommended)
5. Click **"Verify OTP"**

### Step 4: Account Created ✅
- Your account is immediately created
- You're automatically logged in
- Redirected to the home page

---

## 🔑 Forgot Password with OTP (Step-by-Step)

### Step 1: Click Forgot Password
1. On the login screen, click **"Forgot Password?"**
2. Enter your registered email address
3. Click **"Send reset code"**

### Step 2: Receive OTP
- An OTP will be sent to your email
- **For Development Testing**: Check server logs for the OTP

### Step 3: Reset Password
1. Enter the OTP you received
2. Enter your new password
3. Click **"Verify OTP"**

### Step 4: Login with New Password ✅
- Password has been reset
- Use your new password to login

---

## 🧪 Testing the System

### Automatic Test Scripts

Run these commands to test the complete flow:

```bash
# Test 1: Complete signup flow
node test-complete-signup.js

# Test 2: Forgot password flow
node test-forgot-password.js
```

Expected output should show:
```
✅ OTP received
✅ OTP verified successfully!
✅ Auth token received
✅ User created
🎉 TEST PASSED!
```

---

## ⚙️ How It Works (Technical)

### OTP Generation
- 6-digit random number
- Hashed using bcrypt before storage
- Saved to MongoDB with 10-minute expiration
- Auto-deleted by MongoDB after 10 minutes

### OTP Verification
1. User receives OTP in email
2. User submits OTP through form
3. Server validates OTP against stored hash
4. If valid: User account created OR password updated
5. If invalid: Error message shown

### Security Features
- ✅ OTP never stored in plain text
- ✅ OTP automatically expires after 10 minutes
- ✅ Passwords stored as bcrypt hash
- ✅ JWT token for session management
- ✅ Email verification prevents unauthorized access

---

## 📊 API Reference

### Signup Flow

#### Request OTP
```
POST /api/request-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

Response:
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "email": "user@example.com",
  "debugOtp": "123456"  // Only in development
}
```

#### Verify OTP & Create Account
```
POST /api/verify-otp-signup
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "name": "John Doe",
  "password": "secure_password"
}
```

Response:
```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Password Reset Flow

#### Request Reset OTP
```
POST /api/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Verify and Reset Password
```
POST /api/verify-reset-token
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "123456",
  "newPassword": "new_password"
}
```

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# SMTP Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=[Your SendGrid API Key]

# Authentication
JWT_SECRET=your-secret-key

# Database
MONGO_URI=mongodb+srv://contactjivaleaf_db_user:mpdmjvqtTZVabjih@plant.3drbi9h.mongodb.net/plantdb?retryWrites=true&w=majority&appName=Plant
```

### Setting Up Gmail SMTP (Optional)

If you want to actually send emails:

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Windows Computer"
3. Generate an app password (16 characters)
4. Add spaces in groups of 4: `xxxx xxxx xxxx xxxx`
5. Copy to `.env` as `SMTP_PASS` (without spaces: `xxxxxxxxxxxxxxxx`)

---

## 🐛 Troubleshooting

### Issue: "Network error while sending OTP"

**Cause**: Email sending failed (common in development)

**Solution**: Check server logs for the generated OTP:
```
🔐 Generated OTP for user@example.com: 123456
```

Use this OTP in the frontend.

### Issue: "Invalid OTP"

**Cause**: OTP doesn't match or has expired

**Solution**:
1. Request a new OTP (valid for 10 minutes)
2. Check server logs for the latest OTP
3. Enter the correct OTP

### Issue: "Email already registered"

**Cause**: Trying to signup with an existing email

**Solution**:
1. Use a different email for signup
2. Or use "Forgot Password" to reset existing account

### Issue: "No account found with this email"

**Cause**: Trying to reset password for non-existent email

**Solution**: First create an account with that email

---

## 📝 Development Notes

### OTP in Development Mode

When `NODE_ENV` is not set to `production`:
- OTP is returned in API response as `debugOtp`
- OTP is logged in server console
- Allows testing without email setup

### Server Logs

Look for these patterns in server logs:

```
🔄 OTP requested for signup - Email: ...
🔐 Generated OTP for signup ...: 123456
✅ OTP saved to database for signup ...
✅ User created successfully via OTP: ...
```

---

## 🚀 Production Deployment

Before deploying to production:

1. **Set NODE_ENV**:
   ```env
   NODE_ENV=production
   ```

2. **Update SMTP credentials**:
   - Use valid Gmail app password
   - Or configure your own SMTP server

3. **Secure JWT secret**:
   - Use a strong, random string
   - Store in environment variables only

4. **Database backup**:
   - MongoDB with OTP collection
   - TTL index auto-deletes expired OTPs

5. **HTTPS required**:
   - All API calls must be HTTPS
   - JWT tokens transmitted securely

---

## 📞 Support

For issues or questions:

1. Check server logs: `console` output
2. Verify environment variables in `.env`
3. Ensure MongoDB is running
4. Check network tab in browser DevTools

---

## ✨ Features Summary

✅ **Secure OTP Generation**: 6-digit random OTP  
✅ **Automatic Expiration**: OTPs expire after 10 minutes  
✅ **Email Verification**: Optional (has dev fallback)  
✅ **Immediate Login**: No need to login after signup  
✅ **Password Security**: bcrypt hashing  
✅ **Session Management**: JWT tokens  
✅ **Error Handling**: User-friendly error messages  
✅ **Development Mode**: OTP in response for testing  

---

## 🎉 You're All Set!

Your OTP authentication system is ready to use. Start creating accounts and resetting passwords!
