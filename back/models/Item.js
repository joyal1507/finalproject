const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
    productName: String,
    features: String,
    price: Number,
    bidPrice: { type: Number, default: 0 },
    buyNowPrice: { type: Number, default: null }, // ✅ Added "Buy Now" price, default null if not set
    highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // ✅ Stores the "Buy Now" buyer
    imagesArray: [String],
    expirationTime: Date, // ✅ Use Date for easier expiry checks
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isExpired: { type: Boolean, default: false }, // ✅ Track auction expiry
    isBoughtNow: { type: Boolean, default: false } // ✅ Track if item was bought via "Buy Now"
});

// ✅ Middleware to expire auction when Buy Now is used
ItemSchema.pre("save", function (next) {
    if (this.isBoughtNow && !this.isExpired) {
        this.isExpired = true; // Automatically mark item as expired when bought instantly
    }
    next();
});

const Item = mongoose.model("Item", ItemSchema);
module.exports = Item;
