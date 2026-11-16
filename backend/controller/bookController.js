const { Book } = require("../model/mysql");
const { deleteFromR2, getFullR2Url } = require("../utils/r2Utils");
const { success, error, paginated } = require("../utils/response");
const { clearAllCache } = require("../utils/redis");

exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    let image = "";
    let commonPages = [];

    // Handle Main Image
    if (req.files && req.files['image']) {
      const file = req.files['image'][0];
      image = getFullR2Url(file.key);
    }

    // Handle Common Pages
    if (req.files && req.files['commonPages']) {
      commonPages = req.files['commonPages'].map(file => getFullR2Url(file.key));
    }

    const savedBook = await Book.create({ name, image, commonPages });
    await clearAllCache();
    return success(res, savedBook, "Book created successfully", 201);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getAll = async (req, res) => {
  try {
    const { Op } = require("sequelize");
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const search = req.query.search || '';
    const order = [['createdAt', 'DESC']];

    const where = {};
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    if (!req.query.admin) {
      where.isPublished = true;
    }

    if (page && limit) {
      const offset = (page - 1) * limit;
      const { count, rows } = await Book.findAndCountAll({ where, order, limit, offset });
      const { paginated } = require("../utils/response");
      return paginated(res, rows, count, page, limit, "Books retrieved");
    } else {
      const list = await Book.findAll({ where, order });
      const { success } = require("../utils/response");
      return success(res, list, "Books retrieved");
    }
  } catch (err) {
    const { error } = require("../utils/response");
    return error(res, err.message);
  }
};

exports.getOne = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) return error(res, "Book not found", 404);
    return success(res, book, "Book retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const { name } = req.body;
    let updateData = { name };
    const book = await Book.findByPk(req.params.id);

    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

    // Handle Main Image
    if (req.files && req.files['image']) {
      if (book.image) {
        await deleteFromR2(book.image);
      }
      const file = req.files['image'][0];
      updateData.image = getFullR2Url(file.key);
    }

    // Handle Existing Common Pages Deletion via 'retainedPages'
    let currentPages = [];
    try {
        if (book.commonPages) {
            currentPages = typeof book.commonPages === "string" 
                ? JSON.parse(book.commonPages) 
                : book.commonPages;
        }
    } catch (e) {
        currentPages = book.commonPages ? [book.commonPages] : [];
    }
    if (!Array.isArray(currentPages)) currentPages = [];
    
    if (req.body.retainedPages) {
      try {
        const sequence = JSON.parse(req.body.retainedPages);
        let updatedPages = [];
        let newFileIdx = 0;
        const newPages = req.files && req.files['commonPages'] 
          ? req.files['commonPages'].map(file => getFullR2Url(file.key)) 
          : [];

        // Identify pages to delete (those in currentPages but not in the new sequence)
        const sequenceSet = new Set(sequence.filter(item => item !== "___NEW_FILE___"));
        for (const pageUrl of currentPages) {
          if (typeof pageUrl === 'string' && pageUrl.length > 1 && !sequenceSet.has(pageUrl)) {
            await deleteFromR2(pageUrl);
          }
        }

        sequence.forEach(item => {
          if (item === "___NEW_FILE___") {
            if (newPages[newFileIdx]) {
              updatedPages.push(newPages[newFileIdx]);
              newFileIdx++;
            }
          } else {
            updatedPages.push(item);
          }
        });

        // Safety: catch any files not in sequence just in case
        if (newFileIdx < newPages.length) {
          updatedPages = [...updatedPages, ...newPages.slice(newFileIdx)];
        }

        updateData.commonPages = updatedPages;
      } catch (e) {
        console.error("Sequence Parse Error:", e);
        updateData.commonPages = currentPages;
      }
    } else {
      updateData.commonPages = currentPages;
    }

    await Book.update(updateData, { where: { id: req.params.id } });
    const updatedBook = await Book.findByPk(req.params.id);
    await clearAllCache();
    return success(res, updatedBook, "Book updated successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

    if (book.image) {
      await deleteFromR2(book.image);
    }
 
    if (book.commonPages && book.commonPages.length > 0) {
      for (const pageUrl of book.commonPages) {
        await deleteFromR2(pageUrl);
      }
    }

    await Book.destroy({ where: { id: req.params.id } });
    await clearAllCache();
    return success(res, null, "Book deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

// Toggle publish for a single Book
exports.togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    if (isPublished === undefined) {
      return error(res, "isPublished is required", 400);
    }

    const [updatedCount] = await Book.update(
      { isPublished },
      { where: { id } }
    );
    if (updatedCount === 0) return error(res, "Book not found", 404);

    await clearAllCache();
    const updated = await Book.findByPk(id);
    return success(res, updated, `Book ${isPublished ? 'published' : 'drafted'}`);
  } catch (err) {
    return error(res, err.message);
  }
};

// Bulk delete multiple Books
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error(res, "ids array is required", 400);
    }
    const books = await Book.findAll({ where: { id: ids } });
    for (const book of books) {
      if (book.image) await deleteFromR2(book.image);
      if (book.commonPages && book.commonPages.length > 0) {
        for (const pageUrl of book.commonPages) await deleteFromR2(pageUrl);
      }
    }
    const deleted = await Book.destroy({ where: { id: ids } });
    await clearAllCache();
    return success(res, null, `${deleted} Books deleted`);
  } catch (err) {
    return error(res, err.message);
  }
};

// Bulk toggle publish for multiple Books
exports.bulkPublish = async (req, res) => {
  try {
    const { ids, isPublished } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error(res, "ids array is required", 400);
    }
    if (isPublished === undefined) {
      return error(res, "isPublished is required", 400);
    }

    await Book.update({ isPublished }, { where: { id: ids } });

    await clearAllCache();
    return success(res, null, `${ids.length} Books ${isPublished ? 'published' : 'drafted'}`);
  } catch (err) {
    return error(res, err.message);
  }
};

