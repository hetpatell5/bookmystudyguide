const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const Synopsis = sequelize.define("Synopsis", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  mainDegreeId: { type: DataTypes.UUID },
  subDegreeId: { type: DataTypes.UUID },
  subjectId: { type: DataTypes.UUID },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
  },
  mrp: {
    type: DataTypes.DECIMAL(10, 2),
  },
  images: {
    type: DataTypes.JSON,
  },
  coverImageIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  synopsisLinks: {
    type: DataTypes.JSON,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: "Synopsis",
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['subDegreeId'] },
    { fields: ['mainDegreeId'] },
    { fields: ['createdAt'] },
    { fields: ['subDegreeId', 'createdAt'] },
  ],
});

module.exports = Synopsis;
