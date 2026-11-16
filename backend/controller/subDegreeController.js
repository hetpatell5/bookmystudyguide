const { SubDegree, Subject } = require("../model/mysql");
const { success, error } = require("../utils/response");
const { clearAllCache } = require("../utils/redis");

exports.create = async (req, res) => {
  try {
    const { name, mainDegreeId } = req.body;
    if (!mainDegreeId) {
      return error(res, "Main Degree is required", 400);
    }
    const saved = await SubDegree.create({ name, mainDegreeId });
    await clearAllCache();
    return success(res, saved, "Sub Degree created successfully", 201);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getAll = async (req, res) => {
  try {
    const { Op } = require("sequelize");
    const { mainDegreeId, search, page: pageQ, limit: limitQ } = req.query;
    const filter = mainDegreeId ? { mainDegreeId } : {};
    
    if (search) {
      filter.name = { [Op.like]: `%${search}%` };
    }

    if (!req.query.admin) {
      filter.isPublished = true;
    }

    const order = [['createdAt', 'DESC']];
    const page = parseInt(pageQ);
    const limit = parseInt(limitQ);

    if (page && limit) {
      const offset = (page - 1) * limit;
      const { count, rows } = await SubDegree.findAndCountAll({ where: filter, order, limit, offset });
      const { paginated } = require("../utils/response");
      return paginated(res, rows, count, page, limit, "Sub Degrees retrieved");
    } else {
      const list = await SubDegree.findAll({ where: filter, order });
      return success(res, list, "Sub Degrees retrieved");
    }
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await SubDegree.findByPk(req.params.id);
    if (!item) return error(res, "Sub Degree not found", 404);
    return success(res, item, "Sub Degree retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const { name, mainDegreeId, isPublished } = req.body;
    const updateData = { name, mainDegreeId };
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const [updatedCount] = await SubDegree.update(
      updateData,
      { where: { id: req.params.id } }
    );
    if (updatedCount === 0) return error(res, "Sub Degree not found", 404);
    
    const updated = await SubDegree.findByPk(req.params.id);
    await clearAllCache();
    return success(res, updated, "Sub Degree updated successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await SubDegree.destroy({ where: { id: req.params.id } });
    if (!deleted) return error(res, "Sub Degree not found", 404);
    await clearAllCache();
    return success(res, null, "Deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.bulkCreate = async (req, res) => {
  try {
    const { names, mainDegreeId } = req.body;
    if (!mainDegreeId) {
      return res.status(400).json({ success: false, message: "Main Degree is required" });
    }
    if (!names || !Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ success: false, message: "Names array is required" });
    }

    const subDegreesData = names.map(name => ({ name, mainDegreeId }));
    const savedSubDegrees = await SubDegree.bulkCreate(subDegreesData);
    await clearAllCache();
    res.status(201).json({
      success: true,
      data: savedSubDegrees,
      message: `${savedSubDegrees.length} Sub Degrees created successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Toggle publish for a single SubDegree — cascades to all its Subjects
exports.togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    if (isPublished === undefined) {
      return error(res, "isPublished is required", 400);
    }

    // 1. Update SubDegree itself
    const [updatedCount] = await SubDegree.update(
      { isPublished },
      { where: { id } }
    );
    if (updatedCount === 0) return error(res, "Sub Degree not found", 404);

    // 2. Cascade to all Subjects under this SubDegree
    await Subject.update({ isPublished }, { where: { subDegreeId: id } });

    await clearAllCache();
    const updated = await SubDegree.findByPk(id);
    return success(res, updated, `Sub Degree ${isPublished ? 'published' : 'drafted'} (cascade applied)`);
  } catch (err) {
    return error(res, err.message);
  }
};

// Bulk delete multiple SubDegrees
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error(res, "ids array is required", 400);
    }
    const deleted = await SubDegree.destroy({ where: { id: ids } });
    await clearAllCache();
    return success(res, null, `${deleted} Sub Degrees deleted`);
  } catch (err) {
    return error(res, err.message);
  }
};

// Bulk toggle publish for multiple SubDegrees — cascades to Subjects
exports.bulkPublish = async (req, res) => {
  try {
    const { ids, isPublished } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error(res, "ids array is required", 400);
    }
    if (isPublished === undefined) {
      return error(res, "isPublished is required", 400);
    }

    // 1. Update SubDegrees
    await SubDegree.update({ isPublished }, { where: { id: ids } });

    // 2. Cascade to Subjects under these SubDegrees
    await Subject.update({ isPublished }, { where: { subDegreeId: ids } });

    await clearAllCache();
    return success(res, null, `${ids.length} Sub Degrees ${isPublished ? 'published' : 'drafted'} (cascade applied)`);
  } catch (err) {
    return error(res, err.message);
  }
};
