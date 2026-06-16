"use client";

import { Bell, CalendarDays, ChevronRight, Clock, MessageCircle, PackageCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { LoadingCard } from "@/components/loading-card";
import { StatusPill, statusTone } from "@/components/status-pill";
import { rentalStatusLabels } from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { formatDate, formatDateTime } from "@/lib/format";
import { teamConcept } from "@/lib/team-concept";
import { createClient } from "@/lib/supabase/client";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];
type Notice = Database["public"]["Tables"]["notices"]["Row"];
type Rental = Database["public"]["Tables"]["rental_requests"]["Row"] & {
  item?: {
    name: string;
    image_url: string | null;
  } | null;
};
type Message = Database["public"]["Tables"]["chat_messages"]["Row"] & {
  room?: {
    title: string | null;
    room_type: string;
  } | null;
  profile?: {
    display_name: string | null;
    nickname: string | null;
  } | null;
};

const dailyTriathlonQuotes = [
  "昨日より一歩でも前へ。それが強さの正体だ。",
  "苦しい時間は、未来の自分への仕送りである。",
  "泳いだ距離、回した脚、刻んだ一歩は裏切らない。",
  "限界は壁ではない。今日の練習メニューだ。",
  "レース当日に自信をくれるのは、今日逃げなかった自分だ。",
  "速さより先に、続ける強さを育てよう。",
  "しんどい日は、強くなる入口に立っている。",
  "楽しいだけでは終わらない。悔しさまで味わって強くなる。",
  "淡々と積む人が、最後の直線でいちばん伸びる。",
  "トライアスロンは一日で強くならない。だから今日やる。",
  "心拍が上がるほど、迷いは静かになる。",
  "小さな継続は、やがて大きな自信になる。",
  "今日の一本を雑にしない。レースはそこを見ている。",
  "疲れている日こそ、フォームと心を整える日だ。",
  "自分を追い込める人は、自分を信じられる人だ。",
  "完璧な練習より、やめなかった練習が残る。",
  "強い人は特別ではない。今日もやる人だ。",
  "Swim, Bike, Run. 迷ったら、まず動け。",
  "レースはごまかせない。だから練習は面白い。",
  "人生を楽しみつくす体力を、今日もつくろう。"
];

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nextEvents, setNextEvents] = useState<Event[]>([]);
  const [myRentals, setMyRentals] = useState<Rental[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Rental[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [todayLabel, setTodayLabel] = useState("");
  const [heroLine, setHeroLine] = useState(dailyTriathlonQuotes[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    setTodayLabel(formatHeroDate(today));
    setHeroLine(getDailyQuote(today));

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;

      await supabase.rpc("generate_rental_due_alerts");

      const [profileResult, eventsResult, rentalsResult, approvalsResult, noticesResult, messagesResult] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", data.user.id).single(),
          supabase
            .from("events")
            .select("*")
            .is("deleted_at", null)
            .gte("start_at", new Date().toISOString())
            .order("start_at", { ascending: true })
            .limit(3),
          supabase
            .from("rental_requests")
            .select("*, item:items(name,image_url)")
            .eq("requester_id", data.user.id)
            .in("status", ["borrowed", "return_requested", "overdue"])
            .order("approved_end_date", { ascending: true }),
          supabase
            .from("rental_requests")
            .select("*, item:items(name,image_url)")
            .eq("owner_id", data.user.id)
            .eq("status", "requested")
            .order("created_at", { ascending: false }),
          supabase
            .from("notices")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("chat_messages")
            .select("*, room:chat_rooms(title,room_type), profile:profiles!chat_messages_user_id_fkey(display_name,nickname)")
            .order("created_at", { ascending: false })
            .limit(5)
      ]);

      setProfile(profileResult.data);
      setNextEvents(eventsResult.data || []);
      setMyRentals((rentalsResult.data || []) as unknown as Rental[]);
      setPendingApprovals((approvalsResult.data || []) as unknown as Rental[]);
      setNotices(noticesResult.data || []);
      setMessages((messagesResult.data || []) as unknown as Message[]);
      setLoading(false);
    });
  }, []);

  if (loading || !profile) return <LoadingCard />;

  return (
    <div className="space-y-4">
      <section className="rounded-md bg-slate-900 p-5 text-white shadow-soft dark:bg-slate-900">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-300">
          KTTT 日めくり名言
        </p>
        <h2 className="mt-2 text-2xl font-black leading-8">{todayLabel}</h2>
        <p className="mt-3 text-lg font-black leading-7 text-slate-100">「{heroLine}」</p>
      </section>

      <DashboardCard icon={<Sparkles size={18} />} title="チームポリシー" href="/about">
        <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-950">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-accent dark:text-red-300">
            {teamConcept.subtitle}
          </p>
          <p className="mt-2 text-lg font-black leading-6">{teamConcept.tagline}</p>
          <p className="mt-2 line-clamp-3 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
            {teamConcept.body[1]}
          </p>
        </div>
      </DashboardCard>

      <DashboardCard icon={<Bell size={18} />} title="チームお知らせ" href="/notices">
        {notices.length === 0 ? (
          <EmptyState title="お知らせはまだありません" />
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <div key={notice.id} className="rounded-md bg-slate-50 p-3 dark:bg-slate-950">
                <p className="font-black">{notice.title}</p>
                <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-500 dark:text-slate-400">{notice.body}</p>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>

      <DashboardCard
        icon={<CalendarDays size={18} />}
        title="次回イベント"
        href={nextEvents[0] ? `/events/${nextEvents[0].id}` : "/events"}
      >
        {nextEvents.length > 0 ? (
          <div className="space-y-3">
            {nextEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`} className="block rounded-md bg-slate-50 p-3 dark:bg-slate-950">
                <p className="font-black">{event.title}</p>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                  {formatDateTime(event.start_at)} · {event.location || "場所未定"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="予定されているイベントはありません" />
        )}
      </DashboardCard>

      <DashboardCard icon={<MessageCircle size={18} />} title="新着チャット" href="/chat">
        {messages.length === 0 ? (
          <EmptyState title="新着チャットはありません" />
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="rounded-md bg-slate-50 p-3 dark:bg-slate-950">
                <p className="text-xs font-black text-accent dark:text-red-300">
                  {message.room?.title || "チャット"} · {message.profile?.nickname || message.profile?.display_name || "メンバー"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-bold leading-5">{message.message}</p>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>

      <DashboardCard icon={<PackageCheck size={18} />} title="自分の貸出中ギア" href="/gear">
        {myRentals.length === 0 ? (
          <EmptyState title="貸出中のギアはありません" />
        ) : (
          <div className="space-y-3">
            {myRentals.map((rental) => (
              <Link key={rental.id} href={`/gear/${rental.item_id}`} className="block rounded-md bg-slate-50 p-3 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black">{rental.item?.name || "ギア"}</p>
                  <StatusPill label={rentalStatusLabels[rental.status]} tone={statusTone(rental.status)} />
                </div>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                  返却予定 {formatDate(rental.approved_end_date)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </DashboardCard>

      <DashboardCard icon={<Clock size={18} />} title="承認待ち申請" href="/gear">
        {pendingApprovals.length === 0 ? (
          <EmptyState title="承認待ちはありません" />
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((rental) => (
              <Link key={rental.id} href={`/gear/${rental.item_id}`} className="block rounded-md bg-amber-50 p-3 dark:bg-amber-950">
                <p className="font-black">{rental.item?.name || "ギア"}</p>
                <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-200">
                  希望 {formatDate(rental.requested_start_date)} - {formatDate(rental.requested_end_date)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </DashboardCard>

    </div>
  );
}

function formatHeroDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(date);
}

function getDailyQuote(date: Date) {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  return dailyTriathlonQuotes[dayOfYear % dailyTriathlonQuotes.length];
}

function DashboardCard({
  icon,
  title,
  href,
  children
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Link href={href} className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-black">
          {icon}
          {title}
        </h3>
        <ChevronRight size={18} className="text-slate-400" />
      </Link>
      {children}
    </section>
  );
}
