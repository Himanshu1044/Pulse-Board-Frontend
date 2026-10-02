import { useState, type SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { forgotPassword } from "../services/authService";
import AuthShell from "../components/AuthShell";
import { ErrorNote } from "../components/ui";
import { errMsg } from "../lib/utils";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage("");
        setError("");
        setLoading(true);
        try {
            const data = await forgotPassword(email);
            setMessage(typeof data.message === "string" ? data.message : "Check your email for a reset link.");
        } catch (e) {
            setError(errMsg(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Reset your password"
            subtitle="Enter your email and we'll send you a reset link."
            footer={<Link to="/login" className="font-semibold text-brand-600 hover:underline">Back to log in</Link>}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <ErrorNote message={error} />
                {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
                <div>
                    <label className="label" htmlFor="email">Email</label>
                    <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? "Sending" : "Send reset link"}
                </button>
            </form>
        </AuthShell>
    );
}

export default ForgotPassword;
