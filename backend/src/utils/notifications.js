const prisma = require('../config/db');

/**
 * Creates a notification in DB and emits it via socket to the recipient.
 */
const createNotification = async (io, { userId, type, title, body, data = null }) => {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, data },
  });

  if (io) {
    io.to(`user:${userId}`).emit('notification:new', { notification });
  }

  return notification;
};

module.exports = { createNotification };
