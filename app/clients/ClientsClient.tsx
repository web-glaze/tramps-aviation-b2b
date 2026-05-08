"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Plane,
  Calendar,
  Briefcase,
  Star,
  Loader2,
  X,
  Save,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Client / Customer CRM for travel agents.
 *
 * Backend contract (TODO):
 *   GET    /api/agents/clients               → Client[]
 *   POST   /api/agents/clients               body: Client
 *   PUT    /api/agents/clients/:id           body: Partial<Client>
 *   DELETE /api/agents/clients/:id
 *   GET    /api/agents/clients/:id/bookings  → Booking[] for that client
 *
 * Until those are live, the page persists to localStorage so the agent can
 * still build their book. Sync happens automatically once the API responds.
 */
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: "M" | "F";
  passportNo?: string;
  company?: string;
  notes?: string;
  starred?: boolean;
  totalBookings?: number;
  totalSpend?: number;
  lastBookingDate?: string;
  preferredAirline?: string;
}

const STORAGE_KEY = "tp-agent-clients";

const FALLBACK_CLIENTS: Client[] = [
  {
    id: "c1",
    firstName: "Rajesh",
    lastName: "Mehta",
    email: "rajesh.m@gmail.com",
    phone: "+91-9876543210",
    company: "Mehta Trading",
    starred: true,
    totalBookings: 12,
    totalSpend: 142500,
    lastBookingDate: "2026-04-18",
    preferredAirline: "IndiGo",
  },
  {
    id: "c2",
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.s@yahoo.com",
    phone: "+91-9988776655",
    company: "Sharma Exports",
    starred: false,
    totalBookings: 8,
    totalSpend: 96400,
    lastBookingDate: "2026-03-22",
    preferredAirline: "Vistara",
  },
  {
    id: "c3",
    firstName: "Anil",
    lastName: "Kumar",
    email: "anil.k@hotmail.com",
    phone: "+91-9123456789",
    company: "Sole Proprietor",
    starred: false,
    totalBookings: 4,
    totalSpend: 38200,
    lastBookingDate: "2025-12-15",
    preferredAirline: "Air India",
  },
];

