"use client";

import { Check, Loader2, MessageCircle, Save, Trash2, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { LoadingCard } from "@/components/loading-card";
import { StatusPill, statusTone } from "@/components/status-pill";
import {
  availableTypeLabels,
  availableTypeOptions,
  gearCategoryGroupNames,
  getGearCategoryItems,
  itemStatusLabels,
  itemStatusOptions,
  maxRentalMonthOptions,
  rentalStatusLabels,
  transportMethods
} from "@/lib/constants";
import type { Database, RentalStatus } from "@/lib/database.types";
import { formatDate } from "@/lib/format";
import { uploadPublicImage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

type Item = Database["public"]["Tables"]["items"]["Row"] & {
  owner?: {
    id: string;
    display_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
};

type RentalRequest = Database["public"]["Tables"]["rental_requests"]["Row"] & {
  requester?: {
    display_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
};

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ChatRoom = Database["public"]["Tables"]["chat_rooms"]["Row"];

export default function GearDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [editCategoryGroup, setEditCategoryGroup] = useState("その他");
  const [editCategoryItem, setEditCategoryItem] = useState("その他");
  const [editLendable, setEditLendable] = useState(true);
  const [editSellable, setEditSellable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const userResult = await supabase.auth.getUser();
    const userId = userResult.data.user?.id;

    const [itemResult, profileResult, requestsResult] = await Promise.all([
      supabase
        .from("items")
        .select("*, owner:profiles!items_owner_id_fkey(id,display_name,nickname,avatar_url,email)")
        .eq("id", params.id)
        .is("deleted_at", null)
        .single(),
      userId ? supabase.from("profiles").select("*").eq("id", userId).single() : Promise.resolve({ data: null }),
      supabase
        .from("rental_requests")
        .select("*, requester:profiles!rental_requests_requester_id_fkey(display_name,nickname,avatar_url,email)")
        .eq("item_id", params.id)
        .order("created_at", { ascending: false })
    ]);

    const roomIds = (requestsResult.data || []).map((request) => request.id);
    const roomsResult =
      roomIds.length > 0
        ? await supabase.from("chat_rooms").select("*").eq("room_type", "rental").in("related_id", roomIds)
        : { data: [] };

    const nextItem = itemResult.data as unknown as Item | null;
    setItem(nextItem);
    if (nextItem) {
      setEditCategoryGroup(nextItem.category_group || "その他");
      setEditCategoryItem(nextItem.category_item || nextItem.category || "その他");
      setEditLendable(nextItem.is_lendable);
      setEditSellable(nextItem.is_sellable);
    }
    setProfile(profileResult.data as Profile | null);
    setRequests((requestsResult.data || []) as unknown as RentalRequest[]);
    setRooms((roomsResult.data || []) as ChatRoom[]);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = Boolean(profile && item && (profile.id === item.owner_id || profile.role === "admin"));
  const userRequest = useMemo(
    () => requests.find((request) => request.requester_id === profile?.id && request.status !== "returned"),
    [profile?.id, requests]
  );

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "処理に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function requestRental(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) return;
    const formData = new FormData(event.currentTarget);
    await runAction(async () => {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("request_item", {
        p_item_id: item.id,
        p_requested_start_date: String(formData.get("requested_start_date")),
        p_requested_end_date: String(formData.get("requested_end_date")),
        p_message: String(formData.get("message") || ""),
        p_transport_method: String(formData.get("transport_method") || "")
      });
      if (rpcError) throw rpcError;
    }, "貸出申請を送信しました。");
  }

  async function approveRequest(requestId: string, form: HTMLFormElement) {
    const formData = new FormData(form);
    await runAction(async () => {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("approve_rental_request", {
        p_request_id: requestId,
        p_approved_start_date: String(formData.get("approved_start_date")),
        p_approved_end_date: String(formData.get("approved_end_date")),
        p_owner_note: String(formData.get("owner_note") || ""),
        p_transport_method: String(formData.get("transport_method") || "")
      });
      if (rpcError) throw rpcError;
    }, "貸出申請を承認しました。");
  }

  async function rejectRequest(requestId: string, ownerNote: string) {
    await runAction(async () => {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("reject_rental_request", {
        p_request_id: requestId,
        p_owner_note: ownerNote
      });
      if (rpcError) throw rpcError;
    }, "貸出申請を却下しました。");
  }

  async function requestReturn(requestId: string) {
    await runAction(async () => {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("request_rental_return", { p_request_id: requestId });
      if (rpcError) throw rpcError;
    }, "返却完了申請を送信しました。");
  }

  async function confirmReturn(requestId: string) {
    await runAction(async () => {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("confirm_rental_return", { p_request_id: requestId });
      if (rpcError) throw rpcError;
    }, "返却を確認しました。");
  }

  async function updateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || !profile) return;
    const formData = new FormData(event.currentTarget);
    const file = formData.get("image");
    const lendable = formData.get("is_lendable") === "on";
    const sellable = formData.get("is_sellable") === "on";
    const salePriceValue = String(formData.get("sale_price") || "").trim();

    if (!lendable && !sellable) {
      setError("貸出可または販売可を少なくとも1つ選んでください。");
      return;
    }

    await runAction(async () => {
      const imageUrl =
        file instanceof File && file.size > 0
          ? await uploadPublicImage({ bucket: "item-images", userId: profile.id, file })
          : item.image_url;
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("items")
        .update({
          name: String(formData.get("name") || ""),
          category: editCategoryItem,
          category_group: editCategoryGroup,
          category_item: editCategoryItem,
          description: String(formData.get("description") || ""),
          image_url: imageUrl,
          condition: String(formData.get("condition") || ""),
          status: lendable ? (String(formData.get("status") || item.status) as never) : "unavailable",
          is_lendable: lendable,
          is_sellable: sellable,
          sale_price: sellable && salePriceValue ? Number(salePriceValue) : null,
          available_type: String(formData.get("available_type") || "anytime") as never,
          available_from: String(formData.get("available_from") || "") || null,
          available_until: String(formData.get("available_until") || "") || null,
          max_rental_months: Number(formData.get("max_rental_months") || 6),
          transport_method: String(formData.get("transport_method") || "要相談"),
          transport_note: String(formData.get("transport_note") || "")
        })
        .eq("id", item.id);
      if (updateError) throw updateError;
    }, "ギア情報を保存しました。");
  }

  async function deleteItem() {
    if (!item) return;
    if (!window.confirm("このギアを削除しますか？")) return;
    setBusy(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.rpc("delete_item", { p_item_id: item.id });
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.replace("/gear");
    router.refresh();
  }

  if (loading) return <LoadingCard />;
  if (!item) return <p className="text-sm font-bold text-slate-500">ギアが見つかりません。</p>;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm font-black text-slate-400">NO IMAGE</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-accent dark:text-red-300">
                {item.category_group || "その他"} / {item.category_item || item.category}
              </p>
              <h2 className="mt-1 text-2xl font-black leading-7">{item.name}</h2>
            </div>
            {item.is_lendable ? <StatusPill label={itemStatusLabels[item.status]} tone={statusTone(item.status)} /> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.is_lendable ? <MiniBadge label="貸出可" /> : null}
            {item.is_sellable ? (
              <MiniBadge label={`販売可 ${item.sale_price ? `${item.sale_price.toLocaleString()}円` : "価格相談"}`} />
            ) : null}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Avatar
              url={item.owner?.avatar_url}
              name={item.owner?.display_name}
              email={item.owner?.email}
              size="sm"
            />
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">所有者</p>
              <p className="font-black">{item.owner?.nickname || item.owner?.display_name || "未設定"}</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
            {item.description || "説明はまだありません。"}
          </p>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-black">貸出条件</h3>
        <div className="mt-3 grid gap-2 text-sm">
          <Row label="状態" value={item.condition || "未設定"} />
          <Row label="掲載タイプ" value={`${item.is_lendable ? "貸出可" : ""}${item.is_lendable && item.is_sellable ? " / " : ""}${item.is_sellable ? "販売可" : ""}`} />
          <Row label="販売価格" value={item.is_sellable ? (item.sale_price ? `${item.sale_price.toLocaleString()}円` : "価格相談") : "販売なし"} />
          <Row label="貸出タイプ" value={availableTypeLabels[item.available_type] || item.available_type} />
          <Row label="貸出可能期間" value={`${formatDate(item.available_from)} - ${formatDate(item.available_until)}`} />
          <Row label="最大貸出期間" value={`${item.max_rental_months}ヶ月`} />
          <Row label="受け渡し方法" value={item.transport_method} />
          <Row label="備考" value={item.transport_note || "未設定"} />
        </div>
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

      {!canManage && item.is_lendable && item.status === "available" && !userRequest ? (
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-black">借用申請</h3>
          <form onSubmit={requestRental} className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input name="requested_start_date" label="開始希望" type="date" required />
              <Input name="requested_end_date" label="返却希望" type="date" required />
            </div>
            <Select name="transport_method" label="受け渡し希望" values={transportMethods} />
            <Textarea name="message" label="メッセージ" rows={3} />
            <button
              type="submit"
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
            >
              {busy ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              申請する
            </button>
          </form>
        </section>
      ) : null}

      {userRequest ? (
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-black">自分の申請</h3>
          <RentalSummary request={userRequest} room={rooms.find((room) => room.related_id === userRequest.id)} />
          {(["borrowed", "overdue"] as RentalStatus[]).includes(userRequest.status) ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => requestReturn(userRequest.id)}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
            >
              <Undo2 size={17} />
              返却完了を申請
            </button>
          ) : null}
        </section>
      ) : null}

      {requests.length > 0 && (canManage || userRequest) ? (
        <section className="space-y-3">
          <h3 className="font-black">貸出履歴</h3>
          {requests.map((request) => (
            <RentalCard
              key={request.id}
              request={request}
              room={rooms.find((room) => room.related_id === request.id)}
              canManage={canManage}
              busy={busy}
              onApprove={approveRequest}
              onReject={rejectRequest}
              onConfirmReturn={confirmReturn}
            />
          ))}
        </section>
      ) : null}

      {canManage ? (
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-black">ギア編集</h3>
          <form onSubmit={updateItem} className="mt-3 space-y-3">
            <Input name="name" label="ギア名" defaultValue={item.name} required />
            <div className="grid grid-cols-2 gap-3">
              <Select
                name="category_group"
                label="大カテゴリ"
                values={gearCategoryGroupNames}
                value={editCategoryGroup}
                onChange={(value) => {
                  const nextItem = getGearCategoryItems(value)[0];
                  setEditCategoryGroup(value);
                  setEditCategoryItem(nextItem);
                }}
              />
              <Select
                name="category_item"
                label="小カテゴリ"
                values={getGearCategoryItems(editCategoryGroup)}
                value={editCategoryItem}
                onChange={setEditCategoryItem}
              />
            </div>
            <Input name="image" label="写真" type="file" />
            <Textarea name="description" label="説明" rows={3} defaultValue={item.description || ""} />
            <Textarea name="condition" label="状態" rows={2} defaultValue={item.condition || ""} />
            <section className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-black">掲載タイプ</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <CheckOption name="is_lendable" label="貸出可" checked={editLendable} onChange={setEditLendable} />
                <CheckOption name="is_sellable" label="販売可" checked={editSellable} onChange={setEditSellable} />
              </div>
            </section>
            {editSellable ? (
              <Input
                name="sale_price"
                label="販売価格（円）"
                type="number"
                defaultValue={item.sale_price ? String(item.sale_price) : ""}
              />
            ) : null}
            <OptionSelect
              name="status"
              label="貸出ステータス"
              options={itemStatusOptions}
              defaultValue={item.status}
            />
            <OptionSelect
              name="available_type"
              label="貸出可能タイプ"
              options={availableTypeOptions}
              defaultValue={item.available_type}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input name="available_from" label="開始日" type="date" defaultValue={item.available_from || ""} />
              <Input name="available_until" label="終了日" type="date" defaultValue={item.available_until || ""} />
            </div>
            <OptionSelect
              name="max_rental_months"
              label="最大貸出期間"
              options={maxRentalMonthOptions}
              defaultValue={String(item.max_rental_months)}
            />
            <Select
              name="transport_method"
              label="受け渡し方法"
              values={transportMethods}
              defaultValue={item.transport_method}
            />
            <Textarea name="transport_note" label="受け渡し備考" rows={2} defaultValue={item.transport_note || ""} />
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <button
                type="submit"
                disabled={busy}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
              >
                {busy ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                保存
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={deleteItem}
                className="grid h-11 w-11 place-items-center rounded-md bg-rose-600 text-white active:scale-95 disabled:opacity-60"
                aria-label="削除"
                title="削除"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2">
      <span className="font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="min-w-0 whitespace-pre-wrap font-bold">{value}</span>
    </div>
  );
}

function MiniBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">
      {label}
    </span>
  );
}

function RentalSummary({ request, room }: { request: RentalRequest; room?: ChatRoom }) {
  return (
    <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-950">
      <div className="flex items-center justify-between gap-2">
        <StatusPill label={rentalStatusLabels[request.status]} tone={statusTone(request.status)} />
        {room ? (
          <Link
            href={`/chat?room=${room.id}`}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-xs font-black text-white"
          >
            <MessageCircle size={15} />
            チャット
          </Link>
        ) : null}
      </div>
      <p className="mt-2 font-bold">
        希望: {formatDate(request.requested_start_date)} - {formatDate(request.requested_end_date)}
      </p>
      {request.approved_start_date ? (
        <p className="mt-1 font-bold">
          承認: {formatDate(request.approved_start_date)} - {formatDate(request.approved_end_date)}
        </p>
      ) : null}
    </div>
  );
}

function RentalCard({
  request,
  room,
  canManage,
  busy,
  onApprove,
  onReject,
  onConfirmReturn
}: {
  request: RentalRequest;
  room?: ChatRoom;
  canManage: boolean;
  busy: boolean;
  onApprove: (requestId: string, form: HTMLFormElement) => Promise<void>;
  onReject: (requestId: string, ownerNote: string) => Promise<void>;
  onConfirmReturn: (requestId: string) => Promise<void>;
}) {
  const [ownerNote, setOwnerNote] = useState("");

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            url={request.requester?.avatar_url}
            name={request.requester?.display_name}
            email={request.requester?.email}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate font-black">
              {request.requester?.nickname || request.requester?.display_name || "借り手"}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {formatDate(request.requested_start_date)} - {formatDate(request.requested_end_date)}
            </p>
          </div>
        </div>
        <StatusPill label={rentalStatusLabels[request.status]} tone={statusTone(request.status)} />
      </div>
      {request.message ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{request.message}</p> : null}
      {request.owner_note ? (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 dark:bg-slate-950">{request.owner_note}</p>
      ) : null}
      {room ? (
        <Link
          href={`/chat?room=${room.id}`}
          className="mt-3 inline-flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-xs font-black text-white"
        >
          <MessageCircle size={15} />
          貸出チャット
        </Link>
      ) : null}

      {canManage && request.status === "requested" ? (
        <form
          className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800"
          onSubmit={(event) => {
            event.preventDefault();
            onApprove(request.id, event.currentTarget);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              name="approved_start_date"
              label="開始日"
              type="date"
              defaultValue={request.requested_start_date}
              required
            />
            <Input
              name="approved_end_date"
              label="返却予定"
              type="date"
              defaultValue={request.requested_end_date}
              required
            />
          </div>
          <Select
            name="transport_method"
            label="受け渡し"
            values={transportMethods}
            defaultValue={request.transport_method || "要相談"}
          />
          <Textarea
            name="owner_note"
            label="コメント"
            rows={2}
            defaultValue={ownerNote}
            onChange={(value) => setOwnerNote(value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={busy}
              className="flex h-11 items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white disabled:opacity-60 dark:bg-red-500 dark:text-white"
            >
              <Check size={17} />
              承認
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onReject(request.id, ownerNote)}
              className="flex h-11 items-center justify-center gap-2 rounded-md bg-rose-600 font-black text-white disabled:opacity-60"
            >
              <X size={17} />
              却下
            </button>
          </div>
        </form>
      ) : null}

      {canManage && ["borrowed", "return_requested", "overdue"].includes(request.status) ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onConfirmReturn(request.id)}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
        >
          <Check size={17} />
          返却確認
        </button>
      ) : null}
    </article>
  );
}

function Input({
  label,
  name,
  type = "text",
  defaultValue,
  required
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0 text-sm font-black">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}

function Select({
  label,
  name,
  values,
  defaultValue,
  value,
  onChange
}: {
  label: string;
  name: string;
  values: readonly string[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block min-w-0 text-sm font-black">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckOption({
  name,
  label,
  checked,
  onChange
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex h-11 items-center justify-center rounded-md text-sm font-black ring-1 transition ${
        checked
          ? "bg-slate-900 text-white ring-slate-900 dark:bg-red-500 dark:ring-red-500"
          : "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      {label}
    </label>
  );
}

function OptionSelect({
  label,
  name,
  options,
  defaultValue
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <label className="block min-w-0 text-sm font-black">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  label,
  name,
  rows,
  defaultValue,
  onChange
}: {
  label: string;
  name: string;
  rows: number;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-3 text-base leading-6 outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}
