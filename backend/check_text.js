const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

async function check() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query("SELECT description FROM Products WHERE title LIKE '%BECS 144%' LIMIT 1");
    if (results.length > 0) {
      const desc = results[0].description;
      const fs = require('fs');
      fs.writeFileSync('debug_text.json', JSON.stringify({ desc }));
      
      // Also dump character codes for "PROGRAMMES"
      const pIndex = desc.indexOf("PR");
      if (pIndex !== -1) {
          const slice = desc.substring(pIndex, pIndex + 15);
          let hex = "";
          for(let i=0; i<slice.length; i++) {
              hex += slice[i] + " (" + slice.charCodeAt(i).toString(16) + ") ";
          }
          console.log("Hex around PR:", hex);
      }
      console.log("Saved debug_text.json");
    } else {
      console.log("Not found");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
