
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { register } from "../services/authService";
import AuthShell from "../components/AuthShell";
import { ErrorNote } from "../components/ui";
import { errMsg } from "../lib/utils";

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: HTMLElement,
                options: {
                    sitekey: string;
                    callback: (token: string) => void;
                    "expired-callback"?: () => void;
                    "error-callback"?: () => void;
                }
            ) => string;
            reset: (widgetId?: string) => void;
            remove: (widgetId: string) => void;
        };
    }
}

function Register() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [turnstileToken, setTurnstileToken] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [widgetReady, setWidgetReady] = useState(false);

    const turnstileContainerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let script: HTMLScriptElement | null = null;
        let createdScript = false;

        const renderWidget = () => {
            if (
                cancelled ||
                !window.turnstile ||
                !turnstileContainerRef.current ||
                widgetIdRef.current
            ) {
                return;
            }

            const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

            if (!siteKey) {
                setError("CAPTCHA configuration is missing.");
                return;
            }

            widgetIdRef.current = window.turnstile.render(
                turnstileContainerRef.current,
                {
                    sitekey: siteKey,

                    callback: (token: string) => {
                        setTurnstileToken(token);
                        setError("");
                    },

                    "expired-callback": () => {
                        setTurnstileToken("");
                    },

                    "error-callback": () => {
                        setTurnstileToken("");
                        setError(
                            "CAPTCHA failed to load. Please try again."
                        );
                    },
                }
            );

            setWidgetReady(true);
        };

        const scriptId = "cloudflare-turnstile-script";
        const existingScript = document.getElementById(
            scriptId
        ) as HTMLScriptElement | null;

        if (window.turnstile) {
            renderWidget();
        } else if (existingScript) {
            existingScript.addEventListener("load", renderWidget);
            script = existingScript;
        } else {
            script = document.createElement("script");
            script.id = scriptId;
            script.src =
                "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
            script.async = true;
            script.defer = true;

            script.addEventListener("load", renderWidget);
            document.head.appendChild(script);
            createdScript = true;
        }

        return () => {
            cancelled = true;

            if (script) {
                script.removeEventListener("load", renderWidget);
            }

            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }

            if (createdScript && script) {
                script.remove();
            }
        };
    }, []);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (!turnstileToken) {
            setError("Please complete the CAPTCHA verification.");
            return;
        }

        setLoading(true);

        try {
            await register(name, email, password, turnstileToken);

            navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        } catch (e) {
            setError(errMsg(e));

            // Tokens are single-use. Reset the widget for another attempt.
            setTurnstileToken("");

            if (window.turnstile && widgetIdRef.current) {
                window.turnstile.reset(widgetIdRef.current);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Create your account"
            subtitle="Free plan includes 3 projects. No card needed."
            footer={
                <>
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        className="font-semibold text-brand-600 hover:underline"
                    >
                        Log in
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <ErrorNote message={error} />

                <div>
                    <label className="label" htmlFor="name">
                        Full name
                    </label>
                    <input
                        id="name"
                        className="field"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={100}
                    />
                </div>

                <div>
                    <label className="label" htmlFor="email">
                        Work email
                    </label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        className="field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="label" htmlFor="password">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        className="field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                        At least 8 characters.
                    </p>
                </div>

                <div className="min-h-[65px]">
                    <div ref={turnstileContainerRef} />
                    {!widgetReady && (
                        <p className="text-xs text-slate-500">
                            Loading security verification...
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || !widgetReady}
                    className="btn-primary w-full"
                >
                    {loading && (
                        <Loader2 size={16} className="animate-spin" />
                    )}
                    {loading ? "Creating account" : "Create account"}
                </button>
            </form>
        </AuthShell>
    );
}

export default Register;
