const cron = require("node-cron");
const { exportMySQLToSQL } = require("./backupService");
const scrapeIGNOU = require("../scraper/ignouScraper");
const scrapeBMSG = require("../scraper/bmsgScraper");

/**
 * Initialize all scheduled background tasks
 * This should only be called once (e.g. in the cluster master process)
 */
const initScheduler = () => {
    console.log("⏰ Initializing Background Scheduler Service...");

    // 1. Daily SQL Backup at 2:00 AM
    cron.schedule("0 2 * * *", async () => {
        console.log("⏳ Running scheduled daily SQL backup...");
        try {
            const result = await exportMySQLToSQL();
            console.log(`✅ Daily backup completed successfully: ${result.fileName} (${(result.size / 1024 / 1024).toFixed(2)} MB)`);
        } catch (err) {
            console.error("❌ Scheduled daily backup failed:", err);
        }
    });

    // 2. Daily Scraper at 5:00 AM
    cron.schedule("0 5 * * *", async () => {
        console.log("⏳ Running scheduled daily scrapers (BMSG & IGNOU)...");
        try {
            console.log("🔄 Starting BMSG Scraper...");
            await scrapeBMSG();
            
            console.log("🔄 Starting IGNOU Scraper...");
            await scrapeIGNOU();
            
            console.log("✅ Daily scraping tasks completed.");
        } catch (err) {
            console.error("❌ Scheduled scraping failed:", err.message);
        }
    });

    // 3. Optional: Test cron (commented out by default, enable for debugging)
    /*
    cron.schedule("* * * * *", async () => {
        console.log("⏱️ Test Cron running every minute...");
    });
    */

    console.log("✅ All background tasks scheduled.");
};

module.exports = { initScheduler };
