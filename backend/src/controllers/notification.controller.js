const prisma = require('../config/db');

// GET /notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const where = { userId };
    if (unreadOnly === 'true') where.isRead = false;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return res.status(200).json({ notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// PUT /notifications/:id/read
const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to mark notification' });
  }
};

// PUT /notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    return res.status(200).json({ message: 'All marked read' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to mark all notifications' });
  }
};

module.exports = { getNotifications, markRead, markAllRead };
