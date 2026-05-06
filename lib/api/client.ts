import axios, { AxiosRequestConfig } from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://tramps-aviation-backend.onrender.com/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
const getToken = () =>
  typeof window !== "undefined"
    ? localStorage.getItem("auth_token") || localStorage.getItem("agent_token")
    : null;

const setToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth_token", token);
  localStorage.setItem("agent_token", token);
  // Also update the cookie so middleware / SSR can read it
  document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Strict`;
};

const clearToken = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
  localStorage.removeItem("agent_token");
  localStorage.removeItem("tp-auth");
  document.cookie = "auth_token=; path=/; max-age=0";
};

// ── Main authenticated client ─────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send httpOnly cookies when backend sets them
});

// ── Silent token refresh state ────────────────────────────────────────────────
let isRefreshing = false;
let refreshFailedCallbacks: Array<(err: any) => void> = [];
let refreshSuccessCallbacks: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (
  onSuccess: (token: string) => void,
  onFail: (err: any) => void,
) => {
  refreshSuccessCallbacks.push(onSuccess);
  refreshFailedCallbacks.push(onFail);
};

const onRefreshSuccess = (token: string) => {
  refreshSuccessCallbacks.forEach((cb) => cb(token));
  refreshSuccessCallbacks = [];
  refreshFailedCallbacks = [];
};

const onRefreshFail = (err: any) => {
  refreshFailedCallbacks.forEach((cb) => cb(err));
  refreshSuccessCallbacks = [];
  refreshFailedCallbacks = [];
};

// ── Request interceptor: attach JWT ──────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: handle 401 with silent refresh ─────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;
    const path =
      typeof window !== "undefined" ? window.location.pathname : "";

    // Skip 401-driven session-expiry handling on pages that don't actually
    // require auth. If we don't list a public page here a search call from
    // /flights, /hotels, /insurance or /series-fare will spuriously try to
    // refresh the token, fail, and redirect anonymous visitors to /login.
    const isPublicPath =
      path === "/" ||
      path.includes("/login") ||
      path.includes("/register") ||
      path.includes("/kyc") ||
      path.includes("/forgot-password") ||
      path.includes("/reset-password") ||
      // Public marketing / search pages (also accessible without auth)
      path === "/flights"     || path.startsWith("/flights/")     ||
      path === "/hotels"      || path.startsWith("/hotels/")      ||
      path === "/insurance"   || path.startsWith("/insurance/")   ||
      path === "/series-fare" || path.startsWith("/series-fare/") ||
      // Static legal / about pages
      path === "/faq" || path === "/privacy" || path === "/terms" ||
      path === "/refund" || path === "/about";

    if (status === 401 && !originalRequest._retry && !isPublicPath) {
      // ── Attempt silent token refresh ─────────────────────────────────────
      if (isRefreshing) {
        // Queue: wait for ongoing refresh to complete
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(
            (newToken) => {
              originalRequest.headers = {
                ...originalRequest.headers,
                Authorization: `Bearer ${newToken}`,
              };
              originalRequest._retry = true;
              resolve(apiClient(originalRequest));
            },
            (err) => reject(err),
          );
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${API_URL}/agents/refresh-token`,
          {},
          { withCredentials: true, timeout: 10000 },
        );
        const newToken =
          res.data?.data?.access_token ||
          res.data?.access_token ||
          res.data?.token ||
          "";

        if (newToken) {
          setToken(newToken);
          // Update Zustand store token without full re-render
          try {
            const { useAuthStore } = await import("@/lib/store");
            const state = useAuthStore.getState();
            if (state.user) {
              useAuthStore.setState({ token: newToken });
            }
          } catch {
            // store update is best-effort
          }

          isRefreshing = false;
          onRefreshSuccess(newToken);

          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${newToken}`,
          };
          return apiClient(originalRequest);
        }
        throw new Error("No token in refresh response");
      } catch (refreshError) {
        isRefreshing = false;
        onRefreshFail(refreshError);

        // Refresh failed — warn user 5 seconds before redirect
        if (typeof window !== "undefined") {
          clearToken();
          import("sonner")
            .then(({ toast }) => {
              toast.warning("Session expired. Redirecting to login…", {
                duration: 4000,
              });
            })
            .catch(() => {});

          setTimeout(() => {
            // Single-app deployment — every authenticated route lives on
            // this domain, so on session expiry just bounce everyone to
            // /login regardless of where they were.
            window.location.href = "/login";
          }, 4500);
        }
        return Promise.reject(refreshError);
      }
    }

    // Other 401 on public pages — just reject
    return Promise.reject(error);
  },
);

export default apiClient;

// ── Public client — no auth, no 401 redirect ─────────────────────────────────
export const publicApiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});
