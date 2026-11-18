document.addEventListener("DOMContentLoaded", async () => {
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
        search: $("customer-search"),
        pageSize: $("page-size"),
        tableBody: $("customer-table-body"),
        total: $("customer-total"),
        showing: $("customer-showing"),
        paginationInfo: $("pagination-info"),
        previous: $("previous-page"),
        next: $("next-page"),
        message: $("customer-message"),

        detailsModal: $("customer-modal"),
        detailsContent: $("customer-details-content"),
        closeDetails: $("close-customer-modal"),
        detailsBackdrop: $("modal-backdrop"),

        addButton: $("add-customer-button"),
        formModal: $("customer-form-modal"),
        form: $("customer-form"),
        formTitle: $("customer-form-title"),
        formFields: $("customer-form-fields"),
        formError: $("customer-form-error"),
        saveButton: $("save-customer-button"),
        closeForm: $("close-customer-form"),
        cancelForm: $("cancel-customer-form"),
        formBackdrop: $("form-modal-backdrop")
    };

    const state = {
        search: "",
        skip: 0,
        limit: 10,
        total: 0,
        customers: [],
        loading: false,
        editingCustomerId: null,
        selectedCustomerId: null
    };

    const numberFormat = new Intl.NumberFormat("en-US");

    const fieldDefinitions = [
        { name: "customer_code", label: "Customer ID", type: "text", required: true },
        { name: "gender", label: "Gender", type: "select", options: ["Female", "Male"] },
        { name: "senior_citizen", label: "Senior Citizen", type: "select", options: ["0", "1"] },
        { name: "partner", label: "Partner", type: "select", options: ["Yes", "No"] },
        { name: "dependents", label: "Dependents", type: "select", options: ["Yes", "No"] },
        { name: "tenure", label: "Tenure (months)", type: "number", min: 0 },
        { name: "phone_service", label: "Phone Service", type: "select", options: ["Yes", "No"] },
        { name: "multiple_lines", label: "Multiple Lines", type: "select", options: ["Yes", "No", "No phone service"] },
        { name: "internet_service", label: "Internet Service", type: "select", options: ["DSL", "Fiber optic", "No"] },
        { name: "online_security", label: "Online Security", type: "select", options: ["Yes", "No", "No internet service"] },
        { name: "online_backup", label: "Online Backup", type: "select", options: ["Yes", "No", "No internet service"] },
        { name: "device_protection", label: "Device Protection", type: "select", options: ["Yes", "No", "No internet service"] },
        { name: "tech_support", label: "Tech Support", type: "select", options: ["Yes", "No", "No internet service"] },
        { name: "streaming_tv", label: "Streaming TV", type: "select", options: ["Yes", "No", "No internet service"] },
        { name: "streaming_movies", label: "Streaming Movies", type: "select", options: ["Yes", "No", "No internet service"] },
        { name: "contract", label: "Contract", type: "select", options: ["Month-to-month", "One year", "Two year"] },
        { name: "paperless_billing", label: "Paperless Billing", type: "select", options: ["Yes", "No"] },
        {
            name: "payment_method",
            label: "Payment Method",
            type: "select",
            options: [
                "Electronic check",
                "Mailed check",
                "Bank transfer (automatic)",
                "Credit card (automatic)"
            ]
        },
        { name: "monthly_charges", label: "Monthly Charges ($)", type: "number", min: 0, step: "0.01" },
        { name: "total_charges", label: "Total Charges ($)", type: "number", min: 0, step: "0.01" },
        { name: "churn_status", label: "Historical Churn Status", type: "select", options: ["Unknown", "Yes", "No"] }
    ];

    function escapeHTML(value) {
        return String(value ?? "—").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function formatCurrency(value) {
        if (value === null || value === undefined || value === "") return "—";

        const amount = Number(value);
        if (!Number.isFinite(amount)) return "—";

        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD"
        }).format(amount);
    }

    function showMessage(message, type = "error") {
        elements.message.textContent = message;
        elements.message.className = `customer-message ${type}`;
        elements.message.hidden = false;
    }

    function hideMessage() {
        elements.message.hidden = true;
        elements.message.textContent = "";
    }

    function showFormError(message) {
        elements.formError.textContent = message;
        elements.formError.hidden = false;
    }

    function hideFormError() {
        elements.formError.hidden = true;
        elements.formError.textContent = "";
    }

    function getStatusClass(status) {
        if (status === "Yes") return "churn-badge churned";
        if (status === "No") return "churn-badge retained";
        return "churn-badge unknown";
    }

    async function loadUser() {
        const user = await window.ChurnGuardAPI.getCurrentUser(token);
        const fullName = user.full_name || "User";
        const initial = fullName.charAt(0).toUpperCase();

        elements.sidebarName.textContent = fullName;
        elements.sidebarRole.textContent = user.role || "User";
        elements.sidebarAvatar.textContent = initial;
        elements.headerName.textContent = fullName;
        elements.headerAvatar.textContent = initial;
    }

    async function loadCustomers() {
        if (state.loading) return;

        state.loading = true;
        hideMessage();

        elements.tableBody.innerHTML = `
            <tr><td colspan="7" class="table-placeholder">Loading customer records...</td></tr>
        `;

        try {
            const [customers, countData] = await Promise.all([
                window.ChurnGuardAPI.getCustomers(
                    token, state.search, state.skip, state.limit
                ),
                window.ChurnGuardAPI.getCustomerCount(token)
            ]);

            state.customers = customers;
            state.total = Number(countData.total_customers || 0);

            renderCustomers();
            renderPagination();
        } catch (error) {
            elements.tableBody.innerHTML = `
                <tr><td colspan="7" class="table-placeholder">Unable to load customer records.</td></tr>
            `;
            showMessage(error.message || "Failed to load customers.");
        } finally {
            state.loading = false;
        }
    }

    function renderCustomers() {
        elements.total.textContent = numberFormat.format(state.total);
        elements.showing.textContent = numberFormat.format(state.customers.length);

        if (!state.customers.length) {
            elements.tableBody.innerHTML = `
                <tr><td colspan="7" class="table-placeholder">No customers found.</td></tr>
            `;
            return;
        }

        elements.tableBody.innerHTML = state.customers.map(customer => `
            <tr>
                <td><strong class="customer-code">${escapeHTML(customer.customer_code)}</strong></td>
                <td>${escapeHTML(customer.gender)}</td>
                <td>${escapeHTML(customer.tenure)} months</td>
                <td>${escapeHTML(customer.contract)}</td>
                <td>${formatCurrency(customer.monthly_charges)}</td>
                <td><span class="${getStatusClass(customer.churn_status)}">${escapeHTML(customer.churn_status)}</span></td>
                <td>
                    <button class="view-customer-button"
                        data-customer-id="${Number(customer.id)}" type="button">
                        View
                    </button>
                </td>
            </tr>
        `).join("");
    }

    function renderPagination() {
        const start = state.total === 0 ? 0 : state.skip + 1;
        const end = Math.min(state.skip + state.customers.length, state.total);

        elements.paginationInfo.textContent =
            `Showing ${numberFormat.format(start)}–${numberFormat.format(end)} of ${numberFormat.format(state.total)} customers`;

        elements.previous.disabled = state.skip === 0;
        elements.next.disabled = state.skip + state.limit >= state.total;
    }

    async function openCustomerDetails(customerId) {
        state.selectedCustomerId = Number(customerId);
        elements.detailsModal.hidden = false;
        document.body.classList.add("modal-open");
        elements.detailsContent.textContent = "Loading customer details...";

        try {
            const customer = await window.ChurnGuardAPI.getCustomer(
                token, customerId
            );

            const fields = [
                ["Customer ID", customer.customer_code],
                ["Gender", customer.gender],
                ["Senior Citizen", customer.senior_citizen],
                ["Partner", customer.partner],
                ["Dependents", customer.dependents],
                ["Tenure", customer.tenure === null ? "—" : `${customer.tenure} months`],
                ["Phone Service", customer.phone_service],
                ["Multiple Lines", customer.multiple_lines],
                ["Internet Service", customer.internet_service],
                ["Online Security", customer.online_security],
                ["Online Backup", customer.online_backup],
                ["Device Protection", customer.device_protection],
                ["Tech Support", customer.tech_support],
                ["Streaming TV", customer.streaming_tv],
                ["Streaming Movies", customer.streaming_movies],
                ["Contract", customer.contract],
                ["Paperless Billing", customer.paperless_billing],
                ["Payment Method", customer.payment_method],
                ["Monthly Charges", formatCurrency(customer.monthly_charges)],
                ["Total Charges", formatCurrency(customer.total_charges)],
                ["Historical Churn", customer.churn_status]
            ];

            elements.detailsContent.innerHTML = `
                <div class="customer-detail-grid">
                    ${fields.map(([label, value]) => `
                        <div class="customer-detail-item">
                            <span>${escapeHTML(label)}</span>
                            <strong>${escapeHTML(value)}</strong>
                        </div>
                    `).join("")}
                </div>
                <div class="customer-detail-actions">
                    <button type="button" id="edit-customer-button"
                        class="add-customer-button">Edit Customer</button>
                    <button type="button" id="delete-customer-button"
                        class="delete-customer-button">Delete Customer</button>
                </div>
            `;

            $("edit-customer-button").addEventListener("click", () => {
                closeDetails();
                openCustomerForm(customer, true);
            });

            $("delete-customer-button").addEventListener("click", () => {
                deleteCustomer(customer.id, customer.customer_code);
            });
        } catch (error) {
            elements.detailsContent.textContent =
                error.message || "Unable to load customer details.";
        }
    }

    function closeDetails() {
        elements.detailsModal.hidden = true;
        document.body.classList.remove("modal-open");
    }

    function buildFormFields(customer = {}) {
        elements.formFields.innerHTML = fieldDefinitions.map(field => {
            const value = customer[field.name] ?? (
                field.name === "churn_status" ? "Unknown" :
                field.name === "senior_citizen" ? "0" : ""
            );
            let control;

            if (field.type === "select") {
                const options = field.options.map(option => `
                    <option value="${escapeHTML(option)}"
                        ${String(value) === option ? "selected" : ""}>
                        ${escapeHTML(option)}
                    </option>
                `).join("");

                control = `
                    <select id="field-${field.name}" name="${field.name}"
                        ${field.required ? "required" : ""}>
                        <option value="">Select ${escapeHTML(field.label)}</option>
                        ${options}
                    </select>
                `;
            } else {
                control = `
                    <input
                        id="field-${field.name}"
                        name="${field.name}"
                        type="${field.type}"
                        value="${escapeHTML(value)}"
                        ${field.required ? "required" : ""}
                        ${field.min !== undefined ? `min="${field.min}"` : ""}
                        ${field.step ? `step="${field.step}"` : ""}
                        ${field.type === "text" ? 'maxlength="50"' : ""}
                        ${field.name === "customer_code" ? 'placeholder="e.g. CG-10001"' : ""}
                    >
                `;
            }

            return `
                <div class="customer-form-field">
                    <label for="field-${field.name}">
                        ${escapeHTML(field.label)}${field.required ? " *" : ""}
                    </label>
                    ${control}
                </div>
            `;
        }).join("");
    }

    function openCustomerForm(customer = {}, isEdit = false) {
        state.editingCustomerId = isEdit ? Number(customer.id) : null;

        elements.formTitle.textContent = isEdit
            ? "Edit Customer"
            : "Add New Customer";

        elements.saveButton.textContent = isEdit
            ? "Save Changes"
            : "Save Customer";

        hideFormError();
        buildFormFields(customer);

        if (isEdit) {
            const customerCode = $("field-customer_code");
            customerCode.readOnly = true;
            customerCode.title = "Customer ID cannot be changed.";
        }

        elements.formModal.hidden = false;
        document.body.classList.add("modal-open");
    }

    function closeForm() {
        elements.formModal.hidden = true;
        document.body.classList.remove("modal-open");
        elements.form.reset();
        hideFormError();
        state.editingCustomerId = null;
    }

    function collectFormData() {
        const formData = new FormData(elements.form);
        const payload = {};

        for (const field of fieldDefinitions) {
            const rawValue = formData.get(field.name);

            if (rawValue === null || rawValue.trim() === "") {
                if (field.required) {
                    throw new Error(`${field.label} is required.`);
                }

                payload[field.name] = null;
                continue;
            }

            if (field.type === "number") {
                const number = Number(rawValue);

                if (!Number.isFinite(number) || number < 0) {
                    throw new Error(`${field.label} must be a valid non-negative number.`);
                }

                payload[field.name] = field.name === "tenure"
                    ? Math.trunc(number)
                    : number;
            } else if (field.name === "senior_citizen") {
                payload[field.name] = Number(rawValue);
            } else {
                payload[field.name] = rawValue.trim();
            }
        }

        return payload;
    }

    async function saveCustomer(event) {
        event.preventDefault();
        hideFormError();

        const isEditing = Boolean(state.editingCustomerId);
        let payload;

        try {
            payload = collectFormData();
        } catch (error) {
            showFormError(error.message);
            return;
        }

        elements.saveButton.disabled = true;
        elements.saveButton.textContent = "Saving...";

        try {
            if (isEditing) {
                await window.ChurnGuardAPI.updateCustomer(
                    token,
                    state.editingCustomerId,
                    payload
                );
            } else {
                await window.ChurnGuardAPI.createCustomer(token, payload);
            }

            closeForm();
            closeDetails();

            state.skip = 0;
            await loadCustomers();

            showMessage(
                isEditing
                    ? "Customer updated successfully."
                    : "Customer added successfully.",
                "success"
            );
        } catch (error) {
            showFormError(error.message || "Unable to save customer.");
        } finally {
            elements.saveButton.disabled = false;
            elements.saveButton.textContent = isEditing
                ? "Save Changes"
                : "Save Customer";
        }
    }

    async function deleteCustomer(customerId, customerCode) {
        const confirmed = window.confirm(
            `Are you sure you want to delete customer "${customerCode}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            await window.ChurnGuardAPI.deleteCustomer(token, customerId);
            closeDetails();

            if (state.skip > 0 && state.skip >= state.total - 1) {
                state.skip = Math.max(0, state.skip - state.limit);
            }

            await loadCustomers();
            showMessage("Customer deleted successfully.", "success");
        } catch (error) {
            showMessage(error.message || "Unable to delete customer.");
        }
    }

    elements.logout.addEventListener("click", () => {
        localStorage.removeItem("churnguard_access_token");
        localStorage.removeItem("churnguard_user");
        window.location.href = "../index.html";
    });

    elements.search.addEventListener("input", () => {
        state.search = elements.search.value.trim();
        state.skip = 0;
        loadCustomers();
    });

    elements.pageSize.addEventListener("change", () => {
        state.limit = Number(elements.pageSize.value);
        state.skip = 0;
        loadCustomers();
    });

    elements.previous.addEventListener("click", () => {
        if (state.skip >= state.limit) {
            state.skip -= state.limit;
            loadCustomers();
        }
    });

    elements.next.addEventListener("click", () => {
        if (state.skip + state.limit < state.total) {
            state.skip += state.limit;
            loadCustomers();
        }
    });

    elements.tableBody.addEventListener("click", event => {
        const button = event.target.closest("[data-customer-id]");
        if (button) openCustomerDetails(button.dataset.customerId);
    });

    elements.addButton.addEventListener("click", () => openCustomerForm());
    elements.form.addEventListener("submit", saveCustomer);

    elements.closeDetails.addEventListener("click", closeDetails);
    elements.detailsBackdrop.addEventListener("click", closeDetails);

    elements.closeForm.addEventListener("click", closeForm);
    elements.cancelForm.addEventListener("click", closeForm);
    elements.formBackdrop.addEventListener("click", closeForm);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            if (!elements.formModal.hidden) closeForm();
            else if (!elements.detailsModal.hidden) closeDetails();
        }
    });

    try {
        await loadUser();
        await loadCustomers();
    } catch (error) {
        console.error("Customers page initialization failed:", error);

        localStorage.removeItem("churnguard_access_token");
        localStorage.removeItem("churnguard_user");
        window.location.href = "../index.html";
    }
});
