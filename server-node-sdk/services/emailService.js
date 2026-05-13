'use strict';

const nodemailer = require('nodemailer');

// ─── SMTP Transport ──────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
});

/**
 * Send OTP verification email with healthcare-branded HTML template.
 * @param {string} toEmail – Recipient email
 * @param {string} otp – 6-digit verification code
 * @param {string} userName – User's display name
 */
const sendVerificationEmail = async (toEmail, otp, userName = 'User') => {
    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
            <tr>
                <td align="center">
                    <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;border:1px solid rgba(139,92,246,0.2);overflow:hidden;">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:30px 40px;text-align:center;">
                                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
                                    🏥 EHR Blockchain
                                </h1>
                                <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">
                                    Secure Health Records on Hyperledger Fabric
                                </p>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:40px;">
                                <h2 style="margin:0 0 8px;color:#ffffff;font-size:20px;font-weight:700;">
                                    Verify Your Email
                                </h2>
                                <p style="margin:0 0 24px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;">
                                    Hello <strong style="color:#a78bfa;">${userName}</strong>, use the verification code below to complete your account registration.
                                </p>

                                <!-- OTP Code -->
                                <div style="background:rgba(139,92,246,0.1);border:2px solid rgba(139,92,246,0.3);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                                    <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:2px;">
                                        Your Verification Code
                                    </p>
                                    <p style="margin:0;color:#a78bfa;font-size:36px;font-weight:900;letter-spacing:8px;font-family:monospace;">
                                        ${otp}
                                    </p>
                                </div>

                                <p style="margin:0 0 24px;color:rgba(255,255,255,0.4);font-size:13px;line-height:1.6;">
                                    ⏱️ This code expires in <strong style="color:#fbbf24;">10 minutes</strong>.
                                </p>

                                <!-- Security Warning -->
                                <div style="background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;border-radius:0 8px 8px 0;padding:12px 16px;">
                                    <p style="margin:0;color:rgba(255,255,255,0.5);font-size:12px;line-height:1.5;">
                                        🔒 <strong style="color:#fca5a5;">Security Notice:</strong> If you did not create an account on EHR Blockchain, please ignore this email. Do not share this code with anyone.
                                    </p>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding:20px 40px 30px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
                                <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;">
                                    EHR Blockchain System — Hyperledger Fabric + Node.js
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"EHR Blockchain" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Verify Your EHR Account',
        html: htmlBody,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Verification email sent to ${toEmail} (messageId=${info.messageId})`);
        return true;
    } catch (err) {
        console.error(`[Email] Failed to send verification email to ${toEmail}:`, err.message);
        throw Object.assign(
            new Error('Failed to send verification email. Please check server email configuration.'),
            { statusCode: 500 }
        );
    }
};

/**
 * Send password reset OTP email with Sanchay branding.
 * @param {string} toEmail – Recipient email
 * @param {string} otp – 6-digit reset code
 * @param {string} userName – User's display name
 */
const sendPasswordResetEmail = async (toEmail, otp, userName = 'User') => {
    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
            <tr>
                <td align="center">
                    <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;border:1px solid rgba(139,92,246,0.2);overflow:hidden;">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:30px 40px;text-align:center;">
                                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
                                    🔐 Sanchay
                                </h1>
                                <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">
                                    Password Reset Request
                                </p>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:40px;">
                                <h2 style="margin:0 0 8px;color:#ffffff;font-size:20px;font-weight:700;">
                                    Reset Your Password
                                </h2>
                                <p style="margin:0 0 24px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;">
                                    Hello <strong style="color:#a78bfa;">${userName}</strong>, we received a request to reset your password. Use the code below to proceed.
                                </p>

                                <!-- OTP Code -->
                                <div style="background:rgba(251,191,36,0.08);border:2px solid rgba(251,191,36,0.3);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                                    <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:2px;">
                                        Password Reset Code
                                    </p>
                                    <p style="margin:0;color:#fbbf24;font-size:36px;font-weight:900;letter-spacing:8px;font-family:monospace;">
                                        ${otp}
                                    </p>
                                </div>

                                <p style="margin:0 0 24px;color:rgba(255,255,255,0.4);font-size:13px;line-height:1.6;">
                                    ⏱️ This code expires in <strong style="color:#fbbf24;">10 minutes</strong>.
                                </p>

                                <!-- Security Warning -->
                                <div style="background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;border-radius:0 8px 8px 0;padding:12px 16px;">
                                    <p style="margin:0;color:rgba(255,255,255,0.5);font-size:12px;line-height:1.5;">
                                        🔒 <strong style="color:#fca5a5;">Security Notice:</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged.
                                    </p>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding:20px 40px 30px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
                                <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;">
                                    Sanchay — Blockchain Healthcare Platform
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"Sanchay" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Reset Your Sanchay Password',
        html: htmlBody,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Password reset email sent to ${toEmail} (messageId=${info.messageId})`);
        return true;
    } catch (err) {
        console.error(`[Email] Failed to send password reset email to ${toEmail}:`, err.message);
        throw Object.assign(
            new Error('Failed to send password reset email. Please try again later.'),
            { statusCode: 500 }
        );
    }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
