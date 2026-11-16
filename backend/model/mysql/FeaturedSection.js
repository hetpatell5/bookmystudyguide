const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/mysqlDb");

const FeaturedSection = sequelize.define("FeaturedSection", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subtitle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mainDegreeIds: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue("mainDegreeIds");
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      this.setDataValue("mainDegreeIds", JSON.stringify(val || []));
    },
  },
  subDegreeIds: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue("subDegreeIds");
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      this.setDataValue("subDegreeIds", JSON.stringify(val || []));
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  bookTypeOrder: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue("bookTypeOrder");
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      this.setDataValue("bookTypeOrder", JSON.stringify(val || []));
    },
  },
}, {
  timestamps: true,
});

module.exports = FeaturedSection;
