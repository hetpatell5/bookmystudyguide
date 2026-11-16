const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true,
  },
  address: {
    type: DataTypes.STRING,
  },
  course: {
    type: DataTypes.STRING,
  },
  university: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    lowercase: true,
    validate: {
      isEmail: true,
    },
  },
  phoneno: {
    type: DataTypes.STRING,
    trim: true,
  },
  password: {
    type: DataTypes.STRING,
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true,
  },
  role: {
    type: DataTypes.ENUM("user", "admin"),
    defaultValue: "user",
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  otp: {
    type: DataTypes.STRING,
  },
  otpExpiresAt: {
    type: DataTypes.DATE,
  },
  resetPasswordOtp: {
    type: DataTypes.STRING,
  },
  resetPasswordExpiresAt: {
    type: DataTypes.DATE,
  },
  otpAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  resetPasswordAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ["email"] },
    { fields: ["phoneno"] },
  ],
  defaultScope: {
    attributes: { exclude: ["password", "otp", "resetPasswordOtp"] },
  },
  scopes: {
    withPassword: {
      attributes: { include: ["password"] },
    },
    withOtp: {
      attributes: { include: ["otp", "resetPasswordOtp"] },
    }
  }
});

module.exports = User;
