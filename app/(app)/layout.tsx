import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,nickname,role")
    .eq("id", user.id)
    .single();

  return <AppShell profile={profile}>{children}</AppShell>;
}
