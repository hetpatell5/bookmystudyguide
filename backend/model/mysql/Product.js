const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  mrp: {
    type: DataTypes.DECIMAL(10, 2),
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
  },
  percentage: {
    type: DataTypes.FLOAT,
  },

  weight: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isHardCopy: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  language: {
    type: DataTypes.STRING,
  },
  images: {
    type: DataTypes.JSON,
  },
  commonPages: {
    type: DataTypes.JSON,
  },
  coverImageIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Relationships are defined in index.js
}, {
  timestamps: true,
  indexes: [
    { fields: ['subDegreeId'] },
    { fields: ['bookId'] },
    { fields: ['subjectId'] },
    { fields: ['isActive'] },
    { fields: ['createdAt'] },
    { fields: ['subDegreeId', 'isActive', 'createdAt'] },
    { fields: ['bookId', 'subDegreeId', 'isActive'] },
    { unique: true, fields: ['bookId', 'subjectId'], name: 'unique_book_subject' },
  ],
});

module.exports = Product;
