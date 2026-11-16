const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const ProductLink = sequelize.define("ProductLink", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  language: {
    type: DataTypes.STRING,
  },
  link: {
    type: DataTypes.STRING,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: "Soft Copy",
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
}, {
  timestamps: false,
});

module.exports = ProductLink;
