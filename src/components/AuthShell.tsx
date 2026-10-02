import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

const points = [
    "Kanban boards that update live for everyone on the team",
    "Roles for owners, managers, members and viewers",
    "Comments, activity history and notifications in one place"
];

export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
    return (
        <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
            <div className="hidden flex-col justify-between bg-brand-700 p-12 text-white lg:flex">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-base font-bold text-brand-700">P</span>
                    <span className="text-xl font-bold tracking-tight">PulseBoard</span>
                </div>
                <div>
                    <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight">Keep every project moving, together.</h2>
                    <ul className="mt-8 space-y-3.5">
                        {points.map((p) => (
                            <li key={p} className="flex items-start gap-3 text-brand-100">
                                <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
                                <span>{p}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-sm text-brand-100/70">Plan, assign and ship work without the status meetings.</p>
            </div>

            <div className="flex items-center justify-center px-5 py-12">
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex items-center gap-2.5 lg:hidden">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">P</span>
                        <span className="text-lg font-bold">PulseBoard</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
                    <div className="mt-7">{children}</div>
                    {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
                </div>
            </div>
        </div>
    );
}
