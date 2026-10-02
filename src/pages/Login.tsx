import { useState, type SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import { ErrorNote } from "../components/ui";
import { errMsg } from "../lib/utils";

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            navigate("/dashboard");
        } catch (e) {
            const message = errMsg(e);
            setError(message);
            // The backend blocks login until the email is verified; take them straight to the code screen
            if (message === "Email not verified") {
                setTimeout(() => navigate(`/verify-email?email=${encodeURIComponent(email)}`), 1200);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Log in to your PulseBoard workspace."
            footer={<>New to PulseBoard? <Link to="/register" className="font-semibold text-brand-600 hover:underline">Create an account</Link></>}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <ErrorNote message={error} />
                <div>
                    <label className="label" htmlFor="email">Email</label>
                    <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                    <div className="flex items-center justify-between">
                        <label className="label" htmlFor="password">Password</label>
                        <Link to="/forgot-password" className="mb-1.5 text-xs font-medium text-brand-600 hover:underline">Forgot password?</Link>
                    </div>
                    <input id="password" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? "Logging in" : "Log in"}
                </button>
            </form>
        </AuthShell>
    );
}

export default Login;
