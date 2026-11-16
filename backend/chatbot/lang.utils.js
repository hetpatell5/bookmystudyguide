// Detect Gujarati Unicode
exports.isGujarati = (text = "") => /[\u0A80-\u0AFF]/.test(text);

// Gujarati → English normalization
exports.normalizeGujarati = (text = "") => {
  let t = text.toLowerCase();

  const map = [
    { g: ["એડમિશન", "પ્રવેશ"], e: "admission" },
    { g: ["ફી", "ફીસ"], e: "fees" },
    { g: ["પરીક્ષા", "એગ્ઝામ"], e: "exam" },
    { g: ["પરિણામ", "રિઝલ્ટ"], e: "result" },
    { g: ["ટી.ઈ.ઈ", "tee"], e: "term end exam" },
    { g: ["તારીખ", "તારીખો"], e: "date" },
    { g: ["બીસીએ", "બી.સી.એ"], e: "bca" },
    { g: ["એમસીએ"], e: "mca" }
  ];

  map.forEach(({ g, e }) => {
    g.forEach(word => {
      t = t.replaceAll(word, e);
    });
  });

  return t;
};
