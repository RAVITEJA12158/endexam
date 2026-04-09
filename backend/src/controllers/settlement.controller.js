const prisma = require('../config/db');
const { createNotification } = require('../utils/notifications');
const { updateBudgetSpent } = require('../utils/budget');
const { VALID_PAYMENT_MODES } = require('../utils/validators');

// GET /settlements/owe  — splits where logged-in user owes money
const getSettlementsIOwe = async (req, res) => {
  try {
    const userId = req.user.id;

    const splits = await prisma.expenseSplit.findMany({
      where: {
        userId,
        status: { not: 'PAID' },
        sharedExpense: { paidById: { not: userId } },
      },
      include: {
        sharedExpense: {
          select: {
            id: true,
            title: true,
            paidBy: { select: { id: true, username: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const settlements = splits.map((s) => ({
      splitId: s.id,
      owedAmount: s.owedAmount,
      paidAmount: s.paidAmount,
      remainingAmount: parseFloat((s.owedAmount - s.paidAmount).toFixed(2)),
      status: s.status,
      sharedExpense: { id: s.sharedExpense.id, title: s.sharedExpense.title },
      owedTo: s.sharedExpense.paidBy,
    }));

    const totalOwed = settlements.reduce((sum, s) => sum + s.remainingAmount, 0);

    return res.status(200).json({ settlements, totalOwed: parseFloat(totalOwed.toFixed(2)) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch settlements' });
  }
};

// GET /settlements/owed  — splits where others owe logged-in user
const getSettlementsOwedToMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const splits = await prisma.expenseSplit.findMany({
      where: {
        userId: { not: userId },
        status: { not: 'PAID' },
        sharedExpense: { paidById: userId },
      },
      include: {
        user: { select: { id: true, username: true, name: true } },
        sharedExpense: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const settlements = splits.map((s) => ({
      splitId: s.id,
      owedAmount: s.owedAmount,
      paidAmount: s.paidAmount,
      remainingAmount: parseFloat((s.owedAmount - s.paidAmount).toFixed(2)),
      status: s.status,
      sharedExpense: { id: s.sharedExpense.id, title: s.sharedExpense.title },
      owedBy: s.user,
    }));

    const totalOwed = settlements.reduce((sum, s) => sum + s.remainingAmount, 0);

    return res.status(200).json({ settlements, totalOwed: parseFloat(totalOwed.toFixed(2)) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch settlements' });
  }
};

// POST /settlements/:splitId/pay — debtor pays their share
const paySettlement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { splitId } = req.params;
    const { amount, mode } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    if (mode && !VALID_PAYMENT_MODES.includes(mode)) {
      return res.status(400).json({ error: 'Invalid payment mode' });
    }

    const split = await prisma.expenseSplit.findUnique({
      where: { id: splitId },
      include: {
        sharedExpense: {
          include: {
            expense: { include: { category: true } },
            paidBy: { select: { id: true, username: true, name: true } },
          },
        },
      },
    });

    if (!split) return res.status(404).json({ error: 'Split not found' });
    if (split.userId !== userId) return res.status(403).json({ error: 'This is not your split' });
    if (split.status === 'PAID') return res.status(400).json({ error: 'Already fully paid' });

    const remaining = parseFloat((split.owedAmount - split.paidAmount).toFixed(2));
    const payAmount = parseFloat(parseFloat(amount).toFixed(2));

    if (payAmount > remaining) {
      return res.status(400).json({ error: `Amount ${payAmount} exceeds remaining ${remaining}` });
    }

    const newPaid = parseFloat((split.paidAmount + payAmount).toFixed(2));
    const newStatus = newPaid >= split.owedAmount ? 'PAID' : 'PARTIALLY_PAID';

    const [updatedSplit, transaction] = await prisma.$transaction([
      prisma.expenseSplit.update({
        where: { id: splitId },
        data: { paidAmount: newPaid, status: newStatus },
      }),
      prisma.transaction.create({
        data: {
          userId,
          splitId,
          amount: payAmount,
          type: 'PAYMENT',
          mode: mode || null,
        },
      }),

    ]);

    const io = req.app.get('io');

    // Notify paidBy user
    const payerName = req.user.name || req.user.username;
    await createNotification(io, {
      userId: split.sharedExpense.paidById,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      body: `${payerName} paid ${payAmount} for "${split.sharedExpense.title}"`,
      data: {
        splitId,
        amount: payAmount,
        payerName,
        expenseTitle: split.sharedExpense.title,
      },
    });

    // Emit real-time settlement update
    io.to(`user:${split.sharedExpense.paidById}`).emit('settlement:updated', {
      splitId,
      paidAmount: newPaid,
      status: newStatus,
      fromUser: { id: userId, name: payerName },
    });

    // Update budget for paying user
    await updateBudgetSpent(io, {
      userId,
      categoryId: split.sharedExpense.expense.categoryId,
      amount: payAmount,
      date: new Date(),
    });

    return res.status(200).json({
      split: updatedSplit,
      transaction,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to record payment' });
  }
};

// POST /settlements/:splitId/mark-paid — creditor marks split as paid externally
const markPaid = async (req, res) => {
  try {
    const userId = req.user.id;
    const { splitId } = req.params;

    const split = await prisma.expenseSplit.findUnique({
      where: { id: splitId },
      include: {
        sharedExpense: {
          include: { paidBy: { select: { id: true } } },
        },
        user: { select: { id: true, username: true, name: true } },
      },
    });

    if (!split) return res.status(404).json({ error: 'Split not found' });
    if (split.sharedExpense.paidById !== userId) {
      return res.status(403).json({ error: 'Only the payer can mark splits as paid' });
    }
    if (split.status === 'PAID') return res.status(400).json({ error: 'Already paid' });

    const updatedSplit = await prisma.expenseSplit.update({
      where: { id: splitId },
      data: { paidAmount: split.owedAmount, status: 'PAID' },
    });

    const io = req.app.get('io');
    const markerName = req.user.name || req.user.username;

    // Notify the debtor
    await createNotification(io, {
      userId: split.userId,
      type: 'PAYMENT_RECEIVED',
      title: 'Marked as Paid',
      body: `${markerName} marked your share of "${split.sharedExpense.title}" as paid.`,
      data: {
        splitId,
        amount: split.owedAmount,
        payerName: markerName,
        expenseTitle: split.sharedExpense.title,
      },
    });

    io.to(`user:${split.userId}`).emit('settlement:updated', {
      splitId,
      paidAmount: split.owedAmount,
      status: 'PAID',
      fromUser: { id: userId, name: markerName },
    });

    return res.status(200).json({ split: updatedSplit });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to mark as paid' });
  }
};

module.exports = { getSettlementsIOwe, getSettlementsOwedToMe, paySettlement, markPaid };