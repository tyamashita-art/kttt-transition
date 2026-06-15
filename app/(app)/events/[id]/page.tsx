"use client";

import { Check, HelpCircle, Loader2, MessageCircle, Save, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ChatRoom } from "@/components/chat-room";
import { LoadingCard } from "@/components/loading-card";
import { StatusPill, statusTone } from "@/components/status-pill";
import { participantStatusLabels } from "@/lib/constants";
import type { Database, EventParticipantStatus } from "@/lib/database.types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Participant = Database["public"]["Tables"]["event_participants"]["Row"] & {
  profile?: {
    display_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
};
type ChatRoomRow = Database["public"]["Tables"]["chat_rooms"]["Row"];

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [room, setRoom] = useState<ChatRoomRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const userResult = await supabase.auth.getUser();
    const userId = userResult.data.user?.id;

    const [eventResult, profileResult, participantsResult, roomResult] = await Promise.all([
      supabase.from("events").select("*").eq("id", params.id).is("deleted_at", null).single(),
      userId ? supabase.from("profiles").select("*").eq("id", userId).single() : Promise.resolve({ data: null }),
      supabase
        .from("event_participants")
        .select("*, profile:profiles!event_participants_user_id_fkey(display_name,nickname,avatar_url,email)")
        .eq("event_id", params.id),
      supabase
        .from("chat_rooms")
        .select("*")
        .eq("room_type", "event")
        .eq("related_id", params.id)
        .is("deleted_at", null)
        .maybeSingle()
    ]);

    setEvent(eventResult.data);
    setProfile(profileResult.data as Profile | null);
    setParticipants((participantsResult.data || []) as unknown as Participant[]);
    setRoom(roomResult.data);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const currentParticipation = useMemo(
    () => participants.find((participant) => participant.user_id === profile?.id),
    [participants, profile?.id]
  );
  const canManage = Boolean(profile && event && (profile.id === event.created_by || profile.role === "admin"));
  const goingCount = participants.filter((participant) => participant.status === "going").length;

  async function setParticipation(status: EventParticipantStatus) {
    if (!profile || !event) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: upsertError } = await supabase.from("event_participants").upsert(
      {
        event_id: event.id,
        user_id: profile.id,
        status
      },
      { onConflict: "event_id,user_id" }
    );
    setBusy(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    await load();
  }

  async function updateEvent(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    if (!event) return;
    const formData = new FormData(eventForm.currentTarget);
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("events")
      .update({
        title: String(formData.get("title") || ""),
        start_at: new Date(String(formData.get("start_at"))).toISOString(),
        end_at: String(formData.get("end_at") || "")
          ? new Date(String(formData.get("end_at"))).toISOString()
          : null,
        location: String(formData.get("location") || ""),
        description: String(formData.get("description") || "")
      })
      .eq("id", event.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  async function deleteEvent() {
    if (!event) return;
    if (!window.confirm("このイベントを削除しますか？")) return;
    setBusy(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.rpc("delete_event", { p_event_id: event.id });
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.replace("/events");
    router.refresh();
  }

  if (loading) return <LoadingCard />;
  if (!event || !profile) return <p className="text-sm font-bold text-slate-500">イベントが見つかりません。</p>;

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-black text-accent dark:text-red-300">{formatDateTime(event.start_at)}</p>
        <h2 className="mt-1 text-2xl font-black leading-7">{event.title}</h2>
        <p className="mt-2 font-bold text-slate-600 dark:text-slate-300">{event.location || "場所未定"}</p>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
          {event.description || "説明はまだありません。"}
        </p>
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm font-black dark:bg-slate-950">
          参加予定 {goingCount}人
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-black">参加表明</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <RsvpButton
            active={currentParticipation?.status === "going"}
            icon={<Check size={17} />}
            label="参加"
            disabled={busy}
            onClick={() => setParticipation("going")}
          />
          <RsvpButton
            active={currentParticipation?.status === "maybe"}
            icon={<HelpCircle size={17} />}
            label="未定"
            disabled={busy}
            onClick={() => setParticipation("maybe")}
          />
          <RsvpButton
            active={currentParticipation?.status === "not_going"}
            icon={<X size={17} />}
            label="不参加"
            disabled={busy}
            onClick={() => setParticipation("not_going")}
          />
        </div>
        {error ? (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-black">参加者</h3>
        <div className="mt-3 space-y-3">
          {participants.length === 0 ? (
            <p className="text-sm font-bold text-slate-500">まだ参加表明がありません。</p>
          ) : (
            participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    url={participant.profile?.avatar_url}
                    name={participant.profile?.display_name}
                    email={participant.profile?.email}
                    size="sm"
                  />
                  <p className="min-w-0 truncate font-black">
                    {participant.profile?.nickname || participant.profile?.display_name || "メンバー"}
                  </p>
                </div>
                <StatusPill
                  label={participantStatusLabels[participant.status]}
                  tone={statusTone(participant.status)}
                />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-black">
          <MessageCircle size={18} />
          イベントチャット
        </h3>
        {room ? (
          <ChatRoom roomId={room.id} currentUserId={profile.id} compact />
        ) : (
          <p className="rounded-md border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            チャットルーム作成待ちです。
          </p>
        )}
      </section>

      {canManage ? (
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-black">イベント編集</h3>
          <form onSubmit={updateEvent} className="mt-3 space-y-3">
            <Input name="title" label="タイトル" defaultValue={event.title} required />
            <Input name="start_at" label="開始日時" type="datetime-local" defaultValue={toLocalInput(event.start_at)} required />
            <Input name="end_at" label="終了日時" type="datetime-local" defaultValue={toLocalInput(event.end_at)} />
            <Input name="location" label="場所" defaultValue={event.location || ""} />
            <Textarea name="description" label="説明" rows={4} defaultValue={event.description || ""} />
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <button
                type="submit"
                disabled={busy}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white disabled:opacity-60 dark:bg-red-500 dark:text-white"
              >
                {busy ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                保存
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={deleteEvent}
                className="grid h-11 w-11 place-items-center rounded-md bg-rose-600 text-white disabled:opacity-60"
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

function RsvpButton({
  active,
  icon,
  label,
  disabled,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-12 items-center justify-center gap-1 rounded-md text-sm font-black transition active:scale-[0.99] disabled:opacity-60 ${
        active
          ? "bg-slate-900 text-white dark:bg-red-500 dark:text-white"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
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
    <label className="block text-sm font-black">
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

function Textarea({
  label,
  name,
  rows,
  defaultValue
}: {
  label: string;
  name: string;
  rows: number;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-3 text-base leading-6 outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}