export default function ClientsClient() {
  const [list, setList] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "spend" | "bookings" | "name">("recent");

  // ── API helpers ────────────────────────────────────────────────────
  // We hit the real backend (`/api/agents/clients`) for every CRUD op
  // now that the module ships. The page used to fall back to
  // localStorage when the endpoint 404'd; we keep a *one-time* migration
  // so any agent who built up clients on the old localStorage-only
  // version doesn't lose them.
  const apiBase = () =>
    process.env.NEXT_PUBLIC_API_URL || "https://api.trampsaviation.com/api";
  const authHeader = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token =
      localStorage.getItem("auth_token") ||
      localStorage.getItem("agent_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const jsonHeaders = (): Record<string, string> => ({
    "Content-Type": "application/json",
    ...authHeader(),
  });

  // Map backend doc (`_id`) to frontend shape (`id`).
  const fromServer = (d: any): Client => ({
    ...d,
    id: d._id || d.id,
  });

  // ── Initial load + one-time localStorage migration ─────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase()}/agents/clients`, {
          headers: authHeader(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const d = json?.data || json;
        const serverList: Client[] = Array.isArray(d) ? d.map(fromServer) : [];
        if (cancelled) return;

        // ── First-run migration ────────────────────────────────────
        // If the server has nothing but local has entries, push them
        // up so the agent's hand-built list isn't lost. Guarded by a
        // sentinel key so we never re-import after the first success.
        const migrated = localStorage.getItem(`${STORAGE_KEY}:migrated`);
        if (!serverList.length && !migrated) {
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const local: Client[] = raw ? JSON.parse(raw) : [];
            if (Array.isArray(local) && local.length) {
              await fetch(`${apiBase()}/agents/clients/bulk`, {
                method: "POST",
                headers: jsonHeaders(),
                body: JSON.stringify({ clients: local }),
              });
              const reload = await fetch(`${apiBase()}/agents/clients`, {
                headers: authHeader(),
              });
              if (reload.ok) {
                const j2 = await reload.json();
                const d2 = j2?.data || j2;
                if (Array.isArray(d2)) {
                  setList(d2.map(fromServer));
                  localStorage.setItem(`${STORAGE_KEY}:migrated`, "1");
                  setLoading(false);
                  return;
                }
              }
            }
          } catch {
            /* migration is best-effort, never blocks the load */
          }
        }
        setList(serverList);
      } catch {
        // Server unreachable — keep the page usable with local cache.
        if (cancelled) return;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            setList(parsed.length ? parsed : FALLBACK_CLIENTS);
          } else {
            setList(FALLBACK_CLIENTS);
          }
        } catch {
          setList(FALLBACK_CLIENTS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Local mirror so offline / temporary network failures don't wipe the
  // visible list if the agent reloads. The server stays the source of
  // truth — this is just a cache.
  const cacheLocal = (next: Client[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  };

  const onSave = async (c: Client) => {
    const isUpdate = !!c.id && list.some((x) => x.id === c.id);
    try {
      const url = isUpdate
        ? `${apiBase()}/agents/clients/${c.id}`
        : `${apiBase()}/agents/clients`;
      const method = isUpdate ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: jsonHeaders(),
        body: JSON.stringify(c),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Save failed (${res.status})`);
      }
      const saved = fromServer(await res.json());
      const next = isUpdate
        ? list.map((x) => (x.id === c.id ? saved : x))
        : [...list, saved];
      setList(next);
      cacheLocal(next);
      setShowForm(false);
      setEditing(null);
      toast.success(isUpdate ? "Client updated" : "Client added");
    } catch (err: any) {
      toast.error(err?.message || "Could not save client. Please try again.");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Remove this client?")) return;
    // Optimistic update — rollback on failure.
    const previous = list;
    const next = list.filter((c) => c.id !== id);
    setList(next);
    cacheLocal(next);
    try {
      const res = await fetch(`${apiBase()}/agents/clients/${id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      toast.success("Client removed");
    } catch (err: any) {
      setList(previous);
      cacheLocal(previous);
      toast.error(err?.message || "Could not remove client.");
    }
  };

  const onToggleStar = async (id: string) => {
    const target = list.find((c) => c.id === id);
    if (!target) return;
    const nextStarred = !target.starred;
    // Optimistic — flip locally first, then persist.
    const next = list.map((c) =>
      c.id === id ? { ...c, starred: nextStarred } : c,
    );
    setList(next);
    cacheLocal(next);
    try {
      await fetch(`${apiBase()}/agents/clients/${id}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ starred: nextStarred }),
      });
    } catch {
      /* optimistic — server eventual consistency is fine for a star */
    }
  };

  const filtered = useMemo(() => {
    let arr = list.filter((c) => {
      if (!q.trim()) return true;
      const hay =
        `${c.firstName} ${c.lastName} ${c.email || ""} ${c.phone || ""} ${c.company || ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    arr = arr.slice().sort((a, b) => {
      // Starred always first
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      switch (sortBy) {
        case "spend":
          return (b.totalSpend || 0) - (a.totalSpend || 0);
        case "bookings":
          return (b.totalBookings || 0) - (a.totalBookings || 0);
        case "name":
          return a.firstName.localeCompare(b.firstName);
        case "recent":
        default:
          return (
            (b.lastBookingDate || "").localeCompare(a.lastBookingDate || "")
          );
      }
    });
    return arr;
  }, [list, q, sortBy]);

  const totals = useMemo(() => {
    const totalClients = list.length;
    const totalSpend = list.reduce((s, c) => s + (c.totalSpend || 0), 0);
    const totalBookings = list.reduce((s, c) => s + (c.totalBookings || 0), 0);
    const repeat = list.filter((c) => (c.totalBookings || 0) >= 3).length;
    return { totalClients, totalSpend, totalBookings, repeat };
  }, [list]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
            Clients
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Your saved clients with travel history. Click any client to view
            their bookings or rebook in one tap.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary px-4 py-2.5 text-sm whitespace-nowrap"
        >
          <Plus className="h-4 w-4" /> Add client
        </button>
      </div>

      {/* Stats band */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Clients"
          value={totals.totalClients}
          Icon={Users}
          accent="bg-brand-blue/10 text-brand-blue"
        />
        <StatCard
          label="Bookings"
          value={totals.totalBookings}
          Icon={Plane}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="GMV"
          value={`₹${(totals.totalSpend / 100000).toFixed(1)}L`}
          Icon={TrendingUp}
          accent="bg-violet-500/10 text-violet-600"
        />
        <StatCard
          label="Repeat (3+)"
          value={totals.repeat}
          Icon={Star}
          accent="bg-amber-500/10 text-amber-600"
        />
      </div>

      {/* Search + sort */}
      <div className="card-base p-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone or company"
            className="input-base pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="input-base sm:w-44"
        >
          <option value="recent">Recently booked</option>
          <option value="spend">Top spenders</option>
          <option value="bookings">Most bookings</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {/* Add/edit form */}
      {showForm && (
        <ClientForm
          initial={editing || undefined}
          onSaved={onSave}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="card-base p-12 text-center">
          <Loader2 className="h-6 w-6 mx-auto text-muted-foreground animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-base p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mt-4 font-bold">
            {q ? "No clients match that search" : "No clients yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
            {q
              ? "Try a different name, phone or company."
              : "Add your first client to start tracking their travel history."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <ClientRow
              key={c.id}
              client={c}
              onStar={() => onToggleStar(c.id)}
              onEdit={() => {
                setEditing(c);
                setShowForm(true);
              }}
              onDelete={() => onDelete(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: string | number;
  Icon: any;
  accent: string;
}) {
  return (
    <div className="card-base p-4">
      <div
        className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center mb-2",
          accent,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-black font-display tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-0.5">
        {label}
      </p>
    </div>
  );
}

function ClientRow({
  client,
  onStar,
  onEdit,
  onDelete,
}: {
  client: Client;
  onStar: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initials = `${client.firstName?.[0] || "?"}${client.lastName?.[0] || ""}`.toUpperCase();
  return (
    <div className="card-base p-4 flex items-center gap-4 hover:border-primary/30 transition-all">
      <button
        onClick={onStar}
        aria-label={client.starred ? "Unstar" : "Star"}
        className={cn(
          "h-11 w-11 rounded-2xl flex items-center justify-center font-black shrink-0 relative transition-all",
          client.starred
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
            : "bg-brand-blue-tint text-brand-blue",
        )}
      >
        {initials}
        {client.starred && (
          <Star className="absolute -top-1 -right-1 h-3.5 w-3.5 fill-amber-500 text-amber-500" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold truncate">
            {client.firstName} {client.lastName}
          </p>
          {client.company && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-1.5 py-0.5 rounded bg-muted">
              <Briefcase className="h-2.5 w-2.5" /> {client.company}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
          {client.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {client.phone}
            </span>
          )}
          {client.email && (
            <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
              <Mail className="h-3 w-3" /> {client.email}
            </span>
          )}
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 min-w-[110px]">
        {client.totalBookings ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
            <Plane className="h-3 w-3 text-primary" />
            {client.totalBookings} bookings
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">No bookings yet</span>
        )}
        {client.totalSpend ? (
          <span className="text-xs font-bold tabular-nums" style={{ color: "hsl(var(--brand-orange))" }}>
            ₹{client.totalSpend.toLocaleString("en-IN")}
          </span>
        ) : null}
        {client.lastBookingDate && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-2.5 w-2.5" />
            {new Date(client.lastBookingDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Link
          href={`/flights?passengerName=${encodeURIComponent(`${client.firstName} ${client.lastName}`)}`}
          className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-orange/10 text-brand-orange text-xs font-bold hover:bg-brand-orange/20 transition-colors"
        >
          <Plane className="h-3 w-3" /> Book
        </Link>
        <button
          onClick={onEdit}
          aria-label="Edit"
          className="h-9 w-9 rounded-xl border border-border hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete"
          className="h-9 w-9 rounded-xl border border-border hover:border-rose-400 hover:text-rose-500 transition-all flex items-center justify-center"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ClientForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Client;
  onSaved: (c: Client) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Client>({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "M",
    passportNo: "",
    company: "",
    notes: "",
    starred: false,
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Client>(k: K, v: Client[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First & last name are required");
      return;
    }
    setSaving(true);
    onSaved(form);
    setSaving(false);
  };

  return (
    <div className="card-base p-5 space-y-3 border-primary/40">
      <div className="flex items-center justify-between">
        <p className="font-bold text-base">
          {initial?.id ? "Edit client" : "Add a new client"}
        </p>
        <button
          onClick={onCancel}
          aria-label="Close"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold mb-1 block">First name *</label>
          <input
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className="input-base"
            placeholder="Rajesh"
          />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Last name *</label>
          <input
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            className="input-base"
            placeholder="Mehta"
          />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Phone</label>
          <input
            value={form.phone || ""}
            onChange={(e) => set("phone", e.target.value)}
            className="input-base"
            placeholder="+91 98765 43210"
          />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Email</label>
          <input
            type="email"
            value={form.email || ""}
            onChange={(e) => set("email", e.target.value)}
            className="input-base"
            placeholder="rajesh@email.com"
          />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">DOB</label>
          <input
            type="date"
            value={form.dob || ""}
            onChange={(e) => set("dob", e.target.value)}
            className="input-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Gender</label>
          <select
            value={form.gender || "M"}
            onChange={(e) => set("gender", e.target.value as "M" | "F")}
            className="input-base"
          >
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold mb-1 block">Company</label>
          <input
            value={form.company || ""}
            onChange={(e) => set("company", e.target.value)}
            className="input-base"
            placeholder="Mehta Trading"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold mb-1 block">
            Passport
          </label>
          <input
            value={form.passportNo || ""}
            onChange={(e) =>
              set("passportNo", e.target.value.toUpperCase())
            }
            className="input-base font-mono uppercase"
            placeholder="A1234567"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold mb-1 block">Notes</label>
          <textarea
            value={form.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
            className="input-base"
            rows={2}
            placeholder="Prefers window seat, vegan meal, etc."
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={submit}
          disabled={saving}
          className="btn-primary px-4 py-2 text-sm flex-1"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save client"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
