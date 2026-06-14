export function EmptyState({
  title,
  body
}: {
  title: string;
  body?: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      <p className="font-black text-slate-700 dark:text-slate-200">{title}</p>
      {body ? <p className="mt-2 leading-6">{body}</p> : null}
    </div>
  );
}
