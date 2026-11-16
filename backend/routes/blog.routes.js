const express = require("express");
const router = express.Router();
const blogController = require("../controller/blog.controller");
const { body } = require('express-validator');
const validate = require('../middleware/validationMiddleware');

const blogValidation = [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('content').notEmpty().withMessage('Content is required'),
    validate
];

// ADMIN
router.post("/add", blogValidation, blogController.addBlog);
router.put("/:id", blogController.updateBlog);
router.delete("/:id", blogController.deleteBlog);

// USER
router.get("/", blogController.getAllBlogs);
router.get("/:id", blogController.getSingleBlog);

module.exports = router;
