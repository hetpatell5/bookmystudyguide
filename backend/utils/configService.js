const { Config } = require("../model/mysql");

let CACHE = {};

/**
 * Load all config from DB
 */
const loadConfig = async () => {
  try {
    const configs = await Config.findAll();
    CACHE = {};

    configs.forEach((c) => {
      CACHE[c.key] = c.value;
    });

    console.log("⚙️ Dynamic Config Loaded:", Object.keys(CACHE));
  } catch (err) {
    console.error("❌ Failed to load config from MySQL:", err.message);
  }
};

/**
 * Get config value
 */
const getConfig = (key, defaultValue = null) => {
  return CACHE[key] ?? process.env[key] ?? defaultValue;
};

module.exports = {
  loadConfig,
  getConfig,
};
