"use client";

import { Loader2, MailCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { getAuthCallbackUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";

function getSignupErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "確認メールの送信上限に達しました。しばらく時間をおいてから再度お試しください。すでに確認メールが届いている場合は、最新のメール内リンクを開いてください。";
  }

  if (normalized.includes("user already registered") || normalized.includes("already registered")) {
    return "このメールアドレスはすでに登録されています。メール認証がまだの場合は「確認メールを再送」を押してください。認証済みの場合はログインしてください。";
  }

  if (normalized.includes("password")) {
    return "パスワードを確認してください。6文字以上で設定できます。";
  }

  return message;
}

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();
    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl("/login?verified=1"),
        data: {
          display_name: displayName
        }
      }
    });

    setLoading(false);

    if (signUpError) {
      setError(getSignupErrorMessage(signUpError.message));
      return;
    }

    setPassword("");
    setMessage(
      `${normalizedEmail} に確認メールを送信しました。メール内のリンクを開くと認証が完了し、KTTT Transitionのログイン画面に戻ります。届かない場合は迷惑メールフォルダも確認してください。`
    );
  }

  async function resendConfirmation() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("確認メールを再送するメールアドレスを入力してください。");
      return;
    }

    setError(null);
    setMessage(null);
    setResending(true);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: getAuthCallbackUrl("/login?verified=1")
      }
    });

    setResending(false);

    if (resendError) {
      setError(getSignupErrorMessage(resendError.message));
      return;
    }

    setMessage(
      `${normalizedEmail} に確認メールを再送しました。最新のメール内リンクを開いてメール認証を完了してください。`
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent dark:text-red-300">
            Email verification
          </p>
          <h1 className="mt-2 text-3xl font-black">メンバー登録</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            メール認証後にログインできます。登録後に届く確認メールのリンクを開いてください。
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-md border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"
        >
          <label className="block text-sm font-bold">
            名前
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-accent transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-bold">
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
              autoComplete="new-password"
              minLength={6}
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

          {message ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-200">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || resending}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white transition active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
            登録する
          </button>

          <button
            type="button"
            onClick={resendConfirmation}
            disabled={loading || resending || !email.trim()}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white font-black text-slate-800 transition active:scale-[0.99] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {resending ? <Loader2 className="animate-spin" size={18} /> : <MailCheck size={18} />}
            確認メールを再送
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
          アカウント作成済みなら{" "}
          <Link href="/login" className="font-black text-accent dark:text-red-300">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
