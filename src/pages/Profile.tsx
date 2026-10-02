import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getPreferences, updatePreferences } from "../services/accountService";
import { Avatar, ErrorNote, PageHeader, Toggle } from "../components/ui";
import { errMsg, formatDate } from "../lib/utils";
import type { Prefs } from "../lib/types";

const rows: { key: keyof Prefs; api: string; label: string; hint: string }[] = [
    { key: "task_assigned", api: "taskAssigned", label: "Task assignments", hint: "When someone assigns a task to you" },
    { key: "comment_created", api: "commentCreated", label: "Comments", hint: "When someone comments on your tasks" },
    { key: "member_changes", api: "memberChanges", label: "Team changes", hint: "When you are added, removed or your role changes" },
    { key: "deadline_reminders", api: "deadlineReminders", label: "Deadline reminders", hint: "Before your tasks are due" },
    { key: "email_notifications", api: "emailNotifications", label: "Email notifications", hint: "Also send notifications to your email" }
];

function Profile() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: prefs, isError, error } = useQuery({ queryKey: ["prefs"], queryFn: getPreferences });

    const mutation = useMutation({
        mutationFn: (patch: Record<string, boolean>) => updatePreferences(patch),
        // Flip the switch immediately and roll back if the save fails
        onMutate: async (patch) => {
            await queryClient.cancelQueries({ queryKey: ["prefs"] });
            const previous = queryClient.getQueryData<Prefs>(["prefs"]);
            const row = rows.find((r) => r.api in patch)!;
            if (previous) queryClient.setQueryData<Prefs>(["prefs"], { ...previous, [row.key]: patch[row.api] });
            return { previous };
        },
        onError: (_e, _p, ctx) => ctx?.previous && queryClient.setQueryData(["prefs"], ctx.previous),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["prefs"] })
    });

    if (!user) return null;

    return (
        <>
            <PageHeader title="Settings" subtitle="Your profile and notification preferences." />

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <section className="card h-fit p-6">
                    <Avatar name={user.name} size={56} />
                    <h2 className="mt-4 text-lg font-semibold">{user.name}</h2>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <dl className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-slate-500">Email</dt>
                            <dd className="flex items-center gap-1 font-medium">
                                {user.email_verified ? <><BadgeCheck size={15} className="text-emerald-600" /> Verified</> : "Not verified"}
                            </dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-slate-500">Member since</dt>
                            <dd className="font-medium">{formatDate(user.created_at)}</dd>
                        </div>
                    </dl>
                </section>

                <section className="card">
                    <div className="border-b border-line px-6 py-4">
                        <h2 className="font-semibold">Notifications</h2>
                        <p className="text-sm text-slate-500">Choose what PulseBoard tells you about.</p>
                    </div>
                    <div className="space-y-3 p-6">
                        <ErrorNote message={isError ? errMsg(error) : mutation.isError ? errMsg(mutation.error) : null} />
                        <ul className="divide-y divide-line">
                            {rows.map((r) => (
                                <li key={r.key} className="flex items-center justify-between gap-4 py-4">
                                    <div>
                                        <p className="text-sm font-medium">{r.label}</p>
                                        <p className="text-sm text-slate-500">{r.hint}</p>
                                    </div>
                                    <Toggle label={r.label} checked={prefs?.[r.key] ?? true} onChange={(v) => mutation.mutate({ [r.api]: v })} />
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </div>
        </>
    );
}

export default Profile;
