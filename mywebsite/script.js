document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            console.log("📤 Sending login request with:", { email, password });

            try {
                const response = await fetch("http://localhost:4000/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                console.log("📥 Response received:", response);

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                console.log("✅ Server response:", data);

                if (data.success) {
                    localStorage.setItem("authToken", data.token);
                    alert("Login successful! Redirecting...");
                    window.location.href = "choice.html";
                } else {
                    alert("❌ Invalid email or password");
                }
            } catch (error) {
                console.error("❌ Login failed:", error);
                alert("Something went wrong. Please try again.");
            }
        });
    }
});
