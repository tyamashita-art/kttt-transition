import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSafeNextPath } from "@/lib/app-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function redirectToLoginWithError(requestUrl: URL, message: string) {
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("auth_error", "1");
  loginUrl.searchParams.set("message", message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));

  const providerError = requestUrl.searchParams.get("error_description") || requestUrl.searchParams.get("error");
  if (providerError) {
    return redirectToLoginWithError(requestUrl, providerError);
  }

  if (!code && (!tokenHash || !type)) {
    return redirectToLoginWithError(
      requestUrl,
      "メール認証リンクを確認できませんでした。確認メールのリンクをもう一度開いてください。"
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: type as EmailOtpType
      });

  if (error) {
    return redirectToLoginWithError(
      requestUrl,
      "メール認証に失敗しました。リンクの有効期限が切れている場合は、もう一度登録してください。"
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
