const { Product, MainDegree: Degree } = require("../model/mysql");

/**
 * Generate Dynamic Sitemap.xml
 */
exports.generateSitemap = async (req, res) => {
  try {
    const baseUrl = "https://bookmystudyguide.com"; // Replace with actual production URL
    const staticPages = ["", "/about", "/contact", "/faq", "/combo-books", "/shipping", "/returns"];
    
    // Fetch dynamic content
    const [products, degrees] = await Promise.all([
      Product.findAll({ attributes: ["id", "updatedAt"] }),
      Degree.findAll({ attributes: ["id", "updatedAt"] })
    ]);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static Pages
    staticPages.forEach(page => {
      xml += `
  <url>
    <loc>${baseUrl}${page}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    // Products
    products.forEach(p => {
      xml += `
  <url>
    <loc>${baseUrl}/productpage/${p.id}</loc>
    <lastmod>${new Date(p.updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;
    });

    // Degrees / Categories
    degrees.forEach(d => {
      xml += `
  <url>
    <loc>${baseUrl}/main-degrees/${d.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.status(200).send(xml);

  } catch (err) {
    console.error("Sitemap Generation Error:", err);
    res.status(500).send("Error generating sitemap");
  }
};

/**
 * Generate robots.txt
 */
exports.generateRobots = (req, res) => {
  const baseUrl = "https://bookmystudyguide.com";
  const content = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header("Content-Type", "text/plain");
  res.status(200).send(content);
};
