const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const ComboProduct = sequelize.define("ComboProduct", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  bookId: { type: DataTypes.UUID },
  mainDegreeId: { type: DataTypes.UUID },
  subDegreeId: { type: DataTypes.UUID },
  bookName: { type: DataTypes.STRING },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  cancelPrice: {
    type: DataTypes.DECIMAL(10, 2),
  },
  image: {
    type: DataTypes.STRING,
  },
  gallery: {
    type: DataTypes.JSON, // Array of strings
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  language: {
    type: DataTypes.STRING,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

module.exports = ComboProduct;
