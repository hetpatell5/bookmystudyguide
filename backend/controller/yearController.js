const { Year } = require("../model/mysql");
const { success, error } = require("../utils/response");

exports.create = async (req, res) => {
    try {
        const { name } = req.body;
        const saved = await Year.create({ name });
        return success(res, saved, "Year created successfully", 201);
    } catch (err) {
        return error(res, err.message);
    }
};

exports.getAll = async (req, res) => {
    try {
        const list = await Year.findAll({ order: [['createdAt', 'DESC']] });
        return success(res, list, "Years retrieved");
    } catch (err) {
        return error(res, err.message);
    }
};

exports.update = async (req, res) => {
    try {
        const { name } = req.body;
        const [updatedRows] = await Year.update(
            { name },
            { where: { id: req.params.id } }
        );
        if (!updatedRows) return error(res, "Year not found", 404);
        const updated = await Year.findByPk(req.params.id);
        return success(res, updated, "Year updated successfully");
    } catch (err) {
        return error(res, err.message);
    }
};

exports.remove = async (req, res) => {
    try {
        const deleted = await Year.destroy({ where: { id: req.params.id } });
        if (!deleted) return error(res, "Year not found", 404);
        return success(res, null, "Year deleted successfully");
    } catch (err) {
        return error(res, err.message);
    }
};
