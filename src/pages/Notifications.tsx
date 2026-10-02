import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { getNotifications, markNotificationRead } from "../services/accountService";
import { Empty, ErrorNote, PageHeader } from "../components/ui";
import { cn, errMsg, timeAgo } from "../lib/utils";
import type { AppNotification } from "../lib/types";

function Notifications() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { data, isLoading, isError, error } = useQuery<AppNotification[]>({ queryKey: ["notifications"], queryFn: getNotifications });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    };

    const readOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
    // The API has no bulk endpoint, so mark each unread item
    const readAll = useMutation({
        mutationFn: () => Promise.all((data ?? []).filter((n) => !n.read_at).map((n) => markNotificationRead(n.id))),
        onSuccess: refresh
    });

    const unread = (data ?? []).filter((n) => !n.read_at).length;

    return (
        <>
            <PageHeader
                title="Notifications"
                subtitle={unread ? `${unread} unread` : "You're all caught up."}
                actions={unread > 0 && (
                    <button className="btn-secondary" onClick={() => readAll.mutate()} disabled={readAll.isPending}>
                        <CheckCheck size={16} /> Mark all as read
                    </button>
                )}
            />

            {isLoading && <div className="card h-40 animate-pulse bg-slate-50" />}
            {isError && <ErrorNote message={errMsg(error)} />}

            {data?.length === 0 && (
                <Empty icon={<Bell />} title="No notifications yet" body="Assignments, comments and team changes will show up here." />
            )}

            {data && data.length > 0 && (
                <ul className="card divide-y divide-line overflow-hidden">
                    {data.map((n) => (
                        <li key={n.id}>
                            <button
                                className={cn("flex w-full cursor-pointer items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50", !n.read_at && "bg-brand-50/40")}
                                onClick={() => {
                                    if (!n.read_at) readOne.mutate(n.id);
                                    if (n.project_id) navigate(`/projects/${n.project_id}`);
                                }}
                            >
                                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-brand-600")} />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold">{n.title}</span>
                                    <span className="block text-sm text-slate-600">{n.message}</span>
                                </span>
                                <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}

export default Notifications;
