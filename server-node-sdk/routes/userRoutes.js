'use strict';

const express = require('express');
const router = express.Router();
const { enroll } = require('../controllers/userController');

// POST /api/users/enroll
router.post('/enroll', enroll);

module.exports = router;
