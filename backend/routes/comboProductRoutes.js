const express = require('express');
const router = express.Router();
const ctrl = require('../controller/comboProductController');

// CREATE combo product
router.post('/', ctrl.createComboProduct);

// GET all combo products
router.get('/', ctrl.getComboProducts);

// ✅ GET combo product by ID (DETAIL PAGE)
router.get('/:id', ctrl.getComboProductById);

// TOGGLE publish/draft single combo
router.patch('/:id/publish', ctrl.toggleComboPublish);

// BULK publish/draft combos
router.post('/bulk-publish', ctrl.bulkPublishCombos);

// UPDATE combo product
router.patch('/:id', ctrl.updateComboProduct);

// DELETE combo product
router.delete('/:id', ctrl.deleteComboProduct);

module.exports = router;
