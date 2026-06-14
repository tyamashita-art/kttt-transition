import { initials } from "@/lib/format";

export function Avatar({
  url,
  name,
  email,
  size = "md"
}: {
  url?: string | null;
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "h-10 w-10 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-20 w-20 text-xl"
  }[size];

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name || email || "プロフィール写真"}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white dark:ring-slate-900`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} grid place-items-center rounded-full bg-slate-900 font-black text-white ring-2 ring-white dark:bg-cyan-400 dark:text-slate-950 dark:ring-slate-900`}
    >
      {initials(name, email)}
    </div>
  );
}
