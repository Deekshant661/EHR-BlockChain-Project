'use strict';

const express = require('express');
const router = express.Router();
const { enroll, getUserDirectory } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// POST /api/users/enroll
router.post('/enroll', enroll);

// GET /api/users/directory — Admin-only user list with isSynthetic flags
router.get('/directory', verifyToken, requireRole(['hospital', 'insuranceAdmin']), getUserDirectory);

module.exports = router;
