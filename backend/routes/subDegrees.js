const express = require("express");
const router = express.Router();
const subDegreeController = require("../controller/subDegreeController");

const cache = require("../middleware/cacheMiddleware");

router.post("/", subDegreeController.create);
router.post("/bulk", subDegreeController.bulkCreate);
router.post("/bulk-publish", subDegreeController.bulkPublish);
router.post("/bulk-delete", subDegreeController.bulkDelete);
router.get("/", cache(300), subDegreeController.getAll);
router.get("/:id", cache(300), subDegreeController.getById);
router.put("/:id", subDegreeController.update);
router.patch("/:id/publish", subDegreeController.togglePublish);
router.delete("/:id", subDegreeController.remove);

module.exports = router;
