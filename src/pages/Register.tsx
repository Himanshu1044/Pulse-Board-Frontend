import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { register } from "../services/authService";
import AuthShell from "../components/AuthShell";
import { ErrorNote } from "../components/ui";
import { errMsg } from "../lib/utils";

function Register() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            await register(name, email, password);
            navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        } catch (e) {
            setError(errMsg(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Create your account"
            subtitle="Free plan includes 3 projects. No card needed."
            footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link></>}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <ErrorNote message={error} />
                <div>
                    <label className="label" htmlFor="name">Full name</label>
                    <input id="name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} />
                </div>
                <div>
                    <label className="label" htmlFor="email">Work email</label>
                    <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                    <label className="label" htmlFor="password">Password</label>
                    <input id="password" type="password" autoComplete="new-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                    <p className="mt-1.5 text-xs text-slate-500">At least 8 characters.</p>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? "Creating account" : "Create account"}
                </button>
            </form>
        </AuthShell>
    );
}

export default Register;
