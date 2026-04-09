const prisma = require('../config/db');

// GET /budgets
const getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: { select: { id: true, name: true } } },
    });

    const result = budgets.map((b) => {
      const percentUsed = b.limitAmount > 0 ? parseFloat(((b.spentAmount / b.limitAmount) * 100).toFixed(2)) : 0;
      const remaining = parseFloat((b.limitAmount - b.spentAmount).toFixed(2));
      let status = 'ok';
      if (percentUsed >= 100) status = 'exceeded';
      else if (percentUsed >= 80) status = 'warning';

      return { ...b, percentUsed, remaining, status };
    });

    return res.status(200).json({ budgets: result });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

// POST /budgets — create or update (upsert)
const setBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId, limitAmount, month, year } = req.body;

    if (!categoryId || !limitAmount || !month || !year) {
      return res.status(400).json({ error: 'categoryId, limitAmount, month, year are required' });
    }
    if (parseFloat(limitAmount) <= 0) {
      return res.status(400).json({ error: 'limitAmount must be greater than 0' });
    }
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'month must be between 1 and 12' });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return res.status(400).json({ error: 'Invalid category' });

    // Calculate actual spentAmount from expenses for this period
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const expenseSum = await prisma.expense.aggregate({
      where: {
        userId,
        categoryId,
        date: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
    });

    // Also add payments made in this period for shared expenses in this category
    const paymentSum = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'PAYMENT',
        createdAt: { gte: startDate, lt: endDate },
        split: {
          sharedExpense: { expense: { categoryId } },
        },
      },
      _sum: { amount: true },
    });

    const spentAmount = (expenseSum._sum.amount || 0) + (paymentSum._sum.amount || 0);

    const budget = await prisma.budget.upsert({
      where: { userId_categoryId_month_year: { userId, categoryId, month: parseInt(month), year: parseInt(year) } },
      update: { limitAmount: parseFloat(limitAmount), spentAmount },
      create: {
        userId,
        categoryId,
        limitAmount: parseFloat(limitAmount),
        spentAmount,
        month: parseInt(month),
        year: parseInt(year),
      },
      include: { category: { select: { id: true, name: true } } },
    });

    const percentUsed = budget.limitAmount > 0
      ? parseFloat(((budget.spentAmount / budget.limitAmount) * 100).toFixed(2))
      : 0;
    const remaining = parseFloat((budget.limitAmount - budget.spentAmount).toFixed(2));
    let status = 'ok';
    if (percentUsed >= 100) status = 'exceeded';
    else if (percentUsed >= 80) status = 'warning';

    return res.status(201).json({ budget: { ...budget, percentUsed, remaining, status } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to set budget' });
  }
};

// DELETE /budgets/:id
const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await prisma.budget.findUnique({ where: { id } });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    if (budget.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await prisma.budget.delete({ where: { id } });
    return res.status(200).json({ message: 'Budget deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete budget' });
  }
};

module.exports = { getBudgets, setBudget, deleteBudget };
