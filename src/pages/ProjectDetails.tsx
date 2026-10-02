import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Loader2, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import {
    addProjectMember, deleteProject, getProject, getProjectActivity, getProjectMembers, getProjectTasksPage,
    getUserByEmail, removeProjectMember, updateProject, updateProjectMemberRole, updateTask
} from "../services/projectService";
import { getSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { Avatar, Empty, ErrorNote, Modal } from "../components/ui";
import TaskModal from "../components/TaskModal";
import { cn, errMsg, formatDate, isPlanLimit, timeAgo } from "../lib/utils";
import { canEditTasks, STATUSES, type Activity, type Member, type Project, type Role, type Status, type Task, type TaskPage } from "../lib/types";

type Tab = "board" | "members" | "activity";

const priorityStyle = { low: "bg-slate-100 text-slate-600", medium: "bg-blue-50 text-blue-700", high: "bg-red-50 text-red-700" } as const;

const describe = (a: Activity) => {
    const m = a.metadata ?? {};
    const title = typeof m.title === "string" ? `"${m.title}"` : "a task";
    switch (a.action) {
        case "task.created": return `created ${title}`;
        case "task.updated": return `updated ${title}${typeof m.status === "string" ? ` (${m.status.replace("_", " ")})` : ""}`;
        case "task.deleted": return "deleted a task";
        case "comment.created": return "commented on a task";
        case "comment.updated": return "edited a comment";
        case "comment.deleted": return "deleted a comment";
        case "member.added": return `added a member as ${String(m.role ?? "member")}`;
        case "member.role_updated": return `changed a member's role to ${String(m.role ?? "")}`;
        case "member.removed": return "removed a member";
        default: return a.action;
    }
};

function ProjectDetails() {
    const { projectId = "" } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [tab, setTab] = useState<Tab>("board");
    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [assigneeFilter, setAssigneeFilter] = useState("");
    const [taskModal, setTaskModal] = useState<{ task: Task | null; status?: Status } | null>(null);
    const [editingProject, setEditingProject] = useState(false);
    const [dragId, setDragId] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState<Status | null>(null);

    const { data: project, isLoading, isError, error } = useQuery<Project>({ queryKey: ["project", projectId], queryFn: () => getProject(projectId), enabled: !!projectId });
    const { data: members = [] } = useQuery<Member[]>({ queryKey: ["project-members", projectId], queryFn: () => getProjectMembers(projectId), enabled: !!projectId });
    const { data: taskPage } = useQuery<TaskPage>({ queryKey: ["project-tasks", projectId], queryFn: () => getProjectTasksPage(projectId), enabled: !!projectId });
    const { data: activity } = useQuery<Activity[]>({ queryKey: ["project-activity", projectId], queryFn: () => getProjectActivity(projectId), enabled: !!projectId && tab === "activity" });

    const role: Role | undefined = members.find((m) => m.user_id === user?.id)?.role;
    const canEdit = canEditTasks(role);
    const canManageMembers = role === "owner" || role === "manager";
    const isOwner = role === "owner";

    // Realtime: join the project room and refetch whatever changed
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !projectId) return;
        const join = () => socket.emit("join_project", projectId);
        join();
        socket.on("connect", join); // re-join after a reconnect

        const invalidate = (...keys: string[]) => () => {
            keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
            queryClient.invalidateQueries({ queryKey: ["project-activity", projectId] });
        };
        const handlers: Record<string, () => void> = {
            "task.created": invalidate("project-tasks"),
            "task.updated": invalidate("project-tasks"),
            "task.deleted": invalidate("project-tasks"),
            "comment.created": invalidate("comments"),
            "comment.updated": invalidate("comments"),
            "comment.deleted": invalidate("comments"),
            "member.added": invalidate("project-members"),
            "member.removed": invalidate("project-members"),
            "member.role_updated": invalidate("project-members")
        };
        Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));

        return () => {
            socket.emit("leave_project", projectId);
            socket.off("connect", join);
            Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
        };
    }, [projectId, queryClient]);

    // Drag a card to another column: update the cache right away, roll back on failure
    const moveTask = useMutation({
        mutationFn: ({ id, status }: { id: string; status: Status }) => updateTask(projectId, id, { status }),
        onMutate: async ({ id, status }) => {
            const key = ["project-tasks", projectId];
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<TaskPage>(key);
            if (previous) queryClient.setQueryData<TaskPage>(key, { ...previous, tasks: previous.tasks.map((t) => (t.id === id ? { ...t, status } : t)) });
            return { previous };
        },
        onError: (_e, _v, ctx) => ctx?.previous && queryClient.setQueryData(["project-tasks", projectId], ctx.previous),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] })
    });

    const tasks = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (taskPage?.tasks ?? []).filter((t) =>
            (!q || t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)) &&
            (!priorityFilter || t.priority === priorityFilter) &&
            (!assigneeFilter || (assigneeFilter === "none" ? !t.assigned_to : t.assigned_to === assigneeFilter))
        );
    }, [taskPage, search, priorityFilter, assigneeFilter]);

    if (isLoading) return <div className="card h-48 animate-pulse bg-slate-50" />;
    if (isError || !project) {
        return (
            <>
                <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> Projects</Link>
                <ErrorNote message={errMsg(error) || "Project not found"} />
            </>
        );
    }

    const total = taskPage?.pagination.total ?? 0;

    return (
        <>
            <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> Projects</Link>

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">{project.description || "No description"}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {members.slice(0, 5).map((m) => <span key={m.user_id} className="rounded-full ring-2 ring-white"><Avatar name={m.name} size={30} /></span>)}
                    </div>
                    {isOwner && <button className="btn-secondary" onClick={() => setEditingProject(true)}><Pencil size={15} /> Edit</button>}
                    {canEdit && <button className="btn-primary" onClick={() => setTaskModal({ task: null })}><Plus size={16} /> New task</button>}
                </div>
            </div>

            <div role="tablist" className="mb-6 flex gap-1 border-b border-line">
                {(["board", "members", "activity"] as Tab[]).map((t) => (
                    <button
                        key={t}
                        role="tab"
                        aria-selected={tab === t}
                        onClick={() => setTab(t)}
                        className={cn("-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition", tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}
                    >
                        {t}{t === "members" && ` (${members.length})`}
                    </button>
                ))}
            </div>

            {tab === "board" && (
                <>
                    <div className="mb-4 flex flex-wrap gap-3">
                        <div className="relative min-w-52 flex-1 sm:max-w-xs">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input className="field pl-9" placeholder="Search tasks" aria-label="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <select className="field !w-auto" aria-label="Filter by priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                            <option value="">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                        </select>
                        <select className="field !w-auto" aria-label="Filter by assignee" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
                            <option value="">Everyone</option><option value="none">Unassigned</option>
                            {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                        </select>
                    </div>

                    {moveTask.isError && <div className="mb-3"><ErrorNote message={errMsg(moveTask.error)} /></div>}
                    {total > (taskPage?.tasks.length ?? 0) && (
                        <p className="mb-3 text-sm text-amber-700">Showing the latest {taskPage?.tasks.length} of {total} tasks.</p>
                    )}

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {STATUSES.map((col) => {
                            const items = tasks.filter((t) => t.status === col.id);
                            return (
                                <section
                                    key={col.id}
                                    aria-label={col.label}
                                    onDragOver={(e) => { if (canEdit) { e.preventDefault(); setDragOver(col.id); } }}
                                    onDragLeave={() => setDragOver(null)}
                                    onDrop={() => {
                                        setDragOver(null);
                                        const t = taskPage?.tasks.find((x) => x.id === dragId);
                                        if (t && t.status !== col.id) moveTask.mutate({ id: t.id, status: col.id });
                                        setDragId(null);
                                    }}
                                    className={cn("rounded-xl bg-slate-100/70 p-3 transition", dragOver === col.id && "bg-brand-50 ring-2 ring-brand-500/40")}
                                >
                                    <div className="mb-3 flex items-center justify-between px-1">
                                        <h2 className="flex items-center gap-2 text-sm font-semibold"><span className={cn("h-2 w-2 rounded-full", col.dot)} />{col.label}</h2>
                                        <span className="text-xs text-slate-500">{items.length}</span>
                                    </div>
                                    <div className="min-h-16 space-y-2.5">
                                        {items.map((t) => {
                                            const overdue = !!t.due_date && t.status !== "done" && new Date(t.due_date) < new Date();
                                            return (
                                                <button
                                                    key={t.id}
                                                    draggable={canEdit}
                                                    onDragStart={() => setDragId(t.id)}
                                                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                                                    onClick={() => setTaskModal({ task: t })}
                                                    className={cn("card w-full cursor-pointer p-3.5 text-left transition hover:border-brand-500/50 hover:shadow-sm", dragId === t.id && "opacity-50")}
                                                >
                                                    <p className="text-sm font-medium">{t.title}</p>
                                                    <div className="mt-3 flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold capitalize", priorityStyle[t.priority])}>{t.priority}</span>
                                                            {t.due_date && (
                                                                <span className={cn("flex items-center gap-1 text-xs", overdue ? "font-semibold text-red-600" : "text-slate-500")}>
                                                                    <CalendarDays size={12} />{formatDate(t.due_date)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {t.assigned_user_name && <Avatar name={t.assigned_user_name} size={24} />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {canEdit && (
                                            <button onClick={() => setTaskModal({ task: null, status: col.id })} className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-white hover:text-slate-800">
                                                <Plus size={15} /> Add task
                                            </button>
                                        )}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </>
            )}

            {tab === "members" && (
                <MembersPanel projectId={projectId} members={members} role={role} currentUserId={user?.id ?? ""} canManage={canManageMembers} isOwner={isOwner} />
            )}

            {tab === "activity" && (
                activity?.length === 0 ? (
                    <Empty icon={<Pencil />} title="No activity yet" body="Changes to tasks, comments and members will be listed here." />
                ) : (
                    <ul className="card divide-y divide-line">
                        {(activity ?? []).map((a) => (
                            <li key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                                <Avatar name={a.user_name} />
                                <p className="min-w-0 flex-1 text-sm"><span className="font-semibold">{a.user_name}</span> {describe(a)}</p>
                                <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.created_at)}</span>
                            </li>
                        ))}
                    </ul>
                )
            )}

            {taskModal && user && (
                <TaskModal
                    key={taskModal.task?.id ?? "new"}
                    projectId={projectId}
                    task={taskModal.task}
                    defaultStatus={taskModal.status}
                    members={members}
                    canEdit={canEdit}
                    currentUserId={user.id}
                    isOwner={isOwner}
                    onClose={() => setTaskModal(null)}
                />
            )}

            {editingProject && (
                <EditProjectModal project={project} onClose={() => setEditingProject(false)} onDeleted={() => navigate("/dashboard")} />
            )}
        </>
    );
}

function MembersPanel({ projectId, members, role, currentUserId, canManage, isOwner }: { projectId: string; members: Member[]; role?: Role; currentUserId: string; canManage: boolean; isOwner: boolean }) {
    const queryClient = useQueryClient();
    const [email, setEmail] = useState("");
    const [newRole, setNewRole] = useState("member");
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });

    const add = useMutation({
        mutationFn: async () => addProjectMember(projectId, (await getUserByEmail(email.trim().toLowerCase())).id, newRole),
        onSuccess: () => { setEmail(""); setNewRole("member"); refresh(); }
    });
    const changeRole = useMutation({ mutationFn: ({ userId, role }: { userId: string; role: string }) => updateProjectMemberRole(projectId, userId, role), onSuccess: refresh });
    const remove = useMutation({ mutationFn: (userId: string) => removeProjectMember(projectId, userId), onSuccess: refresh });

    const error = add.isError ? add.error : changeRole.isError ? changeRole.error : remove.isError ? remove.error : null;

    return (
        <div className="space-y-4">
            {canManage && (
                <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="card flex flex-wrap items-end gap-3 p-4">
                    <div className="min-w-56 flex-1">
                        <label className="label" htmlFor="memail">Invite by email</label>
                        <input id="memail" type="email" className="field" placeholder="teammate@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label className="label" htmlFor="mrole">Role</label>
                        <select id="mrole" className="field" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                            {isOwner && <option value="manager">Manager</option>}
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>
                    <button className="btn-primary" disabled={add.isPending}>
                        {add.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Add member
                    </button>
                </form>
            )}
            <ErrorNote message={error ? errMsg(error) : null} upgrade={isOwner && isPlanLimit(error)} />
            {!canManage && role && <p className="text-sm text-slate-500">Only owners and managers can add members.</p>}

            <ul className="card divide-y divide-line">
                {members.map((m) => (
                    <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                        <Avatar name={m.name} size={34} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{m.name}{m.user_id === currentUserId && <span className="font-normal text-slate-400"> (you)</span>}</p>
                            <p className="truncate text-xs text-slate-500">{m.email}</p>
                        </div>
                        {isOwner && m.role !== "owner" ? (
                            <>
                                <select aria-label={`Role for ${m.name}`} className="field !w-auto" value={m.role} onChange={(e) => changeRole.mutate({ userId: m.user_id, role: e.target.value })}>
                                    <option value="manager">Manager</option><option value="member">Member</option><option value="viewer">Viewer</option>
                                </select>
                                <button aria-label={`Remove ${m.name}`} className="cursor-pointer rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => window.confirm(`Remove ${m.name} from this project?`) && remove.mutate(m.user_id)}>
                                    <Trash2 size={16} />
                                </button>
                            </>
                        ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600">{m.role}</span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function EditProjectModal({ project, onClose, onDeleted }: { project: Project; onClose: () => void; onDeleted: () => void }) {
    const queryClient = useQueryClient();
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description ?? "");

    const save = useMutation({
        mutationFn: () => updateProject(project.id, { name: name.trim(), description: description.trim() }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project", project.id] });
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            onClose();
        }
    });
    const remove = useMutation({ mutationFn: () => deleteProject(project.id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); onDeleted(); } });
    const error = save.isError ? save.error : remove.isError ? remove.error : null;

    return (
        <Modal title="Project settings" onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4 p-5">
                <ErrorNote message={error ? errMsg(error) : null} />
                <div>
                    <label className="label" htmlFor="ename">Name</label>
                    <input id="ename" className="field" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={150} />
                </div>
                <div>
                    <label className="label" htmlFor="edesc">Description</label>
                    <textarea id="edesc" rows={3} className="field resize-none" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
                </div>
                <div className="flex items-center justify-between">
                    <button type="button" className="btn-danger" disabled={remove.isPending} onClick={() => window.confirm(`Delete "${project.name}" and everything in it?`) && remove.mutate()}>
                        <Trash2 size={15} /> Delete project
                    </button>
                    <div className="flex gap-2">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn-primary" disabled={save.isPending}>Save changes</button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

export default ProjectDetails;
