const { GoogleGenerativeAI } = require("@google/generative-ai");
const { AIConfig } = require("../model/mysql");

/**
 * Centeralized service to handle Google Gemini AI interactions.
 * Supports multiple API keys with rotation and fallback logic.
 */
class GeminiService {
  constructor() {
    this.models = {};
  }

  /**
   * Fetches the AI configuration from the database.
   */
  async getConfig() {
    const config = await AIConfig.findOne({ raw: true });
    if (!config || !config.isActive) {
      throw new Error("AI configuration not found or inactive.");
    }

    // MySQL may return DataTypes.JSON as a raw string — force-parse it
    let keys = config.secretKeys;
    if (typeof keys === "string") {
      try { keys = JSON.parse(keys); } catch (_) { keys = [keys]; }
    }
    if (!Array.isArray(keys)) keys = keys ? [keys] : [];

    // Clean each key: strip accidental bracket-wrapping or surrounding quotes
    config.secretKeys = keys.map(k => {
      let key = String(k).trim();
      if (key.startsWith("[") && key.endsWith("]")) {
        try {
          const p = JSON.parse(key);
          if (Array.isArray(p) && p.length > 0) key = String(p[0]).trim();
        } catch (_) {}
      }
      return key.replace(/^["']+|["']+$/g, "").trim();
    }).filter(k => k.length > 0);

    if (config.secretKeys.length === 0) {
      throw new Error("No valid API keys configured for Gemini.");
    }
    return config;
  }

  /**
   * Rotates and picks an API key.
   * Currently uses random selection, but could be enhanced for load balancing.
   */
  async getApiKey() {
    const config = await this.getConfig();
    const randomIndex = Math.floor(Math.random() * config.secretKeys.length);
    return config.secretKeys[randomIndex];
  }

  /**
   * Generates content using Gemini.
   * @param {string} prompt - The user prompt.
   * @param {string} systemInstruction - Optional system instructions.
   * @param {string} forcedModel - Optional model override.
   */
  async generateContent(prompt, systemInstruction = "", forcedModel = null) {
    let lastError = null;
    const config = await this.getConfig();
    const modelName = forcedModel || config.modelName || "gemini-1.5-flash";

    // Attempt with different keys if one fails
    const maxTries = Math.min(3, config.secretKeys.length);
    const usedKeys = new Set();

    for (let i = 0; i < maxTries; i++) {
      let apiKey;
      do {
        apiKey =
          config.secretKeys[
            Math.floor(Math.random() * config.secretKeys.length)
          ];
      } while (
        usedKeys.has(apiKey) &&
        usedKeys.size < config.secretKeys.length
      );

      usedKeys.add(apiKey);

      let rawKey = apiKey ? apiKey.trim() : "";

      // Sanitize: unwrap if key was accidentally stored as stringified JSON array e.g. `["AIza..."]`
      if (rawKey.startsWith("[") && rawKey.endsWith("]")) {
        try {
          const parsed = JSON.parse(rawKey);
          if (Array.isArray(parsed) && parsed.length > 0) {
            rawKey = String(parsed[0]).trim();
          }
        } catch (_) {}
      }
      // Also strip surrounding quotes if stored as `"AIza..."`
      rawKey = rawKey.replace(/^"|"$/g, "").trim();

      const trimmedKey = rawKey;
      try {
        const genAI = new GoogleGenerativeAI(trimmedKey);

        // System instructions should be passed here in newer SDK versions
        const model = genAI.getGenerativeModel(
          {
            model: modelName,
            systemInstruction: systemInstruction || config.systemPrompt,
          },
          { apiVersion: "v1beta" },
        );

        console.log(
          `[Gemini] Using model: ${modelName} with key: ${apiKey.substring(0, 8)}...`,
        );

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        if (!textResponse) {
          throw new Error("Empty response from Gemini.");
        }

        console.log("[Gemini] Success response length:", textResponse.length);
        return textResponse;
      } catch (err) {
        console.error(`[Gemini] Attempt ${i + 1} failed:`, err.message);
        // console.dir(err, { depth: null }); // Removed noisy debug
        lastError = err;

        // Retry logic for specific errors
        if (
          err.message.includes("429") ||
          err.message.includes("401") ||
          err.message.includes("API_KEY_INVALID")
        ) {
          continue;
        } else if (
          err.message.includes("404") ||
          err.message.includes("model not found")
        ) {
          // If model not found, try fallback model names
          if (modelName === "gemini-1.5-flash") {
            console.log(
              "[Gemini] Model 'gemini-1.5-flash' not found, trying fallback 'gemini-1.5-flash-latest'",
            );
            return this.generateContent(
              prompt,
              systemInstruction,
              "gemini-1.5-flash-latest",
            );
          } else if (modelName === "gemini-1.5-flash-latest") {
            console.log(
              "[Gemini] Model 'gemini-1.5-flash-latest' not found, trying fallback 'gemini-flash-latest'",
            );
            return this.generateContent(
              prompt,
              systemInstruction,
              "gemini-flash-latest",
            );
          }
        }
        continue;
      }
    }

    throw lastError || new Error("Gemini AI failed after multiple attempts.");
  }
}

module.exports = new GeminiService();
