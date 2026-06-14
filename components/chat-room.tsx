"use client";

import { Loader2, SendHorizonal } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import type { Database } from "@/lib/database.types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Message = Database["public"]["Tables"]["chat_messages"]["Row"] & {
  profile?: {
    display_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
};

export function ChatRoom({
  roomId,
  currentUserId,
  compact = false
}: {
  roomId: string;
  currentUserId: string;
  compact?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    async function loadMessages() {
      const { data, error: loadError } = await supabase
        .from("chat_messages")
        .select("*, profile:profiles!chat_messages_user_id_fkey(display_name,nickname,avatar_url,email)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!alive) return;
      if (loadError) {
        setError(loadError.message);
      } else {
        setMessages((data || []) as unknown as Message[]);
      }
      setLoading(false);
    }

    loadMessages();

    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          const next = payload.new as Database["public"]["Tables"]["chat_messages"]["Row"];
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name,nickname,avatar_url,email")
            .eq("id", next.user_id)
            .single();
          setMessages((current) => {
            if (current.some((message) => message.id === next.id)) return current;
            return [...current, { ...next, profile }];
          });
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const message = String(formData.get("message") || "").trim();
    if (!message) return;

    setSending(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      user_id: currentUserId,
      message
    });
    setSending(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    form.reset();
  }

  return (
    <div className="flex min-h-[520px] flex-col rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`${compact ? "max-h-[360px]" : "max-h-[58dvh]"} min-h-[280px] flex-1 overflow-y-auto p-3`}>
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm font-black text-slate-500">
            <Loader2 className="mr-2 animate-spin" size={18} />
            読み込み中
          </div>
        ) : null}

        {!loading && messages.length === 0 ? (
          <EmptyState title="まだメッセージがありません" body="最初の一言を送って流れを作りましょう。" />
        ) : null}

        <div className="space-y-3">
          {messages.map((message) => {
            const mine = message.user_id === currentUserId;
            return (
              <div key={message.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine ? (
                  <Avatar
                    url={message.profile?.avatar_url}
                    name={message.profile?.display_name}
                    email={message.profile?.email}
                    size="sm"
                  />
                ) : null}
                <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="mb-1 text-[11px] font-bold text-slate-400">
                    {mine ? "自分" : message.profile?.nickname || message.profile?.display_name || "メンバー"}
                  </div>
                  <div
                    className={`rounded-md px-3 py-2 text-sm leading-6 ${
                      mine
                        ? "bg-cyan-500 font-bold text-slate-950"
                        : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.message}</p>
                  </div>
                  <time className="mt-1 text-[10px] font-bold text-slate-400">
                    {formatDateTime(message.created_at)}
                  </time>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {error ? (
        <p className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <input
          name="message"
          placeholder="メッセージ"
          className="h-11 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-cyan-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="submit"
          disabled={sending}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-slate-900 text-white active:scale-95 disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950"
          aria-label="送信"
          title="送信"
        >
          {sending ? <Loader2 className="animate-spin" size={18} /> : <SendHorizonal size={19} />}
        </button>
      </form>
    </div>
  );
}
