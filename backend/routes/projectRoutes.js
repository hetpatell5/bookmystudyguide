const express = require("express");
const router = express.Router();
const ctrl = require("../controller/projectController");

router.get("/", ctrl.getProjects);
router.post("/", ctrl.createProject);
router.get("/:id", ctrl.getProjectById);
router.patch("/:id/publish", ctrl.toggleProjectPublish);
router.post("/bulk-publish", ctrl.bulkPublishProjects);
router.patch("/:id", ctrl.updateProject);
router.delete("/:id", ctrl.deleteProject);

module.exports = router;
