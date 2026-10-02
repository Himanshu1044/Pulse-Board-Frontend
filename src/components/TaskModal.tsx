import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { createTask, deleteTask, updateTask } from "../services/projectService";
import { ErrorNote, Modal } from "./ui";
import CommentThread from "./CommentThread";
import { errMsg, isPlanLimit, toLocalInput } from "../lib/utils";
import { STATUSES, type Member, type Priority, type Status, type Task } from "../lib/types";

type Props = {
    projectId: string;
    task: Task | null; // null = creating
    defaultStatus?: Status;
    members: Member[];
    canEdit: boolean;
    currentUserId: string;
    isOwner?: boolean;
    onClose: () => void;
};

export default function TaskModal({ projectId, task, defaultStatus, members, canEdit, currentUserId, isOwner, onClose }: Props) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState(task?.title ?? "");
    const [description, setDescription] = useState(task?.description ?? "");
    const [status, setStatus] = useState<Status>(task?.status ?? defaultStatus ?? "todo");
    const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
    const [assignee, setAssignee] = useState(task?.assigned_to ?? "");
    const [due, setDue] = useState(toLocalInput(task?.due_date ?? null));

    const done = () => {
        queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
        queryClient.invalidateQueries({ queryKey: ["project-activity", projectId] });
        onClose();
    };

    const save = useMutation({
        mutationFn: () => {
            const dueIso = due ? new Date(due).toISOString() : null;
            if (task) {
                return updateTask(projectId, task.id, { title: title.trim(), description, status, priority, assignedTo: assignee || null, dueDate: dueIso });
            }
            return createTask(projectId, title.trim(), description, status, priority, assignee || undefined, dueIso ?? undefined);
        },
        onSuccess: done
    });

    const remove = useMutation({ mutationFn: () => deleteTask(projectId, task!.id), onSuccess: done });

    const assignable = members.filter((m) => m.role !== "viewer");
    const error = save.isError ? save.error : remove.isError ? remove.error : null;

    return (
        <Modal title={task ? "Task details" : "New task"} onClose={onClose} wide={!!task}>
            <div className={task ? "grid gap-0 md:grid-cols-[1.2fr_1fr]" : ""}>
                <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4 p-5">
                    <ErrorNote message={error ? errMsg(error) : null} upgrade={!!isOwner && isPlanLimit(error)} />
                    <div>
                        <label className="label" htmlFor="ttitle">Title</label>
                        <input id="ttitle" className="field" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} maxLength={200} disabled={!canEdit} autoFocus={!task} />
                    </div>
                    <div>
                        <label className="label" htmlFor="tdesc">Description</label>
                        <textarea id="tdesc" rows={4} className="field resize-none" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} disabled={!canEdit} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label" htmlFor="tstatus">Status</label>
                            <select id="tstatus" className="field" value={status} onChange={(e) => setStatus(e.target.value as Status)} disabled={!canEdit}>
                                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label" htmlFor="tprio">Priority</label>
                            <select id="tprio" className="field" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} disabled={!canEdit}>
                                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="label" htmlFor="tassign">Assignee</label>
                            <select id="tassign" className="field" value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={!canEdit}>
                                <option value="">Unassigned</option>
                                {assignable.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label" htmlFor="tdue">Due date</label>
                            <input id="tdue" type="datetime-local" className="field" value={due} onChange={(e) => setDue(e.target.value)} disabled={!canEdit} />
                        </div>
                    </div>

                    {canEdit && (
                        <div className="flex items-center justify-between pt-1">
                            {task ? (
                                <button type="button" className="btn-danger" disabled={remove.isPending} onClick={() => window.confirm("Delete this task and its comments?") && remove.mutate()}>
                                    <Trash2 size={15} /> Delete
                                </button>
                            ) : <span />}
                            <div className="flex gap-2">
                                <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={save.isPending}>
                                    {save.isPending && <Loader2 size={16} className="animate-spin" />}
                                    {task ? "Save changes" : "Create task"}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                {task && (
                    <div className="border-t border-line bg-slate-50/60 p-5 md:border-l md:border-t-0">
                        <CommentThread taskId={task.id} currentUserId={currentUserId} canComment={canEdit} />
                    </div>
                )}
            </div>
        </Modal>
    );
}
