/**
 * Validates password strength:
 * - min 8 characters
 * - at least one uppercase letter
 * - at least one special character
 */
const validatePassword = (password) => {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return 'Password must contain at least one special character';
  return null;
};

/**
 * Validates username: alphanumeric + underscore only
 */
const validateUsername = (username) => {
  if (!username) return 'Username is required';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 30) return 'Username must be at most 30 characters';
  return null;
};

/**
 * Validates amount: positive, up to 2 decimal places
 */
const validateAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return 'Amount must be greater than 0';
  if (!/^\d+(\.\d{1,2})?$/.test(String(num))) return 'Amount can have at most 2 decimal places';
  return null;
};

const VALID_PAYMENT_MODES = ['CASH', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING'];
const VALID_SORT_OPTIONS = ['newest', 'oldest', 'amount_asc', 'amount_desc'];

module.exports = { validatePassword, validateUsername, validateAmount, VALID_PAYMENT_MODES, VALID_SORT_OPTIONS };
