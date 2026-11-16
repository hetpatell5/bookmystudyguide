const { Admin } = require('../model/mysql');
const bcrypt = require('bcrypt');

async function debug() {
    try {
        const admins = await Admin.scope('withPassword').findAll();
        console.log(`Found ${admins.length} admins.`);
        for (const admin of admins) {
            console.log(`- ${admin.name} (${admin.email}) [Role: ${admin.role}]`);
            console.log(`  Hashed Password: ${admin.password?.substring(0, 10)}...`);
            
            // Test a dummy password comparison if you know one, 
            // but for now just check if the field exists.
            if (!admin.password) {
                console.error(`  ❌ Error: Password is missing for ${admin.email}`);
            }
        }
    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        process.exit();
    }
}

debug();
