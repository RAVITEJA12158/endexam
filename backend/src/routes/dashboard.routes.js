const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getSummary, getRecentTransactions } = require('../controllers/dashboard.controller');

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/recent-transactions', getRecentTransactions);

module.exports = router;
