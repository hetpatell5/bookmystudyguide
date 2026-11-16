const express = require("express");
const router = express.Router();
const synopsisController = require("../controller/synopsisController");
const cache = require("../middleware/cacheMiddleware");

router.get("/", cache(300), synopsisController.getAllSynopses);
router.get("/:id", synopsisController.getSynopsisById);
router.post("/", synopsisController.createSynopsis);
router.patch("/:id", synopsisController.updateSynopsis);
router.delete("/:id", synopsisController.deleteSynopsis);

module.exports = router;
