const { Blog } = require("../model/mysql");

// ADMIN - Add Blog
exports.addBlog = async (req, res) => {
  try {
    const blog = await Blog.create(req.body);
    res.status(201).json({ success: true, data: blog, message: "Blog added successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// USER - Get All Blogs
exports.getAllBlogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const offset = (page - 1) * limit;

    const { count, rows: blogs } = await Blog.findAndCountAll({
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });

    res.json({
      success: true,
      data: blogs,
      pagination: { total: count, page, pages: Math.ceil(count / limit), limit },
      message: "Blogs retrieved"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// USER - Get Single Blog
exports.getSingleBlog = async (req, res) => {
  try {
    const blog = await Blog.findByPk(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ADMIN - Update Blog
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findByPk(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
    await blog.update(req.body);
    res.json({ success: true, data: blog, message: "Blog updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ADMIN - Delete Blog
exports.deleteBlog = async (req, res) => {
  try {
    const deleted = await Blog.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ success: false, message: "Blog not found" });
    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
