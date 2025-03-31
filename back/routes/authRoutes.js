const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const SECRET_KEY = "your_secret_key";  // ✅ Use an environment variable in production

// ✅ Register Route (with Password Hashing)
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required!" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered!" });
        }

        // ✅ Hashing password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();

        res.json({ success: true, message: "User registered successfully!" });

    } catch (error) {
        console.error("❌ Registration error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Login Route (with JWT Authentication)
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect password" });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            SECRET_KEY,
            { expiresIn: "2h" }  // Token expiration time
        );

        console.log("✅ Login successful! Returning user data with JWT.");
        
        // ✅ Return JWT token along with user data
        res.json({
            success: true,
            message: "Login successful",
            token,  
            user: {
                _id: user._id.toString(),
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("❌ Login error:", error);

        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: "Server error" });
        }
    }
});

// ✅ Get All Users (For Debugging Only - Remove in Production)
router.get("/users", async (req, res) => {
    try {
        const users = await User.find({}, "-password");  // ✅ Exclude passwords
        console.log("📋 All Users:", users);
        res.json(users);

    } catch (error) {
        console.error("❌ Error fetching users:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ JWT Authentication Middleware (For Protected Routes)
const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Access denied, no token provided" });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;  // Add user data to request
        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid token" });
    }
};

module.exports = router;
