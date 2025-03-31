const express = require("express");
const mongoose = require("mongoose");
const Item = require("../models/Item");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const { startSession } = require("mongoose");

// ✅ Load WebSockets after server starts
let io;
setTimeout(() => {
    io = require("../server").io;
    console.log("✅ WebSockets loaded in itemRoutes.js");
}, 1000);

// ✅ Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// ✅ Configure multer storage for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });


// ✅ Middleware to Validate `userId` in Requests
const validateUser = async (req, res, next) => {
    try {
        const { userId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        req.user = user; // Attach user info to request
        next();
    } catch (error) {
        console.error("❌ User validation error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ✅ Get all auction items
router.get("/", async (req, res) => {
    try {
        const items = await Item.find()
            .populate("highestBidder buyer seller", "username email");

        res.status(200).json(items);
    } catch (error) {
        console.error("❌ Error fetching items:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ✅ Get a single auction item by ID
router.get("/:id", async (req, res) => {
    try {
        const item = await Item.findById(req.params.id)
            .populate("highestBidder buyer seller", "username email");

        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        res.status(200).json(item);
    } catch (error) {
        console.error("❌ Error fetching item:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ✅ Create a new auction item
router.post("/create", upload.single("image"), validateUser, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log("📥 Incoming Data:", req.body);

        const { productName, features, price, buyNowPrice, expirationTime } = req.body;
        const sellerId = req.user._id;  // ✅ Assign authenticated seller

        if (!productName || !features || !price || !expirationTime) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        const newItem = new Item({
            productName,
            features,
            price,
            bidPrice: price,
            buyNowPrice: buyNowPrice || null,
            expirationTime: new Date(expirationTime),
            seller: sellerId,
            highestBidder: null,
            buyer: null,
            imagesArray: imagePath ? [imagePath] : [],
            isExpired: false
        });

        await newItem.save({ session });

        await session.commitTransaction();
        session.endSession();

        // ✅ WebSocket notification
        if (io) {
            io.emit("updateHistory", {
                message: `🛒 New item added: ${newItem.productName} by ${req.user.username}`
            });
        }

        res.status(201).json({ success: true, item: newItem });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ Error creating item:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ✅ Place a bid
router.post("/:id/bid", validateUser, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { bidAmount } = req.body;
        const bidderId = req.user._id;

        let item = await Item.findById(req.params.id).session(session);
        if (!item || item.isExpired) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Invalid or expired auction" });
        }

        if (bidAmount <= item.bidPrice) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Bid must be higher than current bid" });
        }

        item.highestBidder = bidderId;
        item.bidPrice = bidAmount;

        await item.save({ session });

        await session.commitTransaction();
        session.endSession();

        // ✅ Emit bid update
        if (io) {
            io.emit("bidUpdate", {
                itemId: item._id,
                newBid: item.bidPrice,
                highestBidder: req.user.username
            });

            io.emit("updateHistory", {
                message: `💰 Bid placed by ${req.user.username} on ${item.productName}`
            });
        }

        res.status(200).json({ success: true, message: "Bid placed successfully", updatedItem: item });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ Error placing bid:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ✅ "Buy Now" feature
router.post("/:id/buy", validateUser, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const buyerId = req.user._id;

        let item = await Item.findById(req.params.id).session(session);
        if (!item || item.isExpired) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Invalid or expired auction" });
        }

        if (!item.buyNowPrice) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Buy Now not available" });
        }

        item.isExpired = true;
        item.buyer = buyerId;

        await item.save({ session });

        await session.commitTransaction();
        session.endSession();

        // ✅ Emit buy event
        if (io) {
            io.emit("updateHistory", {
                message: `🎉 Item "${item.productName}" bought by ${req.user.username}`
            });
        }

        res.status(200).json({ success: true, message: "Item purchased successfully!", updatedItem: item });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ Error in Buy Now:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
