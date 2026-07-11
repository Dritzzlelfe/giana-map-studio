// Client-side fetch interceptor that injects the `x-preview-role` header
// on Supabase Data API requests when an admin has activated preview-as-role.
//
// The DB helpers (public.current_preview_role_key) verify that the real caller
// is an admin/owner/super_admin before honoring the header, so a non-admin
// sending the header has no effect.

const PREVIEW_KEY = "gad_preview_role_key";

let installed = false;

export function installPreviewRoleFetch() {
  if (installed) return;
  if (typeof window === "undefined") return;

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  if (!supabaseUrl) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.startsWith(supabaseUrl)) {
        const previewKey = window.sessionStorage.getItem(PREVIEW_KEY);
        if (previewKey) {
          const headers = new Headers(input instanceof Request ? input.headers : undefined);
          if (init?.headers) {
            new Headers(init.headers).forEach((v, k) => headers.set(k, v));
          }
          headers.set("x-preview-role", previewKey);
          return originalFetch(input, { ...init, headers });
        }
      }
    } catch {
      // fall through to original fetch on any error
    }
    return originalFetch(input, init);
  };

  installed = true;
}
