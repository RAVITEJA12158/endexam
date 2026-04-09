const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { register, login, getMe, updateMe, changePassword } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.put('/me/password', authenticate, changePassword);

module.exports = router;
