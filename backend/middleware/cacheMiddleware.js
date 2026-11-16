const { getCache, setCache, isRedisAvailable } = require("../utils/redis");

/**
 * Caching middleware
 * @param {number} duration - Cache duration in seconds
 */
const cacheMiddleware = (duration = 300) => {
    return async (req, res, next) => {
        if (!isRedisAvailable()) {
            return next();
        }

        // Generate cache key based on URL and query params
        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedData = await getCache(key);
            if (cachedData) {
                console.log(`⚡ Cache Hit: ${key}`);
                return res.json(cachedData);
            }

            // Override res.json to capture and cache the response
            const originalJson = res.json;
            res.json = (body) => {
                if (res.statusCode === 200) {
                    setCache(key, body, duration);
                }
                return originalJson.call(res, body);
            };

            next();
        } catch (err) {
            console.error("❌ Cache Middleware Error:", err);
            next();
        }
    };
};

module.exports = cacheMiddleware;
