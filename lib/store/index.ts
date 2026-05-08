"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { statsApi, usersApi } from "@/lib/api/services";
import { toast } from "sonner";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════
type ColorTheme =
  | "brand"
  | "blue"
  | "violet"
  | "emerald"
  | "rose"
  | "orange"
  | "teal"
  | "cyan"
  | "amber"
  | "pink"
  | "indigo"
  | "slate"
  | "lime";
type FontSize = "xs" | "sm" | "md" | "lg" | "xl";
type FontFamily =
  | "inter"
  | "poppins"
  | "rajdhani"
  | "nunito"
  | "jakarta"
  | "dm-sans"
  | "outfit"
  | "sora"
  | "space";
type BorderRadius = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
type Theme = "light" | "dark" | "system";
type UserRole = "agent" | "customer" | null;

// ════════════════════════════════════════════════════════════════════════════
// STORE 1 — SETTINGS (theme, color, font, sidebar)
// localStorage key: 'tp-settings'
//
// Usage in any component:
//   import { useSettingsStore } from '@/lib/store'
//   const { theme, setTheme, colorTheme, sidebarOpen } = useSettingsStore()
// ════════════════════════════════════════════════════════════════════════════
interface SettingsState {
  theme: Theme;
  colorTheme: ColorTheme;
  fontSize: FontSize;
  fontFamily: FontFamily;
  borderRadius: BorderRadius;
  sidebarOpen: boolean;
  compactMode: boolean;
  animations: boolean;
  setTheme: (t: Theme) => void;
  setColorTheme: (c: ColorTheme) => void;
  setFontSize: (s: FontSize) => void;
  setFontFamily: (f: FontFamily) => void;
  setBorderRadius: (r: BorderRadius) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  setCompactMode: (v: boolean) => void;
  setAnimations: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // ═══════════════════════════════════════════════════════════════════
      // GLOBAL THEME DEFAULTS — change these to retheme the entire app
      // See also: config/theme.ts (component tokens) + app/globals.css (CSS vars)
      //
      // theme:        'light' | 'dark' | 'system'
      // colorTheme:   'brand'(brand blue #209ACD) | 'blue' | 'violet' | 'emerald' | 'rose' | ...
      // fontFamily:   'jakarta' | 'inter' | 'poppins' | 'outfit' | 'sora' | ...
      // borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
      // ═══════════════════════════════════════════════════════════════════
      theme: "light",
      colorTheme: "brand",
      fontSize: "md",
      fontFamily: "jakarta",
      borderRadius: "lg",
      sidebarOpen: true,
      compactMode: false,
      animations: true,
      setTheme: (theme) => set({ theme }),
      setColorTheme: (colorTheme) => set({ colorTheme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setBorderRadius: (borderRadius) => set({ borderRadius }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setAnimations: (animations) => set({ animations }),
    }),
    { name: "tp-settings" },
  ),
);
export const useUIStore = useSettingsStore; // backward compat alias

