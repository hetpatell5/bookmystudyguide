const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const AIConfig = sequelize.define("AIConfig", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  modelName: {
    type: DataTypes.STRING,
    defaultValue: "gemini-1.5-flash-latest",
  },
  secretKeys: {
    type: DataTypes.JSON, // Array of strings
    defaultValue: [],
  },
  systemPrompt: {
    type: DataTypes.TEXT,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

module.exports = AIConfig;
