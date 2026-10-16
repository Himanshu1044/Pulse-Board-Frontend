import api from "./api";

export const register = async (
    name: string,
    email: string,
    password: string,
    turnstileToken: string
) => {
    const response = await api.post("/auth/register", {
        name,
        email,
        password,
        turnstileToken
    });

    return response.data;
};

export const verifyEmail = async (
    email: string,
    code: string
) => {
    const response = await api.post("/auth/verify-email", {
        email,
        code
    });

    return response.data;
};

export const login = async (
    email: string,
    password: string
) => {
    const response = await api.post("/auth/login", {
        email,
        password
    });

    return response.data;
};

export const forgotPassword = async (email: string) => {
    const response = await api.post("/auth/forgot-password", {
        email
    });

    return response.data;
};

export const resetPassword = async (
    email: string,
    token: string,
    newPassword: string
) => {
    const response = await api.post("/auth/reset-password", {
        email,
        token,
        newPassword
    });

    return response.data;
};

export const getCurrentUser = async () => {
    const response = await api.get("/auth/me");

    return response.data;
};