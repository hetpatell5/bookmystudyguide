const { ProjectInquiry } = require("../model/mysql");
const { Op } = require("sequelize");

/* ─── CREATE ───────────────────────────────────────────── */
exports.createInquiry = async (req, res) => {
  try {
    const {
      name, email, mobileNumber,
      mainDegree, subDegree, subject, enrollmentNumber,
      inquiryType, projectDescription, deadline, address,
    } = req.body;

    if (!name || !email || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Name, email and mobile number are required.",
      });
    }

    const inquiry = await ProjectInquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobileNumber: mobileNumber.trim(),
      mainDegree: mainDegree || null,
      subDegree: subDegree || null,
      subject: subject || null,
      enrollmentNumber: enrollmentNumber || null,
      inquiryType: inquiryType || "Project",
      projectDescription: projectDescription || null,
      deadline: deadline || null,
      address: address || null,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Your project inquiry has been submitted successfully. We will contact you soon!",
      data: inquiry,
    });
  } catch (error) {
    console.error("❌ createProjectInquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit inquiry. Please try again.",
    });
  }
};

/* ─── GET ALL (Admin) ──────────────────────────────────── */
exports.getAllInquiries = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, inquiryType, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status && status !== "all") where.status = status;
    if (inquiryType && inquiryType !== "all") where.inquiryType = inquiryType;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { mobileNumber: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await ProjectInquiry.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
      offset,
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        pages: Math.ceil(count / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("❌ getAllProjectInquiries error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch inquiries." });
  }
};

/* ─── GET ONE ──────────────────────────────────────────── */
exports.getInquiryById = async (req, res) => {
  try {
    const inquiry = await ProjectInquiry.findByPk(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found." });
    return res.json({ success: true, data: inquiry });
  } catch (error) {
    console.error("❌ getProjectInquiryById error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch inquiry." });
  }
};

/* ─── UPDATE STATUS (Admin) ────────────────────────────── */
exports.updateInquiry = async (req, res) => {
  try {
    const inquiry = await ProjectInquiry.findByPk(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found." });

    const allowedFields = ["status", "adminNote"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) inquiry[field] = req.body[field];
    });

    await inquiry.save();
    return res.json({ success: true, message: "Inquiry updated.", data: inquiry });
  } catch (error) {
    console.error("❌ updateProjectInquiry error:", error);
    return res.status(500).json({ success: false, message: "Failed to update inquiry." });
  }
};

/* ─── DELETE (Admin) ───────────────────────────────────── */
exports.deleteInquiry = async (req, res) => {
  try {
    const inquiry = await ProjectInquiry.findByPk(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found." });
    await inquiry.destroy();
    return res.json({ success: true, message: "Inquiry deleted." });
  } catch (error) {
    console.error("❌ deleteProjectInquiry error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete inquiry." });
  }
};
