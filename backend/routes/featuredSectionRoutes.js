const express = require("express");
const router = express.Router();
const { FeaturedSection, Product, MainDegree, SubDegree, Book, ComboProduct } = require("../model/mysql");
const { Op } = require("sequelize");
const adminAuth = require("../middleware/adminAuth");

const COMBO_TAB_ID = "combo";

// Fixed default tab priority: Important Questions, AI Notes, Mastery Guide,
// then Combo Books last — applied whenever a section has no custom
// bookTypeOrder set. Anything not listed here (e.g. Assignments Solution)
// sorts after these by name.
const DEFAULT_BOOK_TYPE_PRIORITY = [
  "Important Question Bank with Solutions",
  "Simplified NotesByAI",
  "IGNOU Curriculum Mastery Guide",
];

function sortBookTypesByDefaultPriority(bookTypes) {
  return [...bookTypes].sort((a, b) => {
    const ai = DEFAULT_BOOK_TYPE_PRIORITY.indexOf(a.name);
    const bi = DEFAULT_BOOK_TYPE_PRIORITY.indexOf(b.name);
    if (a.id === COMBO_TAB_ID) return 1;
    if (b.id === COMBO_TAB_ID) return -1;
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// ─── Helper: resolve products grouped by book type ───────────────────────────
async function resolveProductsForSection(section) {
  const where = { isActive: true };
  const subIds  = Array.isArray(section.subDegreeIds)  ? section.subDegreeIds.filter(Boolean)  : [];
  const mainIds = Array.isArray(section.mainDegreeIds) ? section.mainDegreeIds.filter(Boolean) : [];

  if (subIds.length > 0) {
    where.subDegreeId = { [Op.in]: subIds };
  } else if (mainIds.length > 0) {
    where.mainDegreeId = { [Op.in]: mainIds };
  } else {
    return { flat: [], byBookType: [] };
  }

  const products = await Product.findAll({
    where,
    attributes: ["id", "title", "price", "mrp", "images", "coverImageIndex", "bookId"],
    order: [["createdAt", "DESC"]],
    include: [{
      model: Book,
      as: "Book",
      attributes: ["id", "name"],
      required: false,
    }]
  });

  const plain = products.map((p) => {
    const obj = p.toJSON();
    const imgs = Array.isArray(obj.images) ? obj.images : [];
    const idx = obj.coverImageIndex || 0;
    obj.image = imgs[idx] || imgs[0] || null;
    return obj;
  });

  // Group by book type, respecting bookTypeOrder
  const bookTypeOrder = Array.isArray(section.bookTypeOrder) ? section.bookTypeOrder : [];
  const grouped = {};

  plain.forEach(p => {
    const btId = p.bookId || "__none__";
    const btName = p.Book?.name || "Other";
    if (!grouped[btId]) {
      grouped[btId] = { id: btId, name: btName, products: [] };
    }
    grouped[btId].products.push(p);
  });

  // Sort groups by admin-defined order if set, otherwise the fixed default priority
  const sortedGroups = bookTypeOrder.length > 0
    ? Object.values(grouped).sort((a, b) => {
        const ai = bookTypeOrder.indexOf(a.id);
        const bi = bookTypeOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : sortBookTypesByDefaultPriority(Object.values(grouped));

  return { flat: plain, byBookType: sortedGroups };
}

// ─── PUBLIC: List all active sections ────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const isAdmin = req.query.admin === "true";
    const where = isAdmin ? {} : { isActive: true };

    const sections = await FeaturedSection.findAll({
      where,
      order: [["order", "ASC"], ["createdAt", "DESC"]],
    });

    const result = await Promise.all(
      sections.map(async (sec) => {
        const plain = sec.toJSON();
        const resolved = await resolveProductsForSection(plain);
        plain.products   = resolved.flat;
        plain.byBookType = resolved.byBookType;

        if (plain.mainDegreeIds?.length) {
          const mDegrees = await MainDegree.findAll({ where: { id: { [Op.in]: plain.mainDegreeIds } }, attributes: ["id", "name"] });
          plain.mainDegrees = mDegrees;
        } else { plain.mainDegrees = []; }

        if (plain.subDegreeIds?.length) {
          const sDegrees = await SubDegree.findAll({ where: { id: { [Op.in]: plain.subDegreeIds } }, attributes: ["id", "name"] });
          plain.subDegrees = sDegrees;
        } else { plain.subDegrees = []; }

        return plain;
      })
    );

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("FeaturedSection GET Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUBLIC: Single section — returns metadata + book types (no products) ────
router.get("/:id", async (req, res) => {
  try {
    const section = await FeaturedSection.findByPk(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: "Not found" });
    const plain = section.toJSON();

    if (plain.mainDegreeIds?.length) {
      const mDegrees = await MainDegree.findAll({ where: { id: { [Op.in]: plain.mainDegreeIds } }, attributes: ["id", "name"] });
      plain.mainDegrees = mDegrees;
    } else { plain.mainDegrees = []; }

    if (plain.subDegreeIds?.length) {
      const sDegrees = await SubDegree.findAll({ where: { id: { [Op.in]: plain.subDegreeIds } }, attributes: ["id", "name"] });
      plain.subDegrees = sDegrees;
    } else { plain.subDegrees = []; }

    // Only include book types that actually have at least one matching,
    // active product in this section's degree — an empty tab is not shown.
    const where = { isActive: true };
    const subIds  = plain.subDegreeIds?.filter(Boolean) || [];
    const mainIds = plain.mainDegreeIds?.filter(Boolean) || [];
    let bookTypes = [];

    if (subIds.length > 0 || mainIds.length > 0) {
      if (subIds.length > 0) where.subDegreeId = { [Op.in]: subIds };
      else where.mainDegreeId = { [Op.in]: mainIds };

      const productsInDegree = await Product.findAll({
        where,
        attributes: ["bookId"],
        include: [{ model: Book, as: "Book", attributes: ["id", "name"], required: true }],
      });

      const seen = new Set();
      productsInDegree.forEach((p) => {
        const book = p.Book;
        if (!book || seen.has(book.id)) return;
        seen.add(book.id);
        // Filter out unwanted book types (like Project/Practical) from being featured section tabs
        if (!book.name.includes("Project | Practical")) {
          bookTypes.push({ id: book.id, name: book.name });
        }
      });
    }

    // Add a synthetic "Combo Books" tab if any combo bundles match this section's degree
    const comboWhere = { isActive: true };
    if (subIds.length > 0) comboWhere.subDegreeId = { [Op.in]: subIds };
    else if (mainIds.length > 0) comboWhere.mainDegreeId = { [Op.in]: mainIds };
    if (comboWhere.subDegreeId || comboWhere.mainDegreeId) {
      const comboCount = await ComboProduct.count({ where: comboWhere });
      if (comboCount > 0) {
        bookTypes.push({ id: COMBO_TAB_ID, name: "Combo Books" });
      }
    }

    plain.bookTypes = sortBookTypesByDefaultPriority(bookTypes);
    // No products in this response — loaded on-demand per tab
    delete plain.products;
    delete plain.byBookType;

    res.json({ success: true, data: plain });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUBLIC: On-demand tab — fetch products for section + book type ───────────
router.get("/:id/tab/:bookTypeId", async (req, res) => {
  try {
    const section = await FeaturedSection.findByPk(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: "Section not found" });
    const plain = section.toJSON();

    const subIds  = (plain.subDegreeIds  || []).filter(Boolean);
    const mainIds = (plain.mainDegreeIds || []).filter(Boolean);
    const bookTypeId = req.params.bookTypeId;

    if (bookTypeId === COMBO_TAB_ID) {
      const comboWhere = { isActive: true };
      if (subIds.length > 0) comboWhere.subDegreeId = { [Op.in]: subIds };
      else if (mainIds.length > 0) comboWhere.mainDegreeId = { [Op.in]: mainIds };
      else return res.json({ success: true, data: [] });

      const combos = await ComboProduct.findAll({
        where: comboWhere,
        attributes: ["id", "title", "price", "cancelPrice", "image", "gallery"],
        order: [["createdAt", "DESC"]],
      });

      const result = combos.map((c) => {
        const obj = c.toJSON();
        return {
          id: obj.id,
          title: obj.title,
          price: obj.price,
          mrp: obj.cancelPrice,
          image: obj.image || null,
          isCombo: true,
        };
      });

      return res.json({ success: true, data: result });
    }

    const where = { isActive: true };
    if (subIds.length > 0) where.subDegreeId = { [Op.in]: subIds };
    else if (mainIds.length > 0) where.mainDegreeId = { [Op.in]: mainIds };
    else return res.json({ success: true, data: [] });

    // Filter by the requested book type
    if (bookTypeId && bookTypeId !== "all") {
      where.bookId = bookTypeId;
    }

    const products = await Product.findAll({
      where,
      attributes: ["id", "title", "price", "mrp", "images", "coverImageIndex", "bookId"],
      order: [["createdAt", "DESC"]],
    });

    const result = products.map((p) => {
      const obj = p.toJSON();
      const imgs = Array.isArray(obj.images) ? obj.images : [];
      const idx = obj.coverImageIndex || 0;
      obj.image = imgs[idx] || imgs[0] || null;
      return obj;
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ADMIN: Create ─────────────────────────────────────────────────────────
router.post("/", adminAuth, async (req, res) => {
  try {
    const { title, subtitle, mainDegreeIds, subDegreeIds, bookTypeOrder, isActive, order } = req.body;
    if (!title) return res.status(400).json({ success: false, message: "Title is required" });
    if (!mainDegreeIds || mainDegreeIds.length === 0) return res.status(400).json({ success: false, message: "At least one Main Degree is required" });

    const section = await FeaturedSection.create({
      title,
      subtitle: subtitle || null,
      mainDegreeIds: mainDegreeIds || [],
      subDegreeIds: subDegreeIds || [],
      bookTypeOrder: bookTypeOrder || [],
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
    });
    res.status(201).json({ success: true, data: section });
  } catch (err) {
    console.error("FeaturedSection POST Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ADMIN: Update ─────────────────────────────────────────────────────────
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const section = await FeaturedSection.findByPk(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: "Not found" });
    const { title, subtitle, mainDegreeIds, subDegreeIds, bookTypeOrder, isActive, order } = req.body;
    await section.update({
      title: title ?? section.title,
      subtitle: subtitle !== undefined ? subtitle : section.subtitle,
      mainDegreeIds: mainDegreeIds !== undefined ? (mainDegreeIds || []) : section.mainDegreeIds,
      subDegreeIds: subDegreeIds !== undefined ? (subDegreeIds || []) : section.subDegreeIds,
      bookTypeOrder: bookTypeOrder !== undefined ? (bookTypeOrder || []) : section.bookTypeOrder,
      isActive: isActive !== undefined ? isActive : section.isActive,
      order: order !== undefined ? order : section.order,
    });
    res.json({ success: true, data: section });
  } catch (err) {
    console.error("FeaturedSection PUT Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ADMIN: Delete ─────────────────────────────────────────────────────────
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const section = await FeaturedSection.findByPk(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: "Not found" });
    await section.destroy();
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
