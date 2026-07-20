const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// M-Pesa deposit
router.post('/deposit', authenticate, async (req, res) => {
  try {
    const { amount, phone } = req.body;
    if (!amount || amount < 10) return res.status(400).json({ error: 'Minimum deposit is KSH 10' });
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    
    // Simulate STK push
    const checkoutId = `MPESA-${Date.now()}`;
    
    // Record pending transaction
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
    db.prepare(`
      INSERT INTO transactions (wallet_id, user_id, type, amount, status, description, reference, external_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(wallet.id, req.user.id, 'deposit', amount, 'pending', 'M-Pesa Deposit', checkoutId, checkoutId);
    
    // Simulate async callback (in production, this would come from M-Pesa API)
    setTimeout(() => {
      try {
        db.prepare('UPDATE transactions SET status = ?, reference = ? WHERE reference = ?').run('completed', `MPESA-${Date.now()}-COMP`, checkoutId);
        db.prepare('UPDATE wallets SET balance = balance + ? WHERE user_id = ?').run(amount, req.user.id);
        createNotification(req.user.id, 'Deposit Successful', `KSH ${amount} deposited via M-Pesa`, 'transaction', { amount, type: 'deposit' });
      } catch (e) {
        console.error('M-Pesa callback error:', e);
      }
    }, 3000);
    
    res.json({ message: 'STK push initiated', checkout_request_id: checkoutId, phone });
  } catch (err) {
    res.status(500).json({ error: 'M-Pesa deposit failed' });
  }
});

// M-Pesa withdrawal
router.post('/withdraw', authenticate, async (req, res) => {
  try {
    const { amount, phone } = req.body;
    if (!amount || amount < 50) return res.status(400).json({ error: 'Minimum withdrawal is KSH 50' });
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
    if (wallet.balance < amount) return res.status(400).json({ error: 'Insufficient wallet balance' });
    
    const fee = Math.min(amount * 0.01, 100); // 1% fee, max KSH 100
    const totalDeduct = amount + fee;
    
    if (wallet.balance < totalDeduct) return res.status(400).json({ error: 'Insufficient balance including fee' });
    
    const checkoutId = `MPESA-WD-${Date.now()}`;
    
    db.prepare('UPDATE wallets SET balance = balance - ? WHERE user_id = ?').run(totalDeduct, req.user.id);
    db.prepare(`
      INSERT INTO transactions (wallet_id, user_id, type, amount, fee, status, description, reference)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(wallet.id, req.user.id, 'withdrawal', -amount, fee, 'pending', 'M-Pesa Withdrawal', checkoutId);
    
    setTimeout(() => {
      try {
        db.prepare('UPDATE transactions SET status = ? WHERE reference = ?').run('completed', checkoutId);
        createNotification(req.user.id, 'Withdrawal Successful', `KSH ${amount} withdrawn to M-Pesa`, 'transaction', { amount, type: 'withdrawal' });
      } catch (e) {
        console.error('Withdrawal callback error:', e);
      }
    }, 3000);
    
    res.json({ message: 'Withdrawal initiated', amount, fee, checkout_request_id: checkoutId });
  } catch (err) {
    res.status(500).json({ error: 'M-Pesa withdrawal failed' });
  }
});

// M-Pesa callback (webhook)
router.post('/callback', (req, res) => {
  try {
    const { Body } = req.body;
    const resultCode = Body?.stkCallback?.ResultCode;
    const checkoutId = Body?.stkCallback?.CheckoutRequestID;
    
    if (resultCode === 0) {
      // Success
      db.prepare('UPDATE transactions SET status = ? WHERE external_id = ?').run('completed', checkoutId);
    } else {
      // Failed
      db.prepare('UPDATE transactions SET status = ? WHERE external_id = ?').run('failed', checkoutId);
    }
    
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Error' });
  }
});

module.exports = router;
