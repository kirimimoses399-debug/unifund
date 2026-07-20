const express = require('express');
const { db } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get user's vouchers
router.get('/', authenticate, (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM vouchers WHERE user_id = ?';
    const params = [req.user.id];
    
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY valid_until ASC';
    
    const vouchers = db.prepare(query).all(...params);
    res.json({ vouchers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
});

// Apply voucher to calculate discount
router.post('/apply', authenticate, (req, res) => {
  try {
    const { code, order_total } = req.body;
    if (!code || !order_total) return res.status(400).json({ error: 'Code and order total required' });
    
    const voucher = db.prepare('SELECT * FROM vouchers WHERE code = ? AND user_id = ?').get(code, req.user.id);
    if (!voucher) return res.status(404).json({ error: 'Voucher not found' });
    if (voucher.status !== 'active') return res.status(400).json({ error: 'Voucher is not active' });
    if (voucher.balance <= 0) return res.status(400).json({ error: 'Voucher has no balance' });
    if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
      db.prepare('UPDATE vouchers SET status = ? WHERE id = ?').run('expired', voucher.id);
      return res.status(400).json({ error: 'Voucher has expired' });
    }
    if (order_total < voucher.min_order) return res.status(400).json({ error: `Minimum order KSH ${voucher.min_order} required` });
    
    const discount = Math.min(voucher.balance, voucher.max_discount || voucher.balance, order_total);
    const finalTotal = order_total - discount;
    
    res.json({
      voucher: {
        id: voucher.id,
        code: voucher.code,
        type: voucher.type,
        original_balance: voucher.amount,
        available_balance: voucher.balance,
        discount_applied: discount,
        final_total: finalTotal
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply voucher' });
  }
});

// Create voucher (admin only)
router.post('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const { user_id, type, amount, issuer, valid_until, min_order, max_discount, applicable_categories } = req.body;
    if (!user_id || !type || !amount) return res.status(400).json({ error: 'Missing required fields' });
    
    const code = `UF-${type.toUpperCase()}-${Date.now()}`;
    const now = new Date().toISOString().split('T')[0];
    
    const result = db.prepare(`
      INSERT INTO vouchers (user_id, code, type, amount, balance, issuer, valid_from, valid_until, min_order, max_discount, applicable_categories)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, code, type, amount, amount, issuer || 'UniFund', now, valid_until, min_order || 0, max_discount || amount, applicable_categories || null);
    
    res.status(201).json({ message: 'Voucher created', voucher_id: result.lastInsertRowid, code });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create voucher' });
  }
});

// Bulk create vouchers (admin)
router.post('/bulk', authenticate, authorize('admin'), (req, res) => {
  try {
    const { user_ids, type, amount, valid_until } = req.body;
    const created = [];
    const now = new Date().toISOString().split('T')[0];
    
    for (const userId of user_ids) {
      const code = `UF-${type.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const result = db.prepare(`
        INSERT INTO vouchers (user_id, code, type, amount, balance, issuer, valid_from, valid_until)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, code, type, amount, amount, 'UniFund Admin', now, valid_until);
      created.push({ id: result.lastInsertRowid, code, user_id: userId });
    }
    
    res.status(201).json({ message: `${created.length} vouchers created`, vouchers: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create vouchers' });
  }
});

module.exports = router;
