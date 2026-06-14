type Tone = "accent" | "green" | "amber" | "red" | "slate";

const toneClass: Record<Tone, string> = {
  accent: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-800",
  green:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
  red: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800",
  slate:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
};

export function statusTone(status?: string | null): Tone {
  if (!status) return "slate";
  if (["available", "going", "returned"].includes(status)) return "green";
  if (["requested", "maybe", "return_requested"].includes(status)) return "amber";
  if (["borrowed", "team", "event", "rental"].includes(status)) return "accent";
  if (["unavailable", "rejected", "overdue", "not_going"].includes(status)) return "red";
  return "slate";
}

export function StatusPill({
  label,
  tone
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClass[tone || "slate"]}`}
    >
      {label}
    </span>
  );
}
