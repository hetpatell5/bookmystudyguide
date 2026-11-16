const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.MYSQL_DB,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    dialect: 'mysql',
    logging: false,
  }
);

async function check() {
    const [res] = await sequelize.query("SELECT description FROM Products WHERE title LIKE '%BECS 144%'");
    const fs = require('fs');
    fs.writeFileSync('scratch_desc.txt', JSON.stringify(res[0].description));
    console.log("Wrote to scratch_desc.txt");
    process.exit(0);
}
check();
