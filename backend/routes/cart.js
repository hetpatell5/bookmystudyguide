const router = require("express").Router();
const { Cart } = require("../model/mysql");
const { body } = require('express-validator');
const validate = require('../middleware/validationMiddleware');
const auth = require('../middleware/auth');

const cartValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('product').notEmpty().withMessage('Product data is required'),
  body('quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99'),
  validate
];

// ADD TO CART (Handle Variants)
router.post("/", auth, cartValidation, async (req, res) => {
  const { userId, product, quantity } = req.body;

  // Ownership check
  if (req.userId !== userId) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    // MySQL logic: One row per item/variant
    let item = await Cart.findOne({
      where: {
        userId,
        productId: product._id || product.id,
        type: product.type || 'hardcopy',
        language: product.language || null
      }
    });

    if (item) {
      item.quantity += quantity;
      await item.save();
    } else {
      item = await Cart.create({
        userId,
        productId: product._id || product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        type: product.type || 'hardcopy',
        fileUrl: product.fileUrl,
        language: product.language,
        itemKind: product.itemKind,
        bookId: product.bookId || null,
        mainDegreeId: product.mainDegreeId || null,
        subDegreeId: product.subDegreeId || null,
        quantity,
      });
    }

    const allItems = await Cart.findAll({ where: { userId } });
    return res.status(200).json({ success: true, data: { products: allItems }, message: "Cart updated" });
  } catch (err) {
    console.error("Cart Add Error:", err);
    res.status(500).json({ success: false, message: "Failed to update cart" });
  }
});

// GET CART
router.get("/:userId", auth, async (req, res) => {
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  try {
    const items = await Cart.findAll({
      where: { userId: req.params.userId }
    });

    res.status(200).json({
      success: true,
      data: { products: items },
      message: items.length > 0 ? "Cart retrieved" : "Cart is empty"
    });
  } catch (err) {
    console.error("Get Cart Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE ITEM
router.delete("/:userId/:productId/:type", auth, async (req, res) => {
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  try {
    const deleted = await Cart.destroy({
      where: {
        userId: req.params.userId,
        productId: req.params.productId,
        type: req.params.type
      }
    });

    const allItems = await Cart.findAll({ where: { userId: req.params.userId } });
    res.status(200).json({ success: true, data: { products: allItems }, message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CLEAR CART
router.delete("/clear/:userId", auth, async (req, res) => {
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  try {
    await Cart.destroy({ where: { userId: req.params.userId } });
    res.status(200).json({ success: true, data: { products: [] }, message: "Cart cleared successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
