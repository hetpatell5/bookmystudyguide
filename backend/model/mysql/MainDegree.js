const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const MainDegree = sequelize.define("MainDegree", {
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
  icon: {
    type: DataTypes.STRING,
    defaultValue: "BookOpen",
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: "#6366f1",
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = MainDegree;
