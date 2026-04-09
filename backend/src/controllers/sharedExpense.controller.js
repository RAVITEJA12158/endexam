const prisma = require('../config/db');

// GET /shared-expenses
const getSharedExpenses = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all shared expenses where this user is either payer or in splits
    const sharedExpenses = await prisma.sharedExpense.findMany({
      where: {
        OR: [
          { paidById: userId },
          { splits: { some: { userId } } },
        ],
      },
      include: {
        expense: {
          include: { category: { select: { id: true, name: true } } },
        },
        group: { select: { id: true, name: true } },
        paidBy: { select: { id: true, username: true, name: true } },
        splits: {
          include: { user: { select: { id: true, username: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = sharedExpenses.map((se) => ({
      ...se,
      mySplit: se.splits.find((s) => s.userId === userId) || null,
    }));

    return res.status(200).json({ sharedExpenses: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch shared expenses' });
  }
};

// GET /shared-expenses/:id
const getSharedExpenseById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const sharedExpense = await prisma.sharedExpense.findUnique({
      where: { id },
      include: {
        expense: {
          include: {
            category: true,
            transactions: {
              include: { user: { select: { id: true, username: true, name: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        group: {
          include: {
            members: { include: { user: { select: { id: true, username: true, name: true } } } },
          },
        },
        paidBy: { select: { id: true, username: true, name: true } },
        splits: {
          include: {
            user: { select: { id: true, username: true, name: true } },
            transactions: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    if (!sharedExpense) return res.status(404).json({ error: 'Shared expense not found' });

    // Verify user is part of this shared expense
    const isMember =
      sharedExpense.paidById === userId ||
      sharedExpense.splits.some((s) => s.userId === userId);

    if (!isMember) return res.status(403).json({ error: 'Forbidden' });

    return res.status(200).json(sharedExpense);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch shared expense' });
  }
};

module.exports = { getSharedExpenses, getSharedExpenseById };
