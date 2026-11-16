const express = require("express");
const router = express.Router();
const bookController = require("../controller/bookController");
const cache = require("../middleware/cacheMiddleware");
const upload = require("../middleware/uploadMiddleware");

const cpUpload = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'commonPages', maxCount: 10 }]);

router.post("/", cpUpload, bookController.create);
router.post("/bulk-publish", bookController.bulkPublish);
router.post("/bulk-delete", bookController.bulkDelete);
router.get("/", cache(300), bookController.getAll);
router.get("/:id", cache(60), bookController.getOne);
router.put("/:id", cpUpload, bookController.update);
router.patch("/:id/publish", bookController.togglePublish);
router.delete("/:id", bookController.remove);

module.exports = router;
