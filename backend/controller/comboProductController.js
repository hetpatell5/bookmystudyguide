const { ComboProduct, ComboItem, Book, Product, ProductLink, MainDegree, SubDegree, SoftCopy, sequelize } = require("../model/mysql");
const { Op } = require("sequelize");
const path = require('path');
const fs = require('fs').promises;
const upload = require('../middleware/uploadMiddleware');
const { deleteFromR2, getFullR2Url } = require("../utils/r2Utils");
const { clearAllCache } = require("../utils/redis");

/* =======================
   Resolve the combo's digital ("Soft Copy") bundle
   — one SoftCopy record per included book, matched by bookId + subjectId.
   Only offered as purchasable when EVERY included product has a match,
   since buying "the digital combo" should mean the full set, not a partial one.
======================= */
async function resolveComboSoftCopyBundle(combo) {
  const items = combo.items || combo.get?.('items') || [];
  const products = items.map(it => it.product).filter(Boolean);
  if (products.length === 0) return { available: false, items: [], totalPrice: 0 };

  const pairs = products
    .map(p => ({ bookId: p.bookId, subjectId: p.subjectId }))
    .filter(p => p.bookId && p.subjectId);

  if (pairs.length !== products.length) {
    // Some included product is missing a book/subject link — can't resolve a soft copy for it.
    return { available: false, items: [], totalPrice: 0 };
  }

  const softCopies = await SoftCopy.findAll({
    where: {
      [Op.or]: pairs.map(p => ({ bookId: p.bookId, subjectId: p.subjectId })),
    },
  });

  const matched = pairs.map(p =>
    softCopies.find(sc => String(sc.bookId) === String(p.bookId) && String(sc.subjectId) === String(p.subjectId))
  );

  if (matched.some(m => !m)) {
    return { available: false, items: [], totalPrice: 0 };
  }

  const totalPrice = matched.reduce((sum, sc) => sum + Number(sc.price || 0), 0);
  return {
    available: true,
    totalPrice,
    items: matched.map(sc => ({
      id: sc.id,
      title: sc.title,
      resourceType: sc.resourceType,
      resourceLink: sc.resourceLink || null,
      fileName: sc.fileName || null,
      price: sc.price,
      language: sc.language,
    })),
  };
}

/* =======================
   CREATE COMBO PRODUCT
======================= */
/* =======================
   CREATE COMBO PRODUCT
   ======================= */
