const prisma = require('../config/db');
const { createNotification } = require('../utils/notifications');

// GET /friends
const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, username: true, name: true, email: true } },
        receiver: { select: { id: true, username: true, name: true, email: true } },
      },
    });

    const friends = friendships.map((f) => {
      return f.senderId === userId ? f.receiver : f.sender;
    });

    return res.status(200).json({ friends });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch friends' });
  }
};

// GET /friends/requests
const getIncomingRequests = async (req, res) => {
  try {
    const requests = await prisma.friendship.findMany({
      where: { receiverId: req.user.id, status: 'PENDING' },
      include: {
        sender: { select: { id: true, username: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      requests: requests.map((r) => ({
        id: r.id,
        sender: r.sender,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

// GET /friends/sent
const getSentRequests = async (req, res) => {
  try {
    const sent = await prisma.friendship.findMany({
      where: { senderId: req.user.id, status: 'PENDING' },
      include: {
        receiver: { select: { id: true, username: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      sent: sent.map((r) => ({
        id: r.id,
        receiver: r.receiver,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch sent requests' });
  }
};

// POST /friends/request
const sendRequest = async (req, res) => {
  try {
    const { identifier } = req.body;
    const senderId = req.user.id;

    if (!identifier) {
      return res.status(400).json({ error: 'Identifier (username or email) is required' });
    }

    const target = await prisma.user.findFirst({
      where: { OR: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }] },
      select: { id: true, username: true, name: true },
    });

    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === senderId) return res.status(400).json({ error: 'Cannot send friend request to yourself' });

    // Check existing friendship in either direction
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId: target.id },
          { senderId: target.id, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') return res.status(409).json({ error: 'Already friends' });
      if (existing.status === 'PENDING') return res.status(409).json({ error: 'Friend request already sent' });
    }

    const friendship = await prisma.friendship.create({
      data: { senderId, receiverId: target.id },
    });

    const io = req.app.get('io');
    await createNotification(io, {
      userId: target.id,
      type: 'FRIEND_REQUEST',
      title: 'New Friend Request',
      body: `${req.user.name || req.user.username} sent you a friend request.`,
      data: { friendshipId: friendship.id, senderName: req.user.name || req.user.username },
    });

    return res.status(201).json({ message: 'Friend request sent', friendship });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send friend request' });
  }
};

// PUT /friends/request/:friendshipId/accept
const acceptRequest = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const userId = req.user.id;

    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) return res.status(404).json({ error: 'Request not found' });
    if (friendship.receiverId !== userId) return res.status(403).json({ error: 'Not authorized' });
    if (friendship.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

    await prisma.friendship.update({ where: { id: friendshipId }, data: { status: 'ACCEPTED' } });

    const io = req.app.get('io');
    await createNotification(io, {
      userId: friendship.senderId,
      type: 'FRIEND_ACCEPTED',
      title: 'Friend Request Accepted',
      body: `${req.user.name || req.user.username} accepted your friend request.`,
      data: { friendshipId, receiverName: req.user.name || req.user.username },
    });

    return res.status(200).json({ message: 'Friend request accepted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to accept request' });
  }
};

// PUT /friends/request/:friendshipId/reject
const rejectRequest = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const userId = req.user.id;

    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) return res.status(404).json({ error: 'Request not found' });
    if (friendship.receiverId !== userId) return res.status(403).json({ error: 'Not authorized' });

    await prisma.friendship.update({ where: { id: friendshipId }, data: { status: 'REJECTED' } });

    return res.status(200).json({ message: 'Request rejected' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reject request' });
  }
};

// DELETE /friends/:friendId
const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    if (!friendship) return res.status(404).json({ error: 'Friendship not found' });

    await prisma.friendship.delete({ where: { id: friendship.id } });
    return res.status(200).json({ message: 'Friend removed' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove friend' });
  }
};

// GET /friends/search?q=
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;

    if (!q || q.trim().length < 1) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [
          { username: { contains: q.toLowerCase(), mode: 'insensitive' } },
          { email: { contains: q.toLowerCase(), mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, name: true, email: true },
      take: 20,
    });

    // Get all friendships involving this user
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    });

    const result = users.map((u) => {
      const fs = friendships.find(
        (f) => f.senderId === u.id || f.receiverId === u.id
      );
      return {
        ...u,
        isFriend: fs?.status === 'ACCEPTED',
        requestSent: fs?.status === 'PENDING' && fs?.senderId === userId,
        requestReceived: fs?.status === 'PENDING' && fs?.receiverId === userId,
        friendshipId: fs?.id || null,
      };
    });

    return res.status(200).json({ users: result });
  } catch (err) {
    return res.status(500).json({ error: 'Search failed' });
  }
};

module.exports = { getFriends, getIncomingRequests, getSentRequests, sendRequest, acceptRequest, rejectRequest, removeFriend, searchUsers };
