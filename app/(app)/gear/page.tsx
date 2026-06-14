"use client";

import { Filter, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { LoadingCard } from "@/components/loading-card";
import { StatusPill, statusTone } from "@/components/status-pill";
import { itemCategories, itemStatusLabels } from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

type Item = Database["public"]["Tables"]["items"]["Row"] & {
  owner?: {
    display_name: string | null;
    nickname: string | null;
  } | null;
};

export default function GearPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState("すべて");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("items")
      .select("*, owner:profiles!items_owner_id_fkey(display_name,nickname)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data || []) as unknown as Item[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (category === "すべて") return items;
    return items.filter((item) => item.category === category);
  }, [category, items]);

  return (
    <div className="space-y-4">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">ギア</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">眠っている機材をチーム内で安全に回す。</p>
        </div>
        <Link
          href="/gear/new"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-slate-900 text-white shadow-sm active:scale-95 dark:bg-red-500 dark:text-white"
          aria-label="ギア登録"
          title="ギア登録"
        >
          <Plus size={21} />
        </Link>
      </section>

      <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Filter size={17} className="text-slate-400" />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-9 min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
        >
          <option>すべて</option>
          {itemCategories.map((itemCategory) => (
            <option key={itemCategory}>{itemCategory}</option>
          ))}
        </select>
      </label>

      {loading ? <LoadingCard /> : null}
      {!loading && filtered.length === 0 ? <EmptyState title="登録ギアがありません" body="最初の機材を登録しましょう。" /> : null}

      <div className="grid gap-3">
        {filtered.map((item) => (
          <Link
            key={item.id}
            href={`/gear/${item.id}`}
            className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex gap-3 p-3">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-xs font-black text-slate-400">NO IMAGE</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 font-black leading-5">{item.name}</h3>
                  <StatusPill label={itemStatusLabels[item.status]} tone={statusTone(item.status)} />
                </div>
                <p className="mt-2 text-sm font-bold text-accent dark:text-red-300">{item.category}</p>
                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                  所有者: {item.owner?.nickname || item.owner?.display_name || "未設定"}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                  {item.description || item.condition || "説明はまだありません。"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
