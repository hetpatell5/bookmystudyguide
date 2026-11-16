const { Semester } = require("../model/mysql");
const { success, error } = require("../utils/response");

exports.create = async (req, res) => {
    try {
        const { name } = req.body;
        const saved = await Semester.create({ name });
        return success(res, saved, "Semester created successfully", 201);
    } catch (err) {
        return error(res, err.message);
    }
};

exports.getAll = async (req, res) => {
    try {
        const list = await Semester.findAll({ order: [['createdAt', 'DESC']] });
        return success(res, list, "Semesters retrieved");
    } catch (err) {
        return error(res, err.message);
    }
};

exports.update = async (req, res) => {
    try {
        const { name } = req.body;
        const [updatedRows] = await Semester.update(
            { name },
            { where: { id: req.params.id } }
        );
        if (!updatedRows) return error(res, "Semester not found", 404);
        const updated = await Semester.findByPk(req.params.id);
        return success(res, updated, "Semester updated successfully");
    } catch (err) {
        return error(res, err.message);
    }
};

exports.remove = async (req, res) => {
    try {
        const deleted = await Semester.destroy({ where: { id: req.params.id } });
        if (!deleted) return error(res, "Semester not found", 404);
        return success(res, null, "Semester deleted successfully");
    } catch (err) {
        return error(res, err.message);
    }
};
