const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Subscriber = sequelize.define("Subscriber", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
}, {
  timestamps: true,
});

module.exports = Subscriber;
