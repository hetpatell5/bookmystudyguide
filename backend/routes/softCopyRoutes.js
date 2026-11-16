const express = require('express');
const router = express.Router();
const { SoftCopy, sequelize } = require("../model/mysql");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- 1. MULTER CONFIGURATION (For File Upload) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/softcopies';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB Limit
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|epub|mobi|zip|rar|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        } else {
            cb('Error: Invalid file type!');
        }
    }
});

// --- 2. API ENDPOINTS ---

// GET: Fetch All Soft Copies
router.get('/soft-copies', async (req, res) => {
    try {
        const softCopies = await SoftCopy.findAll({ order: [['createdAt', 'DESC']] });
        res.json(softCopies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST: Add New Soft Copy (Handles both File and Link)
router.post('/soft-copy', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const {
            title, description, price, resourceType, resourceLink,
            bookId, mainDegreeId, subDegreeId, subjectId,
            bookName, mainDegree, subDegree, subject, language
        } = req.body;

        // Validation Logic
        if (resourceType === 'link') {
            if (!resourceLink) {
                return res.status(400).json({ message: "Link is required when resource type is 'link'" });
            }
        } else {
            if (!req.file) {
                return res.status(400).json({ message: "Please upload a file." });
            }
        }

        const savedItem = await SoftCopy.create({
            title,
            description,
            price,
            resourceType: resourceType || 'file',
            language: language || 'Gujarati',
            resourceLink: resourceType === 'link' ? resourceLink : null,
            fileName: req.file ? req.file.originalname : null,
            filePath: req.file ? req.file.path.replace(/\\/g, "/") : null,
            bookId, 
            mainDegreeId, 
            subDegreeId, 
            subjectId,
            bookName, 
            mainDegree, 
            subDegree, 
            subject
        });

        res.status(201).json(savedItem);

    } catch (err) {
        console.error("Backend Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// PUT: Update Soft Copy
router.put('/soft-copy/:id', upload.single('file'), async (req, res) => {
    try {
        const { title, description, price, subject, resourceType, resourceLink, language } = req.body;

        let updateData = {
            title, description, price, subject, resourceType, language
        };

        if (resourceType === 'link') {
            updateData.resourceLink = resourceLink;
            updateData.fileName = null;
            updateData.filePath = null;
        }

        if (req.file) {
            updateData.fileName = req.file.originalname;
            updateData.filePath = req.file.path.replace(/\\/g, "/");
            updateData.resourceLink = null;
        }

        const [updatedRows] = await SoftCopy.update(updateData, { where: { id: req.params.id } });
        if (updatedRows === 0) return res.status(404).json({ message: "Item not found" });
        
        const updatedItem = await SoftCopy.findByPk(req.params.id);
        res.json(updatedItem);

    } catch (err) {
        res.status(500).json({ message: "Update Failed" });
    }
});

// DELETE: Remove Soft Copy
router.delete('/soft-copy/:id', async (req, res) => {
    try {
        const item = await SoftCopy.findByPk(req.params.id);
        if (item) {
            if (item.filePath && fs.existsSync(path.join(process.cwd(), item.filePath))) {
                fs.unlinkSync(path.join(process.cwd(), item.filePath));
            }
            await item.destroy();
            res.json({ message: "Deleted Successfully" });
        } else {
            res.status(404).json({ message: "Item not found" });
        }
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ message: "Delete Failed" });
    }
});

// GET: Find Soft Copy by IDs (STRICT MODE)
router.get('/find-soft-copy', async (req, res) => {
    try {
        const { bookId, subjectId } = req.query;

        if (!bookId && !subjectId) {
            return res.status(400).json({ message: "Please provide bookId or subjectId" });
        }

        let where = {};
        if (bookId) where.bookId = bookId;
        if (subjectId) where.subjectId = subjectId;

        const softCopy = await SoftCopy.findOne({ where });

        if (!softCopy) {
            return res.status(404).json({ message: "Soft copy not found" });
        }

        res.json(softCopy);

    } catch (err) {
        console.error("Error:", err.message);
        res.status(500).json({ message: "Invalid ID Format or Server Error" });
    }
});

module.exports = router;
