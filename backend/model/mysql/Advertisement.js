const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Advertisement = sequelize.define("Advertisement", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mobileImage: {
    type: DataTypes.STRING,
    allowNull: true,   // optional — falls back to desktop image if not set
  },
  link: {
    type: DataTypes.STRING,
  },
  position: {
    type: DataTypes.STRING,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

module.exports = Advertisement;
