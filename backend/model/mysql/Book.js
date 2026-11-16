const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Book = sequelize.define("Book", {
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
  image: {
    type: DataTypes.STRING,
  },
  imagePublicId: {
    type: DataTypes.STRING,
  },
  description: {
    type: DataTypes.TEXT,
  },
  commonPages: {
    type: DataTypes.JSON, // Array of URLs
  },
  commonPagesPublicIds: {
    type: DataTypes.JSON, // Array of Public IDs
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = Book;
