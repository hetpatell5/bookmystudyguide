const { Project } = require("../model/mysql");
const upload = require("../middleware/uploadMiddleware");
const { deleteFromR2, getFullR2Url } = require("../utils/r2Utils");
const { clearAllCache } = require("../utils/redis");

/* CREATE */
exports.createProject = [
  upload.fields([{ name: "image", maxCount: 1 }, { name: "gallery", maxCount: 10 }]),
  async (req, res) => {
    try {
      const { title, description, category, price, cancelPrice, tags, isActive } = req.body;
      const image = req.files?.image?.[0] ? getFullR2Url(req.files.image[0].key) : "";
      const gallery = req.files?.gallery ? req.files.gallery.map(f => getFullR2Url(f.key)) : [];

      const project = await Project.create({
        title, description, category, price, cancelPrice,
        tags: tags ? JSON.parse(tags) : [],
        isActive: isActive === "true",
        image, gallery,
      });

      await clearAllCache();
      return res.status(201).json({ success: true, data: project, message: "Project created" });
    } catch (err) {
      console.error("Create project error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
];

/* GET ALL */
exports.getProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const { count, rows } = await Project.findAndCountAll({
      order: [["createdAt", "DESC"]],
      offset,
      limit,
    });

    return res.status(200).json({ success: true, data: rows, pagination: { total: count, page, pages: Math.ceil(count / limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* GET BY ID */
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    return res.status(200).json({ success: true, data: project });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* UPDATE */
exports.updateProject = [
  upload.fields([{ name: "image", maxCount: 1 }, { name: "gallery", maxCount: 10 }]),
  async (req, res) => {
    try {
      const project = await Project.findByPk(req.params.id);
      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      const updateData = { ...req.body };
      if (req.files?.image?.[0]) updateData.image = getFullR2Url(req.files.image[0].key);
      if (req.files?.gallery) updateData.gallery = req.files.gallery.map(f => getFullR2Url(f.key));
      if (typeof updateData.tags === "string") updateData.tags = JSON.parse(updateData.tags);
      if (typeof updateData.isActive === "string") updateData.isActive = updateData.isActive === "true";

      await project.update(updateData);
      await clearAllCache();
      return res.status(200).json({ success: true, data: project, message: "Project updated" });
    } catch (err) {
      console.error("Update project error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
];

/* TOGGLE PUBLISH */
exports.toggleProjectPublish = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    await project.update({ isActive: req.body.isActive });
    await clearAllCache();
    return res.status(200).json({ success: true, data: project });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* BULK PUBLISH */
exports.bulkPublishProjects = async (req, res) => {
  try {
    const { ids, isPublished } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: "No ids provided" });
    await Project.update({ isActive: isPublished }, { where: { id: ids } });
    await clearAllCache();
    return res.status(200).json({ success: true, message: `${ids.length} project(s) updated` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* DELETE */
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    if (project.image) await deleteFromR2(project.image).catch(console.error);
    if (Array.isArray(project.gallery))
      for (const url of project.gallery) await deleteFromR2(url).catch(console.error);
    await project.destroy();
    await clearAllCache();
    return res.status(200).json({ success: true, message: "Project deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
