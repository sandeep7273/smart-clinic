const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');

// Register route
router
    .post('/register', authController.register)
    .post('/login', authController.login);

module.exports = router;