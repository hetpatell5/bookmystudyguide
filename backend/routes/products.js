const express = require("express");
const router = express.Router();
const controller = require("../controller/productController");
const cache = require("../middleware/cacheMiddleware");
const { body } = require('express-validator');
const validate = require('../middleware/validationMiddleware');
const { searchLimiter } = require("../middleware/rateLimiter");

const productValidation = [
  body('title').optional().notEmpty().withMessage('Title is required').trim(),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('bookId').optional().notEmpty().withMessage('Book ID is required'),
  validate
];

// Public Routes — specific paths must come before /:id
router.get("/", cache(300), controller.getAll);
router.get("/related/:id", cache(300), controller.getRelated);
router.get("/tailored", cache(300), controller.getTailored);
router.get("/categorized", cache(300), controller.getCategorized);
router.get("/suggest", searchLimiter, controller.getSuggest);
router.get("/filter/:bookId/:subDegreeId", cache(300), controller.getFiltered);
router.get("/bysubdegree/:subDegreeId", cache(300), controller.getFiltered);
router.get("/:id", controller.getById);

// Admin/Write Routes
router.post("/", productValidation, controller.create);
router.patch("/:id/publish", controller.togglePublish);
router.post("/bulk-publish", controller.bulkPublish);
router.patch("/:id", productValidation, controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
