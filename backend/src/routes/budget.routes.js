const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getBudgets, setBudget, deleteBudget } = require('../controllers/budget.controller');

router.use(authenticate);

router.get('/', getBudgets);
router.post('/', setBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
