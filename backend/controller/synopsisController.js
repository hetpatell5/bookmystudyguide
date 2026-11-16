const { Synopsis, MainDegree, SubDegree, Subject, sequelize } = require("../model/mysql");
const { s3Client, bucketName, publicUrl } = require("../config/r2Config");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { deleteFromR2 } = require("../utils/r2Utils");
const { clearAllCache } = require("../utils/redis");

exports.getAllSynopses = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const isAdmin = !!req.query.admin;
    const maxLimit = isAdmin ? 200 : 50;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), maxLimit);
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (!isAdmin) {
      whereClause.isActive = true;
    }

    if (req.query.subDegreeId) {
      whereClause.subDegreeId = req.query.subDegreeId;
    }
    if (req.query.mainDegreeId) {
      whereClause.mainDegreeId = req.query.mainDegreeId;
    }
    if (req.query.type) {
      whereClause.type = req.query.type;
    }
    if (req.query.search) {
      const { Op: SynOp } = require("sequelize");
      whereClause.title = { [SynOp.like]: `%${String(req.query.search).trim()}%` };
    }

    let order = [['createdAt', 'DESC']];
    if (req.query.sort === 'price-asc') order = [['price', 'ASC']];
    else if (req.query.sort === 'price-desc') order = [['price', 'DESC']];

    const { count, rows: synopses } = await Synopsis.findAndCountAll({
      where: whereClause,
      include: [
        { model: MainDegree, attributes: ["id", "name"] },
        { model: SubDegree, attributes: ["id", "name"] },
        { model: Subject, attributes: ["id", "name"] }
      ],
      order,
      offset,
      limit,
      distinct: true
    });

    res.json({
      success: true,
      data: synopses,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit
      }
    });
  } catch (error) {
    console.error("GET synopses error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single synopsis
// @route   GET /api/synopsis/:id
exports.getSynopsisById = async (req, res) => {
  try {
    const synopsis = await Synopsis.findByPk(req.params.id, {
      include: [
        { model: MainDegree },
        { model: SubDegree },
        { model: Subject }
      ]
    });
    if (!synopsis) {
      return res.status(404).json({ success: false, message: "Synopsis not found" });
    }
    res.json({ success: true, data: synopsis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create synopsis
// @route   POST /api/synopsis
exports.createSynopsis = async (req, res) => {
  try {
    const data = { ...req.body };

    // Handle multiple images (Base64 to R2)
    if (data.images && Array.isArray(data.images)) {
      const uploadPromises = data.images.map(async (image) => {
        if (typeof image === "string" && image.startsWith("data:image")) {
          const matches = image.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) return image;

          const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const filename = `uploads/synopsis/syn-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
          const buffer = Buffer.from(matches[2], 'base64');

          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: buffer,
            ContentType: `image/${extension}`,
            ACL: 'public-read'
          }));

          return `${publicUrl}/${filename}`;
        }
        return image;
      });
      data.images = await Promise.all(uploadPromises);
    }

    const synopsis = await Synopsis.create(data);
    await clearAllCache();
    res.status(201).json({ success: true, data: synopsis });
  } catch (error) {
    console.error("Synopsis Creation Error:", error);
    res.status(500).json({ success: false, message: "Failed to create synopsis" });
  }
};

// @desc    Update synopsis
// @route   PATCH /api/synopsis/:id
exports.updateSynopsis = async (req, res) => {
  try {
    const data = { ...req.body };

    // Handle images (Base64 to R2)
    if (data.images && Array.isArray(data.images)) {
      const uploadPromises = data.images.map(async (image) => {
        if (typeof image === "string" && image.startsWith("data:image")) {
          const matches = image.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) return image;

          const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const filename = `uploads/synopsis/syn-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
          const buffer = Buffer.from(matches[2], 'base64');

          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: buffer,
            ContentType: `image/${extension}`,
            ACL: 'public-read'
          }));

          return `${publicUrl}/${filename}`;
        }
        return image;
      });
      data.images = await Promise.all(uploadPromises);
    }

    const [updatedRows] = await Synopsis.update(data, { where: { id: req.params.id } });
    if (!updatedRows) {
      return res.status(404).json({ success: false, message: "Synopsis not found" });
    }
    const updatedSynopsis = await Synopsis.findByPk(req.params.id);
    await clearAllCache();
    res.json({ success: true, data: updatedSynopsis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete synopsis
// @route   DELETE /api/synopsis/:id
exports.deleteSynopsis = async (req, res) => {
  try {
    const synopsis = await Synopsis.findByPk(req.params.id);
    if (!synopsis) {
      return res.status(404).json({ success: false, message: "Synopsis not found" });
    }

    // Clean up images from R2
    if (synopsis.images && Array.isArray(synopsis.images)) {
      for (const imageUrl of synopsis.images) {
        if (imageUrl.includes(publicUrl)) {
          await deleteFromR2(imageUrl).catch(err => console.error("R2 deletion error:", err));
        }
      }
    }

    await synopsis.destroy();
    await clearAllCache();
    res.json({ success: true, message: "Synopsis deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
