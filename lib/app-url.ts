function normalizeOrigin(value?: string) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getAppOrigin() {
  if (typeof window !== "undefined") {
    if (window.location.hostname === "127.0.0.1") {
      return `http://localhost${window.location.port ? `:${window.location.port}` : ""}`;
    }

    if (window.location.hostname === "localhost") {
      return window.location.origin;
    }

    return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) || window.location.origin;
  }

  const configuredSiteUrl = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredSiteUrl) return configuredSiteUrl;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getAuthCallbackUrl(next = "/login?verified=1") {
  const callbackUrl = new URL("/auth/callback", getAppOrigin());
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}

export function getSafeNextPath(next: string | null, fallback = "/login?verified=1") {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
