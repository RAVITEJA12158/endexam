const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const initSocket = (io) => {
  // ─── Authentication middleware ──────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error: No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, name: true },
      });
      if (!user) return next(new Error('Authentication error: User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`🔌 Socket connected: ${socket.user.username} (${socket.id})`);

    // Join personal room
    socket.join(`user:${userId}`);

    // Join all group rooms this user belongs to
    try {
      const memberships = await prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      });
      for (const m of memberships) {
        socket.join(`group:${m.groupId}`);
      }
    } catch (err) {
      console.error('Error joining group rooms:', err);
    }

    // ─── Client → Server: join a specific group room ────────────────────────
    socket.on('group:join', async ({ groupId }) => {
      try {
        const member = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } },
        });
        if (member) {
          socket.join(`group:${groupId}`);
          console.log(`📁 ${socket.user.username} joined group room ${groupId}`);
        }
      } catch (err) {
        console.error('Error joining group:', err);
      }
    });

    // ─── Client → Server: send group message ────────────────────────────────
    socket.on('group:message', async ({ groupId, message, expenseId }) => {
      try {
        // Verify membership
        const member = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } },
        });
        if (!member) return;

        const msg = await prisma.groupMessage.create({
          data: {
            groupId,
            userId,
            message,
            expenseId: expenseId || null,
          },
          include: {
            user: { select: { id: true, username: true, name: true } },
          },
        });

        io.to(`group:${groupId}`).emit('group:message', {
          message: msg,
          user: msg.user,
          groupId,
        });
      } catch (err) {
        console.error('Error sending group message:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.user.username}`);
    });
  });
};

module.exports = { initSocket };
