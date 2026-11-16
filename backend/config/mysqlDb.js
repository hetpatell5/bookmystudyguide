const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.MYSQL_DB,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD || "",
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    dialect: "mysql",
    logging: false, // Set to console.log to see SQL queries
    pool: {
      max: 20, // Increased for production cluster mode
      min: 5,
      acquire: 60000,
      idle: 10000,
    },
  }
);

const connectMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL Connected Successfully (Sequelize)");
    
    // Sync models (Consider using migrations for production)
    // await sequelize.sync({ alter: true }); 
  } catch (error) {
    console.error("❌ Unable to connect to MySQL:", error.message);
  }
};

module.exports = { sequelize, connectMySQL };
