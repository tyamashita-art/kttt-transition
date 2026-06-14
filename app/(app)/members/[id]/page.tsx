"use client";

import { Calendar, Flag, NotebookText, Trophy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { LoadingCard } from "@/components/loading-card";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";
import { formatDate } from "@/lib/format";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("*").eq("id", params.id).single(),
      supabase.auth.getUser()
    ]).then(([profileResult, userResult]) => {
      setProfile(profileResult.data || null);
      setCurrentUserId(userResult.data.user?.id || null);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) return <LoadingCard />;
  if (!profile) return <p className="text-sm font-bold text-slate-500">メンバーが見つかりません。</p>;

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <Avatar url={profile.avatar_url} name={profile.display_name} email={profile.email} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black">{profile.display_name || "名前未設定"}</h2>
            <p className="mt-1 font-bold text-cyan-600 dark:text-cyan-300">
              {profile.nickname ? `@${profile.nickname}` : profile.email}
            </p>
            {currentUserId === profile.id ? (
              <Link
                href="/profile"
                className="mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-black text-white dark:bg-cyan-400 dark:text-slate-950"
              >
                プロフィール編集
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <InfoBlock icon={<Calendar size={18} />} title="トライアスロン初レース日">
        {formatDate(profile.first_triathlon_date)}
      </InfoBlock>
      <InfoBlock icon={<Trophy size={18} />} title="今年の目標">
        {profile.yearly_goal || "未設定"}
      </InfoBlock>
      <InfoBlock icon={<Flag size={18} />} title="出場予定大会">
        {profile.planned_races || "未設定"}
      </InfoBlock>
      <InfoBlock icon={<NotebookText size={18} />} title="自己紹介">
        {profile.bio || "未設定"}
      </InfoBlock>
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  children
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-500 dark:text-slate-400">
        {icon}
        {title}
      </div>
      <p className="whitespace-pre-wrap text-base leading-7">{children}</p>
    </section>
  );
}
