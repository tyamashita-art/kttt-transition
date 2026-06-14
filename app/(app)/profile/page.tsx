"use client";

import { Loader2, Save, Upload } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { LoadingCard } from "@/components/loading-card";
import { uploadPublicImage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      setProfile(profileData || null);
      setLoading(false);
    });
  }, []);

  async function onAvatarChange(file?: File) {
    if (!file || !profile) return;
    setError(null);
    setSaving(true);
    try {
      const avatarUrl = await uploadPublicImage({ bucket: "avatars", userId: profile.id, file });
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", profile.id)
        .select()
        .single();
      if (updateError) throw updateError;
      setProfile(data);
      setMessage("プロフィール写真を更新しました。");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "アップロードに失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: String(formData.get("display_name") || ""),
        nickname: String(formData.get("nickname") || ""),
        first_triathlon_date: String(formData.get("first_triathlon_date") || "") || null,
        yearly_goal: String(formData.get("yearly_goal") || ""),
        planned_races: String(formData.get("planned_races") || ""),
        bio: String(formData.get("bio") || "")
      })
      .eq("id", profile.id)
      .select()
      .single();

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProfile(data);
    setMessage("プロフィールを保存しました。");
  }

  if (loading || !profile) return <LoadingCard />;

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-2xl font-black">プロフィール</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">練習前にも片手で更新できる入力量にしています。</p>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <Avatar url={profile.avatar_url} name={profile.display_name} email={profile.email} size="lg" />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-slate-900 px-4 py-3 text-sm font-black text-white active:scale-[0.99] dark:bg-red-500 dark:text-white">
            <Upload size={17} />
            写真を変更
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => onAvatarChange(event.target.files?.[0])}
            />
          </label>
        </div>
      </section>

      <form onSubmit={onSubmit} className="space-y-4">
        <TextInput name="display_name" label="名前" defaultValue={profile.display_name || ""} required />
        <TextInput name="nickname" label="ニックネーム" defaultValue={profile.nickname || ""} />
        <TextInput
          name="first_triathlon_date"
          label="トライアスロン初レース日"
          type="date"
          defaultValue={profile.first_triathlon_date || ""}
        />
        <TextArea name="yearly_goal" label="今年の目標" defaultValue={profile.yearly_goal || ""} rows={3} />
        <TextArea name="planned_races" label="出場予定大会" defaultValue={profile.planned_races || ""} rows={3} />
        <TextArea name="bio" label="自己紹介" defaultValue={profile.bio || ""} rows={5} />

        {error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-200">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          保存
        </button>
      </form>
    </div>
  );
}

function TextInput({
  label,
  name,
  type = "text",
  defaultValue,
  required
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-accent transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-3 text-base leading-6 outline-none ring-accent transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}
