const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const OrderEmailTemplate = sequelize.define("OrderEmailTemplate", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING, // e.g., ORDER_PLACED_USER, ORDER_PLACED_ADMIN
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  htmlContent: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = OrderEmailTemplate;
