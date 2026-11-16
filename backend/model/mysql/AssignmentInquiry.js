const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const AssignmentInquiry = sequelize.define("AssignmentInquiry", {
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
  session: {
    type: DataTypes.STRING,   // e.g. "Jan-Jun 2025"
    allowNull: true,
  },
  // Assignment Details
  solutionType: {
    type: DataTypes.STRING,
    defaultValue: "Handwritten",
  },
  language: {
    type: DataTypes.ENUM("Hindi", "English"),
    defaultValue: "Hindi",
  },
  numberOfAssignments: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  specialInstructions: {
    type: DataTypes.TEXT,
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

module.exports = AssignmentInquiry;
