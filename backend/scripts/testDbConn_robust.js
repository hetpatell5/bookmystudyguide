const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { Sequelize } = require("sequelize");
const fs = require("fs");

const sequelize = new Sequelize(
  process.env.MYSQL_DB,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD || "",
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    dialect: "mysql",
    logging: false,
  }
);

async function testConn() {
  const logFile = path.join(__dirname, "../db_debug.log");
  try {
    fs.appendFileSync(logFile, "Testing connection with:\n" + JSON.stringify({
        db: process.env.MYSQL_DB,
        user: process.env.MYSQL_USER,
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT
    }, null, 2) + "\n");
    await sequelize.authenticate();
    fs.appendFileSync(logFile, "✅ Connected successfully\n");
  } catch (err) {
    fs.appendFileSync(logFile, "❌ Connection failed: " + err.message + "\n" + err.stack + "\n");
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testConn();
