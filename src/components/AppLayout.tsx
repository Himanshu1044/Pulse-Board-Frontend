import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CreditCard, FolderKanban, LogOut, Menu, Settings, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getUnreadCount } from "../services/accountService";
import { getSocket } from "../lib/socket";
import { cn } from "../lib/utils";
import { Avatar } from "./ui";
import type { AppNotification } from "../lib/types";

const nav = [
    { to: "/dashboard", label: "Projects", icon: FolderKanban },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/billing", label: "Billing", icon: CreditCard },
    { to: "/profile", label: "Settings", icon: Settings }
];

export default function AppLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [toast, setToast] = useState<AppNotification | null>(null);

    const { data: unread = 0 } = useQuery({ queryKey: ["unread-count"], queryFn: getUnreadCount });

    // Close the mobile drawer after navigating
    useEffect(() => setOpen(false), [location.pathname]);

    // Live notifications for this user
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        const onNotification = (n: AppNotification) => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["unread-count"] });
            setToast(n);
        };
        socket.on("notification.created", onNotification);
        return () => { socket.off("notification.created", onNotification); };
    }, [queryClient]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(t);
    }, [toast]);

    const sidebar = (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2.5 px-5 py-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">P</span>
                <span className="text-lg font-bold tracking-tight">PulseBoard</span>
            </div>

            <nav className="flex-1 space-y-1 px-3">
                {nav.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                                isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                            )
                        }
                    >
                        <Icon size={18} />
                        <span className="flex-1">{label}</span>
                        {to === "/notifications" && unread > 0 && (
                            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">{unread > 99 ? "99+" : unread}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="m-3 flex items-center gap-3 rounded-lg border border-line p-3">
                <Avatar name={user?.name} size={34} />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <button
                    aria-label="Log out"
                    title="Log out"
                    onClick={() => { logout(); navigate("/login"); }}
                    className="cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen lg:pl-64">
            <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white lg:block">{sidebar}</aside>

            {open && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
                    <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">{sidebar}</aside>
                </div>
            )}

            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
                <button aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)} className="cursor-pointer rounded-md p-1.5 hover:bg-slate-100">
                    {open ? <X size={20} /> : <Menu size={20} />}
                </button>
                <span className="font-bold">PulseBoard</span>
                <NavLink to="/notifications" aria-label="Notifications" className="relative rounded-md p-1.5 hover:bg-slate-100">
                    <Bell size={20} />
                    {unread > 0 && <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-brand-600" />}
                </NavLink>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
                <Outlet />
            </main>

            {toast && (
                <button
                    onClick={() => { setToast(null); navigate("/notifications"); }}
                    className="fixed bottom-5 right-5 z-50 w-80 cursor-pointer rounded-xl border border-line bg-white p-4 text-left shadow-xl"
                >
                    <p className="text-sm font-semibold">{toast.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{toast.message}</p>
                </button>
            )}
        </div>
    );
}
