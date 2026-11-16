const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const FAQ = sequelize.define("FAQ", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
  },
}, {
  timestamps: true,
});

module.exports = FAQ;
