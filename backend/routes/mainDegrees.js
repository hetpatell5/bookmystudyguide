const express = require("express");
const router = express.Router();
const mainDegreeController = require("../controller/mainDegreeController");

const cache = require("../middleware/cacheMiddleware");

router.post("/", mainDegreeController.create);
router.post("/bulk", mainDegreeController.bulkCreate);
router.post("/bulk-publish", mainDegreeController.bulkPublish);
router.post("/bulk-delete", mainDegreeController.bulkDelete);
router.get("/", cache(300), mainDegreeController.getAll);
router.put("/:id", mainDegreeController.update);
router.patch("/:id/publish", mainDegreeController.togglePublish);
router.delete("/:id", mainDegreeController.remove);

module.exports = router;
