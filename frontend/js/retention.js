
document.addEventListener("DOMContentLoaded", async () => {

    // =========================================
    // INITIAL CONFIGURATION
    // =========================================

    const token = localStorage.getItem("churnguard_access_token");

    if (!token) {
        window.location.href = "../index.html";
        return;
    }

    const $ = (id) => document.getElementById(id);

    const numberFormat = new Intl.NumberFormat("en-US");

    const messageBox = $("retention-message");

    let searchTimeout = null;


    // =========================================
    // HELPER FUNCTIONS
    // =========================================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }


    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }


    function showMessage(message, type = "success") {
        messageBox.textContent = message;
        messageBox.className = `retention-message ${type}`;
        messageBox.hidden = false;

        window.setTimeout(() => {
            messageBox.hidden = true;
        }, 5000);
    }


    function setLoading(tbody, columns, message) {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${columns}" class="table-loading">
                        ${escapeHTML(message)}
                    </td>
                </tr>
            `;
        }
    }


    function showModal(modalId) {
        const modal = $(modalId);

        if (modal) {
            modal.hidden = false;
        }
    }


    function closeModal(modalId) {
        const modal = $(modalId);

        if (modal) {
            modal.hidden = true;
        }
    }


    function getRiskClass(risk) {
        return String(risk || "").toLowerCase();
    }


    function getStatusClass(status) {
        return String(status || "")
            .toLowerCase()
            .replace(/\s+/g, "-");
    }


    // =========================================
    // USER AUTHENTICATION
    // =========================================

    try {

        const user = await window.ChurnGuardAPI.getCurrentUser(token);

        const nameElements = [
            $("sidebar-user-name"),
            $("header-user-name")
        ];

        nameElements.forEach(element => {
            if (element) {
                element.textContent = user.full_name;
            }
        });

        const roleElement = $("sidebar-user-role");

        if (roleElement) {
            roleElement.textContent = user.role;
        }

        const initial = user.full_name.charAt(0).toUpperCase();

        const avatar = $("user-avatar");

        if (avatar) {
            avatar.textContent = initial;
        }

        document.querySelectorAll(".header-user .user-avatar")
            .forEach(element => {
                element.textContent = initial;
            });

    } catch (error) {

        localStorage.removeItem("churnguard_access_token");
        localStorage.removeItem("churnguard_user");

        window.location.href = "../index.html";
        return;
    }


    // =========================================
    // LOGOUT
    // =========================================

    $("logout-button")?.addEventListener("click", () => {

        localStorage.removeItem("churnguard_access_token");
        localStorage.removeItem("churnguard_user");

        window.location.href = "../index.html";

    });


    // =========================================
    // RETENTION OVERVIEW
    // =========================================

    async function loadRetentionOverview() {

        try {

            const data =
                await window.ChurnGuardAPI.getRetentionOverview(token);

            const risks = data.risk_distribution || {};
            const actions = data.action_status_distribution || {};

            // KPI CARDS

            $("retention-predicted-customers").textContent =
                numberFormat.format(
                    data.total_customers_with_predictions || 0
                );

            $("retention-high-risk").textContent =
                numberFormat.format(
                    risks.High?.customer_count || 0
                );

            const activeActions =
                (actions.Pending || 0) +
                (actions["In Progress"] || 0);

            $("retention-active-actions").textContent =
                numberFormat.format(activeActions);

            $("retention-overdue-actions").textContent =
                numberFormat.format(data.overdue_actions || 0);


            // RISK DISTRIBUTION

            ["High", "Medium", "Low"].forEach(level => {

                const key = level.toLowerCase();

                const count = risks[level]?.customer_count || 0;
                const percentage = risks[level]?.percentage || 0;

                $(`${key}-risk-percentage`).textContent =
                    `${percentage}%`;

                $(`${key}-risk-count`).textContent =
                    `${numberFormat.format(count)} customers`;

                $(`${key}-risk-bar`).style.width =
                    `${Math.min(100, Math.max(0, percentage))}%`;

            });


            // ACTION STATUS

            $("pending-actions").textContent =
                numberFormat.format(actions.Pending || 0);

            $("progress-actions").textContent =
                numberFormat.format(actions["In Progress"] || 0);

            $("completed-actions").textContent =
                numberFormat.format(actions.Completed || 0);

            $("cancelled-actions").textContent =
                numberFormat.format(actions.Cancelled || 0);


            // INTERACTIONS

            $("total-interactions").textContent =
                numberFormat.format(data.total_interactions || 0);

        } catch (error) {

            console.error("Retention overview error:", error);

            showMessage(
                `Unable to load retention overview: ${error.message}`,
                "error"
            );

        }

    }


    // =========================================
    // AT-RISK CUSTOMERS
    // =========================================

    async function loadAtRiskCustomers() {

        const tbody = $("at-risk-customers-body");

        setLoading(
            tbody,
            7,
            "Loading customer risk data..."
        );

        try {

            const riskLevel = $("risk-level-filter").value;
            const search = $("risk-customer-search").value.trim();

            const data =
                await window.ChurnGuardAPI.getAtRiskCustomers(
                    token,
                    riskLevel,
                    search,
                    0,
                    100
                );

            const customers = data.customers || [];

            if (!customers.length) {

                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="table-loading">
                            No customers found for the selected filters.
                        </td>
                    </tr>
                `;

                return;
            }


            tbody.innerHTML = customers.map(customer => {

                const riskClass = getRiskClass(customer.risk_level);

                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(customer.customer_code)}
                            </strong>
                            <small>
                                ID: ${escapeHTML(customer.customer_id)}
                            </small>
                        </td>

                        <td>
                            ${escapeHTML(customer.tenure)} months
                        </td>

                        <td>
                            ${escapeHTML(customer.contract)}
                        </td>

                        <td>
                            $${Number(
                                customer.monthly_charges || 0
                            ).toFixed(2)}
                        </td>

                        <td>
                            <strong>
                                ${Number(
                                    customer.churn_probability || 0
                                ).toFixed(2)}%
                            </strong>
                        </td>

                        <td>
                            <span class="risk-badge ${riskClass}">
                                ${escapeHTML(customer.risk_level)}
                            </span>
                        </td>

                        <td>
                            <button
                                class="table-action-button"
                                data-create-action="${escapeHTML(customer.customer_id)}">
                                Create Action
                            </button>
                        </td>

                    </tr>
                `;

            }).join("");


        } catch (error) {

            console.error("At-risk customers error:", error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-loading">
                        Unable to load customer data.
                    </td>
                </tr>
            `;

            showMessage(error.message, "error");

        }

    }


    // =========================================
    // RETENTION ACTIONS
    // =========================================

    async function loadRetentionActions() {

        const tbody = $("retention-actions-body");

        setLoading(
            tbody,
            7,
            "Loading retention actions..."
        );

        try {

            const actionStatus = $("action-status-filter").value;
            const priority = $("action-priority-filter").value;

            const data =
                await window.ChurnGuardAPI.getRetentionActions(
                    token,
                    actionStatus,
                    priority,
                    null,
                    0,
                    100
                );

            const actions = data.actions || [];

            if (!actions.length) {

                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="table-loading">
                            No retention actions found.
                        </td>
                    </tr>
                `;

                return;
            }


            tbody.innerHTML = actions.map(action => {

                const priorityClass = getRiskClass(action.priority);

                const statusClass = getStatusClass(action.status);

                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(action.customer_code)}
                            </strong>
                            <small>
                                ID: ${escapeHTML(action.customer_id)}
                            </small>
                        </td>

                        <td>
                            ${escapeHTML(action.action_type)}
                        </td>

                        <td>
                            <span class="priority-badge ${priorityClass}">
                                ${escapeHTML(action.priority)}
                            </span>
                        </td>

                        <td>
                            ${escapeHTML(
                                action.assigned_user || "Unassigned"
                            )}
                        </td>

                        <td>
                            ${formatDate(action.due_date)}
                        </td>

                        <td>
                            <span class="status-badge ${statusClass}">
                                ${escapeHTML(action.status)}
                            </span>
                        </td>

                        <td>
                            <select
                                class="action-status-select"
                                data-action-id="${escapeHTML(action.id)}"
                                aria-label="Update action status">

                                ${[
                                    "Pending",
                                    "In Progress",
                                    "Completed",
                                    "Cancelled"
                                ].map(status => `
                                    <option
                                        value="${status}"
                                        ${action.status === status ? "selected" : ""}>
                                        ${status}
                                    </option>
                                `).join("")}

                            </select>
                        </td>

                    </tr>
                `;

            }).join("");


        } catch (error) {

            console.error("Retention actions error:", error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-loading">
                        Unable to load retention actions.
                    </td>
                </tr>
            `;

            showMessage(error.message, "error");

        }

    }


    // =========================================
    // CREATE RETENTION ACTION
    // =========================================

    $("open-action-modal").addEventListener("click", () => {

        $("retention-action-form").reset();

        showModal("action-modal");

    });


    $("retention-action-form").addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const customerId =
                Number($("action-customer-id").value);

            const actionData = {

                customer_id: customerId,

                action_type:
                    $("action-type").value.trim(),

                description:
                    $("action-description").value.trim() || null,

                priority:
                    $("action-priority").value,

                assigned_to:
                    $("action-assigned-user").value
                        ? Number($("action-assigned-user").value)
                        : null,

                due_date:
                    $("action-due-date").value || null

            };


            try {

                await window.ChurnGuardAPI.createRetentionAction(
                    token,
                    actionData
                );

                closeModal("action-modal");

                showMessage(
                    "Retention action created successfully."
                );

                await Promise.all([
                    loadRetentionOverview(),
                    loadRetentionActions()
                ]);

            } catch (error) {

                console.error("Create action error:", error);

                showMessage(error.message, "error");

            }

        }
    );


    // =========================================
    // UPDATE RETENTION ACTION STATUS
    // =========================================

    $("retention-actions-body").addEventListener(
        "change",
        async event => {

            const select = event.target.closest(
                ".action-status-select"
            );

            if (!select) return;

            const actionId = select.dataset.actionId;
            const newStatus = select.value;

            select.disabled = true;

            try {

                await window.ChurnGuardAPI.updateRetentionAction(
                    token,
                    actionId,
                    {
                        status: newStatus
                    }
                );

                showMessage(
                    `Retention action #${actionId} updated successfully.`
                );

                await Promise.all([
                    loadRetentionOverview(),
                    loadRetentionActions()
                ]);

            } catch (error) {

                console.error("Update action error:", error);

                showMessage(error.message, "error");

                await loadRetentionActions();

            } finally {

                select.disabled = false;

            }

        }
    );


    // =========================================
    // RECORD CUSTOMER INTERACTION
    // =========================================

    $("open-interaction-modal").addEventListener(
        "click",
        () => {

            $("customer-interaction-form").reset();

            const selectedCustomer =
                $("interaction-customer-id").value;

            if (selectedCustomer) {
                $("interaction-form-customer-id").value =
                    selectedCustomer;
            }

            showModal("interaction-modal");

        }
    );


    $("customer-interaction-form").addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const customerId =
                Number($("interaction-form-customer-id").value);

            const interactionData = {

                customer_id: customerId,

                interaction_type:
                    $("interaction-type").value,

                channel:
                    $("interaction-channel").value.trim() || null,

                subject:
                    $("interaction-subject").value.trim() || null,

                notes:
                    $("interaction-notes").value.trim() || null

            };


            try {

                await window.ChurnGuardAPI.createCustomerInteraction(
                    token,
                    interactionData
                );

                closeModal("interaction-modal");

                $("interaction-customer-id").value =
                    customerId;

                showMessage(
                    "Customer interaction recorded successfully."
                );

                await Promise.all([
                    loadRetentionOverview(),
                    loadCustomerInteractions(customerId)
                ]);

            } catch (error) {

                console.error("Interaction creation error:", error);

                showMessage(error.message, "error");

            }

        }
    );


    // =========================================
    // CUSTOMER INTERACTION HISTORY
    // =========================================

    async function loadCustomerInteractions(customerId) {

        const container = $("interaction-history-container");

        container.innerHTML = `
            <div class="activity-empty">
                Loading customer interaction history...
            </div>
        `;

        try {

            const data =
                await window.ChurnGuardAPI.getCustomerInteractions(
                    token,
                    customerId,
                    0,
                    50
                );

            const interactions = data.interactions || [];

            if (!interactions.length) {

                container.innerHTML = `
                    <div class="activity-empty">
                        No interaction history found for
                        ${escapeHTML(data.customer_code)}.
                    </div>
                `;

                return;
            }


            container.innerHTML = `
                <div class="interaction-history-heading">
                    <strong>
                        ${escapeHTML(data.customer_code)}
                    </strong>

                    <span>
                        ${data.total_returned} interaction(s)
                    </span>
                </div>

                <div class="interaction-list">

                    ${interactions.map(interaction => `

                        <article class="interaction-card">

                            <div class="interaction-card-header">

                                <strong>
                                    ${escapeHTML(interaction.subject || interaction.interaction_type)}
                                </strong>

                                <span class="interaction-type-badge">
                                    ${escapeHTML(interaction.interaction_type)}
                                </span>

                            </div>

                            <p>
                                ${escapeHTML(
                                    interaction.notes || "No notes provided."
                                )}
                            </p>

                            <div class="interaction-card-footer">

                                <span>
                                    ${escapeHTML(interaction.channel || "No channel")}
                                </span>

                                <span>
                                    ${formatDate(interaction.interaction_date)}
                                </span>

                                <span>
                                    By ${escapeHTML(
                                        interaction.recorded_by_name || "Unknown"
                                    )}
                                </span>

                            </div>

                        </article>

                    `).join("")}

                </div>
            `;


        } catch (error) {

            console.error("Interaction history error:", error);

            container.innerHTML = `
                <div class="activity-empty">
                    ${escapeHTML(error.message)}
                </div>
            `;

        }

    }


    $("load-interactions-button").addEventListener(
        "click",
        () => {

            const customerId =
                Number($("interaction-customer-id").value);

            if (!customerId || customerId <= 0) {

                showMessage(
                    "Please enter a valid customer ID.",
                    "error"
                );

                return;
            }

            loadCustomerInteractions(customerId);

        }
    );


    // =========================================
    // MODAL CLOSE BUTTONS
    // =========================================

    document.querySelectorAll("[data-close-modal]")
        .forEach(button => {

            button.addEventListener("click", () => {

                closeModal(button.dataset.closeModal);

            });

        });


    document.querySelectorAll(".retention-modal-overlay")
        .forEach(overlay => {

            overlay.addEventListener("click", event => {

                if (event.target === overlay) {
                    overlay.hidden = true;
                }

            });

        });


    // =========================================
    // AT-RISK CUSTOMER ACTION BUTTONS
    // =========================================

    $("at-risk-customers-body").addEventListener(
        "click",
        event => {

            const button = event.target.closest(
                "[data-create-action]"
            );

            if (!button) return;

            $("retention-action-form").reset();

            $("action-customer-id").value =
                button.dataset.createAction;

            showModal("action-modal");

        }
    );


    // =========================================
    // FILTERS AND SEARCH
    // =========================================

    $("risk-level-filter").addEventListener(
        "change",
        loadAtRiskCustomers
    );


    $("risk-customer-search").addEventListener(
        "input",
        () => {

            window.clearTimeout(searchTimeout);

            searchTimeout = window.setTimeout(
                loadAtRiskCustomers,
                400
            );

        }
    );


    $("action-status-filter").addEventListener(
        "change",
        loadRetentionActions
    );


    $("action-priority-filter").addEventListener(
        "change",
        loadRetentionActions
    );


    // =========================================
    // REFRESH BUTTON
    // =========================================

    $("refresh-retention-button").addEventListener(
        "click",
        async () => {

            await Promise.all([
                loadRetentionOverview(),
                loadAtRiskCustomers(),
                loadRetentionActions()
            ]);

            showMessage("Retention Center data refreshed.");

        }
    );


    // =========================================
    // INITIAL PAGE LOAD
    // =========================================

    await Promise.all([

        loadRetentionOverview(),

        loadAtRiskCustomers(),

        loadRetentionActions()

    ]);

});
