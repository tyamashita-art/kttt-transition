"use client";

import { Loader2, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "確認メールの送信上限に達しました。しばらく時間をおいてから再度お試しください。";
  }

  if (normalized.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが違います。パスワードが分からない場合は再設定してください。";
  }

  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("verified") === "1") {
      setInfo("メール認証が完了しました。ログインしてKTTT Transitionを開始できます。");
    }

    if (params.get("reset") === "1") {
      setInfo("パスワードを更新しました。新しいパスワードでログインしてください。");
    }

    if (params.get("auth_error") === "1") {
      setError(params.get("message") || "メール認証に失敗しました。確認メールのリンクをもう一度開いてください。");
    }
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    setLoading(false);

    if (signInError) {
      const friendlyError = signInError.message.toLowerCase().includes("email not confirmed")
        ? "メール認証がまだ完了していません。登録画面から確認メールを再送し、メール内リンクを開いてください。"
        : getAuthErrorMessage(signInError.message);
      setError(friendlyError);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent dark:text-red-300">
            Connect Share Train Race
          </p>
          <h1 className="mt-2 text-3xl font-black">KTTT Transition</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            KTTTメンバー専用の非公開コミュニティです。
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-md border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"
        >
          <label className="block text-sm font-bold">
            メールアドレス
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-accent transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-bold">
            パスワード
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-accent transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          {info ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold leading-6 text-red-700 dark:bg-red-950 dark:text-red-200">
              {info}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white transition active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
            ログイン
          </button>

          <div className="mt-4 text-center text-sm">
            <Link href="/forgot-password" className="font-black text-accent dark:text-red-300">
              パスワードを忘れた方
            </Link>
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
          初回登録は{" "}
          <Link href="/signup" className="font-black text-accent dark:text-red-300">
            こちら
          </Link>
        </p>
      </div>
    </main>
  );
}
