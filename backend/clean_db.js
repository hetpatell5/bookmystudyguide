const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.MYSQL_DB,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    dialect: 'mysql',
    logging: false,
  }
);

async function cleanDB() {
  try {
    await sequelize.authenticate();
    const [products] = await sequelize.query("SELECT id, description FROM Products");
    console.log(`Found ${products.length} products to check.`);
    
    let updatedCount = 0;
    
    for (const prod of products) {
        if (!prod.description) continue;
        
        let cleaned = prod.description;
        
        // 1. Remove invisible breaking characters and fix non-breaking spaces
        cleaned = cleaned.replace(/&nbsp;/gi, " ");
        cleaned = cleaned.replace(/\u00A0/g, " ");
        cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");
        cleaned = cleaned.replace(/\u00AD/g, "");
        cleaned = cleaned.replace(/&shy;/gi, "");
        cleaned = cleaned.replace(/&#8203;/gi, "");
        
        // 2. Fix paragraph breaks mid-word (from PDF pastes)
        cleaned = cleaned.replace(/-<\/p>\s*<p[^>]*>/gi, "-");
        cleaned = cleaned.replace(/([a-zA-Z])<\/p>\s*<p[^>]*>([a-z])/g, "$1$2");
        
        // 3. Prevent hyphens from wrapping (replace regular hyphens with non-breaking hyphens)
        // Wait, replacing them in the database permanently is safe and fixes it on all clients.
        // Let's only do it outside of HTML tags.
        const parts = cleaned.split(/(<[^>]+>)/g);
        for (let i = 0; i < parts.length; i++) {
          if (!parts[i].startsWith('<')) {
            parts[i] = parts[i].replace(/([a-zA-Z0-9])-\s+([a-zA-Z0-9])/g, "$1&#8209;$2");
            parts[i] = parts[i].replace(/([a-zA-Z0-9])-([a-zA-Z0-9])/g, "$1&#8209;$2");
          }
        }
        cleaned = parts.join('');
        
        // Let's also look for specific broken words the user mentioned with a space, just in case:
        // "PR OGRAMMES", "rela ted", "Answ ers", "tabulati on", "r esearch", "esp ecially", "deci sion", "str engthen"
        // Wait, if we replace these specifically:
        cleaned = cleaned.replace(/PR\s+OGRAMMES/g, "PROGRAMMES");
        cleaned = cleaned.replace(/rela\s+ted/g, "related");
        cleaned = cleaned.replace(/Answ\s+ers/g, "Answers");
        cleaned = cleaned.replace(/tabulati\s+on/g, "tabulation");
        cleaned = cleaned.replace(/r\s+esearch/g, "research");
        cleaned = cleaned.replace(/esp\s+ecially/g, "especially");
        cleaned = cleaned.replace(/deci\s+sion/g, "decision");
        cleaned = cleaned.replace(/str\s+engthen/g, "strengthen");

        if (cleaned !== prod.description) {
            await sequelize.query("UPDATE Products SET description = ? WHERE id = ?", {
                replacements: [cleaned, prod.id]
            });
            updatedCount++;
        }
    }
    
    console.log(`Successfully updated ${updatedCount} products.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanDB();
