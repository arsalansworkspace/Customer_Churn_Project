document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("churnguard_access_token");

    if (!token) {
        window.location.href = "../index.html";
        return;
    }

    const nameElements = [
        document.getElementById("sidebar-user-name"),
        document.getElementById("header-user-name")
    ];

    const avatar = document.getElementById("user-avatar");

    try {
        const user = await window.ChurnGuardAPI.getCurrentUser(token);

        nameElements.forEach(element => {
            if (element) element.textContent = user.full_name;
        });

        document.getElementById("sidebar-user-role").textContent = user.role;
        avatar.textContent = user.full_name.charAt(0).toUpperCase();

        document.querySelectorAll(".header-user .user-avatar").forEach(element => {
            element.textContent = user.full_name.charAt(0).toUpperCase();
        });

    } catch (error) {
        localStorage.removeItem("churnguard_access_token");
        localStorage.removeItem("churnguard_user");
        window.location.href = "../index.html";
        return;
    }

    document.getElementById("logout-button").addEventListener("click", () => {
        localStorage.removeItem("churnguard_access_token");
        localStorage.removeItem("churnguard_user");
        window.location.href = "../index.html";
    });
});
