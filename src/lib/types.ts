export type Role = "owner" | "manager" | "member" | "viewer";
export type Status = "todo" | "in_progress" | "review" | "done";
export type Priority = "low" | "medium" | "high";

export type Project = { id: string; owner_id: string; name: string; description: string | null; created_at: string; role?: Role };
export type Member = { user_id: string; name: string; email: string; role: Role; created_at: string };
export type Task = {
  id: string; project_id: string; title: string; description: string | null; status: Status; priority: Priority;
  assigned_to: string | null; assigned_user_name?: string | null; assigned_user_email?: string | null;
  due_date: string | null; created_at: string;
};
export type TaskPage = { tasks: Task[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export type TaskComment = { id: string; task_id: string; user_id: string; user_name: string; user_email: string; content: string; created_at: string; updated_at: string };
export type Activity = { id: string; user_name: string; action: string; entity_type: string; metadata: Record<string, unknown> | null; created_at: string };
export type AppNotification = { id: string; project_id: string | null; type: string; title: string; message: string; read_at: string | null; created_at: string };
export type Subscription = { plan: "free" | "pro" | "team"; status: string; current_period_end: string | null };
export type PlanLimits = { price: number; maxProjects: number; maxMembersPerProject: number; maxTasksPerProject: number };
export type Prefs = { task_assigned: boolean; comment_created: boolean; member_changes: boolean; email_notifications: boolean; deadline_reminders: boolean };
export type Payment = { id: string; amount: number; currency: string; status: string; plan: string | null; created_at: string };

export const STATUSES: { id: Status; label: string; dot: string }[] = [
  { id: "todo", label: "To do", dot: "bg-slate-400" },
  { id: "in_progress", label: "In progress", dot: "bg-blue-500" },
  { id: "review", label: "In review", dot: "bg-amber-500" },
  { id: "done", label: "Done", dot: "bg-emerald-500" },
];
export const canEditTasks = (r?: Role) => r === "owner" || r === "manager" || r === "member";
