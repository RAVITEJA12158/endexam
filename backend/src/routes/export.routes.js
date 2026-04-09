const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { exportCSV } = require('../controllers/export.controller');

router.use(authenticate);

router.get('/csv', exportCSV);

module.exports = router;
