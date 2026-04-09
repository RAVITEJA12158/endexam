const prisma = require('../config/db');
const { validateAmount, VALID_PAYMENT_MODES } = require('../utils/validators');
const { updateBudgetSpent } = require('../utils/budget');
const { createNotification } = require('../utils/notifications');

// ─── Helper: build sort order ─────────────────────────────────────────────────
const buildSort = (sort) => {
  switch (sort) {
    case 'oldest': return { date: 'asc' };
    case 'amount_asc': return { amount: 'asc' };
    case 'amount_desc': return { amount: 'desc' };
    default: return { date: 'desc' };
  }
};

// GET /expenses
const getExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId, month, year, sort = 'newest', search, page = 1, limit = 20 } = req.query;

    const where = { userId };

    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (month || year) {
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month);
      if (m) {
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 1);
        where.date = { gte: start, lt: end };
      } else {
        const start = new Date(y, 0, 1);
        const end = new Date(y + 1, 0, 1);
        where.date = { gte: start, lt: end };
      }
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: buildSort(sort),
        skip,
        take: limitNum,
        include: {
          category: { select: { id: true, name: true } },
          sharedExpense: {
            select: {
              id: true,
              groupId: true,
              paidById: true,
              splits: { select: { userId: true, owedAmount: true, paidAmount: true, status: true } },
            },
          },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return res.status(200).json({
      expenses,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

// GET /expenses/:id
const getExpenseById = async (req, res) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        sharedExpense: {
          include: {
            splits: {
              include: { user: { select: { id: true, username: true, name: true } } },
            },
            paidBy: { select: { id: true, username: true, name: true } },
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    if (expense.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    return res.status(200).json(expense);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch expense' });
  }
};

// POST /expenses
const createExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, amount, categoryId, date, paymentMode, notes, isShared, splits } = req.body;

    // ─── Validation ─────────────────────────────────────────────────────────
    if (!title || !amount || !categoryId || !paymentMode) {
      return res.status(400).json({ error: 'title, amount, categoryId, paymentMode are required' });
    }
    if (title.length > 80) return res.status(400).json({ error: 'Title max 80 characters' });
    if (notes && notes.length > 200) return res.status(400).json({ error: 'Notes max 200 characters' });

    const amountError = validateAmount(amount);
    if (amountError) return res.status(400).json({ error: amountError });

    if (!VALID_PAYMENT_MODES.includes(paymentMode)) {
      return res.status(400).json({ error: `paymentMode must be one of: ${VALID_PAYMENT_MODES.join(', ')}` });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return res.status(400).json({ error: 'Invalid category' });

    const expenseDate = date ? new Date(date) : new Date();
    if (isNaN(expenseDate.getTime())) return res.status(400).json({ error: 'Invalid date' });

    const io = req.app.get('io');

    // ─── SHARED EXPENSE ──────────────────────────────────────────────────────
    if (isShared) {
      if (!splits || !Array.isArray(splits) || splits.length < 2) {
        return res.status(400).json({ error: 'Shared expense requires at least 2 splits' });
      }

      // Validate split sum equals total
      const totalSplit = splits.reduce((sum, s) => sum + parseFloat(s.owedAmount), 0);
      if (Math.abs(totalSplit - parseFloat(amount)) > 0.01) {
        return res.status(400).json({ error: `Split amounts (${totalSplit}) must equal expense amount (${amount})` });
      }

      // Verify all split users exist and are friends (except payer themselves)
      const splitUserIds = splits.map((s) => s.userId);
      const nonPayerIds = splitUserIds.filter((id) => id !== userId);

      if (!splitUserIds.includes(userId)) {
        return res.status(400).json({ error: 'Payer must be included in splits' });
      }

      if (nonPayerIds.length > 0) {
        const friendships = await prisma.friendship.findMany({
          where: {
            status: 'ACCEPTED',
            OR: nonPayerIds.flatMap((fId) => [
              { senderId: userId, receiverId: fId },
              { senderId: fId, receiverId: userId },
            ]),
          },
        });
        const friendIds = new Set(
          friendships.flatMap((f) => [f.senderId, f.receiverId]).filter((id) => id !== userId)
        );
        for (const fId of nonPayerIds) {
          if (!friendIds.has(fId)) {
            return res.status(400).json({ error: `User ${fId} is not your friend` });
          }
        }
      }

      // Create in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create expense
        const expense = await tx.expense.create({
          data: {
            title, amount: parseFloat(amount), notes, date: expenseDate,
            type: 'SHARED', paymentMode, categoryId, userId,
          },
        });

        // Create group
        const group = await tx.group.create({
          data: {
            name: title,
            createdById: userId,
            members: {
              create: splitUserIds.map((uid) => ({ userId: uid })),
            },
          },
        });

        // Create shared expense
        const sharedExpense = await tx.sharedExpense.create({
          data: {
            expenseId: expense.id,
            groupId: group.id,
            paidById: userId,
            title,
          },
        });

        // Create splits
        const splitRecords = await Promise.all(
          splits.map((s) =>
            tx.expenseSplit.create({
              data: {
                sharedExpenseId: sharedExpense.id,
                userId: s.userId,
                owedAmount: parseFloat(s.owedAmount),
                paidAmount: s.userId === userId ? parseFloat(s.owedAmount) : 0,
                status: s.userId === userId ? 'PAID' : 'PENDING',
              },
            })
          )
        );

        // Create transaction record for payer
        await tx.transaction.create({
          data: { userId, expenseId: expense.id, amount: parseFloat(amount), type: 'EXPENSE', mode: paymentMode },
        });

        return { expense, group, sharedExpense, splits: splitRecords };
      });

      // Update budget for payer
      const payerSplit = splits.find((s) => s.userId === userId);
      if (payerSplit) {
        await updateBudgetSpent(io, {
          userId,
          categoryId,
          amount: parseFloat(payerSplit.owedAmount),
          date: expenseDate,
        });
      }

      // Send notifications to non-payer split members
      for (const split of result.splits.filter((s) => s.userId !== userId)) {
        await createNotification(io, {
          userId: split.userId,
          type: 'SPLIT_CREATED',
          title: 'New Shared Expense',
          body: `${req.user.name || req.user.username} added you to "${title}" — you owe ${split.owedAmount}`,
          data: {
            sharedExpenseId: result.sharedExpense.id,
            expenseTitle: title,
            owedAmount: split.owedAmount,
            paidByName: req.user.name || req.user.username,
          },
        });

        // Emit real-time event to each participant
        io.to(`user:${split.userId}`).emit('expense:shared_created', {
          sharedExpense: result.sharedExpense,
          splits: result.splits,
        });

        // Also join them to group room
        io.to(`user:${split.userId}`).emit('group:join', { groupId: result.group.id });
      }

      return res.status(201).json({
        expense: result.expense,
        group: { id: result.group.id, name: result.group.name },
        splits: result.splits,
      });
    }

    // ─── PERSONAL EXPENSE ───────────────────────────────────────────────────
    const expense = await prisma.expense.create({
      data: {
        title, amount: parseFloat(amount), notes, date: expenseDate,
        type: 'PERSONAL', paymentMode, categoryId, userId,
      },
      include: { category: true },
    });

    await prisma.transaction.create({
      data: { userId, expenseId: expense.id, amount: parseFloat(amount), type: 'EXPENSE', mode: paymentMode },
    });

    await updateBudgetSpent(io, { userId, categoryId, amount: parseFloat(amount), date: expenseDate });

    return res.status(201).json({ expense });
  } catch (err) {
    console.error('Create expense error:', err);
    return res.status(500).json({ error: 'Failed to create expense' });
  }
};

