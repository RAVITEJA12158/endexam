const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  getFriends,
  getIncomingRequests,
  getSentRequests,
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
  searchUsers,
} = require('../controllers/friend.controller');

router.use(authenticate);

router.get('/', getFriends);
router.get('/requests', getIncomingRequests);
router.get('/sent', getSentRequests);
router.get('/search', searchUsers);
router.post('/request', sendRequest);
router.put('/request/:friendshipId/accept', acceptRequest);
router.put('/request/:friendshipId/reject', rejectRequest);
router.delete('/:friendId', removeFriend);

module.exports = router;
