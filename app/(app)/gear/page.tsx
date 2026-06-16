"use client";

import { CheckCircle2, ClipboardList, Filter, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { LoadingCard } from "@/components/loading-card";
import { StatusPill, statusTone } from "@/components/status-pill";
import {
  gearCategoryGroupNames,
  gearRequestStatusLabels,
  getGearCategoryItems,
  itemStatusLabels
} from "@/lib/constants";
import type { Database, GearRequestStatus } from "@/lib/database.types";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Item = Database["public"]["Tables"]["items"]["Row"] & {
  owner?: {
    display_name: string | null;
    nickname: string | null;
  } | null;
};
type GearRequest = Database["public"]["Tables"]["gear_requests"]["Row"] & {
  profile?: {
    id: string;
    display_name: string | null;
    nickname: string | null;
  } | null;
};

export default function GearPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [requests, setRequests] = useState<GearRequest[]>([]);
  const [tab, setTab] = useState<"items" | "requests">("items");
  const [categoryGroup, setCategoryGroup] = useState("すべて");
  const [categoryItem, setCategoryItem] = useState("すべて");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const [profileResult, itemsResult, requestsResult] = await Promise.all([
      userId
        ? supabase.from("profiles").select("*").eq("id", userId).single()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("items")
        .select("*, owner:profiles!items_owner_id_fkey(display_name,nickname)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("gear_requests")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
    ]);

    if (profileResult.error) setError(profileResult.error.message);
    if (itemsResult.error) setError(itemsResult.error.message);
    if (requestsResult.error) setError(requestsResult.error.message);

    const requestRows = (requestsResult.data || []) as GearRequest[];
    const requestUserIds = Array.from(new Set(requestRows.map((request) => request.user_id)));
    const requestProfilesResult =
      requestUserIds.length > 0
        ? await supabase.from("profiles").select("id,display_name,nickname").in("id", requestUserIds)
        : { data: [] };
    const requestProfileMap = new Map(
      (requestProfilesResult.data || []).map((requestProfile) => [requestProfile.id, requestProfile])
    );

    setProfile(profileResult.data as Profile | null);
    setItems((itemsResult.data || []) as unknown as Item[]);
    setRequests(
      requestRows.map((request) => ({
        ...request,
        profile: requestProfileMap.get(request.user_id) || null
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const categoryItems = categoryGroup === "すべて" ? [] : getGearCategoryItems(categoryGroup);
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const group = item.category_group || "その他";
      const child = item.category_item || item.category || "その他";
      return (
        (categoryGroup === "すべて" || group === categoryGroup) &&
        (categoryItem === "すべて" || child === categoryItem)
      );
    });
  }, [categoryGroup, categoryItem, items]);

  async function createGearRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
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

    setBusy(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("gear_requests").insert({
      user_id: profile.id,
      title,
      detail,
      desired_start_date: desiredStartDate || null,
      desired_end_date: desiredEndDate || null
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    form.reset();
    setMessage("借りたいギアを投稿しました。");
    await load();
  }

  async function updateRequest(request: GearRequest, status: GearRequestStatus) {
    await run(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("gear_requests")
        .update({ status })
        .eq("id", request.id);
      if (updateError) throw updateError;
    }, status === "resolved" ? "解決済みにしました。" : "募集中に戻しました。");
  }

  async function deleteRequest(request: GearRequest) {
    if (!window.confirm("この投稿を削除しますか？")) return;
    await run(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("gear_requests")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", request.id);
      if (updateError) throw updateError;
    }, "投稿を削除しました。");
  }

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
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

  return (
    <div className="space-y-4">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">ギア</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">貸したい機材、借りたい機材をチーム内で回す。</p>
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

      <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1 dark:bg-slate-900">
        <TabButton active={tab === "items"} onClick={() => setTab("items")} icon={<ShoppingBag size={16} />} label="貸したいギア" />
        <TabButton active={tab === "requests"} onClick={() => setTab("requests")} icon={<ClipboardList size={16} />} label="借りたい投稿" />
      </div>

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

      {tab === "items" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Filter size={17} className="text-slate-400" />
              <select
                value={categoryGroup}
                onChange={(event) => {
                  setCategoryGroup(event.target.value);
                  setCategoryItem("すべて");
                }}
                className="h-9 min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
              >
                <option>すべて</option>
                {gearCategoryGroupNames.map((group) => (
                  <option key={group}>{group}</option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <select
                value={categoryItem}
                disabled={categoryGroup === "すべて"}
                onChange={(event) => setCategoryItem(event.target.value)}
                className="h-9 min-w-0 flex-1 bg-transparent text-sm font-bold outline-none disabled:text-slate-400"
              >
                <option>すべて</option>
                {categoryItems.map((child) => (
                  <option key={child}>{child}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? <LoadingCard /> : null}
          {!loading && filteredItems.length === 0 ? <EmptyState title="登録ギアがありません" body="最初の機材を登録しましょう。" /> : null}

          <div className="grid gap-3">
            {filteredItems.map((item) => (
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
                      {item.is_lendable ? (
                        <StatusPill label={itemStatusLabels[item.status]} tone={statusTone(item.status)} />
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-bold text-accent dark:text-red-300">
                      {item.category_group || "その他"} / {item.category_item || item.category}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.is_lendable ? <MiniBadge label="貸出可" /> : null}
                      {item.is_sellable ? (
                        <MiniBadge label={`販売可 ${item.sale_price ? `${item.sale_price.toLocaleString()}円` : "価格相談"}`} />
                      ) : null}
                    </div>
                    <p className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">
                      所有者: {item.owner?.nickname || item.owner?.display_name || "未設定"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <>
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-black">こんなギアを借りたい</h3>
            <form onSubmit={createGearRequest} className="mt-3 space-y-3">
              <Input name="title" label="タイトル" placeholder="DHバーを借りたい" required />
              <Textarea name="detail" label="詳細" rows={3} placeholder="大会までの練習で使いたい、サイズ感を試したい、など" />
              <div className="grid grid-cols-2 gap-3">
                <Input name="desired_start_date" label="希望開始" type="date" />
                <Input name="desired_end_date" label="希望終了" type="date" />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
              >
                <Plus size={17} />
                投稿する
              </button>
            </form>
          </section>

          {loading ? <LoadingCard /> : null}
          {!loading && requests.length === 0 ? <EmptyState title="借りたい投稿はありません" body="探している機材を投稿できます。" /> : null}

          <div className="grid gap-3">
            {requests.map((request) => {
              const canManage = profile && (profile.id === request.user_id || profile.role === "admin");
              return (
                <article
                  key={request.id}
                  className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-accent dark:text-red-300">
                        {request.profile?.nickname || request.profile?.display_name || "メンバー"}
                      </p>
                      <h3 className="mt-1 text-lg font-black leading-6">{request.title}</h3>
                    </div>
                    <StatusPill label={gearRequestStatusLabels[request.status]} tone={request.status === "open" ? "amber" : "slate"} />
                  </div>
                  {request.detail ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{request.detail}</p>
                  ) : null}
                  <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                    希望期間: {formatDate(request.desired_start_date)} - {formatDate(request.desired_end_date)}
                  </p>
                  {canManage ? (
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateRequest(request, request.status === "open" ? "resolved" : "open")}
                        className="flex h-10 items-center justify-center gap-2 rounded-md bg-slate-100 text-sm font-black text-slate-700 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <CheckCircle2 size={16} />
                        {request.status === "open" ? "解決済みにする" : "募集中に戻す"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteRequest(request)}
                        className="grid h-10 w-10 place-items-center rounded-md bg-rose-600 text-white disabled:opacity-60"
                        aria-label="投稿削除"
                        title="投稿削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-black ${
        active ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MiniBadge({ label }: { label: string }) {
  return <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">{label}</span>;
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
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
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
        className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-3 text-base leading-6 outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}
