const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const OrderItem = sequelize.define("OrderItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
  },
  title: {
    type: DataTypes.STRING,
  },
  image: {
    type: DataTypes.STRING,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  sku: {
    type: DataTypes.STRING,
  },
  type: {
    type: DataTypes.STRING, // 'Hard Copy' or 'Soft Copy'
  },
  isHardCopy: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  weight: {
    type: DataTypes.FLOAT,
    defaultValue: 0.4,
  },
  fileUrl: {
    type: DataTypes.STRING,
  },
  language: {
    type: DataTypes.STRING,
  },
  isSynopsis: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  productLinks: {
    type: DataTypes.JSON, // Snapshot of links at time of order
  },
}, {
  timestamps: false,
});

module.exports = OrderItem;
