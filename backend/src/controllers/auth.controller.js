const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { validatePassword, validateUsername } = require('../utils/validators');

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /auth/register
const register = async (req, res) => {
  try {
    const { fullName, username, email, password, confirmPassword, currency } = req.body;

    // Validate required fields
    if (!fullName || !username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required', code: 'VALIDATION_ERROR' });
    }

    // Validate username
    const usernameError = validateUsername(username);
    if (usernameError) return res.status(400).json({ error: usernameError, code: 'VALIDATION_ERROR' });

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format', code: 'VALIDATION_ERROR' });
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError, code: 'VALIDATION_ERROR' });

    // Confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match', code: 'VALIDATION_ERROR' });
    }

    // Check uniqueness
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] },
    });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'Email' : 'Username';
      return res.status(409).json({ error: `${field} already exists`, code: 'DUPLICATE_FIELD' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: fullName,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        currency: currency || 'INR',
      },
      select: { id: true, username: true, email: true, name: true, currency: true },
    });

    const token = generateToken(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

// POST /auth/login
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required', code: 'VALIDATION_ERROR' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const token = generateToken(user);
    return res.status(200).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, name: user.name, currency: user.currency },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

// GET /auth/me
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, name: true, email: true, currency: true, createdAt: true },
    });
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// PUT /auth/me
const updateMe = async (req, res) => {
  try {
    const { name, currency } = req.body;
    const data = {};
    if (name) data.name = name;
    if (currency) data.currency = currency;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, username: true, name: true, email: true, currency: true },
    });
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

// PUT /auth/me/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required' });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    return res.status(200).json({ message: 'Password updated' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = { register, login, getMe, updateMe, changePassword };
