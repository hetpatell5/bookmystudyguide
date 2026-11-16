const { AIConfig } = require("../model/mysql");

exports.getConfig = async (req, res) => {
  try {
    let config = await AIConfig.findOne();
    if (!config) {
      // Return a default structure if none exists yet
      return res.json({
        success: true,
        data: {
          modelName: "gemini-1.5-flash-latest",
          secretKeys: [],
          systemPrompt: "You are a helpful assistant that generates product titles, descriptions, and SKUs based on Book Category, Main Degree, Sub Degree, and Subject. Return only a JSON object with 'title', 'description', and 'sku' keys.",
          isActive: false
        }
      });
    }
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { modelName, secretKeys, systemPrompt, isActive } = req.body;

    // Sanitize: clean each key — unwrap `["AIza..."]` or `"AIza..."` accidentally stringified
    const sanitizeKey = (k) => {
      let key = String(k).trim();
      if (key.startsWith('[') && key.endsWith(']')) {
        try { const p = JSON.parse(key); if (Array.isArray(p) && p.length > 0) key = String(p[0]).trim(); } catch (_) {}
      }
      return key.replace(/^"|"$/g, '').trim();
    };
    const cleanKeys = (secretKeys || []).map(sanitizeKey).filter(k => k.length > 0);
    let config = await AIConfig.findOne();

    if (config) {
      config.modelName = modelName;
      config.secretKeys = cleanKeys;
      config.systemPrompt = systemPrompt;
      config.isActive = isActive;
      await config.save();
    } else {
      config = await AIConfig.create({
        modelName,
        secretKeys: cleanKeys,
        systemPrompt,
        isActive
      });
    }

    res.json({ success: true, data: config, message: "AI Configuration updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
