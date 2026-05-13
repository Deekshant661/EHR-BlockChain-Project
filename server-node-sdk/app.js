'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');

// ─── Internal Modules ────────────────────────────────────────────────────────
const { initDatabase } = require('./db/database');
const { bootstrapAdmins } = require('./services/adminBootstrap');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const ehrRoutes = require('./routes/ehrRoutes');
const fileRoutes = require('./routes/fileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const auditRoutes = require('./routes/auditRoutes');
const { globalErrorHandler } = require('./middleware/errorHandler');

// ─── Express App ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(cors());

// ─── Initialize SQLite ───────────────────────────────────────────────────────
initDatabase();

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/status', (req, res) => {
    res.json({ success: true, data: { message: 'Server is up.' } });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);   // POST /api/auth/signup, /api/auth/login
app.use('/api/users', userRoutes);   // POST /api/users/enroll (legacy/direct)
app.use('/api/ehr', ehrRoutes);    // POST /api/ehr/<chaincode-function> (JWT protected)
app.use('/api/files', fileRoutes);   // POST /api/files/upload, /api/files/getByPatient (JWT + RBAC)
app.use('/api/admin', adminRoutes);  // GET  /api/admin/analytics/* (Admin analytics)
app.use('/api/audit', auditRoutes);  // GET  /api/audit/recent (Admin audit feed)

// ─── Global Error Handler (must be registered last) ──────────────────────────
app.use(globalErrorHandler);

// ─── Server Startup ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

bootstrapAdmins()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`\n🚀 EHR Blockchain Server running on port ${PORT}`);
            console.log(`   Health:  GET  http://localhost:${PORT}/status`);
            console.log(`   Signup:  POST http://localhost:${PORT}/api/auth/signup`);
            console.log(`   Login:   POST http://localhost:${PORT}/api/auth/login`);
            console.log(`   EHR API: POST http://localhost:${PORT}/api/ehr/<function> (JWT required)`);
            console.log(`   Files:   POST http://localhost:${PORT}/api/files/upload (JWT + RBAC)\n`);
        });
    })
    .catch((err) => {
        console.error('[Startup] Admin bootstrap failed:', err.message);
        console.warn('[Startup] Starting server without admin auto-enrollment...');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n⚠️  EHR Server running on port ${PORT} (admin bootstrap skipped)\n`);
        });
    });