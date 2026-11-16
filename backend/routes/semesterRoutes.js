const express = require("express");
const router = express.Router();
const semesterController = require("../controller/semesterController");

router.post("/", semesterController.create);
router.get("/", semesterController.getAll);
router.put("/:id", semesterController.update);
router.delete("/:id", semesterController.remove);

module.exports = router;
