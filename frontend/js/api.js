
(() => {
    const API_BASE_URL = "http://127.0.0.1:8000";

    async function request(endpoint, options = {}) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message = Array.isArray(data.detail)
                ? data.detail.map(item => item.msg).join(", ")
                : data.detail || "Something went wrong. Please try again.";

            throw new Error(message);
        }

        return data;
    }

    function authHeaders(token) {
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    window.ChurnGuardAPI = {
        // AUTHENTICATION

        login: (email, password) => request("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        }),

        getCurrentUser: (token) => request("/api/auth/me", {
            headers: authHeaders(token)
        }),

        // CUSTOMER MANAGEMENT

        getCustomerStats: (token) => request("/api/customers/stats", {
            headers: authHeaders(token)
        }),

        getCustomers: (token, search = "", skip = 0, limit = 10) => {
            const params = new URLSearchParams({
                skip: String(skip),
                limit: String(limit)
            });

            if (search.trim()) {
                params.set("search", search.trim());
            }

            return request(`/api/customers/?${params.toString()}`, {
                headers: authHeaders(token)
            });
        },

        getCustomerCount: (token) => request("/api/customers/count", {
            headers: authHeaders(token)
        }),

        getCustomer: (token, customerId) => request(
            `/api/customers/${customerId}`,
            { headers: authHeaders(token) }
        ),

        createCustomer: (token, customerData) => request(
            "/api/customers/",
            {
                method: "POST",
                headers: authHeaders(token),
                body: JSON.stringify(customerData)
            }
        ),

        updateCustomer: (token, customerId, customerData) => request(
            `/api/customers/${customerId}`,
            {
                method: "PATCH",
                headers: authHeaders(token),
                body: JSON.stringify(customerData)
            }
        ),

        deleteCustomer: (token, customerId) => request(
            `/api/customers/${customerId}`,
            {
                method: "DELETE",
                headers: authHeaders(token)
            }
        ),

// ANALYTICS

getAnalyticsOverview: (token) => request(
    "/api/analytics/overview",
    {
        headers: authHeaders(token)
    }
),

        // CHURN PREDICTIONS

        predictCustomerChurn: (token, customerId) => request(
            `/api/predictions/customers/${customerId}`,
            {
                method: "POST",
                headers: authHeaders(token)
            }
        ),

        getCustomerPredictionHistory: (token, customerId) => request(
            `/api/predictions/customers/${customerId}/history`,
            {
                headers: authHeaders(token)
            }
        ),

        getRecentPredictions: (token, limit = 50) => {
            const params = new URLSearchParams({
                limit: String(limit)
            });

            return request(`/api/predictions/?${params.toString()}`, {
                headers: authHeaders(token)
            });
        },

        // GENERAL

       
        // RETENTION CENTER

        getRetentionOverview: (token) => request(
            "/api/retention/overview",
            {
                headers: authHeaders(token)
            }
        ),

        getAtRiskCustomers: (
            token,
            riskLevel = "",
            search = "",
            skip = 0,
            limit = 20
        ) => {
            const params = new URLSearchParams({
                skip: String(skip),
                limit: String(limit)
            });

            if (riskLevel) {
                params.set("risk_level", riskLevel);
            }

            if (search.trim()) {
                params.set("search", search.trim());
            }

            return request(
                `/api/retention/at-risk-customers?${params.toString()}`,
                {
                    headers: authHeaders(token)
                }
            );
        },

        createRetentionAction: (token, actionData) => request(
            "/api/retention/actions",
            {
                method: "POST",
                headers: authHeaders(token),
                body: JSON.stringify(actionData)
            }
        ),

        getRetentionActions: (
            token,
            actionStatus = "",
            priority = "",
            customerId = null,
            skip = 0,
            limit = 20
        ) => {
            const params = new URLSearchParams({
                skip: String(skip),
                limit: String(limit)
            });

            if (actionStatus) {
                params.set("status", actionStatus);
            }

            if (priority) {
                params.set("priority", priority);
            }

            if (customerId) {
                params.set("customer_id", String(customerId));
            }

            return request(
                `/api/retention/actions?${params.toString()}`,
                {
                    headers: authHeaders(token)
                }
            );
        },

        updateRetentionAction: (token, actionId, actionData) => request(
            `/api/retention/actions/${actionId}`,
            {
                method: "PATCH",
                headers: authHeaders(token),
                body: JSON.stringify(actionData)
            }
        ),

        createCustomerInteraction: (token, interactionData) => request(
            "/api/retention/interactions",
            {
                method: "POST",
                headers: authHeaders(token),
                body: JSON.stringify(interactionData)
            }
        ),

        getCustomerInteractions: (
            token,
            customerId,
            skip = 0,
            limit = 50
        ) => {
            const params = new URLSearchParams({
                skip: String(skip),
                limit: String(limit)
            });

            return request(
                `/api/retention/customers/${customerId}/interactions?${params.toString()}`,
                {
                    headers: authHeaders(token)
                }
            );
        },

                // REPORTS AND FILE DOWNLOADS

        downloadReport: async (token, endpoint, fallbackFilename) => {
            const response = await fetch(
                `${API_BASE_URL}${endpoint}`,
                {
                    method: "GET",
                    headers: authHeaders(token)
                }
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));

                const message = Array.isArray(data.detail)
                    ? data.detail.map(item => item.msg).join(", ")
                    : data.detail || "Unable to download report.";

                throw new Error(message);
            }

            const blob = await response.blob();

            const disposition = response.headers.get(
                "Content-Disposition"
            );

            let filename = fallbackFilename;

            if (disposition) {
                const match = disposition.match(
                    /filename="?([^";]+)"?/i
                );

                if (match && match[1]) {
                    filename = match[1];
                }
            }

            const downloadUrl = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = filename;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(downloadUrl);

            return filename;
        },

        // GENERAL

        getBaseUrl: () => API_BASE_URL

    };
})();
