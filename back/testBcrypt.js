const bcrypt = require("bcrypt");

const plainPassword = "diyon"; // Enter the exact password used during registration
const hashedPassword = "$2b$10$wXdLLV2tVPv.krCeZNFhmefW0/.zYeL/GtmFiotb7sG8kGepiwAbu"; // Paste the new hashed password

(async () => {
    console.log("🔑 Testing bcrypt.compare()");
    console.log("Entered Password:", plainPassword);
    console.log("Stored Hashed Password:", hashedPassword);

    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    console.log("✅ Password Match Result:", isMatch);
})();
