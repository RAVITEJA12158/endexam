const prisma = require('../config/db');

// GET /categories
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({ categories });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

module.exports = { getCategories };
