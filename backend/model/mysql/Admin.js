const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const Admin = sequelize.define("Admin", {
  // ... fields same as before
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: "admin",
  },
  permissions: {
    type: DataTypes.JSON,
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
  },
  resetPasswordExpire: {
    type: DataTypes.DATE,
  },
}, {
  timestamps: true,
  defaultScope: {
    attributes: { exclude: ["password", "permissions", "resetPasswordToken", "resetPasswordExpire"] },
  },
  scopes: {
    withPassword: {
      attributes: { include: ["password"] },
    },
    withPermissions: {
      attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpire"] },
    },
    withReset: {
      attributes: { include: ["resetPasswordToken", "resetPasswordExpire"] },
    }
  },
  hooks: {
    beforeSave: async (admin) => {
      if (admin.changed("password")) {
        admin.password = await bcrypt.hash(admin.password, 10);
      }
      if (admin.changed("role")) {
        // You could auto-fill permissions here if needed
      }
    },
  }
});

Admin.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

Admin.prototype.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
  return resetToken;
};

module.exports = Admin;
