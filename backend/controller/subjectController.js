const { Subject, SubDegree, MainDegree } = require("../model/mysql");
const { success, error, paginated } = require("../utils/response");
const { clearAllCache } = require("../utils/redis");

exports.create = async (req, res) => {
  try {
    const { name, code, mainDegreeId, subDegreeId, year, semester, course } = req.body;

    if (!mainDegreeId || !subDegreeId || !year || !semester || !course) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const saved = await Subject.create({
      name,
      code,
      mainDegreeId,
      subDegreeId,
      year,
      semester,
      course,
    });

    await clearAllCache();
    res.status(201).json({ success: true, data: saved, message: "Subject created successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { Op } = require("sequelize");
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    const { subDegreeId, mainDegreeId, search } = req.query;
    const isAdmin = !!req.query.admin;
    const where = {};
    if (subDegreeId) where.subDegreeId = subDegreeId;
    if (mainDegreeId) where.mainDegreeId = mainDegreeId;

    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    if (!isAdmin) where.isPublished = true;

    const order = [['createdAt', 'DESC']];

    const include = [
      { model: SubDegree, attributes: ['id', 'name'] },
      { model: MainDegree, attributes: ['id', 'name'] },
    ];

    if (page && limit) {
      const maxLimit = isAdmin ? 500 : 100;
      const clampedLimit = Math.min(Math.max(limit, 1), maxLimit);
      const clampedPage = Math.max(page, 1);
      const offset = (clampedPage - 1) * clampedLimit;
      const { count, rows } = await Subject.findAndCountAll({ where, order, limit: clampedLimit, offset, include });
      const { paginated } = require("../utils/response");
      return paginated(res, rows, count, clampedPage, clampedLimit, "Subjects retrieved");
    } else {
      const list = await Subject.findAll({ where, order, include });
      return success(res, list, "Subjects retrieved");
    }
  } catch (err) {
    return error(res, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const { name, code, mainDegreeId, subDegreeId, year, semester, course, isPublished } = req.body;
    const updateData = { name, code, mainDegreeId, subDegreeId, year, semester, course };
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const [updatedCount] = await Subject.update(
      updateData,
      { where: { id: req.params.id } }
    );
    if (updatedCount === 0) return res.status(404).json({ success: false, message: "Subject not found" });
    
    const updated = await Subject.findByPk(req.params.id);
    await clearAllCache();
    res.json({ success: true, data: updated, message: "Subject updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Subject.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ success: false, message: "Subject not found" });
    await clearAllCache();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulkCreate = async (req, res) => {
  try {
    const { names, mainDegreeId, subDegreeId, year, semester, course } = req.body;

    if (!mainDegreeId || !subDegreeId || !year || !semester || !course) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (!names || !Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ success: false, message: "Names array is required" });
    }

    const subjectsData = names.map(name => ({
      name,
      mainDegreeId,
      subDegreeId,
      year,
      semester,
      course
    }));

    const savedSubjects = await Subject.bulkCreate(subjectsData);

    await clearAllCache();
    res.status(201).json({
      success: true,
      data: savedSubjects,
      message: `${savedSubjects.length} Subjects created successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Toggle publish for a single Subject (no cascade — bottom of hierarchy)
exports.togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    if (isPublished === undefined) {
      return error(res, "isPublished is required", 400);
    }

    const [updatedCount] = await Subject.update(
      { isPublished },
      { where: { id } }
    );
    if (updatedCount === 0) return error(res, "Subject not found", 404);

    await clearAllCache();
    const updated = await Subject.findByPk(id);
    return success(res, updated, `Subject ${isPublished ? 'published' : 'drafted'}`);
  } catch (err) {
    return error(res, err.message);
  }
};

// Bulk delete multiple Subjects
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error(res, "ids array is required", 400);
    }
    const deleted = await Subject.destroy({ where: { id: ids } });
    await clearAllCache();
    return success(res, null, `${deleted} Subjects deleted`);
  } catch (err) {
    return error(res, err.message);
  }
};

// Bulk toggle publish for multiple Subjects
exports.bulkPublish = async (req, res) => {
  try {
    const { ids, isPublished } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error(res, "ids array is required", 400);
    }
    if (isPublished === undefined) {
      return error(res, "isPublished is required", 400);
    }

    await Subject.update({ isPublished }, { where: { id: ids } });

    await clearAllCache();
    return success(res, null, `${ids.length} Subjects ${isPublished ? 'published' : 'drafted'}`);
  } catch (err) {
    return error(res, err.message);
  }
};
