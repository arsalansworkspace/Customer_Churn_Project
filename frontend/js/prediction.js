
document.addEventListener("DOMContentLoaded", async () => {

    // ==========================================
    // AUTHENTICATION
    // ==========================================

    const token = localStorage.getItem("churnguard_access_token");

    if (!token) {
        window.location.href = "../index.html";
        return;
    }

    const $ = id => document.getElementById(id);

    const elements = {
        sidebarName: $("sidebar-user-name"),
        sidebarRole: $("sidebar-user-role"),
        sidebarAvatar: $("user-avatar"),
        headerName: $("header-user-name"),
        headerAvatar: $("header-avatar"),
        logout: $("logout-button"),

        search: $("prediction-customer-search"),
        searchButton: $("search-customer-button"),
        searchMessage: $("prediction-search-message"),
        customerResults: $("prediction-customer-results"),

        selectedPanel: $("selected-customer-panel"),
        selectedCode: $("selected-customer-code"),
        selectedDetails: $("selected-customer-details"),
        generateButton: $("generate-prediction-button"),

        resultMessage: $("prediction-result-message"),
        resultContent: $("prediction-result-content"),

        historyBody: $("prediction-history-body"),
        recentBody: $("recent-predictions-body")
    };

    const state = {
        selectedCustomer: null,
        searching: false,
        generating: false
    };

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    function escapeHTML(value) {
        return String(value ?? "—").replace(/[&<>"']/g, character => ({
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

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString();
    }

    function formatMoney(value) {
        if (value === null || value === undefined) {
            return "—";
        }

        return "$" + Number(value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function showMessage(element, message, type = "error") {
        if (!element) return;

        element.textContent = message;
        element.className = `customer-message ${type}`;
        element.hidden = false;
    }

    function hideMessage(element) {
        if (!element) return;
        element.hidden = true;
        element.textContent = "";
    }

    function getRiskClass(risk) {
        const value = String(risk || "").toLowerCase();

        if (value === "high") return "high";
        if (value === "medium") return "medium";
        if (value === "low") return "low";

        return "";
    }

    function handleError(error) {
        console.error("ChurnGuard error:", error);

        const message = error?.message || "An unexpected error occurred.";

        if (
            message.includes("401") ||
            message.toLowerCase().includes("not authenticated") ||
            message.toLowerCase().includes("invalid token") ||
            message.toLowerCase().includes("token has expired")
        ) {
            localStorage.removeItem("churnguard_access_token");
            localStorage.removeItem("churnguard_user");

            window.location.href = "../index.html";
            return true;
        }

        return false;
    }

    // ==========================================
    // USER PROFILE
    // ==========================================

    async function loadUserProfile() {
        try {
            const user = await window.ChurnGuardAPI.getCurrentUser(token);

            const name =
                user.full_name ||
                user.name ||
                user.username ||
                user.email ||
                "User";

            const role = user.role || "User";
            const initial = name.trim().charAt(0).toUpperCase() || "U";

            elements.sidebarName.textContent = name;
            elements.sidebarRole.textContent = role;
            elements.sidebarAvatar.textContent = initial;

            elements.headerName.textContent = name;
            elements.headerAvatar.textContent = initial;

        } catch (error) {
            if (!handleError(error)) {
                console.error("Unable to load user profile:", error);
            }
        }
    }

    // ==========================================
    // LOGOUT
    // ==========================================

    elements.logout.addEventListener("click", () => {
        localStorage.removeItem("churnguard_access_token");
        localStorage.removeItem("churnguard_user");

        window.location.href = "../index.html";
    });

    // ==========================================
    // CUSTOMER SEARCH
    // ==========================================

    async function searchCustomers() {

        if (state.searching) return;

        const query = elements.search.value.trim();

        if (!query) {
            showMessage(
                elements.searchMessage,
                "Please enter a customer ID or customer code."
            );
            return;
        }

        state.searching = true;
        elements.searchButton.disabled = true;
        elements.searchButton.textContent = "Searching...";

        hideMessage(elements.searchMessage);

        elements.customerResults.innerHTML = `
            <p class="prediction-empty-state">
                Searching customer database...
            </p>
        `;

        try {
            const customers = await window.ChurnGuardAPI.getCustomers(
                token,
                query,
                0,
                10
            );

            if (!Array.isArray(customers) || customers.length === 0) {

                elements.customerResults.innerHTML = `
                    <p class="prediction-empty-state">
                        No customers found matching
                        "${escapeHTML(query)}".
                    </p>
                `;

                return;
            }

            renderCustomerResults(customers);

        } catch (error) {

            if (!handleError(error)) {
                showMessage(
                    elements.searchMessage,
                    error.message || "Unable to search customers."
                );

                elements.customerResults.innerHTML = `
                    <p class="prediction-empty-state">
                        Customer search failed. Please try again.
                    </p>
                `;
            }

        } finally {
            state.searching = false;
            elements.searchButton.disabled = false;
            elements.searchButton.textContent = "Search Customer";
        }
    }

    function renderCustomerResults(customers) {

        elements.customerResults.innerHTML = customers.map(customer => `
            <article class="prediction-customer-card">

                <div class="prediction-customer-info">
                    <strong>
                        ${escapeHTML(customer.customer_code)}
                    </strong>

                    <span>
                        Customer #${escapeHTML(customer.id)}
                        · ${escapeHTML(customer.contract)}
                    </span>

                    <small>
                        Tenure: ${escapeHTML(customer.tenure)} months
                        · Monthly Charges:
                        ${escapeHTML(formatMoney(customer.monthly_charges))}
                    </small>
                </div>

                <button
                    type="button"
                    class="select-prediction-customer"
                    data-customer-id="${Number(customer.id)}"
                >
                    Select Customer
                </button>

            </article>
        `).join("");
    }

    elements.searchButton.addEventListener("click", searchCustomers);

    elements.search.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            searchCustomers();
        }
    });

    // ==========================================
    // CUSTOMER SELECTION
    // ==========================================

    elements.customerResults.addEventListener("click", async event => {

        const button = event.target.closest("[data-customer-id]");

        if (!button) return;

        const customerId = Number(button.dataset.customerId);

        if (!Number.isInteger(customerId) || customerId <= 0) {
            return;
        }

        await selectCustomer(customerId);
    });

    async function selectCustomer(customerId) {

        try {
            const customer = await window.ChurnGuardAPI.getCustomer(
                token,
                customerId
            );

            state.selectedCustomer = customer;

            elements.selectedCode.textContent = customer.customer_code;

            elements.selectedDetails.textContent =
                `Customer #${customer.id} · ` +
                `${customer.gender || "—"} · ` +
                `${customer.contract || "—"} Contract · ` +
                `${customer.tenure ?? "—"} Months Tenure`;

            elements.selectedPanel.hidden = false;
            elements.generateButton.disabled = false;

            elements.resultContent.innerHTML = `
                <div class="prediction-empty-state">
                    <div class="prediction-empty-icon">⌁</div>
                    <h3>Ready to Generate Prediction</h3>
                    <p>
                        Customer ${escapeHTML(customer.customer_code)}
                        is selected. Generate a prediction to view
                        the churn risk assessment.
                    </p>
                </div>
            `;

            hideMessage(elements.resultMessage);

            await loadCustomerHistory(customerId);

        } catch (error) {

            if (!handleError(error)) {
                showMessage(
                    elements.searchMessage,
                    error.message || "Unable to load customer details."
                );
            }
        }
    }

    // ==========================================
    // GENERATE CHURN PREDICTION
    // ==========================================

    elements.generateButton.addEventListener("click", generatePrediction);

    async function generatePrediction() {

        if (!state.selectedCustomer || state.generating) {
            return;
        }

        state.generating = true;

        elements.generateButton.disabled = true;
        elements.generateButton.textContent = "Analyzing Customer...";

        hideMessage(elements.resultMessage);

        elements.resultContent.innerHTML = `
            <div class="prediction-loading">
                <div class="prediction-loader"></div>
                <h3>Analyzing Customer Data</h3>
                <p>
                    The XGBoost model is evaluating the selected
                    customer's profile.
                </p>
            </div>
        `;

        try {

            const customerId = state.selectedCustomer.id;

            const result = await window.ChurnGuardAPI.predictCustomerChurn(
                token,
                customerId
            );

            renderPredictionResult(result);

            await loadCustomerHistory(customerId);
            await loadRecentPredictions();

        } catch (error) {

            if (!handleError(error)) {

                showMessage(
                    elements.resultMessage,
                    error.message || "Prediction generation failed."
                );

                elements.resultContent.innerHTML = `
                    <div class="prediction-empty-state">
                        <h3>Prediction Failed</h3>
                        <p>Please check your connection and try again.</p>
                    </div>
                `;
            }

        } finally {

            state.generating = false;
            elements.generateButton.disabled = false;
            elements.generateButton.textContent = "Generate Prediction";
        }
    }

    // ==========================================
    // DISPLAY PREDICTION RESULT
    // ==========================================

    function renderPredictionResult(result) {

        const probability = Number(result.churn_probability);
        const threshold = Number(result.threshold);

        const validProbability =
            Number.isFinite(probability) &&
            probability >= 0 &&
            probability <= 100;

        const validThreshold =
            Number.isFinite(threshold) &&
            threshold >= 0 &&
            threshold <= 100;

        if (!validProbability || !validThreshold) {
            throw new Error("The prediction API returned invalid probability data.");
        }

        const risk = String(result.risk_level || "Unknown");
        const prediction = String(result.prediction || "Unknown");

        const riskClass = getRiskClass(risk);

        const safeProbability = Math.min(100, Math.max(0, probability));

        elements.resultContent.innerHTML = `

            <div class="prediction-result-overview">

                <div class="prediction-probability-card">
                    <span class="eyebrow">CHURN PROBABILITY</span>

                    <strong class="prediction-probability-value">
                        ${safeProbability.toFixed(2)}%
                    </strong>

                    <div class="prediction-progress-track">
                        <div
                            class="prediction-progress-fill ${riskClass}"
                            style="width: ${safeProbability}%"
                        ></div>
                    </div>

                    <small>
                        Model classification threshold:
                        ${threshold.toFixed(2)}%
                    </small>
                </div>

                <div class="prediction-status-card">
                    <span class="eyebrow">MODEL PREDICTION</span>

                    <strong class="prediction-status-value">
                        ${escapeHTML(prediction)}
                    </strong>

                    <span class="prediction-risk-badge ${riskClass}">
                        ${escapeHTML(risk)} Risk
                    </span>
                </div>

            </div>

            <div class="prediction-metadata-grid">

                <div class="prediction-metadata-item">
                    <span>Prediction ID</span>
                    <strong>${escapeHTML(result.prediction_id)}</strong>
                </div>

                <div class="prediction-metadata-item">
                    <span>Customer ID</span>
                    <strong>${escapeHTML(result.customer_code)}</strong>
                </div>

                <div class="prediction-metadata-item">
                    <span>Model</span>
                    <strong>${escapeHTML(result.model)}</strong>
                </div>

                <div class="prediction-metadata-item">
                    <span>Model Version</span>
                    <strong>${escapeHTML(result.model_version)}</strong>
                </div>

                <div class="prediction-metadata-item">
                    <span>Classification Threshold</span>
                    <strong>${threshold.toFixed(2)}%</strong>
                </div>

                <div class="prediction-metadata-item">
                    <span>Generated At</span>
                    <strong>${escapeHTML(formatDate(result.created_at))}</strong>
                </div>

            </div>

            <div class="prediction-result-note">
                Prediction successfully generated and saved in MySQL.
            </div>
        `;

        showMessage(
            elements.resultMessage,
            "Prediction generated successfully.",
            "success"
        );
    }

    // ==========================================
    // CUSTOMER PREDICTION HISTORY
    // ==========================================

    async function loadCustomerHistory(customerId) {

        elements.historyBody.innerHTML = `
            <tr>
                <td colspan="5" class="table-placeholder">
                    Loading prediction history...
                </td>
            </tr>
        `;

        try {

            const response =
                await window.ChurnGuardAPI.getCustomerPredictionHistory(
                    token,
                    customerId
                );

            const predictions = response.predictions || [];

            if (predictions.length === 0) {

                elements.historyBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="table-placeholder">
                            No prediction history for this customer yet.
                        </td>
                    </tr>
                `;

                return;
            }

            elements.historyBody.innerHTML = predictions.map(record => `
                <tr>
                    <td>#${escapeHTML(record.prediction_id)}</td>

                    <td>
                        ${Number(record.churn_probability).toFixed(2)}%
                    </td>

                    <td>${escapeHTML(record.prediction)}</td>

                    <td>
                        <span class="prediction-risk-badge ${getRiskClass(record.risk_level)}">
                            ${escapeHTML(record.risk_level)}
                        </span>
                    </td>

                    <td>${escapeHTML(formatDate(record.created_at))}</td>
                </tr>
            `).join("");

        } catch (error) {

            if (!handleError(error)) {

                elements.historyBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="table-placeholder">
                            Unable to load prediction history.
                        </td>
                    </tr>
                `;

                console.error("Prediction history error:", error);
            }
        }
    }

    // ==========================================
    // RECENT PREDICTIONS
    // ==========================================

    async function loadRecentPredictions() {

        elements.recentBody.innerHTML = `
            <tr>
                <td colspan="5" class="table-placeholder">
                    Loading recent predictions...
                </td>
            </tr>
        `;

        try {

            const response =
                await window.ChurnGuardAPI.getRecentPredictions(token, 10);

            const predictions = response.predictions || [];

            if (predictions.length === 0) {

                elements.recentBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="table-placeholder">
                            No prediction records available yet.
                        </td>
                    </tr>
                `;

                return;
            }

            elements.recentBody.innerHTML = predictions.map(record => `
                <tr>
                    <td>
                        ${escapeHTML(record.customer_code)}
                    </td>

                    <td>
                        ${Number(record.churn_probability).toFixed(2)}%
                    </td>

                    <td>${escapeHTML(record.prediction)}</td>

                    <td>
                        <span class="prediction-risk-badge ${getRiskClass(record.risk_level)}">
                            ${escapeHTML(record.risk_level)}
                        </span>
                    </td>

                    <td>${escapeHTML(formatDate(record.created_at))}</td>
                </tr>
            `).join("");

        } catch (error) {

            if (!handleError(error)) {

                elements.recentBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="table-placeholder">
                            Unable to load recent predictions.
                        </td>
                    </tr>
                `;

                console.error("Recent predictions error:", error);
            }
        }
    }

    // ==========================================
    // INITIALIZE PAGE
    // ==========================================

    await loadUserProfile();
    await loadRecentPredictions();

});
