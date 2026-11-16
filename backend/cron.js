const cron = require("node-cron");
const scrapeIGNOU = require("./scraper/ignouScraper");
const scrapeBMSG = require("./scraper/bmsgScraper");
const { exportMySQLToSQL } = require("./services/backupService");

// Daily at 2 AM - SQL Backup
cron.schedule("0 2 * * *", async () => {
  console.log("⏳ Running daily SQL backup...");
  try {
    const result = await exportMySQLToSQL();
    console.log(`✅ Daily backup completed: ${result.fileName}`);
  } catch (err) {
    console.error("❌ Daily backup failed:", err);
  }
});

// Daily at 5 AM
cron.schedule("0 5 * * *", async () => {
  console.log("⏳ Running daily scraper...");
  await scrapeBMSG(); // 🔥 FIRST
  await scrapeIGNOU(); // 🔥 SECOND
});
