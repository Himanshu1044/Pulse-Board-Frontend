import { useState, type SyntheticEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { verifyEmail } from "../services/authService";
import AuthShell from "../components/AuthShell";
import { ErrorNote } from "../components/ui";
import { errMsg } from "../lib/utils";

function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const email = searchParams.get("email") || "";

    const [code, setCode] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage("");
        setError("");
        if (!email) return setError("This verification link is incomplete. Register again to get a new code.");

        setLoading(true);
        try {
            const data = await verifyEmail(email, code);
            setMessage(typeof data.message === "string" ? data.message : "Email verified");
            setTimeout(() => navigate("/login"), 1500);
        } catch (e) {
            setError(errMsg(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Check your email"
            subtitle={email ? `We sent a 6-digit code to ${email}.` : "Enter the 6-digit code we emailed you."}
            footer={<Link to="/login" className="font-semibold text-brand-600 hover:underline">Back to log in</Link>}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <ErrorNote message={error} />
                {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}. Redirecting to log in.</p>}
                <div>
                    <label className="label" htmlFor="code">Verification code</label>
                    <input
                        id="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        pattern="\d{6}"
                        className="field text-center text-xl font-semibold tracking-[0.5em]"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        required
                    />
                </div>
                <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? "Verifying" : "Verify email"}
                </button>
            </form>
        </AuthShell>
    );
}

export default VerifyEmail;
