const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getGroups, getGroupMessages, sendGroupMessage } = require('../controllers/group.controller');

router.use(authenticate);

router.get('/', getGroups);
router.get('/:groupId/messages', getGroupMessages);
router.post('/:groupId/messages', sendGroupMessage);

module.exports = router;
