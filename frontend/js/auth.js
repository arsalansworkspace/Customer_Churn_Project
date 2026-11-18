document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const toggleButton = document.getElementById("toggle-password");
    const loginButton = document.getElementById("login-button");
    const buttonText = document.getElementById("login-button-text");
    const messageBox = document.getElementById("login-message");

    function showMessage(message, type = "error") {
        messageBox.textContent = message;
        messageBox.className = type === "success"
            ? "alert success"
            : "alert";
        messageBox.hidden = false;
    }

    toggleButton.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";
        toggleButton.textContent = isPassword ? "Hide" : "Show";
        toggleButton.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        messageBox.hidden = true;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage("Please enter your email and password.");
            return;
        }

        loginButton.disabled = true;
        buttonText.textContent = "Signing in...";

        try {
            const result = await window.ChurnGuardAPI.login(email, password);

            localStorage.setItem("churnguard_access_token", result.access_token);
            localStorage.setItem("churnguard_user", JSON.stringify(result.user));

            showMessage("Login successful. Opening your workspace...", "success");

            window.setTimeout(() => {
                window.location.href = "./pages/dashboard.html";
            }, 700);

        } catch (error) {
            showMessage(error.message);
            loginButton.disabled = false;
            buttonText.textContent = "Sign in";
        }
    });
});
