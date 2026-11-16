const { Knowledge } = require("../model/mysql");
const geminiService = require("../services/geminiService");

exports.chatBot = async (req, res) => {
  try {
    console.log("📩 Gemini Chatbot request:", req.body);

    let message = req.body?.message;

    if (!message || typeof message !== "string") {
      return res.status(200).json({
        reply: "કૃપા કરીને પ્રશ્ન લખો."
      });
    }

    // Fetch relevant context from Knowledge Base
    // We'll fetch a few samples to give Gemini context about what we offer
    const knowledgeData = await Knowledge.findAll({ 
      where: { isActive: true }, 
      limit: 20, 
      raw: true 
    });
    
    // Create a context string for Gemini
    const context = knowledgeData.map(k => `- ${k.title}: ${k.link || "Available in store"}`).join("\n");

    const systemPrompt = `
      You are an AI assistant for "Book My Study Guide" (BMSG), a premium platform for IGNOU and other university study materials.
      Your goal is to help students find study guides, assignments, and notes.
      
      Instructions:
      1. If the user asks in Gujarati, respond in Gujarati.
      2. If the user asks in English, respond in English.
      3. Use the following context about our available materials if relevant:
      ${context}
      
      4. If you don't know the specific answer about a product, encourage them to browse the categories or contact support.
      5. Keep responses concise, helpful, and professional.
      6. Mention that we provide high-quality AI-enhanced notes.
    `;

    const reply = await geminiService.generateContent(message, systemPrompt);

    return res.status(200).json({
      reply: reply || "માફ કરશો, હું અત્યારે તમારી મદદ કરી શકું તેમ નથી."
    });

  } catch (err) {
    console.error("🔥 CHATBOT FATAL ERROR:", err);
    return res.status(200).json({
      reply: "સર્વરમાં સમસ્યા છે, કૃપા કરીને થોડું પછી પ્રયાસ કરો."
    });
  }
};
