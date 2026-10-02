import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { createPaymentOrder, getPayments, getSubscription, verifyPayment } from "../services/accountService";
import { ErrorNote, PageHeader } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { cn, errMsg, formatDate } from "../lib/utils";

// Mirrors src/config/subscriptionPlans.ts on the backend (the backend stays the source of truth for enforcement)
const plans = [
    { id: "free", name: "Free", price: 0, features: ["3 projects", "5 members per project", "100 tasks per project"] },
    { id: "pro", name: "Pro", price: 499, features: ["20 projects", "20 members per project", "1,000 tasks per project"] },
    { id: "team", name: "Team", price: 999, features: ["100 projects", "100 members per project", "10,000 tasks per project"] }
] as const;

type RazorpayOptions = {
    key: string; order_id: string; amount: number; currency: string; name: string; description: string;
    prefill?: { name?: string; email?: string }; theme?: { color: string };
    handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void; modal?: { ondismiss?: () => void };
};
declare global {
    interface Window { Razorpay?: new (o: RazorpayOptions) => { open: () => void; on: (e: string, cb: (r: { error: { description: string } }) => void) => void } }
}

const loadRazorpay = () =>
    new Promise<boolean>((resolve) => {
        if (window.Razorpay) return resolve(true);
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.body.appendChild(s);
    });

const money = (paise: number, currency: string) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(paise / 100);

function Billing() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [error, setError] = useState("");
    const [confirming, setConfirming] = useState(false);
    const poll = useRef<ReturnType<typeof setInterval> | null>(null);

    const { data: sub } = useQuery({ queryKey: ["subscription"], queryFn: getSubscription });
    const { data: payments } = useQuery({ queryKey: ["payments"], queryFn: getPayments });

    useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

    // The plan changes when Razorpay's webhook reaches the backend, which can lag the checkout by a few seconds
    const waitForUpgrade = (plan: string) => {
        setConfirming(true);
        let tries = 0;
        poll.current = setInterval(async () => {
            tries++;
            await queryClient.invalidateQueries({ queryKey: ["subscription"] });
            await queryClient.invalidateQueries({ queryKey: ["payments"] });
            const current = queryClient.getQueryData<{ subscription: { plan: string } }>(["subscription"]);
            if (current?.subscription.plan === plan || tries >= 15) {
                if (poll.current) clearInterval(poll.current);
                setConfirming(false);
            }
        }, 2000);
    };

    const upgrade = useMutation({
        mutationFn: async (plan: "pro" | "team") => {
            setError("");
            const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
            if (!keyId) throw new Error("Payments are not configured. Set VITE_RAZORPAY_KEY_ID in your frontend .env.");
            if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("Could not load the payment window. Check your connection.");

            const { order } = await createPaymentOrder(plan);
            const checkout = new window.Razorpay({
                key: keyId,
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                name: "PulseBoard",
                description: `${plan[0].toUpperCase()}${plan.slice(1)} plan`,
                prefill: { name: user?.name, email: user?.email },
                theme: { color: "#0f766e" },
                handler: async (response) => {
                    // Tell the backend to verify the signature and activate the plan right away
                    try {
                        await verifyPayment(response);
                        await queryClient.invalidateQueries({ queryKey: ["subscription"] });
                        await queryClient.invalidateQueries({ queryKey: ["payments"] });
                    } catch (e) {
                        setError(`${errMsg(e)} Checking again in case the payment webhook confirms it.`);
                        waitForUpgrade(plan);
                    }
                }
            });
            checkout.on("payment.failed", (r) => setError(r.error.description || "Payment failed. You have not been charged."));
            checkout.open();
        },
        onError: (e) => setError(errMsg(e))
    });

    const current = sub?.subscription.plan ?? "free";

    return (
        <>
            <PageHeader title="Billing" subtitle="Manage your plan and see past payments." />
            <div className="mb-4"><ErrorNote message={error} /></div>

            {confirming && (
                <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                    <Loader2 size={16} className="animate-spin" /> Payment received. Confirming your new plan.
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
                {plans.map((p) => {
                    const isCurrent = p.id === current;
                    return (
                        <div key={p.id} className={cn("card flex flex-col p-6", isCurrent && "border-brand-500 ring-1 ring-brand-500")}>
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold">{p.name}</h2>
                                {isCurrent && <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">Current plan</span>}
                            </div>
                            <p className="mt-3"><span className="text-3xl font-bold">₹{p.price}</span><span className="text-sm text-slate-500"> / month</span></p>
                            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                                {p.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-slate-600"><Check size={16} className="text-brand-600" />{f}</li>
                                ))}
                            </ul>
                            {p.id !== "free" && (
                                <button
                                    className={cn("mt-6", isCurrent ? "btn-secondary" : "btn-primary")}
                                    disabled={isCurrent || upgrade.isPending || confirming}
                                    onClick={() => upgrade.mutate(p.id as "pro" | "team")}
                                >
                                    {upgrade.isPending && upgrade.variables === p.id && <Loader2 size={16} className="animate-spin" />}
                                    {isCurrent ? "Your plan" : `Upgrade to ${p.name}`}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {sub?.subscription.current_period_end && current !== "free" && (
                <p className="mt-4 text-sm text-slate-500">Current period ends {formatDate(sub.subscription.current_period_end)}.</p>
            )}

            <section className="card mt-8 overflow-hidden">
                <div className="border-b border-line px-6 py-4"><h2 className="font-semibold">Payment history</h2></div>
                {payments?.length === 0 && <p className="px-6 py-10 text-center text-sm text-slate-500">No payments yet.</p>}
                {payments && payments.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left text-slate-500">
                                <tr><th className="px-6 py-2.5 font-medium">Date</th><th className="px-6 py-2.5 font-medium">Plan</th><th className="px-6 py-2.5 font-medium">Amount</th><th className="px-6 py-2.5 font-medium">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {payments.map((p) => (
                                    <tr key={p.id}>
                                        <td className="px-6 py-3">{formatDate(p.created_at)}</td>
                                        <td className="px-6 py-3 capitalize">{p.plan ?? "-"}</td>
                                        <td className="px-6 py-3">{money(p.amount, p.currency)}</td>
                                        <td className="px-6 py-3">
                                            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                                                ["paid", "captured", "success", "completed"].includes(p.status) ? "bg-emerald-50 text-emerald-700" :
                                                p.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700")}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    );
}

export default Billing;
