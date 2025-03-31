require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http"); // ✅ Import http module
const { Server } = require("socket.io"); // ✅ Import socket.io
const Item = require("./models/Item"); // ✅ Import the Item model

const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");

const app = express();
const server = http.createServer(app); // ✅ Create HTTP server
const io = new Server(server, {
    cors: { origin: "*" } // ✅ Allow frontend connections
});

app.use(cors());
app.use(express.json());
// ✅ Serve static image files
app.use("/uploads", express.static("uploads"));
const historyRoutes = require("./routes/historyRoutes");
app.use("/api/history", historyRoutes);



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);

// WebSocket connection
io.on("connection", (socket) => {
    console.log("🔌 A user connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
    });
});

// ✅ Check for expired auctions and announce winners
const checkAuctionExpiry = async () => {
    const currentTime = new Date();
    const expiredItems = await Item.find({ expirationTime: { $lt: currentTime }, isExpired: false });

    if (expiredItems.length > 0) {
        expiredItems.forEach(async (item) => {
            item.isExpired = true;

            let winnerMessage = "No bids placed. Item not sold.";
            if (item.highestBidder) {
                winnerMessage = `Auction ended! Winner: User ${item.highestBidder}, Winning Bid: $${item.bidPrice}`;
            }

            await item.save();
            console.log(`⏳ Auction expired: ${item.productName} | ${winnerMessage}`);

            // 📡 Notify all users that the auction has ended & announce the winner
            io.emit("auctionExpired", {
                itemId: item._id,
                productName: item.productName,
                winnerMessage,
            });

            // 🗑️ Remove item from database after notifying the winner
            setTimeout(async () => {
                await Item.findByIdAndDelete(item._id);
                console.log(`🗑️ Deleted expired auction: ${item.productName}`);
            }, 5000); // Delay to ensure UI updates
        });
    }
};

// ✅ Run expiry check every 1 minute
setInterval(checkAuctionExpiry, 60000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = { io }; // ✅ Export io for WebSockets
