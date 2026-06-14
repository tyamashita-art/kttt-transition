export function LoadingCard({ label = "読み込み中" }: { label?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      {label}
    </div>
  );
}
