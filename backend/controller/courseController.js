const { Course } = require("../model/mysql");
const { success, error } = require("../utils/response");

exports.create = async (req, res) => {
    try {
        const { name } = req.body;
        const saved = await Course.create({ name });
        return success(res, saved, "Course created successfully", 201);
    } catch (err) {
        return error(res, err.message);
    }
};

exports.getAll = async (req, res) => {
    try {
        const list = await Course.findAll({ order: [['createdAt', 'DESC']] });
        return success(res, list, "Courses retrieved");
    } catch (err) {
        return error(res, err.message);
    }
};

exports.update = async (req, res) => {
    try {
        const { name } = req.body;
        const [updatedRows] = await Course.update(
            { name },
            { where: { id: req.params.id } }
        );
        if (!updatedRows) return error(res, "Course not found", 404);
        const updated = await Course.findByPk(req.params.id);
        return success(res, updated, "Course updated successfully");
    } catch (err) {
        return error(res, err.message);
    }
};

exports.remove = async (req, res) => {
    try {
        const deleted = await Course.destroy({ where: { id: req.params.id } });
        if (!deleted) return error(res, "Course not found", 404);
        return success(res, null, "Course deleted successfully");
    } catch (err) {
        return error(res, err.message);
    }
};
