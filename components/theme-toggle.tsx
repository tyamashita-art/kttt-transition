"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", next);
    setIsDark(next);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      title={isDark ? "ライトモード" : "ダークモード"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
