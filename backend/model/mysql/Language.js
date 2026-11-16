const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Language = sequelize.define("Language", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = Language;
