import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ProfileRole } from "@/lib/database.types";

export function AppShell({
  children,
  profile
}: {
  children: React.ReactNode;
  profile: {
    display_name: string | null;
    nickname: string | null;
    role: ProfileRole;
  } | null;
}) {
  return (
    <div className="min-h-dvh bg-canvas text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-canvas/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <Link href="/" className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-accent dark:text-red-300">
              Connect Share Train Race
            </p>
            <h1 className="truncate text-xl font-black leading-tight">KTTT Transition</h1>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {profile?.role === "admin" ? (
              <Link
                href="/admin"
                className="rounded-full bg-accent px-3 py-2 text-xs font-black text-white shadow-sm active:scale-95"
              >
                Admin
              </Link>
            ) : null}
            <Link
              href="/profile"
              className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 min-[380px]:inline-flex"
            >
              {profile?.nickname || profile?.display_name || "Profile"}
            </Link>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pb-28 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
