"use client";

import { Bell, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { LoadingCard } from "@/components/loading-card";
import type { Database } from "@/lib/database.types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Notice = Database["public"]["Tables"]["notices"]["Row"] & {
  author?: {
    display_name: string | null;
    nickname: string | null;
  } | null;
};

export default function NoticesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;

    const [profileResult, noticesResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("notices")
        .select("*, author:profiles!notices_author_id_fkey(display_name,nickname)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
    ]);

    setProfile(profileResult.data);
    setNotices((noticesResult.data || []) as unknown as Notice[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    await run(async () => {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("notices").insert({
        author_id: profile.id,
        title: String(formData.get("title") || ""),
        body: String(formData.get("body") || "")
      });
      if (insertError) throw insertError;
      form.reset();
    }, "お知らせを投稿しました。");
  }

  async function saveNotice(notice: Notice) {
    await run(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("notices")
        .update({
          title: editingTitle,
          body: editingBody
        })
        .eq("id", notice.id);
      if (updateError) throw updateError;
      setEditingId(null);
    }, "お知らせを保存しました。");
  }

  async function deleteNotice(notice: Notice) {
    if (!window.confirm("このお知らせを削除しますか？")) return;
    await run(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("notices")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", notice.id);
      if (updateError) throw updateError;
    }, "お知らせを削除しました。");
  }

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await action();
      setMessage(success);
      await load();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "処理に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(notice: Notice) {
    setEditingId(notice.id);
    setEditingTitle(notice.title);
    setEditingBody(notice.body);
  }

  if (loading || !profile) return <LoadingCard />;

  return (
    <div className="space-y-4">
      <section>
        <h2 className="flex items-center gap-2 text-2xl font-black">
          <Bell size={22} />
          チームお知らせ
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">練習会の連絡、共有事項、チーム内のお知らせ。</p>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-black">お知らせ投稿</h3>
        <form onSubmit={createNotice} className="mt-3 space-y-3">
          <Input name="title" label="タイトル" required />
          <Textarea name="body" label="本文" rows={4} required />
          <button
            type="submit"
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
          >
            {busy ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
            投稿する
          </button>
        </form>
      </section>

      {message ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {notices.length === 0 ? <EmptyState title="お知らせはまだありません" body="最初のお知らせを投稿できます。" /> : null}

      <div className="grid gap-3">
        {notices.map((notice) => {
          const canManage = profile.id === notice.author_id || profile.role === "admin";
          const editing = editingId === notice.id;
          return (
            <article
              key={notice.id}
              className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {editing ? (
                <div className="space-y-3">
                  <Input value={editingTitle} onChange={setEditingTitle} label="タイトル" name="edit_title" required />
                  <Textarea value={editingBody} onChange={setEditingBody} label="本文" name="edit_body" rows={4} required />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveNotice(notice)}
                      className="flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 text-sm font-black text-white disabled:opacity-60 dark:bg-red-500"
                    >
                      <Save size={16} />
                      保存
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                      className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-slate-600 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200"
                      aria-label="編集をキャンセル"
                      title="編集をキャンセル"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs font-black text-accent dark:text-red-300">
                    {notice.author?.nickname || notice.author?.display_name || "メンバー"} · {formatDateTime(notice.created_at)}
                  </p>
                  <h3 className="mt-1 text-lg font-black leading-6">{notice.title}</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{notice.body}</p>
                  {canManage ? (
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(notice)}
                        className="h-10 rounded-md bg-slate-100 text-sm font-black text-slate-700 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteNotice(notice)}
                        className="grid h-10 w-10 place-items-center rounded-md bg-rose-600 text-white disabled:opacity-60"
                        aria-label="お知らせ削除"
                        title="お知らせ削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  required
}: {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <input
        name={name}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  rows,
  value,
  onChange,
  required
}: {
  label: string;
  name: string;
  rows: number;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <textarea
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
        className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-3 text-base leading-6 outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}
