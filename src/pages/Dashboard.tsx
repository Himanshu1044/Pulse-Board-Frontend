import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FolderKanban, Loader2, Plus, Trash2 } from "lucide-react";
import { createProject, deleteProject, getProjects } from "../services/projectService";
import { getSubscription } from "../services/accountService";
import { Empty, ErrorNote, Modal, PageHeader } from "../components/ui";
import { errMsg, formatDate, isPlanLimit } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import type { Project } from "../lib/types";

function Dashboard() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const { data: projects, isLoading, isError, error } = useQuery<Project[]>({ queryKey: ["projects"], queryFn: getProjects });
    const { data: sub } = useQuery({ queryKey: ["subscription"], queryFn: getSubscription });

    const createMutation = useMutation({
        mutationFn: () => createProject(name.trim(), description.trim()),
        onSuccess: () => {
            setCreating(false);
            setName("");
            setDescription("");
            queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteProject(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] })
    });

    // Plan limits count projects you own, not ones you were invited to
    const ownedCount = (projects ?? []).filter((p) => p.owner_id === user?.id).length;
    const atLimit = !!sub && !!projects && ownedCount >= sub.limits.maxProjects;

    return (
        <>
            <PageHeader
                title={`Hi ${user?.name.split(" ")[0] ?? "there"}`}
                subtitle="Your projects and their progress."
                actions={
                    <button
                        className="btn-primary"
                        onClick={() => setCreating(true)}
                        disabled={atLimit}
                        title={atLimit ? "Project limit reached. Upgrade your plan to create more." : undefined}
                    >
                        <Plus size={16} /> New project
                    </button>
                }
            />

            {sub && projects && (
                <div className="card mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
                    <div>
                        <p className="text-xs text-slate-500">Plan</p>
                        <p className="font-semibold capitalize">{sub.subscription.plan}</p>
                    </div>
                    <div className="min-w-48 flex-1">
                        <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                            <span>Projects used</span>
                            <span>{ownedCount} of {sub.limits.maxProjects}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (ownedCount / sub.limits.maxProjects) * 100)}%` }} />
                        </div>
                    </div>
                    {atLimit && (
                        <>
                            <p className="w-full text-sm text-amber-700 sm:order-last">
                                You've used all {sub.limits.maxProjects} projects on the {sub.subscription.plan} plan. Upgrade to create more.
                            </p>
                            <Link to="/billing" className="btn-primary">Upgrade plan</Link>
                        </>
                    )}
                </div>
            )}

            {isLoading && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => <div key={i} className="card h-36 animate-pulse bg-slate-50" />)}
                </div>
            )}

            {isError && <ErrorNote message={errMsg(error)} />}

            {projects?.length === 0 && (
                <Empty
                    icon={<FolderKanban />}
                    title="Create your first project"
                    body="Projects hold your tasks, team and activity. Start one and invite your teammates."
                    action={<button className="btn-primary" onClick={() => setCreating(true)} disabled={atLimit}><Plus size={16} /> New project</button>}
                />
            )}

            {projects && projects.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((p) => (
                        <div key={p.id} className="card group relative p-5 transition hover:border-brand-500/50 hover:shadow-sm">
                            <div className="flex items-start justify-between">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 font-bold text-brand-700">
                                    {p.name.charAt(0).toUpperCase()}
                                </span>
                                {p.owner_id !== user?.id && (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600">
                                        Shared · {p.role ?? "member"}
                                    </span>
                                )}
                                {p.owner_id === user?.id && <button
                                    aria-label={`Delete ${p.name}`}
                                    disabled={deleteMutation.isPending}
                                    onClick={() => {
                                        if (window.confirm(`Delete "${p.name}"? Its tasks, members, comments and activity are permanently removed.`)) deleteMutation.mutate(p.id);
                                    }}
                                    className="relative z-10 cursor-pointer rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>}
                            </div>
                            <h3 className="mt-4 font-semibold">
                                {/* Stretched link makes the whole card clickable without nesting a button in a link */}
                                <Link to={`/projects/${p.id}`} className="after:absolute after:inset-0">{p.name}</Link>
                            </h3>
                            <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{p.description || "No description"}</p>
                            <p className="mt-4 text-xs text-slate-400">Created {formatDate(p.created_at)}</p>
                        </div>
                    ))}
                </div>
            )}

            {deleteMutation.isError && <div className="mt-4"><ErrorNote message={errMsg(deleteMutation.error)} /></div>}

            {creating && (
                <Modal title="New project" onClose={() => setCreating(false)}>
                    <form
                        onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
                        className="space-y-4 p-5"
                    >
                        <ErrorNote message={createMutation.isError ? errMsg(createMutation.error) : null} upgrade={createMutation.isError && isPlanLimit(createMutation.error)} />
                        <div>
                            <label className="label" htmlFor="pname">Name</label>
                            <input id="pname" autoFocus className="field" placeholder="Website redesign" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={150} />
                        </div>
                        <div>
                            <label className="label" htmlFor="pdesc">Description <span className="font-normal text-slate-400">(optional)</span></label>
                            <textarea id="pdesc" rows={3} className="field resize-none" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
                            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                                Create project
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}

export default Dashboard;
