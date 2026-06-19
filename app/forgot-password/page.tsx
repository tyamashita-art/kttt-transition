"use client";

import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { getAuthCallbackUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";

function getResetRequestErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "再設定メールの送信上限に達しました。しばらく時間をおいてから再度お試しください。";
  }

  if (normalized.includes("invalid") && normalized.includes("email")) {
    return "メールアドレスを確認してください。登録時と同じメールアドレスを入力してください。";
  }

  return message;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getAuthCallbackUrl("/reset-password")
    });

    setLoading(false);

    if (resetError) {
      setError(getResetRequestErrorMessage(resetError.message));
      return;
    }

    setMessage(
      `${normalizedEmail} にパスワード再設定メールを送信しました。メール内のリンクを開いて、新しいパスワードを設定してください。`
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent dark:text-red-300">
            Password recovery
          </p>
          <h1 className="mt-2 text-3xl font-black">パスワード再設定</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            登録済みメールアドレスに再設定リンクを送信します。
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

          {error ? (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold leading-6 text-red-700 dark:bg-red-950 dark:text-red-200">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white transition active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <MailCheck size={18} />}
            再設定メールを送る
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
          <Link href="/login" className="inline-flex items-center gap-1 font-black text-accent dark:text-red-300">
            <ArrowLeft size={15} />
            ログインに戻る
          </Link>
        </p>
      </div>
    </main>
  );
}
