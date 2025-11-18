const express = require('express');
const router = express.Router();
const { validateRegister, validateLogin, validateRefreshToken } = require('../middlewares/validator.middleware');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth.middleware');
// Register route
router
    .post('/register', validateRegister, authController.register)
    .post('/login', validateLogin, authController.login)
    .post('/refresh-token', validateRefreshToken, authController.refreshToken)
    .post('/logout', authenticate, authController.logout)
    .get('/profile', authenticate, authController.getProfile)

module.exports = router;  