const express = require("express");
const router = express.Router();
const languageController = require("../controller/languageController");

router.post("/", languageController.create);
router.get("/", languageController.getAll);
router.put("/:id", languageController.update);
router.delete("/:id", languageController.remove);

module.exports = router;
