const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const ProjectInquiry = sequelize.define("ProjectInquiry", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Personal
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isEmail: true },
  },
  mobileNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Academic
  mainDegree: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subDegree: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  enrollmentNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Project Details
  inquiryType: {
    type: DataTypes.ENUM("Project", "Practical", "Synopsis", "Internship"),
    defaultValue: "Project",
  },
  projectDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  deadline: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Admin
  status: {
    type: DataTypes.ENUM("pending", "in-progress", "completed", "cancelled"),
    defaultValue: "pending",
  },
  adminNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = ProjectInquiry;
