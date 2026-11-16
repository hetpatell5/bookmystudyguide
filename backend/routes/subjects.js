const express = require("express");
const router = express.Router();
const subjectController = require("../controller/subjectController");

const cache = require("../middleware/cacheMiddleware");

router.post("/", subjectController.create);
router.post("/bulk", subjectController.bulkCreate);
router.post("/bulk-publish", subjectController.bulkPublish);
router.post("/bulk-delete", subjectController.bulkDelete);
router.get("/", cache(300), subjectController.getAll);
router.put("/:id", subjectController.update);
router.patch("/:id/publish", subjectController.togglePublish);
router.delete("/:id", subjectController.remove);

module.exports = router;
