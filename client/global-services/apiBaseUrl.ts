function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.PROD
    ? import.meta.env.VITE_API_BASE_URL_PROD
    : import.meta.env.VITE_API_BASE_URL_LOCAL;
  const baseUrl = configuredBaseUrl?.replace(/\/+$/, "") ?? "";

  if (import.meta.env.PROD) {
    const resolvedUrl = new URL(
      baseUrl || window.location.origin,
      window.location.origin
    );
    if (resolvedUrl.protocol !== "https:" && !isLoopbackHost(resolvedUrl.hostname)) {
      throw new Error("Production API traffic must use HTTPS.");
    }
  }

  return baseUrl;
}

export const API_BASE_URL = resolveApiBaseUrl();