// ════════════════════════════════════════════════════════════════════════════
// STORE 2 — AUTH (login / logout / user session)
// localStorage key: 'tp-auth'
//
// Usage:
//   const { isAuthenticated, user, role, setAuth, clearAuth } = useAuthStore()
//
// SSR Note — always check _hasHydrated before reading isAuthenticated:
//   const { _hasHydrated, isAuthenticated } = useAuthStore()
//   if (!_hasHydrated) return <Spinner />
//   if (!isAuthenticated) router.push('/login')
// ════════════════════════════════════════════════════════════════════════════
interface AuthState {
  user: any | null;
  token: string | null;
  role: UserRole;
  agentId: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: any, token: string) => void;
  clearAuth: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      agentId: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, token) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_token", token);
          localStorage.setItem("agent_token", token);
          document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Lax`;
        }
        set({
          user,
          token,
          role: user?.role || null,
          agentId: user?.agentId || null,
          isAuthenticated: true,
        });
      },
      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("agent_token");
          localStorage.removeItem("tp-auth");
          document.cookie = "auth_token=; path=/; max-age=0";
        }
        set({
          user: null,
          token: null,
          role: null,
          agentId: null,
          isAuthenticated: false,
        });
      },
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "tp-auth",
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Order matters — set `isAuthenticated` BEFORE flipping
          // `_hasHydrated`, otherwise consumers (AgentShell) wake up
          // with `_hasHydrated: true` but `isAuthenticated: false`
          // (the original default) and bounce the user to /login.
          state.isAuthenticated = !!(state.token && state.user);
          state.setHasHydrated(true);
        }
      },
    },
  ),
);

// ════════════════════════════════════════════════════════════════════════════
// STORE 3 — STATS (dashboard numbers)
// Replaces: useQuery from @tanstack/react-query
//
// Usage:
//   import { useStatsStore } from '@/lib/store'
//   const { stats, loading, fetchStats } = useStatsStore()
//   useEffect(() => { fetchStats() }, [])
// ════════════════════════════════════════════════════════════════════════════
interface StatsState {
  stats: any | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null; // timestamp — avoids refetch if fresh (<5 min)
  fetchStats: () => Promise<void>;
  reset: () => void;
}

export const useStatsStore = create<StatsState>()((set, get) => ({
  stats: null,
  loading: false,
  error: null,
  lastFetched: null,
  fetchStats: async () => {
    // Skip if fetched within last 5 minutes
    const last = get().lastFetched;
    if (last && Date.now() - last < 5 * 60 * 1000) return;
    set({ loading: true, error: null });
    try {
      const res = await statsApi.getStats();
      const data = res.data?.data ?? res.data ?? null;
      set({ stats: data, loading: false, lastFetched: Date.now() });
    } catch (e: any) {
      set({ loading: false, error: e?.message || "Failed to load stats" });
    }
  },
  reset: () =>
    set({ stats: null, loading: false, error: null, lastFetched: null }),
}));

// ════════════════════════════════════════════════════════════════════════════
// STORE 4 — USERS (admin user management)
// Replaces: useQuery + useMutation from @tanstack/react-query
//
// Usage:
//   import { useUsersStore } from '@/lib/store'
//   const { users, loading, fetchUsers, deleteUser } = useUsersStore()
//   useEffect(() => { fetchUsers() }, [])
// ════════════════════════════════════════════════════════════════════════════
interface UsersState {
  users: any[];
  meta: any | null;
  loading: boolean;
  error: string | null;
  page: number;
  search: string;
  fetchUsers: (params?: {
    page?: number;
    search?: string;
    limit?: number;
  }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  setPage: (p: number) => void;
  setSearch: (s: string) => void;
}

export const useUsersStore = create<UsersState>()((set, get) => ({
  users: [],
  meta: null,
  loading: false,
  error: null,
  page: 1,
  search: "",
  fetchUsers: async (params) => {
    set({ loading: true, error: null });
    try {
      const p = params || { page: get().page, search: get().search, limit: 10 };
      const res = await usersApi.getUsers(p);
      const data = res.data?.data ?? res.data;
      const users = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      const meta = data?.meta || data?.pagination || null;
      set({ users, meta, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message || "Failed to load users" });
    }
  },
  deleteUser: async (id) => {
    try {
      await usersApi.deleteUser(id);
      toast.success("User deleted successfully!");
      // Remove from local state immediately (optimistic)
      set((s) => ({
        users: s.users.filter((u) => u.id !== id && u._id !== id),
      }));
      // Refresh from server
      get().fetchUsers();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to delete user");
    }
  },
  setPage: (page) => {
    set({ page });
    get().fetchUsers({ page, search: get().search });
  },
  setSearch: (search) => {
    set({ search, page: 1 });
    get().fetchUsers({ page: 1, search });
  },
}));

// ════════════════════════════════════════════════════════════════════════════
// STORE 5 — NOTIFICATIONS
// Usage:
//   const { notifications, unreadCount, markAllRead } = useNotificationsStore()
// ════════════════════════════════════════════════════════════════════════════
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}
interface NotificationsState {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (
    n: Omit<NotificationItem, "id" | "read" | "createdAt">,
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      addNotification: (n) =>
        set((s) => {
          const newN: NotificationItem = {
            ...n,
            id: Date.now().toString(),
            read: false,
            createdAt: new Date().toISOString(),
          };
          const notifications = [newN, ...s.notifications].slice(0, 50);
          return {
            notifications,
            unreadCount: notifications.filter((x) => !x.read).length,
          };
        }),
      markRead: (id) =>
        set((s) => {
          const notifications = s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          );
          return {
            notifications,
            unreadCount: notifications.filter((x) => !x.read).length,
          };
        }),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
      removeNotification: (id) =>
        set((s) => {
          const notifications = s.notifications.filter((n) => n.id !== id);
          return {
            notifications,
            unreadCount: notifications.filter((x) => !x.read).length,
          };
        }),
      clearAll: () => set({ notifications: [], unreadCount: 0 }),
    }),
    { name: "tp-notifications" },
  ),
);

// ════════════════════════════════════════════════════════════════════════════
// STORE 6 — PLATFORM SETTINGS (fetched from /admin/public-settings)
// Cached for 10 minutes. Used in header, footer, sidebar for dynamic branding.
//
// Usage:
//   import { usePlatformStore } from '@/lib/store'
//   const { ps, fetchIfStale } = usePlatformStore()
//   useEffect(() => { fetchIfStale() }, [])
//   <span>{ps.platformName || APP_NAME}</span>
// ════════════════════════════════════════════════════════════════════════════
export interface PlatformSettings {
  platformName?: string;
  platformTagline?: string;
  platformDescription?: string;
  footerCopyright?: string;
  supportEmail?: string;
  supportPhone?: string;
  supportPhoneDisplay?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  socialLinkedin?: string;
  socialYoutube?: string;
  socialWhatsapp?: string;
  // Address & company details (from Platform Settings → Company Address section)
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstNumber?: string;
  panNumber?: string;
  cinNumber?: string;
  // GST on commission & markup config (from Platform Settings → Pricing section)
  gstPercent?: number;
  flightMarkupPercent?: number;
  hotelMarkupPercent?: number;
  insuranceMarkupPercent?: number;
  b2bAgentDiscount?: number;
  // Bank accounts shown on the wallet topup page. Admin-managed via
  // /admin/settings → bankAccounts; exposed to agents via /admin/public-settings.
  bankAccounts?: Array<{
    accountName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
    branch?: string;
    isActive?: boolean;
  }>;
  minWalletTopup?: number;
  maxWalletTopup?: number;
}

interface PlatformState {
  ps: PlatformSettings;
  lastFetched: number | null;
  fetchIfStale: () => Promise<void>;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://tramps-aviation-backend.onrender.com/api";

export const usePlatformStore = create<PlatformState>()((set, get) => ({
  ps: {},
  lastFetched: null,
  fetchIfStale: async () => {
    // Cache for 10 minutes — avoid re-fetching on every component mount
    const last = get().lastFetched;
    if (last && Date.now() - last < 10 * 60 * 1000) return;
    try {
      const res = await fetch(`${API_BASE}/admin/public-settings`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      const data: PlatformSettings = json?.data || json;
      if (data?.platformName) {
        set({ ps: data, lastFetched: Date.now() });
      }
    } catch {
      // silently fail — components use APP_NAME fallback
    }
  },
}));

// ════════════════════════════════════════════════════════════════════════════
// STORE 7 — WALLET (real-time balance, shared across all pages/components)
//
// Design goals:
//   • Single source of truth for wallet balance — avoids stale reads
//   • deductOptimistic(amount) — immediately reduces balance in UI before
//     the server round-trip, making the booking confirmation feel instant
//   • fetchBalance() — re-syncs with the server; called on mount + after booking
//   • Reset to null on logout (clearAuth already handles this via clearWallet)
//
// Usage:
//   const { balance, fetchBalance, deductOptimistic } = useWalletStore()
//   useEffect(() => { fetchBalance() }, [])
//   // After booking succeeds:
//   deductOptimistic(totalFare)
// ════════════════════════════════════════════════════════════════════════════
interface WalletState {
  balance: number | null;        // null = not yet loaded
  lastFetched: number | null;
  loading: boolean;
  fetchBalance: (force?: boolean) => Promise<void>;
  deductOptimistic: (amount: number) => void;
  creditOptimistic: (amount: number) => void;
  setBalance: (b: number) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>()((set, get) => ({
  balance: null,
  lastFetched: null,
  loading: false,

  fetchBalance: async (force = false) => {
    // Throttle: skip if fetched within the last 30 seconds (unless forced)
    const last = get().lastFetched;
    if (!force && last && Date.now() - last < 30_000) return;
    set({ loading: true });
    try {
      // Lazy import to avoid circular dependency
      const { agentApi, unwrap } = await import("@/lib/api/services");
      const res = await agentApi.getWallet();
      const d = unwrap(res) as any;
      const balance = Number(
        d?.balance ?? d?.walletBalance ?? d?.wallet?.balance ?? 0,
      );
      set({ balance, lastFetched: Date.now(), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  /** Immediately reduce the displayed balance (before server round-trip). */
  deductOptimistic: (amount: number) => {
    set((s) => ({
      balance: s.balance !== null ? Math.max(0, s.balance - amount) : null,
      // Mark stale so next page load re-fetches
      lastFetched: null,
    }));
  },

  creditOptimistic: (amount: number) => {
    set((s) => ({
      balance: s.balance !== null ? s.balance + amount : null,
    }));
  },

  setBalance: (balance: number) => set({ balance, lastFetched: Date.now() }),
  clearWallet: () => set({ balance: null, lastFetched: null, loading: false }),
}));

// Re-export flight filters store so consumers can do:
//   import { useFlightFiltersStore } from '@/lib/store'
export { useFlightFiltersStore } from "./flightFilters";
export type { FlightFiltersState } from "./flightFilters";

// Re-export search state store — persists last search inputs + results across
// tab changes, navigation, booking dialog opens, and page unmounts.
//   import { useSearchStateStore } from '@/lib/store'
export { useSearchStateStore } from "./searchState";
export type {
  FlightSearchParams,
  SeriesFareSearchParams,
  HotelSearchParams,
} from "./searchState";
