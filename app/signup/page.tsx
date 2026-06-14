"use client";

import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setMessage("登録を受け付けました。確認メールが届いた場合は、リンクを開いてからログインしてください。");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">
            Invite only
          </p>
          <h1 className="mt-2 text-3xl font-black">メンバー登録</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            allowed_emailsに登録済みのメールアドレスだけが参加できます。
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
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-cyan-400 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
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
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-cyan-400 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
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
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-cyan-400 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-md bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white transition active:scale-[0.99] disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
            登録する
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
          アカウント作成済みなら{" "}
          <Link href="/login" className="font-black text-cyan-600 dark:text-cyan-300">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
