const axios = require("axios");
const cheerio = require("cheerio");
const { saveItems } = require("./saveToDB");

const BASE_URL = "https://bookmystudyguide.com";

async function scrapeBMSG() {
  try {
    console.log("⏳ Scraping BookMyStudyGuide...");

    const { data } = await axios.get(BASE_URL, { timeout: 20000 });
    const $ = cheerio.load(data);

    const items = [];

    $("a").each((_, el) => {
      const title = $(el).text().trim();
      let link = $(el).attr("href");

      if (!title || title.length < 15) return;

      if (link && !link.startsWith("http")) {
        link = BASE_URL + link;
      }

      items.push({ title, link });
    });

    const uniqueItems = [
      ...new Map(items.map(i => [i.title, i])).values()
    ];

    if (uniqueItems.length) {
      await saveItems("BMSG", uniqueItems);
      console.log(`✅ Saved ${uniqueItems.length} BMSG records`);
    } else {
      console.log("⚠️ No BMSG data found");
    }

    console.log("✅ BMSG scraping done");
  } catch (err) {
    console.error("❌ BMSG Error:", err.message);
  }
}

module.exports = scrapeBMSG;
