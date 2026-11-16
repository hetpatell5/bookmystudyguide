const geminiService = require("../services/geminiService");

/**
 * Generate a unique SKU server-side based on degree + subject.
 * Format: BMS-{DEG}-{SUB}-{3-digit random}
 */
const generateSKU = (mainDegree, subject) => {
  const deg = (mainDegree || "GEN").substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const sub = (subject || "SUB").substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `BMS-${deg}-${sub}-${rand}`;
};

exports.generateProductInfo = async (req, res) => {
  try {
    const { book, mainDegree, subDegree, subject } = req.body;
    console.log("AI Generation request received for:", { book, mainDegree, subDegree, subject });

    // SKU is generated server-side — NOT by the AI (avoids template literal injection issues)
    const sku = generateSKU(mainDegree, subject);

    const prompt = `
      You are an expert SEO Content Writer for "BOOK MY STUDY GUIDE", a premium educational resource provider.
      Create a professional, high-converting study material listing with these details:
      - Book Type: ${book}
      - Program/Main Degree: ${mainDegree}
      - Specialization/Sub Degree: ${subDegree}
      - Subject: ${subject}

      Output MUST be a valid JSON object ONLY. Do not include any markdown formatting like \`\`\`json.
      The JSON object must contain ONLY these two fields:
      {
        "title": "A catchy, SEO-friendly title (max 70 chars) that includes the subject and degree",
        "description": "A detailed, professional description (2-3 paragraphs). Use HTML <p> tags for paragraphs. Include a 'Key Features' section with <ul> and <li> tags highlighting benefits like 'Exam-oriented content', 'Easy to understand', and 'Expertly curated'."
      }
    `;

    console.log("Calling Gemini Service...");
    const text = await geminiService.generateContent(prompt);
    console.log("AI Raw Content:", text);

    // Extraction logic to handle markdown (```json ... ```) or extra text
    let cleanText = text.trim();
    
    // Remove markdown code blocks if present
    const jsonBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      cleanText = jsonBlockMatch[1];
    }

    // Find the first { and last } to extract the JSON object
    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
      console.error("No valid JSON structure found in AI response:", text);
      return res.status(500).json({ success: false, message: "AI failed to generate valid data format. Please try again." });
    }

    const jsonString = cleanText.substring(startIdx, endIdx + 1);

    try {
      const parsed = JSON.parse(jsonString);
      // Always use server-side SKU — override any SKU the AI might have tried to produce
      parsed.sku = sku;
      console.log("AI successfully generated data:", parsed.title, "| SKU:", parsed.sku);
      res.json({ success: true, data: parsed });
    } catch (parseErr) {
      console.error("JSON Parse error:", parseErr, "Target string was:", jsonString);
      res.status(500).json({ success: false, message: "Error parsing AI response. Please try again." });
    }
  } catch (err) {
    console.error("Critical AI Generation Error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "An unexpected error occurred during AI generation."
    });
  }
};
