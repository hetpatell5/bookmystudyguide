const cron = require("node-cron");
const scrapeIGNOU = require("../scraper/ignouScraper");
const scrapeBMSG = require("../scraper/bmsgScraper");

// ⏰ Daily 5:30 AM
cron.schedule("30 5 * * *", async () => {
  console.log("🔄 Running Daily Scraper Cron...");

  try {
    await scrapeBMSG();
    await scrapeIGNOU();
    console.log("✅ Scraping completed");
  } catch (err) {
    console.error("❌ Cron Error:", err.message);
  }
});

module.exports = {};
