const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Blog = sequelize.define("Blog", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING,
  },
  author: {
    type: DataTypes.STRING,
  },
  tags: {
    type: DataTypes.JSON, // Array of strings
  },
}, {
  timestamps: true,
});

module.exports = Blog;
