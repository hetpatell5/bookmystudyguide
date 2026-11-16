const { FAQ: Faq } = require("../model/mysql");

// Get all FAQs
exports.getAllFaqs = async (req, res) => {
    try {
        const faqs = await Faq.findAll({ order: [['createdAt', 'ASC']] });
        res.status(200).json({
            success: true,
            data: faqs,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// Create a new FAQ (Admin Only)
exports.createFaq = async (req, res) => {
    try {
        const { question, answer } = req.body;

        if (!question || !answer) {
            return res.status(400).json({
                success: false,
                message: "Please provide both question and answer",
            });
        }

        const newFaq = await Faq.create({ question, answer });

        res.status(201).json({
            success: true,
            data: newFaq,
            message: "FAQ created successfully!",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// Update an FAQ (Admin Only)
exports.updateFaq = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer } = req.body;

        const [updatedRows] = await Faq.update(
            { question, answer },
            { where: { id } }
        );

        if (!updatedRows) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
        }

        const faq = await Faq.findByPk(id);

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
        }

        res.status(200).json({
            success: true,
            data: faq,
            message: "FAQ updated successfully!",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// Delete an FAQ (Admin Only)
exports.deleteFaq = async (req, res) => {
    try {
        const { id } = req.params;

        const faq = await Faq.destroy({ where: { id } });

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "FAQ deleted successfully!",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};
