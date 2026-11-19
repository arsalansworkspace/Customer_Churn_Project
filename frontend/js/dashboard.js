
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("churnguard_access_token");

    if (!token) {
        window.location.href = "../index.html";
        return;
    }

    // -----------------------------------------
    // ELEMENTS & CONFIGURATION
    // -----------------------------------------

    const numberFormat = new Intl.NumberFormat("en-US");

    const totalElement = document.getElementById("total-customers");
    const churnedElement = document.getElementById("churned-customers");
    const churnRateElement = document.getElementById("churn-rate");
    const highRiskElement = document.getElementById("high-risk-customers");

    const churnCanvas = document.getElementById("churn-distribution-chart");
    const riskCanvas = document.getElementById("risk-distribution-chart");

    const riskEmptyState = document.getElementById("risk-empty-state");
    const riskSummary = document.getElementById("risk-summary");

    const lowRiskElement = document.getElementById("low-risk-count");
    const mediumRiskElement = document.getElementById("medium-risk-count");
    const highRiskCountElement = document.getElementById("high-risk-count");

    const activityEmpty = document.getElementById("activity-empty");
    const activityContent = document.getElementById("activity-content");
    const activityBody = document.getElementById("recent-predictions-body");

    let churnChart = null;
    let riskChart = null;

    // -----------------------------------------
    // CHART DEFAULTS
    // -----------------------------------------

    if (window.Chart) {
        Chart.defaults.font.family = "'Manrope', sans-serif";
        Chart.defaults.font.size = 10;
        Chart.defaults.color = "#778294";

        Chart.defaults.plugins.tooltip.backgroundColor = "#1d4ed8";
        Chart.defaults.plugins.tooltip.titleColor = "#ffffff";
        Chart.defaults.plugins.tooltip.bodyColor = "#e8edf4";
        Chart.defaults.plugins.tooltip.padding = 11;
        Chart.defaults.plugins.tooltip.cornerRadius = 5;
        Chart.defaults.plugins.tooltip.displayColors = true;
    }

    // -----------------------------------------
    // AUTHENTICATION
    // -----------------------------------------

    try {
        const user = await window.ChurnGuardAPI.getCurrentUser(token);

        const fullName = user.full_name || "User";

        const nameElements = [
            document.getElementById("sidebar-user-name"),
            document.getElementById("header-user-name")
        ];

        nameElements.forEach(element => {
            if (element) {
                element.textContent = fullName;
            }
        });

        const roleElement = document.getElementById("sidebar-user-role");

        if (roleElement) {
            roleElement.textContent = user.role || "User";
        }

        const initial = fullName.charAt(0).toUpperCase();

        const avatar = document.getElementById("user-avatar");

        if (avatar) {
            avatar.textContent = initial;
        }

        document.querySelectorAll(".header-user .user-avatar").forEach(element => {
            element.textContent = initial;
        });

    } catch (error) {
        console.error("Authentication error:", error);

        localStorage.removeItem("churnguard_access_token");
        localStorage.removeItem("churnguard_user");

        window.location.href = "../index.html";
        return;
    }

    // -----------------------------------------
    // LOGOUT
    // -----------------------------------------

    const logoutButton = document.getElementById("logout-button");

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("churnguard_access_token");
            localStorage.removeItem("churnguard_user");

            window.location.href = "../index.html";
        });
    }

    // -----------------------------------------
    // CUSTOMER STATISTICS
    // -----------------------------------------

    try {
        const stats = await window.ChurnGuardAPI.getCustomerStats(token);

        const totalCustomers = Number(stats.total_customers) || 0;
        const churnedCustomers = Number(stats.churned_customers) || 0;
        const retainedCustomers = Number(stats.retained_customers) || 0;

        if (totalElement) {
            totalElement.textContent = numberFormat.format(totalCustomers);
        }

        if (churnedElement) {
            churnedElement.textContent = numberFormat.format(churnedCustomers);
        }

        if (churnRateElement) {
            churnRateElement.textContent = `${stats.churn_rate}%`;
        }

        // -----------------------------------------
        // CHART 1: CUSTOMER CHURN DISTRIBUTION
        // Doughnut chart
        // -----------------------------------------

        if (churnCanvas && window.Chart) {

            if (churnChart) {
                churnChart.destroy();
            }

            churnChart = new Chart(churnCanvas, {
                type: "doughnut",

                data: {
                    labels: [
                        "Retained Customers",
                        "Churned Customers"
                    ],

                    datasets: [{
                        data: [
                            retainedCustomers,
                            churnedCustomers
                        ],

                        backgroundColor: [
                            "#506F8F",
                            "#C5A46D"
                        ],

                        hoverBackgroundColor: [
                            "#405D7B",
                            "#B38F58"
                        ],

                        borderColor: "#ffffff",
                        borderWidth: 4,
                        hoverOffset: 7,
                        borderRadius: 3,
                        spacing: 2
                    }]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    cutout: "72%",
                    rotation: -90,

                    animation: {
                        duration: 900,
                        easing: "easeOutQuart"
                    },

                    interaction: {
                        intersect: false
                    },

                    plugins: {
                        legend: {
                            position: "bottom",

                            labels: {
                                usePointStyle: true,
                                pointStyle: "circle",
                                boxWidth: 8,
                                boxHeight: 8,
                                padding: 22,

                                font: {
                                    family: "Manrope",
                                    size: 10,
                                    weight: "600"
                                }
                            }
                        },

                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = Number(context.raw) || 0;

                                    const total =
                                        retainedCustomers + churnedCustomers;

                                    const percentage = total
                                        ? ((value / total) * 100).toFixed(1)
                                        : "0.0";

                                    return ` ${numberFormat.format(value)} customers (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

    } catch (error) {
        console.error("Customer statistics error:", error);
    }

    // -----------------------------------------
    // CUSTOMER RISK DISTRIBUTION
    // -----------------------------------------

    try {
        const analytics = await window.ChurnGuardAPI.getAnalyticsOverview(token);

        const riskData = analytics.risk_distribution || [];

        const riskCounts = {
            Low: 0,
            Medium: 0,
            High: 0
        };

        // Normalize risk levels from API response.

        riskData.forEach(item => {
            const level = String(item.risk_level || "")
                .trim()
                .toLowerCase();

            const count = Number(item.customer_count) || 0;

            if (level === "low") {
                riskCounts.Low = count;
            } else if (level === "medium") {
                riskCounts.Medium = count;
            } else if (level === "high") {
                riskCounts.High = count;
            }
        });

        const totalRiskCustomers =
            riskCounts.Low +
            riskCounts.Medium +
            riskCounts.High;

        // -----------------------------------------
        // UPDATE RISK SUMMARY
        // -----------------------------------------

        if (lowRiskElement) {
            lowRiskElement.textContent = numberFormat.format(riskCounts.Low);
        }

        if (mediumRiskElement) {
            mediumRiskElement.textContent = numberFormat.format(riskCounts.Medium);
        }

        if (highRiskCountElement) {
            highRiskCountElement.textContent = numberFormat.format(riskCounts.High);
        }

        if (highRiskElement) {
            highRiskElement.textContent = numberFormat.format(riskCounts.High);
        }

        // -----------------------------------------
        // CHART 2: CUSTOMER RISK OVERVIEW
        // Horizontal bar chart
        // -----------------------------------------

        if (riskCanvas && totalRiskCustomers > 0 && window.Chart) {

            if (riskEmptyState) {
                riskEmptyState.hidden = true;
            }

            if (riskSummary) {
                riskSummary.hidden = false;
            }

            riskCanvas.hidden = false;

            if (riskChart) {
                riskChart.destroy();
            }

            riskChart = new Chart(riskCanvas, {
                type: "bar",

                data: {
                    labels: [
                        "Low Risk",
                        "Medium Risk",
                        "High Risk"
                    ],

                    datasets: [{
                        label: "Customers",

                        data: [
                            riskCounts.Low,
                            riskCounts.Medium,
                            riskCounts.High
                        ],

                        backgroundColor: [
                            "#6D9C83",
                            "#C69B5F",
                            "#BD6B6B"
                        ],

                        hoverBackgroundColor: [
                            "#57866D",
                            "#AD8149",
                            "#A95656"
                        ],

                        borderRadius: 4,
                        borderSkipped: false,
                        barThickness: 19,
                        maxBarThickness: 22
                    }]
                },

                options: {
                    indexAxis: "y",

                    responsive: true,
                    maintainAspectRatio: false,

                    animation: {
                        duration: 850,
                        easing: "easeOutQuart"
                    },

                    plugins: {
                        legend: {
                            display: false
                        },

                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = Number(context.raw) || 0;

                                    const percentage = totalRiskCustomers
                                        ? ((value / totalRiskCustomers) * 100).toFixed(1)
                                        : "0.0";

                                    return ` ${numberFormat.format(value)} customers (${percentage}%)`;
                                }
                            }
                        }
                    },

                    scales: {
                        x: {
                            beginAtZero: true,

                            border: {
                                display: false
                            },

                            grid: {
                                color: "#eeece7",
                                drawTicks: false
                            },

                            ticks: {
                                precision: 0,
                                padding: 8,

                                font: {
                                    family: "Manrope",
                                    size: 9
                                }
                            },

                            title: {
                                display: true,
                                text: "Number of customers",

                                color: "#8993A1",

                                font: {
                                    family: "Manrope",
                                    size: 9,
                                    weight: "600"
                                },

                                padding: {
                                    top: 8
                                }
                            }
                        },

                        y: {
                            border: {
                                display: false
                            },

                            grid: {
                                display: false
                            },

                            ticks: {
                                color: "#45536A",
                                padding: 9,

                                font: {
                                    family: "Manrope",
                                    size: 10,
                                    weight: "700"
                                }
                            }
                        }
                    }
                }
            });

        } else {

            if (riskEmptyState) {
                riskEmptyState.hidden = false;
            }

            if (riskSummary) {
                riskSummary.hidden = true;
            }

            if (riskCanvas) {
                riskCanvas.hidden = true;
            }
        }

    } catch (error) {
        console.error("Risk distribution error:", error);

        if (riskEmptyState) {
            riskEmptyState.hidden = false;
        }

        if (riskSummary) {
            riskSummary.hidden = true;
        }

        if (riskCanvas) {
            riskCanvas.hidden = true;
        }
    }

    // -----------------------------------------
    // RECENT PREDICTION ACTIVITY
    // -----------------------------------------

    try {
        const response = await window.ChurnGuardAPI.getRecentPredictions(
            token,
            10
        );

        const predictions = response.predictions || [];

        if (!predictions.length) {

            if (activityEmpty) {
                activityEmpty.hidden = false;
            }

            if (activityContent) {
                activityContent.hidden = true;
            }

            return;
        }

        if (activityEmpty) {
            activityEmpty.hidden = true;
        }

        if (activityContent) {
            activityContent.hidden = false;
        }

        if (!activityBody) {
            return;
        }

        activityBody.innerHTML = "";

        predictions.forEach(item => {
            const row = document.createElement("tr");

            const date = item.created_at
                ? new Date(item.created_at).toLocaleString()
                : "—";

            const probability = Number(
                item.churn_probability || 0
            ).toFixed(2);

            const riskClass = String(
                item.risk_level || "Low"
            ).toLowerCase();

            const cells = [
                item.customer_code || "—",
                `${probability}%`,
                item.prediction || "—",
                item.risk_level || "—",
                date
            ];

            cells.forEach((value, index) => {
                const cell = document.createElement("td");

                if (index === 3) {
                    const badge = document.createElement("span");

                    badge.className = `risk-badge ${riskClass}`;
                    badge.textContent = value;

                    cell.appendChild(badge);
                } else {
                    cell.textContent = value;
                }

                row.appendChild(cell);
            });

            activityBody.appendChild(row);
        });

    } catch (error) {
        console.error("Recent prediction activity error:", error);

        if (activityEmpty) {
            activityEmpty.hidden = false;
            activityEmpty.textContent =
                "Unable to load recent prediction activity.";
        }

        if (activityContent) {
            activityContent.hidden = true;
        }
    }
});
