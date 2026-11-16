const puppeteer = require("puppeteer");
const { saveItems } = require("./saveToDB");

const URL = "https://www.ignou.ac.in/";

async function scrapeIGNOU() {
  let browser;
  try {
    console.log("🚀 Launching browser for IGNOU...");

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 0 });

    const data = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll("a").forEach(a => {
        const title = a.innerText.trim();
        const link = a.href;

        if (title && title.length > 20 && link.includes("ignou")) {
          items.push({ title, link });
        }
      });
      return items;
    });

    if (!data.length) {
      console.log("⚠️ No IGNOU data found");
      return;
    }

    await saveItems("IGNOU", data.slice(0, 25));
    console.log(`✅ Saved ${data.length} IGNOU records`);

  } catch (err) {
    console.error("❌ IGNOU Scraper Error:", err.message);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeIGNOU;
