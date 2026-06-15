"use client";

import { MessageCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChatRoom } from "@/components/chat-room";
import { LoadingCard } from "@/components/loading-card";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Room = Database["public"]["Tables"]["chat_rooms"]["Row"];

export default function ChatPage() {
  const searchParams = useSearchParams();
  const requestedRoomId = searchParams.get("room");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(requestedRoomId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const [profileResult, roomsResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", data.user.id).single(),
        supabase.from("chat_rooms").select("*").is("deleted_at", null).order("created_at", { ascending: true })
      ]);
      const nextRooms = roomsResult.data || [];
      setProfile(profileResult.data);
      setRooms(nextRooms);
      setSelectedRoomId((current) => current || requestedRoomId || nextRooms[0]?.id || null);
      setLoading(false);
    });
  }, [requestedRoomId]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || rooms[0],
    [rooms, selectedRoomId]
  );

  if (loading || !profile) return <LoadingCard />;

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-2xl font-black">チャット</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">チーム、イベント、貸出案件ごとのリアルタイム会話。</p>
      </section>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => setSelectedRoomId(room.id)}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-black transition active:scale-95 ${
              selectedRoom?.id === room.id
                ? "bg-slate-900 text-white dark:bg-red-500 dark:text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"
            }`}
          >
            <MessageCircle size={16} />
            {room.title || roomLabel(room.room_type)}
          </button>
        ))}
      </div>

      {selectedRoom ? (
        <ChatRoom roomId={selectedRoom.id} currentUserId={profile.id} />
      ) : (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          参加できるチャットルームがありません。
        </p>
      )}
    </div>
  );
}

function roomLabel(roomType: Room["room_type"]) {
  if (roomType === "team") return "チーム全体";
  if (roomType === "event") return "イベント";
  return "貸出";
}
