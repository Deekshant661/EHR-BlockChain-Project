Act as a Senior Full-Stack Security Architect for a production-style Hyperledger Fabric healthcare platform.

We already have a fully functional system with:

* React frontend (`client-ui/`)
* Node.js + Express backend (`server-node-sdk/`)
* JWT authentication
* SQLite user database
* Hyperledger Fabric integration
* RBAC middleware
* role-based dashboards
* protected APIs
* patient consent workflows

We now want to implement COMPLETE email verification using OTP before allowing login access.

IMPORTANT:
This feature must integrate with BOTH:

* backend authentication flow
* frontend signup/login flow

DO NOT redesign the existing authentication architecture.
Extend the current system cleanly.

---

# PRIMARY GOAL

Implement:

* email verification during signup
* OTP-based verification
* verified-account enforcement
* frontend OTP verification flow
* resend OTP functionality
* secure verification lifecycle

Users must NOT be able to log in until their email is verified.

---

# IMPLEMENTATION REQUIREMENTS

## Backend Stack

Backend already uses:

* Express.js
* SQLite
* JWT
* bcrypt
* MVC architecture

Use:

* nodemailer
* Gmail App Password SMTP

DO NOT use:

* Firebase Auth
* OAuth
* Passport.js
* third-party authentication providers

---

# DATABASE CHANGES

Update SQLite Users table.

Add fields:

isVerified BOOLEAN DEFAULT 0
verificationCode TEXT
verificationExpires DATETIME

IMPORTANT:
Ensure migration logic safely updates existing databases using ALTER TABLE ... ADD COLUMN.

Wrap the ALTER statements in try/catch blocks so the server doesn't crash if the columns already exist.

Do NOT drop the table.
Do NOT delete existing users.

---

# EMAIL VERIFICATION FLOW

## Signup Flow

Current signup:
POST `/api/auth/signup`

Updated behavior:

1. Validate input
2. Hash password
3. Create user with:

   * isVerified = false
4. Generate 6-digit OTP
5. Store OTP + expiration
6. Send verification email
7. Return:
   {
   success: true,
   requiresVerification: true,
   email: "[user@email.com](mailto:user@email.com)"
   }

IMPORTANT:
Do NOT issue JWT during signup anymore.
JWT should ONLY be issued AFTER email verification.

---

# OTP RULES

* 6-digit numeric OTP
* expires in 10 minutes
* regenerate on resend
* overwrite old OTP on resend
* do NOT log OTPs to console in production mode

---

# NEW BACKEND ENDPOINTS

## POST `/api/auth/verify-email`

Request:
{
"email": "",
"otp": ""
}

Behavior:

* validate OTP
* validate expiration
* mark user verified
* clear OTP fields
* generate JWT
* return authenticated session

Successful response:
{
"success": true,
"data": {
"token": "...",
"user": { ... }
}
}

---

## POST `/api/auth/resend-otp`

Request:
{
"email": ""
}

Behavior:

* generate new OTP
* overwrite old OTP
* send new email
* reset expiration

---

# LOGIN FLOW CHANGES

Current login:
POST `/api/auth/login`

NEW RULE:
If user.isVerified === false:

Return:
{
"success": false,
"requiresVerification": true,
"message": "Email verification required"
}

Do NOT generate JWT for unverified users.

---

# EMAIL SENDING REQUIREMENTS

Use:

* nodemailer
* Gmail SMTP
* environment variables

Add to `.env`:

EMAIL_USER=
EMAIL_APP_PASSWORD=

DO NOT hardcode credentials.

---

# EMAIL TEMPLATE

Create a professional healthcare-style email template.

Subject:
Verify Your EHR Account

Body should include:

* OTP code
* expiration notice
* healthcare branding tone
* security warning if user did not initiate signup

Use clean HTML email formatting.

---

# FRONTEND CHANGES (`client-ui/`)

Update the React frontend to support verification flow.

---

# NEW PAGE

Create:

`pages/VerifyOtpPage.jsx`

Features:

* OTP input
* verify button
* resend OTP button
* loading states
* countdown timer
* error handling
* success redirect

Route:
`/verify-email`

---

# UPDATED SIGNUP FLOW

Current:
signup → dashboard

NEW:
signup → verify-email page

Flow:

1. User signs up
2. Backend sends OTP
3. Frontend redirects:
   `/verify-email?email=user@email.com`
4. User enters OTP
5. Backend verifies
6. JWT returned
7. Store JWT
8. Redirect dashboard

---

# UPDATED LOGIN FLOW

If login response returns:
{
requiresVerification: true
}

Frontend should:

* redirect to verify page
* preserve email
* show verification-required message

---

# AUTH CONTEXT UPDATES

Update `AuthContext.jsx` to support:

* verification-required state
* post-verification login
* OTP verification flow

---

# SECURITY REQUIREMENTS

* Never expose SMTP credentials
* Never store plaintext OTP history
* OTP must expire
* Clear verificationCode after success
* Rate-limit resend endpoint if possible
* Use bcrypt as-is for passwords
* Maintain JWT architecture

---

# BACKEND COMPATIBILITY

Maintain compatibility with:

* existing JWT middleware
* existing RBAC middleware
* existing Hyperledger onboarding
* existing SQLite architecture
* existing dashboards

Do NOT break existing blockchain flows.

---

# UI REQUIREMENTS

Maintain existing frontend style:

* purple healthcare/cybersecurity theme
* dark UI
* responsive design
* modern dashboard styling

OTP page should visually match the rest of the application.

---

# TESTING REQUIREMENTS

After implementation:

1. Test signup flow
2. Verify OTP email delivery
3. Test invalid OTP
4. Test expired OTP
5. Test resend OTP
6. Test login restriction before verification
7. Test successful verification
8. Test JWT generation after verification
9. Test redirect to correct dashboard
10. Test persistence after refresh

Provide:

* full testing walkthrough
* environment setup instructions
* Gmail App Password setup instructions

---

# REVIEW-DRIVEN DEVELOPMENT

Before modifying files:

1. Show updated auth flow
2. Show DB schema changes
3. Show new routes/endpoints
4. Show frontend flow
5. Show OTP lifecycle
6. Explain nodemailer setup

Then begin implementation.
