const Redis = require("ioredis");
const config = require("../config/envConfig");

let redis;
let isRedisAvailable = false;

try {
    const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
            if (times > 3) {
                console.error("❌ Redis connection failed. Falling back to in-memory/DB only.");
                isRedisAvailable = false;
                return null; // stop retrying
            }
            return Math.min(times * 50, 2000);
        }
    });

    redis.on("connect", () => {
        console.log("✅ Redis connected successfully".green.bold);
        isRedisAvailable = true;
    });

    redis.on("error", (err) => {
        console.warn("⚠️ Redis Error:", err.message);
        isRedisAvailable = false;
    });

} catch (err) {
    console.error("❌ Redis Initialization Error:", err.message);
    isRedisAvailable = false;
}

/**
 * Get data from cache
 */
const getCache = async (key) => {
    if (!isRedisAvailable) return null;
    try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        return null;
    }
};

/**
 * Set data in cache
 */
const setCache = async (key, value, duration = 3600) => {
    if (!isRedisAvailable) return;
    try {
        await redis.set(key, JSON.stringify(value), "EX", duration);
    } catch (err) {
        console.error("❌ Redis Set Error:", err.message);
    }
};

/**
 * Delete data from cache
 */
const delCache = async (key) => {
    if (!isRedisAvailable) return;
    try {
        await redis.del(key);
    } catch (err) {
        console.error("❌ Redis Del Error:", err.message);
    }
};

/**
 * Delete all keys starting with 'cache:'
 */
const clearAllCache = async () => {
    if (!isRedisAvailable) return;
    try {
        const stream = redis.scanStream({
            match: "cache:*",
            count: 100
        });

        stream.on("data", async (keys) => {
            if (keys.length > 0) {
                const pipeline = redis.pipeline();
                keys.forEach(key => pipeline.del(key));
                await pipeline.exec();
            }
        });

        return new Promise((resolve, reject) => {
            stream.on("end", () => {
                console.log("🧹 Global API cache cleared");
                resolve();
            });
            stream.on("error", (err) => {
                console.error("❌ Redis Clear Error:", err.message);
                reject(err);
            });
        });
    } catch (err) {
        console.error("❌ Redis Clear Error:", err.message);
    }
};

/**
 * Delete only product-related cache keys (cache:/api/products*).
 * Preferred over clearAllCache() to avoid evicting unrelated catalog entries.
 */
const clearProductCache = async () => {
    if (!isRedisAvailable) return;
    try {
        const stream = redis.scanStream({ match: "cache:/api/products*", count: 100 });

        stream.on("data", async (keys) => {
            if (keys.length > 0) {
                const pipeline = redis.pipeline();
                keys.forEach(key => pipeline.del(key));
                await pipeline.exec();
            }
        });

        return new Promise((resolve, reject) => {
            stream.on("end", () => {
                console.log("🧹 Product cache cleared");
                resolve();
            });
            stream.on("error", (err) => {
                console.error("❌ Redis Product Clear Error:", err.message);
                reject(err);
            });
        });
    } catch (err) {
        console.error("❌ Redis Product Clear Error:", err.message);
    }
};

module.exports = {
    redis,
    getCache,
    setCache,
    delCache,
    clearAllCache,
    clearProductCache,
    isRedisAvailable: () => isRedisAvailable,
};

