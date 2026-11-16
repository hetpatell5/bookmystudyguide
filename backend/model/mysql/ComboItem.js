const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const ComboItem = sequelize.define("ComboItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  timestamps: false,
});

module.exports = ComboItem;
