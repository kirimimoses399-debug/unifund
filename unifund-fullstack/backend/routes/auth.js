const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { generateToken, authenticate } = require('../middleware/auth');
const { sendSMS } = require('../services/smsService');

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('phone').matches(/^\+254[0-9]{9}$/).withMessage('Phone must be in +254XXXXXXXXX format'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').trim().notEmpty(),
  body('university').optional().trim(),
  body('student_id').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, phone, password, full_name, university, student_id, role } = req.body;
    
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(email, phone);
    if (existingUser) {
      return res.status(409).json({ error: 'Email or phone already registered' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userRole = role && ['student', 'vendor', 'merchant'].includes(role) ? role : 'student';
    
    const result = db.prepare(`
      INSERT INTO users (email, phone, password, full_name, university, student_id, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(email, phone, hashedPassword, full_name, university || null, student_id || null, userRole);

    const userId = result.lastInsertRowid;
    
    // Create wallet for user
    db.prepare('INSERT INTO wallets (user_id) VALUES (?)').run(userId);
    
    // Create welcome vouchers for students
    if (userRole === 'student') {
      const now = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const validUntil = nextMonth.toISOString().split('T')[0];
      
      db.prepare(`
        INSERT INTO vouchers (user_id, code, type, amount, balance, issuer, valid_from, valid_until)
        VALUES (?, ?, 'food', 500, 500, 'UniFund Welcome', ?, ?)
      `).run(userId, `WELCOME-FOOD-${userId}`, now, validUntil);
      
      db.prepare(`
        INSERT INTO vouchers (user_id, code, type, amount, balance, issuer, valid_from, valid_until)
        VALUES (?, ?, 'market', 300, 300, 'UniFund Welcome', ?, ?)
      `).run(userId, `WELCOME-MARKET-${userId}`, now, validUntil);
    }
    
    // Send welcome SMS
    try {
      await sendSMS(phone, `Welcome to UniFund, ${full_name}! Your account is ready. Download the app to start shopping.`);
    } catch (e) {
      console.log('SMS not sent (dev mode):', e.message);
    }
    
    const token = generateToken(userId);
    
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        email,
        phone,
        full_name,
        role: userRole,
        university: university || null
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = email || phone;
    
    if (!identifier) {
      return res.status(400).json({ error: 'Email or phone required' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(identifier, identifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ error: `Account ${user.status}. Contact support.` });
    }
    
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    
    const token = generateToken(user.id);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        role: user.role,
        university: user.university,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  try {
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
    const notificationCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id);
    
    res.json({
      user: req.user,
      wallet: wallet || { balance: 0, food_voucher_balance: 0, market_voucher_balance: 0 },
      unread_notifications: notificationCount.count
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Update profile
router.put('/profile', authenticate, [
  body('full_name').optional().trim().notEmpty(),
  body('university').optional().trim(),
  body('phone').optional().matches(/^\+254[0-9]{9}$/)
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { full_name, university, phone, avatar } = req.body;
    const updates = [];
    const values = [];
    
    if (full_name) { updates.push('full_name = ?'); values.push(full_name); }
    if (university) { updates.push('university = ?'); values.push(university); }
    if (phone) { updates.push('phone = ?'); values.push(phone); }
    if (avatar) { updates.push('avatar = ?'); values.push(avatar); }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.user.id);
    
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Change password
router.put('/password', authenticate, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 6 })
], (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    
    if (!bcrypt.compareSync(current_password, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    const hashed = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

module.exports = router;
