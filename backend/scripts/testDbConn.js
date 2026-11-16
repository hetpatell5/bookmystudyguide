const { sequelize } = require("../config/mysqlDb");
const fs = require("fs");

async function testConn() {
  try {
    await sequelize.authenticate();
    fs.writeFileSync("db_status.txt", "Connected");
  } catch (err) {
    fs.writeFileSync("db_status.txt", "Error: " + err.message + "\n" + err.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testConn();
