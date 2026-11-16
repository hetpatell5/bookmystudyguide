const express = require("express");
const router = express.Router();

const { chatBot } = require("../chatbot/chatbot.controller");

// POST: /api/chatbot
router.post("/chatbot", chatBot);

module.exports = router;
