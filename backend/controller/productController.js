const { Product, ProductLink, MainDegree, SubDegree, Subject, sequelize } = require("../model/mysql");
const { Op } = require("sequelize");
const { success, error, paginated } = require("../utils/response");
const { clearProductCache } = require("../utils/redis");
const { deleteFromR2 } = require("../utils/r2Utils");
const { handleUpload } = require("../utils/uploadHelper");

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const isAdmin = !!req.query.admin;
    const maxLimit = isAdmin ? 500 : 50;
    const requestedLimit = parseInt(req.query.limit) || 20;
    const limit = Math.min(Math.max(requestedLimit, 1), maxLimit);
    const offset = (page - 1) * limit;
    const where = {};
    const order = [["createdAt", "DESC"]];

    if (req.query.bookId) where.bookId = req.query.bookId;
    if (req.query.mainDegreeId) where.mainDegreeId = req.query.mainDegreeId;
    if (req.query.subDegreeId) where.subDegreeId = req.query.subDegreeId;

    if (req.query.search) {
      where.title = { [Op.like]: `%${String(req.query.search).trim()}%` };
    }

    if (req.query.sort === "price-asc") order[0] = ["price", "ASC"];
    else if (req.query.sort === "price-desc") order[0] = ["price", "DESC"];
    else if (req.query.sort === "title-asc") order[0] = ["title", "ASC"];
    else if (req.query.sort === "title-desc") order[0] = ["title", "DESC"];

    if (!isAdmin) where.isActive = true;

    // Public list returns card-only fields — no heavy relational joins
    const attributes = isAdmin
      ? undefined
      : ["id", "title", "price", "mrp", "images", "coverImageIndex", "bookId", "mainDegreeId", "subDegreeId", "subjectId", "isActive", "createdAt"];

    const include = isAdmin
      ? [ProductLink, { model: MainDegree, attributes: ["id", "name"] }, { model: SubDegree, attributes: ["id", "name"] }, { model: Subject, attributes: ["id", "name"] }]
      : [];

    const { count, rows } = await Product.findAndCountAll({ where, include, attributes, order, limit, offset });

    const normalized = rows.map(r => {
      const d = r.toJSON();
      if (isAdmin) {
        d.mainDegree = d.MainDegree?.name || d.mainDegree || null;
        d.subDegree = d.SubDegree?.name || d.subDegree || null;
        d.subjectName = d.Subject?.name || d.subjectName || null;
      }
      return d;
    });

    return paginated(res, normalized, count, page, limit, "Products retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getFiltered = async (req, res) => {
  try {
    const { bookId, subDegreeId } = req.params;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const isAdmin = !!req.query.admin;
    const maxLimit = isAdmin ? 500 : 200;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 200, 1), maxLimit);
    const offset = (page - 1) * limit;
    const where = { bookId, subDegreeId };
    if (!isAdmin) where.isActive = true;

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [ProductLink],
      attributes: ["id", "title", "price", "mrp", "images", "coverImageIndex", "subjectId", "isActive"],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return paginated(res, rows, count, page, limit, "Filtered products retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getRelated = async (req, res) => {
  try {
    const { id } = req.params;
    const limitPerGroup = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 24);

    const product = await Product.findByPk(id, {
      attributes: ["id", "subjectId", "bookId", "subDegreeId", "sku"]
    });
    if (!product) return error(res, "Product not found", 404);

    const base = { isActive: true, id: { [Op.ne]: id } };
    const cardAttrs = ["id", "title", "price", "mrp", "images", "coverImageIndex", "subjectId", "bookId", "subDegreeId"];

    const [sameSubject, sameBook, sameProgram] = await Promise.all([
      product.subjectId
        ? Product.findAll({ where: { ...base, subjectId: product.subjectId }, attributes: cardAttrs, limit: limitPerGroup, order: [["createdAt", "DESC"]] })
        : Promise.resolve([]),
      product.bookId
        ? Product.findAll({ where: { ...base, bookId: product.bookId, ...(product.subjectId ? { subjectId: { [Op.ne]: product.subjectId } } : {}) }, attributes: cardAttrs, limit: limitPerGroup, order: [["createdAt", "DESC"]] })
        : Promise.resolve([]),
      product.subDegreeId
        ? Product.findAll({ where: { ...base, subDegreeId: product.subDegreeId, ...(product.bookId ? { bookId: { [Op.ne]: product.bookId } } : {}) }, attributes: cardAttrs, limit: limitPerGroup, order: [["createdAt", "DESC"]] })
        : Promise.resolve([]),
    ]);

    return success(res, {
      sameSubject: sameSubject.map(r => r.toJSON()),
      sameBook: sameBook.map(r => r.toJSON()),
      sameProgram: sameProgram.map(r => r.toJSON()),
    }, "Related products retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getTailored = async (req, res) => {
  try {
    const { subDegreeId } = req.query;
    if (!subDegreeId) return error(res, "subDegreeId is required", 400);

    const perBookLimit = Math.min(Math.max(parseInt(req.query.perBookLimit) || 8, 1), 20);
    const cardAttrs = ["id", "title", "price", "mrp", "images", "coverImageIndex", "bookId", "isActive"];

    const { Book } = require("../model/mysql");

    const books = await Book.findAll({ attributes: ["id", "name"], order: [["name", "ASC"]] });

    const results = await Promise.all(
      books.map(async (book) => {
        const products = await Product.findAll({
          where: { subDegreeId, bookId: book.id, isActive: true },
          attributes: cardAttrs,
          limit: perBookLimit,
          order: [["createdAt", "DESC"]],
        });
        if (!products.length) return null;
        return { bookId: book.id, bookName: book.name, products: products.map(p => p.toJSON()) };
      })
    );

    return success(res, results.filter(Boolean), "Tailored products retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getCategorized = async (req, res) => {
  try {
    const { bookId, subDegreeId } = req.query;
    if (!bookId || !subDegreeId) return error(res, "bookId and subDegreeId are required", 400);

    const { Subject: SubjectModel, SubDegree: SubDegreeModel } = require("../model/mysql");

    const [subDegree, subjects, products] = await Promise.all([
      SubDegreeModel.findByPk(subDegreeId, { attributes: ["id", "name"] }),
      SubjectModel.findAll({
        where: { subDegreeId, isPublished: true },
        attributes: ["id", "name", "code", "year", "semester", "course"],
        order: [["year", "ASC"], ["semester", "ASC"], ["name", "ASC"]],
      }),
      Product.findAll({
        where: { bookId, subDegreeId, isActive: true },
        attributes: ["id", "title", "price", "mrp", "images", "coverImageIndex", "subjectId"],
      }),
    ]);

    const productMap = new Map(products.map(p => [String(p.subjectId), p.toJSON()]));

    const groups = {};
    subjects.forEach((subject) => {
      const year = subject.year || "1st Year";
      const sem = subject.semester || "1st Semester";
      const cat = subject.course || "General Courses";

      if (!groups[year]) groups[year] = {};
      if (!groups[year][sem]) groups[year][sem] = {};
      if (!groups[year][sem][cat]) groups[year][sem][cat] = [];

      groups[year][sem][cat].push({
        subject: { id: subject.id, name: subject.name, code: subject.code },
        product: productMap.get(String(subject.id)) || null,
      });
    });

    return success(res, {
      subDegree: subDegree ? subDegree.toJSON() : null,
      groups,
    }, "Categorized products retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getSuggest = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return success(res, [], "No query");

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 20);

    const rows = await Product.findAll({
      where: {
        isActive: true,
        title: { [Op.like]: `%${q}%` },
      },
      attributes: ["id", "title", "price", "mrp", "images", "coverImageIndex"],
      limit,
      order: [["createdAt", "DESC"]],
    });

    return success(res, rows.map(r => r.toJSON()), "Suggestions retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        ProductLink,
        { model: MainDegree, attributes: ["id", "name"] },
        { model: SubDegree, attributes: ["id", "name"] },
        { model: Subject, attributes: ["id", "name"] },
      ]
    });
    if (!product) return error(res, "Product not found", 404);
    const data = product.toJSON();
    data.mainDegree = data.MainDegree?.name || data.mainDegree || null;
    data.subDegree = data.SubDegree?.name || data.subDegree || null;
    data.subjectName = data.Subject?.name || data.subjectName || null;
    return success(res, data, "Product retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const productData = req.body;

    if (productData.bookId && productData.subjectId) {
      const existingProduct = await Product.findOne({
        where: {
          bookId: productData.bookId,
          subjectId: productData.subjectId,
        },
        transaction: t,
      });

      if (existingProduct) {
        await t.rollback();
        return error(res, "This subject is already listed in the selected book", 400);
      }
    }

    productData.images = await handleUpload(productData.images, "images");
    productData.commonPages = await handleUpload(productData.commonPages, "commonpages");

    const { productLinks, ...rest } = productData;
    const prod = await Product.create(rest, { transaction: t });

    if (productLinks && Array.isArray(productLinks)) {
      await ProductLink.bulkCreate(
        productLinks.map(link => ({ ...link, productId: prod.id })),
        { transaction: t }
      );
    }

    await t.commit();
    await clearProductCache();
    const result = await Product.findByPk(prod.id, { include: [ProductLink] });
    return success(res, result, "Product created successfully", 201);
  } catch (err) {
    await t.rollback();
    if (err.name === 'SequelizeUniqueConstraintError') {
      const field = err.errors?.[0]?.path || 'field';
      return error(res, `A product with this ${field} already exists`, 400);
    }
    return error(res, err.message);
  }
};

exports.update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const productData = req.body;
    const product = await Product.findByPk(req.params.id);
    if (!product) return error(res, "Product not found", 404);

    const nextBookId = productData.bookId || product.bookId;
    const nextSubjectId = productData.subjectId || product.subjectId;

    if (nextBookId && nextSubjectId) {
      const existingProduct = await Product.findOne({
        where: {
          bookId: nextBookId,
          subjectId: nextSubjectId,
          id: { [Op.ne]: req.params.id },
        },
        transaction: t,
      });

      if (existingProduct) {
        await t.rollback();
        return error(res, "This subject is already listed in the selected book", 400);
      }
    }

    productData.images = await handleUpload(productData.images, "images");
    productData.commonPages = await handleUpload(productData.commonPages, "commonpages");

    const { productLinks, ...rest } = productData;
    await product.update(rest, { transaction: t });

    if (productLinks && Array.isArray(productLinks)) {
      await ProductLink.destroy({ where: { productId: product.id }, transaction: t });

      // Defensively map and clean link data for 'Perfect' saving
      const cleanedLinks = productLinks.map(link => ({
        language: link.language || "",
        type: link.type || "Soft Copy",
        price: parseFloat(link.price) || 0,
        link: link.link || "",
        productId: product.id
      }));

      await ProductLink.bulkCreate(cleanedLinks, { transaction: t });
    }

    await t.commit();
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    return error(res, err.message);
  }

  // Finalize outside transaction to prevent crash on rollback of finished state
  try {
    await clearProductCache();
    const result = await Product.findByPk(req.params.id, { include: [ProductLink] });
    return success(res, result, "Product updated successfully");
  } catch (err) {
    console.error("Post-commit error:", err);
    return success(res, null, "Product updated, but failed to refresh local view correctly.");
  }
};

exports.remove = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return error(res, "Product not found", 404);

    if (product.images && Array.isArray(product.images)) {
      const { publicUrl } = require("../config/r2Config");
      for (const imageUrl of product.images) {
        if (imageUrl.includes(publicUrl)) await deleteFromR2(imageUrl);
      }
    }

    await product.destroy();
    await clearProductCache();
    return success(res, null, "Product deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.bulkPublish = async (req, res) => {
  try {
    const { ids, isPublished } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error(res, "ids array is required", 400);
    }
    await Product.update({ isActive: isPublished }, { where: { id: ids } });
    await clearProductCache();
    return success(res, null, `${ids.length} products updated`);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    await Product.update({ isActive }, { where: { id } });
    await clearProductCache();
    const updated = await Product.findByPk(id);
    return success(res, updated, `Product ${isActive ? 'published' : 'drafted'}`);
  } catch (err) {
    return error(res, err.message);
  }
};
