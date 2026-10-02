import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { cn, initials } from "../lib/utils";

export function Avatar({ name, size = 28 }: { name?: string | null; size?: number }) {
    return (
        <span
            title={name || undefined}
            style={{ width: size, height: size, fontSize: size * 0.4 }}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700"
        >
            {initials(name || "")}
        </span>
    );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-10" onMouseDown={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(e) => e.stopPropagation()}
                className={cn("card w-full shadow-xl", wide ? "max-w-3xl" : "max-w-md")}
            >
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                    <h2 className="font-semibold">{title}</h2>
                    <button onClick={onClose} aria-label="Close" className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function ErrorNote({ message, upgrade }: { message?: string | null; upgrade?: boolean }) {
    if (!message) return null;
    return (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
            {upgrade && <> <Link to="/billing" className="font-semibold underline">Upgrade your plan</Link></>}
        </p>
    );
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
    return (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
            {actions}
        </div>
    );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={cn("relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition", checked ? "bg-brand-600" : "bg-slate-300")}
        >
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
        </button>
    );
}
