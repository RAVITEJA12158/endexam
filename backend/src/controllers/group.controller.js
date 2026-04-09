const prisma = require('../config/db');

// GET /groups
const getGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: { user: { select: { id: true, username: true, name: true } } },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { user: { select: { id: true, username: true, name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const groups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      createdAt: m.group.createdAt,
      members: m.group.members.map((mem) => mem.user),
      lastMessage: m.group.messages[0]
        ? {
            message: m.group.messages[0].message,
            user: m.group.messages[0].user,
            createdAt: m.group.messages[0].createdAt,
          }
        : null,
    }));

    return res.status(200).json({ groups });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

// GET /groups/:groupId/messages
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

    // Verify membership
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) return res.status(403).json({ error: 'Not a member of this group' });

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));

    const messages = await prisma.groupMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
    });

    return res.status(200).json({ messages: messages.reverse() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// POST /groups/:groupId/messages
const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { message, expenseId } = req.body;

    if (!message && !expenseId) {
      return res.status(400).json({ error: 'Message or expenseId is required' });
    }

    // Verify membership
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) return res.status(403).json({ error: 'Not a member of this group' });

    const msg = await prisma.groupMessage.create({
      data: { groupId, userId, message: message || null, expenseId: expenseId || null },
      include: { user: { select: { id: true, username: true, name: true } } },
    });

    // Emit via socket
    const io = req.app.get('io');
    io.to(`group:${groupId}`).emit('group:message', {
      message: msg,
      user: msg.user,
      groupId,
    });

    return res.status(201).json(msg);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};

module.exports = { getGroups, getGroupMessages, sendGroupMessage };
