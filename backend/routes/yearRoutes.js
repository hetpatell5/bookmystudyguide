const express = require("express");
const router = express.Router();
const yearController = require("../controller/yearController");

router.post("/", yearController.create);
router.get("/", yearController.getAll);
router.put("/:id", yearController.update);
router.delete("/:id", yearController.remove);

module.exports = router;
