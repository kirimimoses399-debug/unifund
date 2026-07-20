const express = require('express');
const { db } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');
const { sendSMS } = require('../services/smsService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const generateOrderCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'UF-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

// Create order
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, delivery_method, delivery_address, notes, voucher_code } = req.body;
    
    if (!items || !items.length) return res.status(400).json({ error: 'No items in order' });
    
    // Validate items and calculate totals
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_available = 1').get(item.product_id);
      if (!product) return res.status(400).json({ error: `Product ${item.product_id} not found` });
      if (product.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        vendor_id: product.vendor_id
      });
    }
    
    // Check voucher
    let discount = 0;
    if (voucher_code) {
      const voucher = db.prepare('SELECT * FROM vouchers WHERE code = ? AND user_id = ? AND status = ? AND balance > 0').get(voucher_code, req.user.id, 'active');
      if (voucher) {
        discount = Math.min(voucher.balance, subtotal);
      }
    }
    
    const deliveryFee = delivery_method === 'campus_delivery' ? 50 : (delivery_method === 'hostel_delivery' ? 80 : 0);
    const total = subtotal + deliveryFee - discount;
    
    // Check wallet balance
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
    if (wallet.balance < total) {
      return res.status(400).json({ error: 'Insufficient wallet balance', required: total, available: wallet.balance });
    }
    
    // Deduct from wallet
    db.prepare('UPDATE wallets SET balance = balance - ?, total_spent = total_spent + ? WHERE user_id = ?').run(total, total, req.user.id);
    
    // Create order
    const orderCode = generateOrderCode();
    const result = db.prepare(`
      INSERT INTO orders (order_code, user_id, items, subtotal, delivery_fee, discount, total, delivery_method, delivery_address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orderCode, req.user.id, JSON.stringify(orderItems), subtotal, deliveryFee, discount, total, delivery_method, delivery_address || null, notes || null);
    
    const orderId = result.lastInsertRowid;
    
    // Deduct stock
    for (const item of items) {
      db.prepare('UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?').run(item.quantity, item.quantity, item.product_id);
    }
    
    // Deduct voucher if used
    if (voucher_code && discount > 0) {
      db.prepare('UPDATE vouchers SET balance = balance - ?, usage_count = usage_count + 1 WHERE code = ?').run(discount, voucher_code);
    }
    
    // Create transaction record
    const walletRecord = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
    db.prepare(`
      INSERT INTO transactions (wallet_id, user_id, type, amount, balance_after, description, reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(walletRecord.id, req.user.id, 'payment', -total, walletRecord.balance, `Order ${orderCode}`, orderCode);
    
    // Notify user
    createNotification(req.user.id, 'Order Placed', `Your order ${orderCode} has been received. Total: KSH ${total.toLocaleString()}`, 'order', { order_id: orderId, order_code: orderCode });
    
    // Notify vendors
    const vendorIds = [...new Set(orderItems.map(i => i.vendor_id))];
    for (const vendorId of vendorIds) {
      createNotification(vendorId, 'New Order', `You have a new order ${orderCode}`, 'order', { order_id: orderId });
    }
    
    // Send SMS
    try {
      await sendSMS(req.user.phone, `UniFund: Order ${orderCode} confirmed! Total KSH ${total.toLocaleString()}. Track in app.`);
    } catch (e) {}
    
    res.status(201).json({ message: 'Order placed', order_id: orderId, order_code: orderCode, total });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Get user's orders
router.get('/', authenticate, (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    let query = 'SELECT * FROM orders WHERE user_id = ?';
    const params = [req.user.id];
    
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const orders = db.prepare(query).all(...params);
    orders.forEach(o => { if (o.items) o.items = JSON.parse(o.items); });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order details
router.get('/:id', authenticate, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    
    if (order.items) order.items = JSON.parse(order.items);
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status (vendor/admin)
router.put('/:id/status', authenticate, (req, res) => {
  try {
    const { status } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const items = JSON.parse(order.items);
    const vendorIds = [...new Set(items.map(i => i.vendor_id))];
    
    if (!vendorIds.includes(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    
    const statusMessages = {
      confirmed: 'Your order has been confirmed!',
      preparing: 'Your order is being prepared!',
      ready: 'Your order is ready for pickup!',
      delivered: 'Your order has been delivered!',
      cancelled: 'Your order has been cancelled.',
      refunded: 'Your order has been refunded.'
    };
    
    createNotification(order.user_id, 'Order Update', statusMessages[status] || `Order status: ${status}`, 'order', { order_id: order.id, status });
    
    res.json({ message: 'Order status updated', status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get vendor orders
router.get('/vendor/orders', authenticate, (req, res) => {
  try {
    if (!['vendor', 'merchant', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { status } = req.query;
    // Get orders that contain products from this vendor
    const allOrders = db.prepare('SELECT * FROM orders WHERE status != ? ORDER BY created_at DESC', 'cancelled').all();
    const vendorOrders = allOrders.filter(o => {
      const items = JSON.parse(o.items);
      return items.some(i => i.vendor_id === req.user.id);
    });
    
    if (status) {
      const filtered = vendorOrders.filter(o => o.status === status);
      return res.json({ orders: filtered });
    }
    
    res.json({ orders: vendorOrders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vendor orders' });
  }
});

module.exports = router;
