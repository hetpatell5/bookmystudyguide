const express = require("express");
const router = express.Router();
const courseController = require("../controller/courseController");

router.post("/", courseController.create);
router.get("/", courseController.getAll);
router.put("/:id", courseController.update);
router.delete("/:id", courseController.remove);

module.exports = router;
