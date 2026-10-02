import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const fallback: Record<number, string> = {
    403: "You do not have permission to perform this action.",
    404: "The requested resource was not found.",
    409: "This action conflicts with the current data."
};

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!axios.isAxiosError(error)) return Promise.reject(new Error("Something went wrong. Please try again."));

        const status = error.response?.status;
        const data = error.response?.data as { message?: string; code?: string; errors?: Record<string, string[]> } | undefined;

        // An expired/invalid token on an authenticated call logs the user out (login itself also returns 401 for bad credentials)
        if (status === 401 && localStorage.getItem("token")) {
            localStorage.removeItem("token");
            window.dispatchEvent(new Event("pb:logout"));
        }

        if (!error.response) return Promise.reject(new Error("Cannot reach the server. Check your connection and try again."));

        // Validation errors: surface the first field message (e.g. "password: Too small")
        const fieldErrors = data?.errors
            ? Object.entries(data.errors).map(([field, msgs]) => `${field}: ${msgs?.[0]}`).join(", ")
            : "";

        const message =
            fieldErrors ||
            data?.message ||
            (status ? fallback[status] : undefined) ||
            (status && status >= 500 ? "Something went wrong on the server. Please try again." : "Invalid request. Please check your input.");

        return Promise.reject(Object.assign(new Error(message), { code: data?.code }));
    }
);

export default api;
