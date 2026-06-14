export function formatDate(value?: string | null) {
  if (!value) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short"
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function initials(name?: string | null, email?: string | null) {
  const source = name || email || "K";
  return source.trim().slice(0, 2).toUpperCase();
}