// PUT /expenses/:id
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { sharedExpense: { include: { splits: true } } },
    });

    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    if (expense.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    // Block edit if shared expense has payments
    if (expense.sharedExpense) {
      const hasPayments = expense.sharedExpense.splits.some(
        (s) => s.status !== 'PENDING' && s.userId !== userId
      );
      if (hasPayments) {
        return res.status(400).json({ error: 'Cannot edit shared expense with existing payments' });
      }
    }

    const { title, amount, categoryId, date, paymentMode, notes } = req.body;

    const data = {};
    if (title !== undefined) {
      if (title.length > 80) return res.status(400).json({ error: 'Title max 80 characters' });
      data.title = title;
    }
    if (amount !== undefined) {
      const err = validateAmount(amount);
      if (err) return res.status(400).json({ error: err });
      data.amount = parseFloat(amount);
    }
    if (categoryId) data.categoryId = categoryId;
    if (date) data.date = new Date(date);
    if (paymentMode) {
      if (!VALID_PAYMENT_MODES.includes(paymentMode))
        return res.status(400).json({ error: 'Invalid payment mode' });
      data.paymentMode = paymentMode;
    }
    if (notes !== undefined) {
      if (notes.length > 200) return res.status(400).json({ error: 'Notes max 200 characters' });
      data.notes = notes;
    }

    const updated = await prisma.expense.update({
      where: { id },
      data,
      include: { category: true },
    });

    return res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update expense' });
  }
};

// DELETE /expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { sharedExpense: { include: { splits: true } } },
    });

    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    if (expense.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    if (expense.sharedExpense) {
      const hasPayments = expense.sharedExpense.splits.some((s) => s.paidAmount > 0 && s.userId !== userId);
      if (hasPayments) {
        return res.status(400).json({ error: 'Cannot delete shared expense with existing payments' });
      }
    }

    await prisma.expense.delete({ where: { id } });
    return res.status(200).json({ message: 'Expense deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete expense' });
  }
};

module.exports = { getExpenses, getExpenseById, createExpense, updateExpense, deleteExpense };
