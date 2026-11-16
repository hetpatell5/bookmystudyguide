const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const SoftCopy = sequelize.define("SoftCopy", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
  },
  resourceType: {
    type: DataTypes.ENUM("file", "link"),
    defaultValue: "file",
  },
  resourceLink: {
    type: DataTypes.STRING,
  },
  fileName: {
    type: DataTypes.STRING,
  },
  filePath: {
    type: DataTypes.STRING,
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: "Gujarati",
  },
  // Relations mapped via UUIDs
  bookId: { type: DataTypes.UUID },
  mainDegreeId: { type: DataTypes.UUID },
  subDegreeId: { type: DataTypes.UUID },
  subjectId: { type: DataTypes.UUID },
  // Denormalized names for convenience (optional, but in Mongoose schema)
  bookName: { type: DataTypes.STRING },
  mainDegree: { type: DataTypes.STRING },
  subDegree: { type: DataTypes.STRING },
  subject: { type: DataTypes.STRING },
}, {
  timestamps: true,
});

module.exports = SoftCopy;
