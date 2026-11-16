require("dotenv").config();
const colors = require("colors");

const app = require("./app");
const { loadConfig } = require("./utils/configService");
const config = require("./config/envConfig");
const { connectMySQL } = require("./config/mysqlDb");
const { syncMySQL } = require("./model/mysql"); // Sync MySQL tables
const { redis } = require("./utils/redis");
const { sequelize } = require("./model/mysql");

const PORT = config.port;

const { initScheduler } = require("./services/schedulerService");

const startServer = async () => {
  try {
    console.log(`🚀 Starting Server...`.cyan.bold);

    // 1. Connect to MySQL
    console.log(`⚙️ Connecting to MySQL...`.yellow);
    await connectMySQL();

    // 2. Sync MySQL Tables (One-time check)
    console.log(`⚙️ Syncing MySQL Tables...`.yellow);
    await syncMySQL();

    // 3. Load Dynamic Config
    await loadConfig();

    // 4. Initialize Scheduler (Background tasks)
    // Note: In PM2 cluster mode, this will run on EVERY instance.
    // If you want it on only one, check process.env.NODE_APP_INSTANCE === '0'
    if (!process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0') {
      console.log(`⏰ Initializing Scheduler...`.yellow);
      initScheduler();
    }

    // 5. Start HTTP Server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (PID: ${process.pid})`.yellow.bold);
    });

    // ── Graceful Shutdown ───────────────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n⏹️  ${signal} received — gracefully shutting down...`.yellow);
      server.close(async () => {
        console.log("✅ HTTP server closed.".green);
        try {
          await sequelize.close();
          console.log("✅ MySQL pool closed.".green);
        } catch (err) {
          console.error("❌ MySQL pool close error:", err.message);
        }
        try {
          if (redis && redis.status !== "end") {
            await redis.quit();
            console.log("✅ Redis disconnected.".green);
          }
        } catch (err) {
          console.error("❌ Redis disconnect error:", err.message);
        }
        process.exit(0);
      });

      // Force-kill if not done in 10s
      setTimeout(() => {
        console.error("❌ Graceful shutdown timed out — forcing exit.".red);
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));

  } catch (err) {
    console.error(`❌ Critical Startup Error:`.red.bold, err);
    process.exit(1);
  }
};

startServer();
