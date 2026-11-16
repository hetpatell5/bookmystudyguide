const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Subject = sequelize.define("Subject", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true, // Optional for hierarchy, but good for bulk upload
  },
  mainDegreeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "MainDegrees",
      key: "id",
    },
  },
  subDegreeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "SubDegrees",
      key: "id",
    },
  },
  year: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  semester: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  course: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: "Subjects",
  indexes: [
    {
      fields: ["subDegreeId", "year", "semester"],
    },
  ],
});

module.exports = Subject;
