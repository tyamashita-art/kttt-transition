"use client";

import { CalendarPlus, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { LoadingCard } from "@/components/loading-card";
import { participantStatusLabels } from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Participant = Database["public"]["Tables"]["event_participants"]["Row"];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("events").select("*").order("start_at", { ascending: true }),
      supabase.from("event_participants").select("*")
    ]).then(([eventsResult, participantsResult]) => {
      setEvents(eventsResult.data || []);
      setParticipants(participantsResult.data || []);
      setLoading(false);
    });
  }, []);

  const counts = useMemo(() => {
    return participants.reduce<Record<string, number>>((acc, participant) => {
      if (participant.status === "going") {
        acc[participant.event_id] = (acc[participant.event_id] || 0) + 1;
      }
      return acc;
    }, {});
  }, [participants]);

  return (
    <div className="space-y-4">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">イベント</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">練習会、レース、飲み会までまとめて管理。</p>
        </div>
        <Link
          href="/events/new"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-slate-900 text-white shadow-sm active:scale-95 dark:bg-cyan-400 dark:text-slate-950"
          aria-label="イベント作成"
          title="イベント作成"
        >
          <CalendarPlus size={21} />
        </Link>
      </section>

      {loading ? <LoadingCard /> : null}
      {!loading && events.length === 0 ? (
        <EmptyState title="イベントがありません" body="次の練習会やレース予定を作成しましょう。" />
      ) : null}

      <div className="grid gap-3">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm font-black text-cyan-600 dark:text-cyan-300">{formatDateTime(event.start_at)}</p>
            <h3 className="mt-1 text-lg font-black leading-6">{event.title}</h3>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <MapPin size={15} />
                {event.location || "場所未定"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={15} />
                {counts[event.id] || 0}人参加
              </span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {event.description || participantStatusLabels.maybe}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
