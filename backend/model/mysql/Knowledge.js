const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Knowledge = sequelize.define("Knowledge", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  source: {
    type: DataTypes.ENUM("BMSG", "IGNOU"),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
  },
  link: {
    type: DataTypes.STRING,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

module.exports = Knowledge;
