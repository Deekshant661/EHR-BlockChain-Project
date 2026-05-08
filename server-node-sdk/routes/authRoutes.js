'use strict';

const express = require('express');
const router = express.Router();
const { signup, login, verifyEmail, resendOtp } = require('../controllers/authController');

// POST /api/auth/signup       — Register user + send OTP (no JWT yet)
router.post('/signup', signup);

// POST /api/auth/login        — Authenticate (blocks unverified users)
router.post('/login', login);

// POST /api/auth/verify-email — Validate OTP → issue JWT
router.post('/verify-email', verifyEmail);

// POST /api/auth/resend-otp   — Generate & send new OTP
router.post('/resend-otp', resendOtp);

module.exports = router;
