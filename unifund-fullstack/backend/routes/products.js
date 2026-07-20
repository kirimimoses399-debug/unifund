const express = require('express');
const { db } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all products with filters
router.get('/', optionalAuth, (req, res) => {
  try {
    const {
      category, subcategory, search, min_price, max_price, 
      in_stock, is_featured, is_bargain, accept_swap, vendor_id,
      sort = 'created_at', order = 'desc',
      limit = 24, offset = 0
    } = req.query;
    
    let query = `
      SELECT p.*, u.full_name as vendor_name, u.university as vendor_university
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      WHERE p.is_available = 1 AND u.status = 'active'
    `;
    const params = [];
    
    if (category) { query += ' AND p.category = ?'; params.push(category); }
    if (subcategory) { query += ' AND p.subcategory = ?'; params.push(subcategory); }
    if (vendor_id) { query += ' AND p.vendor_id = ?'; params.push(parseInt(vendor_id)); }
    if (min_price) { query += ' AND p.price >= ?'; params.push(parseFloat(min_price)); }
    if (max_price) { query += ' AND p.price <= ?'; params.push(parseFloat(max_price)); }
    if (in_stock === 'true') { query += ' AND p.stock > 0'; }
    if (is_featured === 'true') { query += ' AND p.is_featured = 1'; }
    if (is_bargain === 'true') { query += ' AND p.is_bargain = 1'; }
    if (accept_swap === 'true') { query += ' AND p.accept_swap = 1'; }
    if (search) { query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    
    const validSort = ['created_at', 'price', 'rating', 'sales', 'views'].includes(sort) ? sort : 'created_at';
    const validOrder = ['asc', 'desc'].includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
    
    query += ` ORDER BY p.${validSort} ${validOrder}`;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const products = db.prepare(query).all(...params);
    
    // Parse images JSON
    products.forEach(p => {
      if (p.images) p.images = JSON.parse(p.images);
    });
    
    res.json({ products, total: products.length });
  } catch (err) {
    console.error('Products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.*, u.full_name as vendor_name, u.university as vendor_university, u.phone as vendor_phone
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      WHERE p.id = ? AND p.is_available = 1
    `).get(req.params.id);
    
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    if (product.images) product.images = JSON.parse(product.images);
    
    // Increment view count
    db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(req.params.id);
    
    // Track activity if user is logged in
    if (req.user) {
      db.prepare('INSERT INTO user_activity (user_id, product_id, action) VALUES (?, ?, ?)').run(req.user.id, product.id, 'view');
    }
    
    // Get reviews
    const reviews = db.prepare(`
      SELECT r.*, u.full_name as reviewer_name, u.avatar as reviewer_avatar
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT 10
    `).all(req.params.id);
    
    // Related products
    const related = db.prepare(`
      SELECT p.*, u.full_name as vendor_name
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      WHERE p.category = ? AND p.id != ? AND p.is_available = 1
      ORDER BY p.sales DESC LIMIT 4
    `).all(product.category, product.id);
    related.forEach(p => { if (p.images) p.images = JSON.parse(p.images); });
    
    res.json({ product, reviews, related_products: related });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (vendor/merchant only)
router.post('/', authenticate, [
  body('name').trim().notEmpty(),
  body('category').isIn(['food', 'meal_plan', 'grocery', 'textbook', 'electronics', 'fashion', 'services', 'swap']),
  body('price').isFloat({ min: 0 })
], (req, res) => {
  try {
    if (!['vendor', 'merchant', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only vendors can create products' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const {
      name, description, category, subcategory, price, compare_price,
      stock, images, sku, barcode, accept_swap, swap_for,
      location_lat, location_lng, delivery_radius
    } = req.body;
    
    const result = db.prepare(`
      INSERT INTO products (vendor_id, name, description, category, subcategory, price, compare_price, stock, images, sku, barcode, accept_swap, swap_for, location_lat, location_lng, delivery_radius)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id, name, description || null, category, subcategory || null,
      price, compare_price || null, stock || 0, images ? JSON.stringify(images) : null,
      sku || null, barcode || null, accept_swap ? 1 : 0, swap_for || null,
      location_lat || null, location_lng || null, delivery_radius || 5
    );
    
    res.status(201).json({ message: 'Product created', product_id: result.lastInsertRowid });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', authenticate, (req, res) => {
  try {
    const product = db.prepare('SELECT vendor_id FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.vendor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { name, description, price, stock, is_available, is_featured, images } = req.body;
    const updates = [];
    const values = [];
    
    if (name) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (price !== undefined) { updates.push('price = ?'); values.push(price); }
    if (stock !== undefined) { updates.push('stock = ?'); values.push(stock); }
    if (is_available !== undefined) { updates.push('is_available = ?'); values.push(is_available ? 1 : 0); }
    if (is_featured !== undefined) { updates.push('is_featured = ?'); values.push(is_featured ? 1 : 0); }
    if (images) { updates.push('images = ?'); values.push(JSON.stringify(images)); }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);
    
    db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', authenticate, (req, res) => {
  try {
    const product = db.prepare('SELECT vendor_id FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.vendor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get vendor's products
router.get('/vendor/:vendorId', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.* FROM products p
      JOIN users u ON p.vendor_id = u.id
      WHERE p.vendor_id = ? AND p.is_available = 1 AND u.status = 'active'
      ORDER BY p.created_at DESC
    `).all(req.params.vendorId);
    
    products.forEach(p => { if (p.images) p.images = JSON.parse(p.images); });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vendor products' });
  }
});

// Get categories
router.get('/categories/all', (req, res) => {
  try {
    const categories = db.prepare('SELECT DISTINCT category FROM products WHERE is_available = 1').all();
    const subcategories = db.prepare('SELECT DISTINCT subcategory FROM products WHERE is_available = 1 AND subcategory IS NOT NULL').all();
    res.json({ categories: categories.map(c => c.category), subcategories: subcategories.map(s => s.subcategory) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
