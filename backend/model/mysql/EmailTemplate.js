const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const EmailTemplate = sequelize.define("EmailTemplate", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM(
      "OTP_VERIFICATION",
      "WELCOME_EMAIL",
      "ORDER_PLACED",
      "ORDER_SHIPPED",
      "ORDER_CANCELLED",
      "PASSWORD_RESET",
      "FORGOT_PASSWORD",
      "CONTACT_MESSAGE"
    ),
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
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ["type", "isActive"] },
  ],
});

module.exports = EmailTemplate;
