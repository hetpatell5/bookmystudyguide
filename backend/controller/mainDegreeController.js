const { MainDegree, SubDegree, Subject } = require("../model/mysql");
const { success, error } = require("../utils/response");
const { clearAllCache } = require("../utils/redis");

exports.create = async (req, res) => {
  try {
    const { name, icon, color, description } = req.body;
    const saved = await MainDegree.create({ name, icon, color, description });
    await clearAllCache();
    return success(res, saved, "Main Degree created successfully", 201);
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
      const { count, rows } = await MainDegree.findAndCountAll({ where, order, limit, offset });
      const { paginated } = require("../utils/response");
      return paginated(res, rows, count, page, limit, "Main Degrees retrieved");
    } else {
      const list = await MainDegree.findAll({ where, order });
      return success(res, list, "Main Degrees retrieved");
    }
  } catch (err) {
    return error(res, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const { name, icon, color, description, isPublished } = req.body;
    const updateData = { name, icon, color, description };
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const [updatedCount] = await MainDegree.update(
      updateData,
      { where: { id: req.params.id } }
    );
    if (updatedCount === 0) return error(res, "Main Degree not found", 404);
    
    const updated = await MainDegree.findByPk(req.params.id);
    await clearAllCache();
    return success(res, updated, "Main Degree updated successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await MainDegree.destroy({ where: { id: req.params.id } });
    if (!deleted) return error(res, "Main Degree not found", 404);
    await clearAllCache();
    return success(res, null, "Deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.bulkCreate = async (req, res) => {
  try {
    const { names } = req.body;
    if (!names || !Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ success: false, message: "Names array is required" });
    }

    const degrees = names.map(name => ({ name }));
    const savedDegrees = await MainDegree.bulkCreate(degrees);
    await clearAllCache();
    res.status(201).json({
      success: true,
      data: savedDegrees,
      message: `${savedDegrees.length} Main Degrees created successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Toggle publish for a single MainDegree — cascades to all SubDegrees and their Subjects
exports.togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    if (isPublished === undefined) {
      return error(res, "isPublished is required", 400);
    }

    // 1. Update the MainDegree itself
    const [updatedCount] = await MainDegree.update(
      { isPublished },
      { where: { id } }
    );
    if (updatedCount === 0) return error(res, "Main Degree not found", 404);

    // 2. Find all SubDegrees under this MainDegree
    const subDegrees = await SubDegree.findAll({ where: { mainDegreeId: id }, attributes: ['id'] });
    const subDegreeIds = subDegrees.map(s => s.id);

    if (subDegreeIds.length > 0) {
      // 3. Cascade to SubDegrees
      await SubDegree.update({ isPublished }, { where: { mainDegreeId: id } });

      // 4. Cascade to all Subjects under those SubDegrees
      await Subject.update({ isPublished }, { where: { subDegreeId: subDegreeIds } });
    }

    await clearAllCache();
    const updated = await MainDegree.findByPk(id);
    return success(res, updated, `Main Degree ${isPublished ? 'published' : 'drafted'} (cascade applied)`);
  } catch (err) {
    return error(res, err.message);
  }
};

// Bulk delete multiple MainDegrees (cascades via DB foreign keys)
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error(res, "ids array is required", 400);
    }
    const deleted = await MainDegree.destroy({ where: { id: ids } });
    await clearAllCache();
    return success(res, null, `${deleted} Main Degrees deleted`);
  } catch (err) {
    return error(res, err.message);
  }
};

// Bulk toggle publish for multiple MainDegrees — cascades each
exports.bulkPublish = async (req, res) => {
  try {
    const { ids, isPublished } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error(res, "ids array is required", 400);
    }
    if (isPublished === undefined) {
      return error(res, "isPublished is required", 400);
    }

    // 1. Update MainDegrees
    await MainDegree.update({ isPublished }, { where: { id: ids } });

    // 2. Find all SubDegrees under these MainDegrees
    const subDegrees = await SubDegree.findAll({ where: { mainDegreeId: ids }, attributes: ['id'] });
    const subDegreeIds = subDegrees.map(s => s.id);

    if (subDegreeIds.length > 0) {
      // 3. Cascade to SubDegrees
      await SubDegree.update({ isPublished }, { where: { mainDegreeId: ids } });

      // 4. Cascade to Subjects
      await Subject.update({ isPublished }, { where: { subDegreeId: subDegreeIds } });
    }

    await clearAllCache();
    return success(res, null, `${ids.length} Main Degrees ${isPublished ? 'published' : 'drafted'} (cascade applied)`);
  } catch (err) {
    return error(res, err.message);
  }
};
