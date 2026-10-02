export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const initials = (name?: string) =>
  (name || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

// <input type="datetime-local"> expects local time without a zone suffix
export const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

// The backend answers 403 { code: "PLAN_LIMIT" } when a subscription limit is hit
export const isPlanLimit = (e: unknown) => e instanceof Error && (e as Error & { code?: string }).code === "PLAN_LIMIT";
