const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const SubDegree = sequelize.define("SubDegree", {
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
  mainDegreeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "MainDegrees",
      key: "id",
    },
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = SubDegree;
