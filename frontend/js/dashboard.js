
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("churnguard_access_token");

    if (!token) {
        window.location.href = "../index.html";
        return;
    }

    // -----------------------------------------
    // ELEMENTS
    // -----------------------------------------

    const numberFormat = new Intl.NumberFormat("en-US");

    const totalElement = document.getElementById("total-customers");
    const churnedElement = document.getElementById("churned-customers");
    const churnRateElement = document.getElementById("churn-rate");
    const highRiskElement = document.getElementById("high-risk-customers");

    const riskCanvas = document.getElementById("risk-distribution-chart");
    const riskEmptyState = document.getElementById("risk-empty-state");

    const lowRiskElement = document.getElementById("low-risk-count");
    const mediumRiskElement = document.getElementById("medium-risk-count");
    const highRiskCountElement = document.getElementById("high-risk-count");

    const activityEmpty = document.getElementById("activity-empty");
    const activityContent = document.getElementById("activity-content");
    const activityBody = document.getElementById("recent-predictions-body");

    let riskChart = null;

    // -----------------------------------------
    // AUTHENTICATION
    // -----------------------------------------

    try {
        const user = await window.ChurnGuardAPI.getCurrentUser(token);

        const nameElements = [
            document.getElementById("sidebar-user-name"),
            document.getElementById("header-user-name")
        ];

        nameElements.forEach(element => {
            if (element) {
                element.textContent = user.full_name;
            }
        });

        const roleElement = document.getElementById("sidebar-user-role");

        if (roleElement) {
            roleElement.textContent = user.role;
        }

        const initial = user.full_name.charAt(0).toUpperCase();

        const avatar = document.getElementById("user-avatar");

        if (avatar) {
            avatar.textContent = initial;
        }

        document.querySelectorAll(".header-user .user-avatar").forEach(element => {
            element.textContent = initial;
        });

    } catch (error) {
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

        if (totalElement) {
            totalElement.textContent = numberFormat.format(
                stats.total_customers
            );
        }

        if (churnedElement) {
            churnedElement.textContent = numberFormat.format(
                stats.churned_customers
            );
        }

        if (churnRateElement) {
            churnRateElement.textContent = `${stats.churn_rate}%`;
        }

        // Customer churn distribution chart

        const churnCanvas = document.getElementById(
            "churn-distribution-chart"
        );

        if (churnCanvas && window.Chart) {
            const existingChart = Chart.getChart(churnCanvas);

            if (existingChart) {
                existingChart.destroy();
            }

            new Chart(churnCanvas, {
                type: "doughnut",

                data: {
                    labels: [
                        "Retained Customers",
                        "Churned Customers"
                    ],

                    datasets: [{
                        data: [
                            stats.retained_customers,
                            stats.churned_customers
                        ],

                        backgroundColor: [
                            "#2563eb",
                            "#f59e0b"
                        ],

                        borderWidth: 0,
                        hoverOffset: 5
                    }]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    cutout: "68%",

                    plugins: {
                        legend: {
                            position: "bottom"
                        },

                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw || 0;

                                    const total =
                                        stats.retained_customers +
                                        stats.churned_customers;

                                    const percentage = total
                                        ? ((value / total) * 100).toFixed(1)
                                        : 0;

                                    return `${context.label}: ${numberFormat.format(value)} (${percentage}%)`;
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

        riskData.forEach(item => {
            if (Object.prototype.hasOwnProperty.call(
                riskCounts,
                item.risk_level
            )) {
                riskCounts[item.risk_level] = Number(
                    item.customer_count || 0
                );
            }
        });

        const totalRiskCustomers =
            riskCounts.Low +
            riskCounts.Medium +
            riskCounts.High;

        if (lowRiskElement) {
            lowRiskElement.textContent = numberFormat.format(
                riskCounts.Low
            );
        }

        if (mediumRiskElement) {
            mediumRiskElement.textContent = numberFormat.format(
                riskCounts.Medium
            );
        }

        if (highRiskCountElement) {
            highRiskCountElement.textContent = numberFormat.format(
                riskCounts.High
            );
        }

        if (highRiskElement) {
            highRiskElement.textContent = numberFormat.format(
                riskCounts.High
            );
        }

        if (riskCanvas && totalRiskCustomers > 0 && window.Chart) {
            if (riskEmptyState) {
                riskEmptyState.hidden = true;
            }

            riskCanvas.hidden = false;

            if (riskChart) {
                riskChart.destroy();
            }

            riskChart = new Chart(riskCanvas, {
                type: "doughnut",

                data: {
                    labels: [
                        "Low Risk",
                        "Medium Risk",
                        "High Risk"
                    ],

                    datasets: [{
                        data: [
                            riskCounts.Low,
                            riskCounts.Medium,
                            riskCounts.High
                        ],

                        backgroundColor: [
                            "#22c55e",
                            "#f59e0b",
                            "#ef4444"
                        ],

                        borderWidth: 0,
                        hoverOffset: 6
                    }]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "65%",

                    plugins: {
                        legend: {
                            position: "bottom"
                        },

                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw || 0;

                                    const percentage = totalRiskCustomers
                                        ? ((value / totalRiskCustomers) * 100).toFixed(1)
                                        : 0;

                                    return `${context.label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

        } else if (riskEmptyState) {
            riskEmptyState.hidden = false;

            if (riskCanvas) {
                riskCanvas.hidden = true;
            }
        }

    } catch (error) {
        console.error("Risk distribution error:", error);

        if (riskEmptyState) {
            riskEmptyState.hidden = false;
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
    }
});
