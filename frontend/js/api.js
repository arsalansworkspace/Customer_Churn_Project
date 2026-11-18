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

    window.ChurnGuardAPI = {
        login: (email, password) => request("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        }),

        getCurrentUser: (token) => request("/api/auth/me", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }),

        getBaseUrl: () => API_BASE_URL
    };
})();
