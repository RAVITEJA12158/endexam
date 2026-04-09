const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getSharedExpenses, getSharedExpenseById } = require('../controllers/sharedExpense.controller');

router.use(authenticate);

router.get('/', getSharedExpenses);
router.get('/:id', getSharedExpenseById);

module.exports = router;
