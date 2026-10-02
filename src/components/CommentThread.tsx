import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { createComment, deleteComment, getTaskComments, updateComment } from "../services/projectService";
import { Avatar, ErrorNote } from "./ui";
import { errMsg, timeAgo } from "../lib/utils";

export default function CommentThread({ taskId, currentUserId, canComment }: { taskId: string; currentUserId: string; canComment: boolean }) {
    const queryClient = useQueryClient();
    const [text, setText] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");

    const key = ["comments", taskId];
    const { data: comments, isLoading } = useQuery({ queryKey: key, queryFn: () => getTaskComments(taskId) });
    const refresh = () => queryClient.invalidateQueries({ queryKey: key });

    const add = useMutation({ mutationFn: () => createComment(taskId, text.trim()), onSuccess: () => { setText(""); refresh(); } });
    const edit = useMutation({ mutationFn: () => updateComment(editingId!, editText.trim()), onSuccess: () => { setEditingId(null); refresh(); } });
    const remove = useMutation({ mutationFn: (id: string) => deleteComment(id), onSuccess: refresh });

    const error = add.isError ? add.error : edit.isError ? edit.error : remove.isError ? remove.error : null;

    return (
        <div>
            <h3 className="mb-3 text-sm font-semibold">Comments {comments ? `(${comments.length})` : ""}</h3>
            <ErrorNote message={error ? errMsg(error) : null} />

            {isLoading && <p className="text-sm text-slate-400">Loading comments</p>}
            {comments?.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}

            <ul className="mt-2 space-y-4">
                {comments?.map((c) => (
                    <li key={c.id} className="flex gap-3">
                        <Avatar name={c.user_name} />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm">
                                <span className="font-semibold">{c.user_name}</span>{" "}
                                <span className="text-xs text-slate-400">{timeAgo(c.created_at)}{c.updated_at !== c.created_at && " (edited)"}</span>
                            </p>

                            {editingId === c.id ? (
                                <form className="mt-1 space-y-2" onSubmit={(e) => { e.preventDefault(); edit.mutate(); }}>
                                    <textarea className="field resize-none" rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={2000} required autoFocus />
                                    <div className="flex gap-2">
                                        <button className="btn-primary !py-1" disabled={edit.isPending}>Save</button>
                                        <button type="button" className="btn-secondary !py-1" onClick={() => setEditingId(null)}>Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700">{c.content}</p>
                            )}

                            {editingId !== c.id && c.user_id === currentUserId && canComment && (
                                <div className="mt-1 flex gap-3 text-xs text-slate-400">
                                    <button className="flex cursor-pointer items-center gap-1 hover:text-slate-700" onClick={() => { setEditingId(c.id); setEditText(c.content); }}><Pencil size={12} /> Edit</button>
                                    <button className="flex cursor-pointer items-center gap-1 hover:text-red-600" onClick={() => window.confirm("Delete this comment?") && remove.mutate(c.id)}><Trash2 size={12} /> Delete</button>
                                </div>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {canComment ? (
                <form className="mt-5 space-y-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate(); }}>
                    <textarea className="field resize-none" rows={2} placeholder="Write a comment" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
                    <button className="btn-primary" disabled={add.isPending || !text.trim()}>Comment</button>
                </form>
            ) : (
                <p className="mt-4 text-sm text-slate-500">Viewers can read comments but not post them.</p>
            )}
        </div>
    );
}
