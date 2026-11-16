const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Wishlist = sequelize.define("Wishlist", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
  },
  image: {
    type: DataTypes.STRING,
  },
}, {
  timestamps: true,
});

module.exports = Wishlist;
