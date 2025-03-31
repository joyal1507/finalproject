const express = require("express");
const router = express.Router();
const Item = require("../models/Item");

// ✅ Fetch all auction history (global view)
router.get("/", async (req, res) => {
    try {
        const history = await Item.find()
            .populate("seller", "username email")
            .populate("buyer", "username email")
            .sort({ expirationTime: -1 });

        res.json({
            success: true,
            history
        });

    } catch (error) {
        console.error("❌ Error fetching auction history:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
