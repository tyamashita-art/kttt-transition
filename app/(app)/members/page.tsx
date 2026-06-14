"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import { LoadingCard } from "@/components/loading-card";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function MembersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .order("display_name", { ascending: true })
      .then(({ data }) => {
        setProfiles(data || []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return profiles;
    return profiles.filter((profile) =>
      [profile.display_name, profile.nickname, profile.yearly_goal, profile.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized))
    );
  }, [profiles, query]);

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-2xl font-black">メンバー</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">チームの顔と今年の目標をすばやく確認。</p>
      </section>

      <label className="flex h-12 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Search size={18} className="text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="名前、ニックネーム、目標で検索"
          className="min-w-0 flex-1 bg-transparent text-base outline-none"
        />
      </label>

      {loading ? <LoadingCard /> : null}

      {!loading && filtered.length === 0 ? <EmptyState title="メンバーが見つかりません" /> : null}

      <div className="grid gap-3">
        {filtered.map((profile) => (
          <Link
            key={profile.id}
            href={`/members/${profile.id}`}
            className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm transition active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
          >
            <Avatar url={profile.avatar_url} name={profile.display_name} email={profile.email} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-black">{profile.display_name || "名前未設定"}</h3>
                {profile.role === "admin" ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700 dark:bg-red-950 dark:text-red-200">
                    admin
                  </span>
                ) : null}
              </div>
              <p className="truncate text-sm font-bold text-slate-500 dark:text-slate-400">
                {profile.nickname ? `@${profile.nickname}` : "ニックネーム未設定"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                {profile.yearly_goal || "今年の目標はまだ未設定です。"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
