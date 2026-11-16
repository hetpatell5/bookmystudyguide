const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const IgnouCard = sequelize.define("IgnouCard", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subtitle: {
    type: DataTypes.STRING,
  },
  icon: {
    type: DataTypes.STRING,
  },
  slug: {
    type: DataTypes.STRING,
  },
  targetUrl: {
    type: DataTypes.STRING,
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

module.exports = IgnouCard;
