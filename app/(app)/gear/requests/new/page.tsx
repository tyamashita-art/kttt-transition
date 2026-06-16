"use client";

import { ArrowLeft, ClipboardList, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NewGearRequestPage() {
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

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") || "").trim();
    const detail = String(formData.get("detail") || "").trim();
    const desiredStartDate = String(formData.get("desired_start_date") || "");
    const desiredEndDate = String(formData.get("desired_end_date") || "");

    if (!title) {
      setError("タイトルを入力してください。");
      return;
    }

    if (desiredStartDate && desiredEndDate && desiredStartDate > desiredEndDate) {
      setError("希望開始日は希望終了日より前の日付にしてください。");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("gear_requests").insert({
      user_id: userId,
      title,
      detail,
      desired_start_date: desiredStartDate || null,
      desired_end_date: desiredEndDate || null
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.replace("/gear?tab=requests&created=request");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="flex items-start gap-3">
        <Link
          href="/gear?tab=requests"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white text-slate-700 ring-1 ring-slate-200 active:scale-95 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
          aria-label="戻る"
          title="戻る"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-accent dark:text-red-300">
            <ClipboardList size={16} />
            借りたい投稿
          </p>
          <h2 className="mt-1 text-2xl font-black">探しているギアを書く</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">例: DHバーを借りたい、輪行袋を探している。</p>
        </div>
      </section>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input name="title" label="タイトル" placeholder="DHバーを借りたい" required />
        <Textarea name="detail" label="詳細" rows={5} placeholder="用途、希望サイズ、使いたい大会や練習日など" />
        <div className="grid grid-cols-2 gap-3">
          <Input name="desired_start_date" label="希望開始" type="date" />
          <Input name="desired_end_date" label="希望終了" type="date" />
        </div>

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
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          投稿する
        </button>
      </form>
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  placeholder,
  required
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  rows,
  placeholder
}: {
  label: string;
  name: string;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-3 text-base leading-6 outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}
