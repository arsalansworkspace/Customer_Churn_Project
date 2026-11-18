
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

    const statusElement = document.getElementById("analytics-status");
    const errorElement = document.getElementById("analytics-error");

    const elements = {
        totalCustomers: document.getElementById("analytics-total-customers"),
        churnedCustomers: document.getElementById("analytics-churned-customers"),
        churnRate: document.getElementById("analytics-churn-rate"),
        retentionRate: document.getElementById("analytics-retention-rate"),
        totalPredictions: document.getElementById("analytics-total-predictions"),

        summaryTotal: document.getElementById("summary-total-predictions"),
        summaryCustomers: document.getElementById("summary-customers-predicted"),
        summaryChurn: document.getElementById("summary-churn-predictions"),
        summaryNoChurn: document.getElementById("summary-no-churn-predictions")
    };


    // ==========================================
    // FORMATTERS
    // ==========================================

    function formatNumber(value) {
        return Number(value || 0).toLocaleString("en-US");
    }

    function formatPercentage(value) {
        return `${Number(value || 0).toFixed(2)}%`;
    }

    function formatCurrency(value) {
        return `$${Number(value || 0).toFixed(2)}`;
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

            const sidebarName = document.getElementById("sidebar-user-name");
            const sidebarRole = document.getElementById("sidebar-user-role");
            const avatar = document.getElementById("user-avatar");
            const headerName = document.getElementById("header-user-name");

            if (sidebarName) sidebarName.textContent = displayName;
            if (sidebarRole) sidebarRole.textContent = role;
            if (avatar) avatar.textContent = initial;
            if (headerName) headerName.textContent = displayName;

        } catch (error) {
            console.error("Unable to load user information:", error);

            if (error.message.toLowerCase().includes("token") ||
                error.message.toLowerCase().includes("credential") ||
                error.message.toLowerCase().includes("unauthorized")) {
                localStorage.removeItem("churnguard_access_token");
                localStorage.removeItem("churnguard_user");
                window.location.href = "../index.html";
            }
        }
    }


    // ==========================================
    // KPI CARDS
    // ==========================================

    function updateCustomerOverview(overview) {
        elements.totalCustomers.textContent =
            formatNumber(overview.total_customers);

        elements.churnedCustomers.textContent =
            formatNumber(overview.churned_customers);

        elements.churnRate.textContent =
            formatPercentage(overview.churn_rate);

        elements.retentionRate.textContent =
            formatPercentage(overview.retention_rate);
    }


    // ==========================================
    // PREDICTION SUMMARY
    // ==========================================

    function updatePredictionSummary(summary) {
        elements.totalPredictions.textContent =
            formatNumber(summary.total_predictions);

        elements.summaryTotal.textContent =
            formatNumber(summary.total_predictions);

        elements.summaryCustomers.textContent =
            formatNumber(summary.customers_with_predictions);

        elements.summaryChurn.textContent =
            formatNumber(summary.churn_predictions);

        elements.summaryNoChurn.textContent =
            formatNumber(summary.no_churn_predictions);
    }


    // ==========================================
    // CHART DEFAULTS
    // ==========================================

    if (typeof Chart === "undefined") {
        showError("Chart.js could not be loaded. Check your internet connection and refresh the page.");
        return;
    }

    Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
    Chart.defaults.color = "#718096";

    const chartInstances = {};

    function createChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);

        if (!canvas) {
            console.warn(`Chart canvas not found: ${canvasId}`);
            return;
        }

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        chartInstances[canvasId] = new Chart(canvas, config);
    }


    // ==========================================
    // RETENTION DOUGHNUT CHART
    // ==========================================

    function renderRetentionChart(overview) {
        createChart("retentionChart", {
            type: "doughnut",

            data: {
                labels: ["Retained Customers", "Churned Customers"],

                datasets: [{
                    data: [
                        overview.retained_customers,
                        overview.churned_customers
                    ],

                    backgroundColor: [
                        "#3478f6",
                        "#f06b6b"
                    ],

                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",

                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },

                    tooltip: {
                        callbacks: {
                            label(context) {
                                return `${context.label}: ${formatNumber(context.raw)}`;
                            }
                        }
                    }
                }
            }
        });
    }


    // ==========================================
    // CUSTOMER RISK DOUGHNUT CHART
    // ==========================================

    function renderRiskChart(riskDistribution) {
        const canvas = document.getElementById("riskChart");
        const emptyState = document.getElementById("risk-empty-state");

        const totalRiskCustomers = riskDistribution.reduce(
            (total, item) => total + Number(item.customer_count || 0),
            0
        );

        if (totalRiskCustomers === 0) {
            if (canvas) canvas.hidden = true;
            if (emptyState) emptyState.hidden = false;
            return;
        }

        if (canvas) canvas.hidden = false;
        if (emptyState) emptyState.hidden = true;

        const riskColors = {
            Low: "#159b69",
            Medium: "#f0ad4e",
            High: "#d94343"
        };

        const labels = riskDistribution.map(item => item.risk_level);
        const values = riskDistribution.map(item => Number(item.customer_count));

        createChart("riskChart", {
            type: "doughnut",

            data: {
                labels,

                datasets: [{
                    data: values,

                    backgroundColor: labels.map(
                        label => riskColors[label] || "#718096"
                    ),

                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",

                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },

                    tooltip: {
                        callbacks: {
                            label(context) {
                                const item = riskDistribution[context.dataIndex];

                                return `${context.label}: ${formatNumber(context.raw)} (${formatPercentage(item.percentage)})`;
                            }
                        }
                    }
                }
            }
        });
    }


    // ==========================================
    // CONTRACT CHURN BAR CHART
    // ==========================================

    function renderContractChart(contractDistribution) {
        const labels = contractDistribution.map(item => item.contract);

        const churned = contractDistribution.map(
            item => Number(item.churned || 0)
        );

        const retained = contractDistribution.map(
            item => Number(item.retained || 0)
        );

        createChart("contractChart", {
            type: "bar",

            data: {
                labels,

                datasets: [
                    {
                        label: "Retained Customers",
                        data: retained,
                        backgroundColor: "#3478f6",
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: "Churned Customers",
                        data: churned,
                        backgroundColor: "#f06b6b",
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },

                    y: {
                        beginAtZero: true,

                        ticks: {
                            precision: 0
                        }
                    }
                },

                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },

                    tooltip: {
                        callbacks: {
                            afterBody(context) {
                                const item = contractDistribution[context[0].dataIndex];

                                return [
                                    `Total: ${formatNumber(item.total)}`,
                                    `Churn rate: ${formatPercentage(item.churn_rate)}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }


    // ==========================================
    // TENURE CHURN RATE CHART
    // ==========================================

    function renderTenureChart(tenureDistribution) {
        const labels = tenureDistribution.map(item => item.tenure_group);

        const churnRates = tenureDistribution.map(
            item => Number(item.churn_rate || 0)
        );

        createChart("tenureChart", {
            type: "line",

            data: {
                labels,

                datasets: [{
                    label: "Churn Rate",
                    data: churnRates,

                    borderColor: "#3478f6",
                    backgroundColor: "rgba(52, 120, 246, 0.12)",

                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,

                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: "#3478f6"
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },

                    y: {
                        beginAtZero: true,
                        max: 100,

                        ticks: {
                            callback(value) {
                                return `${value}%`;
                            }
                        }
                    }
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label(context) {
                                const item = tenureDistribution[context.dataIndex];

                                return [
                                    `Churn rate: ${formatPercentage(context.raw)}`,
                                    `Customers: ${formatNumber(item.total)}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }


    // ==========================================
    // MONTHLY CHARGES COMPARISON
    // ==========================================

    function renderChargesChart(chargesComparison) {
        const labels = chargesComparison.map(item => {
            return item.churn_status === "Yes"
                ? "Churned"
                : "Retained";
        });

        const values = chargesComparison.map(
            item => Number(item.average_monthly_charges || 0)
        );

        const customerCounts = chargesComparison.map(
            item => Number(item.customer_count || 0)
        );

        createChart("chargesChart", {
            type: "bar",

            data: {
                labels,

                datasets: [{
                    label: "Average Monthly Charges",
                    data: values,

                    backgroundColor: [
                        "#f06b6b",
                        "#3478f6"
                    ],

                    borderRadius: 7,
                    borderSkipped: false,
                    maxBarThickness: 65
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },

                    y: {
                        beginAtZero: true,

                        ticks: {
                            callback(value) {
                                return `$${value}`;
                            }
                        }
                    }
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label(context) {
                                return `Average: ${formatCurrency(context.raw)}`;
                            },

                            afterLabel(context) {
                                return `Customers: ${formatNumber(customerCounts[context.dataIndex])}`;
                            }
                        }
                    }
                }
            }
        });
    }


    // ==========================================
    // STATUS AND ERROR HANDLING
    // ==========================================

    function updateStatus(message, isError = false) {
        if (!statusElement) return;

        statusElement.textContent = message;
        statusElement.classList.toggle("error", isError);
    }

    function showError(message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.hidden = false;
        }

        updateStatus("Analytics unavailable", true);
    }


    // ==========================================
    // LOAD ANALYTICS DATA
    // ==========================================

    async function loadAnalytics() {
        try {
            updateStatus("Loading analytics...");

            if (errorElement) {
                errorElement.hidden = true;
            }

            const data = await ChurnGuardAPI.getAnalyticsOverview(token);

            // Update KPI cards.
            updateCustomerOverview(data.customer_overview);

            // Update prediction summary.
            updatePredictionSummary(data.prediction_summary);

            // Render charts using actual API data.
            renderRetentionChart(data.customer_overview);
            renderRiskChart(data.risk_distribution || []);
            renderContractChart(data.contract_distribution || []);
            renderTenureChart(data.tenure_distribution || []);
            renderChargesChart(data.charges_comparison || []);

            updateStatus("Live database data");

        } catch (error) {
            console.error("Analytics loading failed:", error);

            showError(
                error.message || "Unable to load analytics. Please try again."
            );
        }
    }


    // ==========================================
    // INITIALIZE PAGE
    // ==========================================

    await loadUserInformation();
    await loadAnalytics();

});
