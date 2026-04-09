const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  getSettlementsIOwe,
  getSettlementsOwedToMe,
  paySettlement,
  markPaid,
} = require('../controllers/settlement.controller');

router.use(authenticate);

router.get('/owe', getSettlementsIOwe);
router.get('/owed', getSettlementsOwedToMe);
router.post('/:splitId/pay', paySettlement);
router.post('/:splitId/mark-paid', markPaid);

module.exports = router;
