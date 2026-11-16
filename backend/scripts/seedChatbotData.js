require("dotenv").config();
const { Knowledge } = require("../model/mysql");

async function seed() {
  try {
    console.log("⏳ Seeding Chatbot Knowledge Data...");

    // Clear existing data
    await Knowledge.destroy({ where: {}, truncate: false }); 
    console.log("🧹 Old data cleared");

    const data = [
      {
        source: "BMSG",
        title: "IGNOU Exam Notes and Study Material",
        link: "https://bookmystudyguide.com",
        isActive: true
      }
    ];

    await Knowledge.bulkCreate(data);

    console.log("🚀 Chatbot data seeded successfully to MySQL");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding Failed:", err);
    process.exit(1);
  }
}

seed();