exports.createComboProduct = [
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      let imageUrl = '';
      if (req.files && req.files['image'] && req.files['image'][0]) {
        imageUrl = getFullR2Url(req.files['image'][0].key);
      }

      let galleryUrls = [];
      if (req.files && req.files['gallery']) {
        galleryUrls = req.files['gallery'].map(file => getFullR2Url(file.key));
      }

      const {
        bookId, mainDegreeId, subDegreeId, subjectIds,
        title, description, price, cancelPrice, language, isActive, items,
      } = req.body;

      const parsedSubjectIds = subjectIds ? JSON.parse(subjectIds) : [];
      let parsedItems = [];
      if (items) {
        parsedItems = JSON.parse(items)
          .filter((it) => it.productId)
          .map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity) || 1,
          }));
      }

      const book = await Book.findByPk(bookId);

      // Start transaction or use Sequelize create with include
      const savedCombo = await sequelize.transaction(async (t) => {
        const combo = await ComboProduct.create({
          bookId, mainDegreeId, subDegreeId,
          subjectIds: parsedSubjectIds,
          bookName: book?.name || '',
          title, description, price, cancelPrice,
          language,
          isActive: isActive === 'true',
          image: imageUrl,
          gallery: galleryUrls,
        }, { transaction: t });

        if (parsedItems.length > 0) {
          await ComboItem.bulkCreate(
            parsedItems.map(it => ({ ...it, comboProductId: combo.id })),
            { transaction: t }
          );
        }

        const productLinks = req.body.productLinks ? (typeof req.body.productLinks === 'string' ? JSON.parse(req.body.productLinks) : req.body.productLinks) : [];
        if (productLinks && Array.isArray(productLinks)) {
          await ProductLink.bulkCreate(
            productLinks.map(link => ({ ...link, comboProductId: combo.id })),
            { transaction: t }
          );
        }
        return combo;
      });

      return res.status(201).json({ 
        success: true, 
        data: await ComboProduct.findByPk(savedCombo.id, {
          include: [
            { model: ComboItem, as: 'items', include: [{ model: Product, as: 'product' }] },
            { model: MainDegree, as: 'mainDegree' },
            { model: SubDegree, as: 'subDegree' },
            ProductLink
          ]
        }), 
        message: "Combo created successfully" 
      });
    } catch (err) {
      console.error('Create combo error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
];

/* =======================
   GET ALL COMBO PRODUCTS
======================= */
exports.getComboProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (req.query.subDegreeId) {
      whereClause.subDegreeId = req.query.subDegreeId;
    }

    const { count, rows: combos } = await ComboProduct.findAndCountAll({
      where: whereClause,
      include: [
        { model: ComboItem, as: 'items', include: [{ model: Product, as: 'product' }] },
            { model: MainDegree, as: 'mainDegree' },
            { model: SubDegree, as: 'subDegree' },
        ProductLink
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit,
      distinct: true
    });

    return res.status(200).json({
      success: true,
      data: combos,
      pagination: { total: count, page, pages: Math.ceil(count / limit), limit }
    });
  } catch (err) {
    console.error('❌ GET combo products error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =======================
   ✅ GET COMBO BY ID
======================= */
exports.getComboProductById = async (req, res) => {
  try {
    const combo = await ComboProduct.findByPk(req.params.id, {
      include: [
        { model: ComboItem, as: 'items', include: [{ model: Product, as: 'product' }] },
            { model: MainDegree, as: 'mainDegree' },
            { model: SubDegree, as: 'subDegree' },
        ProductLink
      ]
    });

    if (!combo) {
      return res.status(404).json({ success: false, message: 'Combo not found' });
    }

    const plain = combo.toJSON();
    plain.softCopyBundle = await resolveComboSoftCopyBundle(combo);

    return res.status(200).json({ success: true, data: plain });
  } catch (err) {
    console.error('Get combo by id error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =======================
   UPDATE COMBO PRODUCT
======================= */
exports.updateComboProduct = [
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const updateData = { ...req.body };
      
      // Handle Image Upload
      if (req.files && req.files['image'] && req.files['image'][0]) {
        updateData.image = getFullR2Url(req.files['image'][0].key);
      }

      // Handle Gallery Upload
      if (req.files && req.files['gallery']) {
        const newGalleryUrls = req.files['gallery'].map(file => getFullR2Url(file.key));
        updateData.gallery = newGalleryUrls;
      }

      // Parse fields if they are strings (from FormData)
      if (typeof updateData.subjectIds === 'string') {
        updateData.subjectIds = JSON.parse(updateData.subjectIds);
      }
      
      let itemsToUpdate = null;
      if (typeof updateData.items === 'string') {
        itemsToUpdate = JSON.parse(updateData.items).map(it => ({
          productId: it.productId,
          quantity: Number(it.quantity) || 1
        }));
        delete updateData.items;
      }

      const updatedCombo = await sequelize.transaction(async (t) => {
        const combo = await ComboProduct.findByPk(req.params.id, { transaction: t });
        if (!combo) return null;

        await combo.update(updateData, { transaction: t });

        if (itemsToUpdate) {
          await ComboItem.destroy({ where: { comboProductId: combo.id }, transaction: t });
          await ComboItem.bulkCreate(
            itemsToUpdate.map(it => ({ ...it, comboProductId: combo.id })),
            { transaction: t }
          );
        }

        const productLinks = req.body.productLinks ? (typeof req.body.productLinks === 'string' ? JSON.parse(req.body.productLinks) : req.body.productLinks) : null;
        if (productLinks && Array.isArray(productLinks)) {
          await ProductLink.destroy({ where: { comboProductId: combo.id }, transaction: t });
          
          // Defensively map and clean combo link data for 'Perfect' saving
          const cleanedLinks = productLinks.map(link => ({
            language: link.language || "",
            type: link.type || "Soft Copy",
            price: parseFloat(link.price) || 0,
            link: link.link || "",
            comboProductId: combo.id
          }));

          await ProductLink.bulkCreate(cleanedLinks, { transaction: t });
        }
        return combo;
      });

      if (!updatedCombo) {
        return res.status(404).json({ success: false, message: 'Combo not found' });
      }

      // Finalize outside transaction to prevent crash on rollback of finished state
      try {
        await clearAllCache();
        const fullComboData = await ComboProduct.findByPk(updatedCombo.id, {
          include: [
            { model: ComboItem, as: 'items', include: [{ model: Product, as: 'product' }] },
            { model: MainDegree, as: 'mainDegree' },
            { model: SubDegree, as: 'subDegree' },
            ProductLink
          ]
        });
        return res.status(200).json({ success: true, data: fullComboData, message: "Combo updated successfully" });
      } catch (err) {
        console.error("Post-commit combo refresh error:", err);
        return res.status(200).json({ success: true, message: "Combo updated, but failed to refresh local view correctly." });
      }
    } catch (err) {
      console.error('Update combo error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
];

/* =======================
   TOGGLE PUBLISH
======================= */
exports.toggleComboPublish = async (req, res) => {
  try {
    const combo = await ComboProduct.findByPk(req.params.id);
    if (!combo) return res.status(404).json({ success: false, message: 'Combo not found' });
    const { isActive } = req.body;
    await combo.update({ isActive });
    await clearAllCache();
    return res.status(200).json({ success: true, data: combo, message: `Combo ${isActive ? 'published' : 'drafted'}` });
  } catch (err) {
    console.error('Toggle combo publish error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =======================
   BULK PUBLISH
======================= */
exports.bulkPublishCombos = async (req, res) => {
  try {
    const { ids, isPublished } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'No ids provided' });
    await ComboProduct.update({ isActive: isPublished }, { where: { id: ids } });
    await clearAllCache();
    return res.status(200).json({ success: true, message: `${ids.length} combo(s) ${isPublished ? 'published' : 'drafted'}` });
  } catch (err) {
    console.error('Bulk publish combos error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =======================
   DELETE COMBO PRODUCT
======================= */
exports.deleteComboProduct = async (req, res) => {
  try {
    const combo = await ComboProduct.findByPk(req.params.id);
    if (!combo) {
      return res.status(404).json({ success: false, message: 'Combo not found' });
    }

    // Delete Main Image
    if (combo.image) {
      await deleteFromR2(combo.image).catch(err => console.error("R2 Delete Error:", err));
    }
 
    // Delete Gallery
    if (combo.gallery && Array.isArray(combo.gallery)) {
      for (const url of combo.gallery) {
        await deleteFromR2(url).catch(err => console.error("R2 Delete Error:", err));
      }
    }

    await combo.destroy();
    return res.status(200).json({ success: true, message: 'Combo deleted successfully' });
  } catch (err) {
    console.error('Delete combo error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
