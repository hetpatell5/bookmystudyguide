const express = require('express');
const router = express.Router();
const { Review } = require('../model/mysql');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { publicLimiter } = require('../middleware/rateLimiter');

// 1. GET REVIEWS for a product (public — only approved)
router.get('/', async (req, res) => {
  try {
    const { productId } = req.query;
    const where = { isApproved: true };
    if (productId) where.productId = productId;

    const reviews = await Review.findAll({
      where,
      attributes: ['id', 'name', 'rating', 'comment', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. SUBMIT REVIEW (authenticated users, rate limited)
router.post(
  '/',
  publicLimiter,
  [
    body('productId').notEmpty().withMessage('productId is required'),
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required (max 100 chars)'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
    body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment max 1000 chars'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const { productId, name, rating, comment } = req.body;
      // Extract userId from token if present (optional auth)
      let userId = null;
      try {
        const jwt = require('jsonwebtoken');
        const configEnv = require('../config/envConfig');
        const header = req.headers.authorization;
        if (header && header.startsWith('Bearer ')) {
          const decoded = jwt.verify(header.split(' ')[1], configEnv.jwtSecret);
          userId = decoded.id;
        }
      } catch (_) {}

      const review = await Review.create({
        productId,
        userId,
        name: name.trim(),
        rating: Number(rating),
        comment: comment ? comment.trim() : null,
        isApproved: false,
      });

      res.status(201).json({
        success: true,
        message: 'Review submitted! It will appear after approval.',
        data: { id: review.id },
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// 3. ADMIN — GET ALL REVIEWS (pending + approved)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { approved } = req.query;
    const where = {};
    if (approved === 'true') where.isApproved = true;
    if (approved === 'false') where.isApproved = false;

    const reviews = await Review.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. ADMIN — APPROVE / REJECT REVIEW
router.patch('/admin/:id/approve', adminAuth, async (req, res) => {
  try {
    const { isApproved } = req.body;
    if (typeof isApproved !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isApproved (boolean) is required' });
    }
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    await review.update({ isApproved });
    res.json({ success: true, data: review, message: isApproved ? 'Review approved' : 'Review rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. ADMIN — DELETE REVIEW
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    await review.destroy();
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
