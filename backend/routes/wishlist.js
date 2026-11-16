const express = require("express");
const router = express.Router();
const wishlistController = require("../controller/wishlistController");
const auth = require("../middleware/auth");

// All wishlist routes are protected
router.use(auth);

router.get("/", wishlistController.getWishlist);
router.post("/add", wishlistController.addToWishlist);
router.delete("/remove/:productId", wishlistController.removeFromWishlist);

module.exports = router;
