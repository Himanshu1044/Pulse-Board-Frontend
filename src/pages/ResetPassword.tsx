import { useState, type SyntheticEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { resetPassword } from "../services/authService";
import AuthShell from "../components/AuthShell";
import { ErrorNote } from "../components/ui";
import { errMsg } from "../lib/utils";

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const email = searchParams.get("email") || "";
    const token = searchParams.get("token") || "";

    const [newPassword, setNewPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage("");
        setError("");
        if (!email || !token) return setError("This reset link is incomplete. Request a new one.");

        setLoading(true);
        try {
            const data = await resetPassword(email, token, newPassword);
            setMessage(typeof data.message === "string" ? data.message : "Password reset");
            setTimeout(() => navigate("/login"), 1500);
        } catch (e) {
            setError(errMsg(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Choose a new password"
            subtitle={email ? `Resetting the password for ${email}.` : "Pick a new password for your account."}
            footer={<Link to="/forgot-password" className="font-semibold text-brand-600 hover:underline">Request a new link</Link>}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <ErrorNote message={error} />
                {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}. Redirecting to log in.</p>}
                <div>
                    <label className="label" htmlFor="pw">New password</label>
                    <input id="pw" type="password" autoComplete="new-password" className="field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
                    <p className="mt-1.5 text-xs text-slate-500">At least 8 characters.</p>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? "Saving" : "Reset password"}
                </button>
            </form>
        </AuthShell>
    );
}

export default ResetPassword;
