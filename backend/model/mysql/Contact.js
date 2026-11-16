const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Contact = sequelize.define("Contact", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  phone: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
  },
  officeTime: {
    type: DataTypes.STRING,
  },
  address: {
    type: DataTypes.TEXT,
  },
  facebook: {
    type: DataTypes.STRING,
  },
  instagram: {
    type: DataTypes.STRING,
  },
  whatsapp: {
    type: DataTypes.STRING,
  },
}, {
  timestamps: true,
});

module.exports = Contact;
