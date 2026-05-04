'use client'
import { useState, useEffect } from 'react'
import { agentApi, unwrap } from '@/lib/api/services'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, Clock, CheckCircle, RefreshCcw, Plane, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function CommissionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
      </div>
      <div className="h-64 bg-muted rounded-2xl" />
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:     'bg-emerald-500/10 text-emerald-600',
  TICKET_ISSUED: 'bg-emerald-500/10 text-emerald-600',
  confirmed:     'bg-emerald-500/10 text-emerald-600',
  PENDING:       'bg-amber-500/10 text-amber-600',
  PENDING_PAYMENT:'bg-amber-500/10 text-amber-600',
  pending:       'bg-amber-500/10 text-amber-600',
  CANCELLED:     'bg-red-500/10 text-red-500',
  cancelled:     'bg-red-500/10 text-red-500',
  FAILED:        'bg-red-500/10 text-red-500',
}

export default function CommissionPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await agentApi.getCommissions()
      const d   = unwrap(res) as any
      // getCommissions now points to /bookings/my
      const list = Array.isArray(d?.bookings)
        ? d.bookings
        : Array.isArray(d?.data)
          ? d.data
          : Array.isArray(d)
            ? d
            : []
      setBookings(list)
    } catch { toast.error('Failed to load commission data') }
    finally { setLoading(false) }
  }

  if (loading) return <CommissionSkeleton />

  // Only bookings that have an agent commission or are confirmed/issued
  const commissionable = bookings.filter(b =>
    (b.agentCommission && b.agentCommission > 0) ||
    b.status === 'CONFIRMED' ||
    b.status === 'TICKET_ISSUED' ||
    b.status === 'confirmed'
  )

  const totalCommission = bookings.reduce((s, b) => s + (b.agentCommission || 0), 0)
  const confirmed       = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'TICKET_ISSUED' || b.status === 'confirmed')
  const confirmedEarned = confirmed.reduce((s, b) => s + (b.agentCommission || 0), 0)
  const pending         = bookings.filter(b => b.status === 'PENDING' || b.status === 'pending')
  const pendingEarned   = pending.reduce((s, b) => s + (b.agentCommission || 0), 0)

  const filtered = search
    ? commissionable.filter(b =>
        (b.bookingRef || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.pnr       || '').toLowerCase().includes(search.toLowerCase())
      )
    : commissionable

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Commission" subtitle="Your earnings from confirmed bookings" />
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5">
          <RefreshCcw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total Earned"
          value={`₹${totalCommission.toLocaleString('en-IN')}`}
          icon={DollarSign}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          isLoading={loading}
        />
        <StatCard
          title="Confirmed"
          value={`₹${confirmedEarned.toLocaleString('en-IN')}`}
          icon={CheckCircle}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          isLoading={loading}
        />
        <StatCard
          title="Pending"
          value={`₹${pendingEarned.toLocaleString('en-IN')}`}
          icon={Clock}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
          isLoading={loading}
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Search */}
        <div className="px-5 py-3 border-b border-border">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by booking ref or PNR..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <TrendingUp className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No commission records found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Commission is earned on confirmed bookings
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Booking Ref</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Route</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Booking Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Commission</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((b: any) => {
                  const id = b._id || b.id
                  const route = b.route ||
                    (b.segments?.[0]
                      ? `${b.segments[0].origin} → ${b.segments[0].destination}`
                      : '—')
                  return (
                    <tr key={id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {b.bookingRef || id?.slice(-8) || '—'}
                        </span>
                        {b.pnr && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            PNR: {b.pnr}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Plane className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate max-w-[150px]">{route}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold">
                        ₹{(b.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={cn(
                          'font-bold',
                          (b.agentCommission || 0) > 0 ? 'text-emerald-500' : 'text-muted-foreground'
                        )}>
                          {(b.agentCommission || 0) > 0
                            ? `+₹${b.agentCommission.toLocaleString('en-IN')}`
                            : '—'
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn(
                          'text-xs font-semibold px-2.5 py-1 rounded-full capitalize',
                          STATUS_COLORS[b.status] || 'bg-muted text-muted-foreground'
                        )}>
                          {(b.status || 'pending').toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {b.createdAt
                          ? new Date(b.createdAt).toLocaleDateString('en-IN')
                          : '—'
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
