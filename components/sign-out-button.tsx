"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      aria-label="ログアウト"
      title="ログアウト"
    >
      <LogOut size={18} />
    </button>
  );
}
