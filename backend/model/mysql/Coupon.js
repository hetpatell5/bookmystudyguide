const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Coupon = sequelize.define("Coupon", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    trim: true,
  },
  discountType: {
    type: DataTypes.ENUM("percentage", "flat"),
    defaultValue: "percentage",
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  minOrderAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  minItems: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  eligibleProductIds: {
    type: DataTypes.JSON,
  },
  eligibleComboIds: {
    type: DataTypes.JSON,
  },
  eligibleMainDegreeIds: {
    type: DataTypes.JSON,
  },
  eligibleSynopsisIds: {
    type: DataTypes.JSON,
  },
  maxDiscountAmount: {
    type: DataTypes.DECIMAL(10, 2),
  },
  expiryDate: {
    type: DataTypes.DATE,
  },
  usageLimit: {
    type: DataTypes.INTEGER,
  },
  usedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

module.exports = Coupon;
