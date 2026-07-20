const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// Get wallet
router.get('/', authenticate, (req, res) => {
  try {
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    
    const recentTransactions = db.prepare(`
      SELECT t.* FROM transactions t
      WHERE t.wallet_id = ?
      ORDER BY t.created_at DESC LIMIT 10
    `).all(wallet.id);
    
    const activeVouchers = db.prepare('SELECT * FROM vouchers WHERE user_id = ? AND status = ? AND balance > 0 ORDER BY valid_until ASC').all(req.user.id, 'active');
    
    const stats = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'topup' THEN amount ELSE 0 END) as total_topped_up,
        SUM(CASE WHEN type = 'payment' THEN ABS(amount) ELSE 0 END) as total_spent,
        COUNT(*) as total_transactions
      FROM transactions
      WHERE user_id = ? AND status = 'completed'
    `).get(req.user.id);
    
    res.json({ wallet, recent_transactions: recentTransactions, active_vouchers: activeVouchers, stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// Top up wallet (manual admin or via M-Pesa callback)
router.post('/topup', authenticate, (req, res) => {
  try {
    const { amount, reference, description } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    
    const newBalance = wallet.balance + parseFloat(amount);
    db.prepare('UPDATE wallets SET balance = ?, total_topped_up = total_topped_up + ? WHERE user_id = ?').run(newBalance, amount, req.user.id);
    
    db.prepare(`
      INSERT INTO transactions (wallet_id, user_id, type, amount, balance_after, description, reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(wallet.id, req.user.id, 'topup', amount, newBalance, description || 'Wallet top-up', reference || `TOPUP-${Date.now()}`);
    
    createNotification(req.user.id, 'Wallet Top-up', `KSH ${amount.toLocaleString()} added to your wallet. New balance: KSH ${newBalance.toLocaleString()}`, 'payment', { amount, balance: newBalance });
    
    res.json({ message: 'Top-up successful', balance: newBalance });
  } catch (err) {
    res.status(500).json({ error: 'Top-up failed' });
  }
});

// Transfer to another user
router.post('/transfer', authenticate, (req, res) => {
  try {
    const { to_phone, amount, note } = req.body;
    if (!to_phone || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid transfer details' });
    
    const fromWallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
    if (fromWallet.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
    
    const toUser = db.prepare('SELECT id, full_name FROM users WHERE phone = ?').get(to_phone);
    if (!toUser) return res.status(404).json({ error: 'Recipient not found' });
    if (toUser.id === req.user.id) return res.status(400).json({ error: 'Cannot transfer to yourself' });
    
    const toWallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(toUser.id);
    
    // Deduct from sender
    db.prepare('UPDATE wallets SET balance = balance - ? WHERE user_id = ?').run(amount, req.user.id);
    // Add to receiver
    db.prepare('UPDATE wallets SET balance = balance + ? WHERE user_id = ?').run(amount, toUser.id);
    
    // Record transactions
    db.prepare(`
      INSERT INTO transactions (wallet_id, user_id, type, amount, balance_after, description, reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fromWallet.id, req.user.id, 'transfer', -amount, fromWallet.balance - amount, `Transfer to ${toUser.full_name}`, `TRANSFER-${toUser.id}`);
    
    db.prepare(`
      INSERT INTO transactions (wallet_id, user_id, type, amount, balance_after, description, reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(toWallet.id, toUser.id, 'transfer', amount, toWallet.balance + amount, `Transfer from ${req.user.full_name}`, `RECEIVED-${req.user.id}`);
    
    createNotification(req.user.id, 'Transfer Sent', `You sent KSH ${amount.toLocaleString()} to ${toUser.full_name}`, 'payment', { amount, to: toUser.full_name });
    createNotification(toUser.id, 'Transfer Received', `You received KSH ${amount.toLocaleString()} from ${req.user.full_name}`, 'payment', { amount, from: req.user.full_name });
    
    res.json({ message: 'Transfer successful', amount, to: toUser.full_name });
  } catch (err) {
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// Get all transactions
router.get('/transactions', authenticate, (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    const wallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(req.user.id);
    
    let query = 'SELECT * FROM transactions WHERE wallet_id = ?';
    const params = [wallet.id];
    
    if (type) { query += ' AND type = ?'; params.push(type); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const transactions = db.prepare(query).all(...params);
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;
