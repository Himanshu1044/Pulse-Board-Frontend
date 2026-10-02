import api from "./api";
import type { AppNotification, Subscription, PlanLimits, Prefs, Payment } from "../lib/types";

export const getNotifications = async (): Promise<AppNotification[]> => (await api.get("/notifications")).data.notifications;
export const getUnreadCount = async (): Promise<number> => (await api.get("/notifications/unread-count")).data.count;
export const markNotificationRead = async (id: string) => (await api.patch(`/notifications/${id}/read`)).data;

export const getPreferences = async (): Promise<Prefs> => (await api.get("/notification-preferences")).data;
export const updatePreferences = async (data: Partial<{
    taskAssigned: boolean; commentCreated: boolean; memberChanges: boolean; emailNotifications: boolean; deadlineReminders: boolean;
}>): Promise<Prefs> => (await api.patch("/notification-preferences", data)).data;

export const getSubscription = async (): Promise<{ subscription: Subscription; limits: PlanLimits }> => (await api.get("/subscription")).data;
export const getPayments = async (): Promise<Payment[]> => (await api.get("/payments")).data.payments;
export const verifyPayment = async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    (await api.post("/payments/verify", r)).data as { message: string; status: string };

export const createPaymentOrder = async (plan: "pro" | "team") =>
    (await api.post("/payments/order", { plan })).data as { order: { id: string; amount: number; currency: string } };
