const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.STRING,
    unique: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  dueAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  paymentMode: {
    type: DataTypes.STRING,
    defaultValue: "full_online",
  },
  paymentStatus: {
    type: DataTypes.STRING,
    defaultValue: "Paid",
  },
  shippingCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  serviceFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  // Address fields directly in Order
  street: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  pincode: { type: DataTypes.INTEGER },
  country: { type: DataTypes.STRING, defaultValue: "India" },
  
  customerName: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  invoiceUrl: { type: DataTypes.STRING },
  
  paymentId: { type: DataTypes.STRING },
  razorpayOrderId: { type: DataTypes.STRING },
  paymentLinkId: { type: DataTypes.STRING },
  paymentLinkUrl: { type: DataTypes.STRING },
  paymentLinkStatus: { type: DataTypes.STRING },
  onlinePayAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  
  shippingProvider: { type: DataTypes.STRING },
  shiprocketOrderId: { type: DataTypes.STRING },
  shiprocketShipmentId: { type: DataTypes.STRING },
  courierName: { type: DataTypes.STRING },
  awbCode: { type: DataTypes.STRING },
  shippingRate: { type: DataTypes.DECIMAL(10, 2) },
  shippingCharge: { type: DataTypes.DECIMAL(10, 2) },
  
  status: {
    type: DataTypes.STRING,
    defaultValue: "Pending",
    // Allowed: Pending | Processing | Shipped | Delivered | Cancelled
  },

  refundStatus: { type: DataTypes.STRING, defaultValue: "None" },
  refundId: { type: DataTypes.STRING },
  refundAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  
  shippingLength: { type: DataTypes.FLOAT, defaultValue: 25 },
  shippingWidth: { type: DataTypes.FLOAT, defaultValue: 20 },
  shippingHeight: { type: DataTypes.FLOAT, defaultValue: 5 },
  shippingWeight: { type: DataTypes.FLOAT },
}, {
  timestamps: true,
  indexes: [
    { fields: ["userId"] },
    { fields: ["orderId"] },
    { fields: ["createdAt"] },
  ]
});

module.exports = Order;
