const { Wishlist } = require("../model/mysql");

// Add to Wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const { productId, name, price, image } = req.body;
        const userId = req.userId;

        // Check if already in wishlist (relational)
        const existing = await Wishlist.findOne({ where: { userId, productId } });
        if (existing) {
            return res.status(400).json({ success: false, message: "Product already in wishlist" });
        }

        const added = await Wishlist.create({
            userId,
            productId,
            name,
            price,
            image
        });

        // For compatibility, fetch the whole list or return the new state
        const items = await Wishlist.findAll({ where: { userId } });
        res.status(200).json({ 
            success: true, 
            message: "Added to wishlist", 
            data: { products: items } 
        });
    } catch (error) {
        console.error("Add to wishlist error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Remove from Wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.userId;

        const deleted = await Wishlist.destroy({ where: { userId, productId } });

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Product not found in wishlist" });
        }

        const items = await Wishlist.findAll({ where: { userId } });
        res.status(200).json({ 
            success: true, 
            message: "Removed from wishlist", 
            data: { products: items } 
        });
    } catch (error) {
        console.error("Remove from wishlist error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Wishlist
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.userId;
        const items = await Wishlist.findAll({
            where: { userId }
        });

        res.status(200).json({ 
            success: true, 
            data: { products: items } 
        });
    } catch (error) {
        console.error("Get wishlist error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
