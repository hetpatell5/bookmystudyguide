const { Language } = require('../model/mysql');
const { success, error } = require("../utils/response");

exports.create = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return error(res, "Name is required", 400);

        const exists = await Language.findOne({ where: { name } });
        if (exists) return error(res, "Language already exists", 400);

        const newLang = await Language.create({ name });
        return success(res, newLang, "Language created successfully", 201);
    } catch (err) {
        return error(res, err.message);
    }
};

exports.getAll = async (req, res) => {
    try {
        const langs = await Language.findAll({ order: [['createdAt', 'DESC']] });
        return success(res, langs, "Languages retrieved");
    } catch (err) {
        return error(res, err.message);
    }
};

exports.update = async (req, res) => {
    try {
        const { name } = req.body;
        const [updatedRows] = await Language.update(
            { name },
            { where: { id: req.params.id } }
        );
        if (!updatedRows) return error(res, "Language not found", 404);
        const updated = await Language.findByPk(req.params.id);
        return success(res, updated, "Language updated successfully");
    } catch (err) {
        return error(res, err.message);
    }
};

exports.remove = async (req, res) => {
    try {
        const deleted = await Language.destroy({ where: { id: req.params.id } });
        if (!deleted) return error(res, "Language not found", 404);
        return success(res, null, "Language deleted successfully");
    } catch (err) {
        return error(res, err.message);
    }
};
