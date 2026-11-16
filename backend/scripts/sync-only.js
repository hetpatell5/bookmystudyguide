const { sequelize, Config } = require('../model/mysql');

async function sync() {
    try {
        console.log('🔄 Manually syncing Config model with alter: true...');
        await Config.sync({ alter: true });
        console.log('✅ Config Sync completed.');
        
        // Debug check
        const columns = await sequelize.getQueryInterface().describeTable('Configs');
        console.log('Columns in Configs table:', Object.keys(columns));
    } catch (err) {
        console.error('❌ Config Sync failed:', err);
    } finally {
        process.exit();
    }
}

sync();
