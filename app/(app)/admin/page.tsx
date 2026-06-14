"use client";

import { Loader2, MailPlus, Shield, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { LoadingCard } from "@/components/loading-card";
import type { Database, ProfileRole } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AllowedEmail = Database["public"]["Tables"]["allowed_emails"]["Row"];
type Item = Database["public"]["Tables"]["items"]["Row"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];

export default function AdminPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const userResult = await supabase.auth.getUser();
    const userId = userResult.data.user?.id;
    if (!userId) return;

    const meResult = await supabase.from("profiles").select("*").eq("id", userId).single();
    setMe(meResult.data);

    if (meResult.data?.role !== "admin") {
      setLoading(false);
      return;
    }

    const [profilesResult, allowedResult, itemsResult, eventsResult] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("allowed_emails").select("*").order("created_at", { ascending: false }),
      supabase.from("items").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("events").select("*").order("start_at", { ascending: false }).limit(20)
    ]);

    setProfiles(profilesResult.data || []);
    setAllowedEmails(allowedResult.data || []);
    setItems(itemsResult.data || []);
    setEvents(eventsResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!me) return;
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const role = String(formData.get("role") || "member") as ProfileRole;
    if (!email) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("allowed_emails").upsert(
      {
        email,
        role,
        invited_by: me.id
      },
      { onConflict: "email" }
    );
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    event.currentTarget.reset();
    await load();
  }

  async function removeInvite(id: string) {
    await run(async () => {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("allowed_emails").delete().eq("id", id);
      if (deleteError) throw deleteError;
    });
  }

  async function changeRole(profile: Profile, role: ProfileRole) {
    if (!me) return;
    await run(async () => {
      const supabase = createClient();
      const [{ error: profileError }, { error: inviteError }] = await Promise.all([
        supabase.from("profiles").update({ role }).eq("id", profile.id),
        supabase
          .from("allowed_emails")
          .upsert({ email: profile.email, role, invited_by: me.id }, { onConflict: "email" })
      ]);
      if (profileError) throw profileError;
      if (inviteError) throw inviteError;
    });
  }

  async function deleteItem(id: string) {
    if (!window.confirm("このギアを削除しますか？")) return;
    await run(async () => {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("items").delete().eq("id", id);
      if (deleteError) throw deleteError;
    });
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("このイベントを削除しますか？")) return;
    await run(async () => {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("events").delete().eq("id", id);
      if (deleteError) throw deleteError;
    });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "処理に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingCard />;
  if (me?.role !== "admin") {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-5 text-sm font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        管理者のみアクセスできます。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section>
        <h2 className="flex items-center gap-2 text-2xl font-black">
          <Shield size={22} />
          管理
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">招待、ロール、主要データを管理します。</p>
      </section>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-black">招待メール管理</h3>
        <form onSubmit={addInvite} className="mt-3 grid grid-cols-[1fr_6.5rem_auto] gap-2">
          <input
            name="email"
            type="email"
            placeholder="email@example.com"
            className="h-11 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-cyan-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
            required
          />
          <select
            name="role"
            className="h-11 rounded-md border border-slate-200 bg-white px-2 text-sm font-bold outline-none ring-cyan-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="grid h-11 w-11 place-items-center rounded-md bg-slate-900 text-white disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950"
            aria-label="招待追加"
            title="招待追加"
          >
            {busy ? <Loader2 className="animate-spin" size={18} /> : <MailPlus size={18} />}
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {allowedEmails.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 dark:bg-slate-950">
              <div className="min-w-0">
                <p className="truncate font-black">{invite.email}</p>
                <p className="text-xs font-bold text-slate-500">{invite.role}</p>
              </div>
              <button
                type="button"
                onClick={() => removeInvite(invite.id)}
                className="grid h-9 w-9 place-items-center rounded-md bg-rose-600 text-white"
                aria-label="招待削除"
                title="招待削除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <AdminSection title="メンバー管理">
        {profiles.map((profile) => (
          <div key={profile.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 dark:bg-slate-950">
            <div className="min-w-0">
              <p className="truncate font-black">{profile.display_name || profile.email}</p>
              <p className="truncate text-xs font-bold text-slate-500">{profile.email}</p>
            </div>
            <select
              value={profile.role}
              onChange={(event) => changeRole(profile, event.target.value as ProfileRole)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </div>
        ))}
      </AdminSection>

      <AdminSection title="ギア管理">
        {items.map((item) => (
          <AdminDeletableRow key={item.id} title={item.name} subtitle={item.category} onDelete={() => deleteItem(item.id)} />
        ))}
      </AdminSection>

      <AdminSection title="イベント管理">
        {events.map((event) => (
          <AdminDeletableRow
            key={event.id}
            title={event.title}
            subtitle={event.location || "場所未定"}
            onDelete={() => deleteEvent(event.id)}
          />
        ))}
      </AdminSection>
    </div>
  );
}

function AdminSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-black">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function AdminDeletableRow({
  title,
  subtitle,
  onDelete
}: {
  title: string;
  subtitle: string;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 dark:bg-slate-950">
      <div className="min-w-0">
        <p className="truncate font-black">{title}</p>
        <p className="truncate text-xs font-bold text-slate-500">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="grid h-9 w-9 place-items-center rounded-md bg-rose-600 text-white"
        aria-label="削除"
        title="削除"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
