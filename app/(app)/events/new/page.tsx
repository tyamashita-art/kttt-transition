"use client";

import { CalendarPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NewEventPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("events")
      .insert({
        title: String(formData.get("title") || ""),
        start_at: new Date(String(formData.get("start_at"))).toISOString(),
        end_at: String(formData.get("end_at") || "")
          ? new Date(String(formData.get("end_at"))).toISOString()
          : null,
        location: String(formData.get("location") || ""),
        description: String(formData.get("description") || ""),
        created_by: userId
      })
      .select("id")
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.replace(`/events/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-2xl font-black">イベント作成</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">作成するとイベントチャットも自動でできます。</p>
      </section>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input name="title" label="タイトル" required />
        <Input name="start_at" label="開始日時" type="datetime-local" required />
        <Input name="end_at" label="終了日時" type="datetime-local" />
        <Input name="location" label="場所" />
        <Textarea name="description" label="説明" rows={5} />

        {error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <CalendarPlus size={18} />}
          作成する
        </button>
      </form>
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  required
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}

function Textarea({ label, name, rows }: { label: string; name: string; rows: number }) {
  return (
    <label className="block text-sm font-black">
      {label}
      <textarea
        name={name}
        rows={rows}
        className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-3 text-base leading-6 outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}
