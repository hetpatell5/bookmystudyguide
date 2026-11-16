const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Cart = sequelize.define("Cart", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
  },
  image: {
    type: DataTypes.TEXT('medium'),
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  type: {
    type: DataTypes.STRING, // 'hardcopy' or 'softcopy'
  },
  fileUrl: {
    type: DataTypes.STRING,
  },
  language: {
    type: DataTypes.STRING,
  },
  itemKind: {
    type: DataTypes.STRING,
  },
  bookId: {
    type: DataTypes.UUID,
  },
  mainDegreeId: {
    type: DataTypes.UUID,
  },
  subDegreeId: {
    type: DataTypes.UUID,
  },
}, {
  timestamps: true,
});

module.exports = Cart;
