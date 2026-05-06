"use client";

import { useState, useEffect } from "react";
import {
  Users, Plus, Search, Eye, Power, PowerOff,
  RefreshCw, UserCheck, UserX, Loader2, Mail,
  Phone, Copy, MoreHorizontal, Wallet,
} from "lucide-react";
import { agentApi, unwrap } from "@/lib/api/services";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SubAgent {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  agentId?: string;
  status: "active" | "inactive" | "suspended";
  walletBalance?: number;
  totalBookings?: number;
  totalCommission?: number;
  createdAt: string;
  kycStatus?: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SubAgentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-muted rounded-xl" />
      <div className="grid sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
      </div>
      <div className="h-64 bg-muted rounded-2xl" />
    </div>
  );
}

// ─── Add Sub-Agent Modal ──────────────────────────────────────────────────────
function AddSubAgentModal({
  open, onClose, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "",
  });
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("Name, email, and password are required"); return;
    }
    setLoading(true);
    try {
      await (agentApi as any).createSubAgent(form);
      toast.success(`Sub-agent ${form.name} created successfully!`);
      onSuccess();
      onClose();
      setForm({ name: "", email: "", phone: "", password: "" });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to create sub-agent");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-bold">Add Sub-Agent</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a login for a staff member or sub-agent
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">✕</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {[
            { key: "name", label: "Full Name", placeholder: "Rahul Sharma", required: true },
            { key: "email", label: "Email Address", placeholder: "rahul@agency.com", type: "email", required: true },
            { key: "phone", label: "Phone Number", placeholder: "+91 98765 43210", type: "tel" },
            { key: "password", label: "Password", placeholder: "Min 8 characters", type: "password", required: true },
          ].map(({ key, label, placeholder, type = "text", required }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={type}
                placeholder={placeholder}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3.5 h-10 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Sub-Agent
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600",
    inactive: "bg-muted text-muted-foreground",
    suspended: "bg-red-500/10 text-red-500",
  };
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize", map[status] || map.inactive)}>
      {status}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SubAgentsPage() {
  const [agents, setAgents] = useState<SubAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await (agentApi as any).getSubAgents();
      const d = unwrap(res) as any;
      setAgents(d?.subAgents || d?.agents || d?.data || d || []);
    } catch {
      // Backend might not have this endpoint yet — show empty state
      setAgents([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleToggleStatus = async (agent: SubAgent) => {
    setTogglingId(agent._id);
    const newStatus = agent.status === "active" ? "inactive" : "active";
    try {
      await (agentApi as any).updateSubAgentStatus(agent._id, newStatus);
      setAgents(prev => prev.map(a => a._id === agent._id ? { ...a, status: newStatus } : a));
      toast.success(`${agent.name} is now ${newStatus}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update status");
    } finally { setTogglingId(null); }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Agent ID copied!");
  };

  const filtered = search
    ? agents.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.agentId || "").toLowerCase().includes(search.toLowerCase()))
    : agents;

  const fmtINR = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const activeCount   = agents.filter(a => a.status === "active").length;
  const totalBookings = agents.reduce((s, a) => s + (a.totalBookings || 0), 0);
  const totalCommission = agents.reduce((s, a) => s + (a.totalCommission || 0), 0);

  if (loading) return <SubAgentSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Sub-Agent Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your team members and sub-agents
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAgents} disabled={loading}
            className="h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Sub-Agent
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Active Sub-Agents", value: `${activeCount} / ${agents.length}`, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Total Bookings", value: totalBookings, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Total Commission", value: fmtINR(totalCommission), icon: Wallet, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl bg-card border border-border p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", bg)}>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <span className="text-sm text-muted-foreground font-medium">{label}</span>
            </div>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="flex-1">
            <h3 className="font-bold font-display">Sub-Agents</h3>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input placeholder="Search by name, email, ID…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-semibold mb-1">
              {agents.length === 0 ? "No sub-agents yet" : "No matching sub-agents"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {agents.length === 0
                ? "Add your first sub-agent to let team members book on your behalf."
                : "Try adjusting your search."}
            </p>
            {agents.length === 0 && (
              <button onClick={() => setAddOpen(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
                + Add First Sub-Agent
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Sub-Agent", "Agent ID", "Status", "Bookings", "Commission", "Joined", "Actions"].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(agent => (
                    <tr key={agent._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                            {agent.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{agent.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {agent.agentId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{agent.agentId}</span>
                            <button onClick={() => copyId(agent.agentId!)} className="text-muted-foreground hover:text-primary">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={agent.status} /></td>
                      <td className="px-5 py-3.5 font-semibold">{agent.totalBookings || 0}</td>
                      <td className="px-5 py-3.5 font-semibold text-emerald-500">{fmtINR(agent.totalCommission || 0)}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleStatus(agent)}
                            disabled={togglingId === agent._id}
                            title={agent.status === "active" ? "Deactivate" : "Activate"}
                            className={cn(
                              "h-7 w-7 rounded-lg flex items-center justify-center border transition-colors",
                              agent.status === "active"
                                ? "border-red-500/30 text-red-500 hover:bg-red-500/10"
                                : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                            )}
                          >
                            {togglingId === agent._id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : agent.status === "active"
                                ? <PowerOff className="h-3.5 w-3.5" />
                                : <Power className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map(agent => (
                <div key={agent._id} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {agent.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                    </div>
                    <StatusBadge status={agent.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/40 rounded-xl p-2">
                      <p className="text-[10px] text-muted-foreground">Bookings</p>
                      <p className="text-sm font-bold">{agent.totalBookings || 0}</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-2">
                      <p className="text-[10px] text-muted-foreground">Commission</p>
                      <p className="text-sm font-bold text-emerald-500">{fmtINR(agent.totalCommission || 0)}</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-2">
                      <p className="text-[10px] text-muted-foreground">Joined</p>
                      <p className="text-sm font-bold">
                        {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) : "—"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(agent)}
                    disabled={togglingId === agent._id}
                    className={cn(
                      "w-full h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-colors",
                      agent.status === "active"
                        ? "border-red-500/30 text-red-500 hover:bg-red-500/10"
                        : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                    )}
                  >
                    {togglingId === agent._id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : agent.status === "active"
                        ? <><PowerOff className="h-3.5 w-3.5" /> Deactivate</>
                        : <><Power className="h-3.5 w-3.5" /> Activate</>}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AddSubAgentModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={fetchAgents} />
    </div>
  );
}
