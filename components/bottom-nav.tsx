"use client";

import { CalendarDays, Home, MessageCircle, Package, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/gear", label: "ギア", icon: Package },
  { href: "/events", label: "イベント", icon: CalendarDays },
  { href: "/members", label: "メンバー", icon: Users },
  { href: "/chat", label: "チャット", icon: MessageCircle }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex h-14 flex-col items-center justify-center rounded-md text-[11px] font-bold transition active:scale-95 ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-red-500 dark:text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
              }`}
            >
              <Icon size={19} strokeWidth={2.4} />
              <span className="mt-1 leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
