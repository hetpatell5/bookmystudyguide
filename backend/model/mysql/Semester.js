const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Semester = sequelize.define("Semester", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  timestamps: true,
});

module.exports = Semester;
