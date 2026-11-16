const fs = require("fs");
const path = require("path");
const { User, Product, Order, ComboProduct, sequelize } = require("../model/mysql");

const getDirSize = (dirPath) => {
    let size = 0;
    if (!fs.existsSync(dirPath)) return 0;
    const files = fs.readdirSync(dirPath);

    for (let i = 0; i < files.length; i++) {
        const filePath = path.join(dirPath, files[i]);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            size += getDirSize(filePath);
        } else {
            size += stats.size;
        }
    }
    return size;
};

exports.getStorageStats = async (req, res) => {
    try {
        // 1. Fetch MySQL Statistics (Disk Usage)
        const dbName = sequelize.config.database;
        const [dbSizeResult] = await sequelize.query(`
            SELECT 
                SUM(data_length) as dataSize,
                SUM(index_length) as indexSize,
                SUM(data_length + index_length) as storageSize,
                COUNT(table_name) as collections
            FROM information_schema.TABLES 
            WHERE table_schema = '${dbName}'
        `);

        // 2. Fetch Total Record Count (Objects)
        const [totalObjectsResult] = await sequelize.query(`
            SELECT SUM(TABLE_ROWS) as totalRows 
            FROM information_schema.TABLES 
            WHERE table_schema = '${dbName}'
        `);

        // 3. Fetch Local Storage Statistics (including Backups)
        let localStorageStats = {
            images: 0,
            videos: 0,
            pdf: 0,
            backups: 0,
            total: 0
        };

        const uploadsPath = path.join(process.cwd(), "uploads");
        if (fs.existsSync(uploadsPath)) {
            const subDirs = ["images", "videos", "pdf"];
            subDirs.forEach(dir => {
                const subPath = path.join(uploadsPath, dir);
                if (fs.existsSync(subPath)) {
                    localStorageStats[dir] = getDirSize(subPath);
                }
            });
        }

        const backupsPath = path.join(process.cwd(), "backups");
        if (fs.existsSync(backupsPath)) {
            localStorageStats.backups = getDirSize(backupsPath);
        }

        localStorageStats.total = localStorageStats.images + localStorageStats.videos + localStorageStats.pdf + localStorageStats.backups;

        return res.status(200).json({
            success: true,
            data: {
                database: {
                    storageSize: parseInt(dbSizeResult[0]?.storageSize || 0),
                    dataSize: parseInt(dbSizeResult[0]?.dataSize || 0),
                    indexSize: parseInt(dbSizeResult[0]?.indexSize || 0),
                    objects: parseInt(totalObjectsResult[0]?.totalRows || 0),
                    collections: parseInt(dbSizeResult[0]?.collections || 0),
                    indexes: 0 // Will be expanded if needed
                },
                localStorage: localStorageStats
            }
        });
    } catch (err) {
        console.error("Storage Stats Error:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch storage stats", error: err.message });
    }
};
