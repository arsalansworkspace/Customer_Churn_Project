
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // ==========================================
    // AUTHENTICATION
    // ==========================================

    const token = localStorage.getItem("churnguard_access_token");

    if (!token) {
        window.location.href = "../index.html";
        return;
    }

    const logoutButton = document.getElementById("logout-button");

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("churnguard_access_token");
            localStorage.removeItem("churnguard_user");

            window.location.href = "../index.html";
        });
    }


    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const reportsStatus = document.getElementById("reports-status");
    const reportsMessage = document.getElementById("reports-message");

    const downloadButtons = document.querySelectorAll(
        "[data-report]"
    );


    // ==========================================
    // STATUS AND MESSAGE HANDLING
    // ==========================================

    function showMessage(message, type = "success") {
        if (!reportsMessage) return;

        reportsMessage.textContent = message;
        reportsMessage.className = `reports-message ${type}`;
        reportsMessage.hidden = false;
    }


    function hideMessage() {
        if (!reportsMessage) return;

        reportsMessage.textContent = "";
        reportsMessage.hidden = true;
    }


    function updateStatus(message) {
        if (!reportsStatus) return;

        reportsStatus.innerHTML = `
            <span class="status-dot"></span>
            ${message}
        `;
    }


    // ==========================================
    // USER INFORMATION
    // ==========================================

    async function loadUserInformation() {
        try {
            const user = await ChurnGuardAPI.getCurrentUser(token);

            const displayName =
                user.full_name ||
                user.name ||
                user.username ||
                user.email ||
                "User";

            const role = user.role || "User";

            const initial = displayName.charAt(0).toUpperCase();

            const sidebarName = document.getElementById(
                "sidebar-user-name"
            );

            const sidebarRole = document.getElementById(
                "sidebar-user-role"
            );

            const avatar = document.getElementById("user-avatar");

            const headerName = document.getElementById(
                "header-user-name"
            );

            if (sidebarName) {
                sidebarName.textContent = displayName;
            }

            if (sidebarRole) {
                sidebarRole.textContent = role;
            }

            if (avatar) {
                avatar.textContent = initial;
            }

            if (headerName) {
                headerName.textContent = displayName;
            }

            return true;

        } catch (error) {
            console.error("User information error:", error);

            const errorMessage = error.message.toLowerCase();

            if (
                errorMessage.includes("token") ||
                errorMessage.includes("credential") ||
                errorMessage.includes("unauthorized") ||
                errorMessage.includes("401")
            ) {
                localStorage.removeItem("churnguard_access_token");
                localStorage.removeItem("churnguard_user");

                window.location.href = "../index.html";

                return false;
            }

            showMessage(
                "Unable to load user information: " + error.message,
                "error"
            );

            return false;
        }
    }


    const userLoaded = await loadUserInformation();

    if (!userLoaded) {
        return;
    }


    // ==========================================
    // REPORT CONFIGURATION
    // ==========================================

    const reportConfigurations = {

        pdf: {
            endpoint: "/api/reports/pdf",
            filename: "churnguard_analytics_report.pdf",
            label: "PDF Report"
        },

        excel: {
            endpoint: "/api/reports/excel",
            filename: "churnguard_report.xlsx",
            label: "Excel Workbook"
        },

        customers: {
            endpoint: "/api/reports/customers.csv",
            filename: "churnguard_customers.csv",
            label: "Customer CSV"
        },

        predictions: {
            endpoint: "/api/reports/predictions.csv",
            filename: "churnguard_predictions.csv",
            label: "Prediction CSV"
        }

    };


    // ==========================================
    // DOWNLOAD HANDLER
    // ==========================================

    let isDownloading = false;


    async function downloadReport(reportType, button) {

        if (isDownloading) {
            return;
        }

        const config = reportConfigurations[reportType];

        if (!config) {
            showMessage("Invalid report selected.", "error");
            return;
        }

        isDownloading = true;

        const originalButtonContent = button.innerHTML;

        try {

            hideMessage();

            // Disable all export buttons during download.
            downloadButtons.forEach((item) => {
                item.disabled = true;
            });

            button.innerHTML = `
                <span>⏳</span>
                Generating...
            `;

            updateStatus(`Generating ${config.label}...`);

            const filename = await ChurnGuardAPI.downloadReport(
                token,
                config.endpoint,
                config.filename
            );

            showMessage(
                `${config.label} downloaded successfully: ${filename}`,
                "success"
            );

            updateStatus("Export completed successfully");

        } catch (error) {

            console.error(
                `Error downloading ${config.label}:`,
                error
            );

            const message = error.message || "An unexpected error occurred.";

            showMessage(
                `Unable to download ${config.label}: ${message}`,
                "error"
            );

            updateStatus("Export failed");

            if (
                message.toLowerCase().includes("token") ||
                message.toLowerCase().includes("credential") ||
                message.toLowerCase().includes("unauthorized") ||
                message.includes("401")
            ) {
                localStorage.removeItem("churnguard_access_token");
                localStorage.removeItem("churnguard_user");

                window.location.href = "../index.html";
            }

        } finally {

            isDownloading = false;

            downloadButtons.forEach((item) => {
                item.disabled = false;
            });

            button.innerHTML = originalButtonContent;

        }
    }


    // ==========================================
    // BUTTON EVENT LISTENERS
    // ==========================================

    downloadButtons.forEach((button) => {

        button.addEventListener("click", async () => {

            const reportType = button.dataset.report;

            await downloadReport(reportType, button);

        });

    });


    // ==========================================
    // INITIAL PAGE STATE
    // ==========================================

    updateStatus("Ready to export");

    console.log("ChurnGuard Reports page initialized successfully.");

});
