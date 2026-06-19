"use client";

import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function getPasswordUpdateErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("same_password")) {
    return "現在と同じパスワードは設定できません。別のパスワードを入力してください。";
  }

  if (normalized.includes("weak_password") || normalized.includes("password")) {
    return "パスワードを確認してください。6文字以上で設定できます。";
  }

  if (normalized.includes("session") || normalized.includes("jwt")) {
    return "再設定リンクの有効期限が切れている可能性があります。もう一度、再設定メールを送信してください。";
  }

  return message;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setReady(Boolean(data.user));
      setChecking(false);
    });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください。");
      return;
    }

    if (password !== passwordConfirm) {
      setError("確認用パスワードが一致していません。");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setLoading(false);
      setError(getPasswordUpdateErrorMessage(updateError.message));
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    router.replace("/login?reset=1");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent dark:text-red-300">
            New password
          </p>
          <h1 className="mt-2 text-3xl font-black">新しいパスワード</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            新しいパスワードを設定すると、ログイン画面に戻ります。
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-md border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"
        >
          {checking ? (
            <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              <Loader2 className="animate-spin" size={16} />
              再設定リンクを確認しています。
            </div>
          ) : null}

          {!checking && !ready ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold leading-6 text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              再設定リンクを確認できませんでした。メール内の最新リンクを開くか、再設定メールをもう一度送信してください。
            </p>
          ) : null}

          <label className="block text-sm font-bold">
            新しいパスワード
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={!ready || loading}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-accent transition focus:ring-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-bold">
            新しいパスワード確認
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              disabled={!ready || loading}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-accent transition focus:ring-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!ready || loading}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white transition active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
            パスワードを更新
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
          <Link href="/forgot-password" className="inline-flex items-center gap-1 font-black text-accent dark:text-red-300">
            <ArrowLeft size={15} />
            再設定メールを送り直す
          </Link>
        </p>
      </div>
    </main>
  );
}
