import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  confirmed:     { label: 'Confirmed',     cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  active:        { label: 'Active',        cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  approved:      { label: 'Approved',      cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  completed:     { label: 'Completed',     cls: 'bg-primary/10 text-primary border-blue-500/30' },
  paid:          { label: 'Paid',          cls: 'bg-primary/10 text-primary border-blue-500/30' },
  pending:       { label: 'Pending',       cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  pending_kyc:   { label: 'Pending KYC',   cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  pending_payment:{ label: 'Pending Pay',  cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  submitted:     { label: 'Submitted',     cls: 'bg-primary/10 text-primary border-blue-500/30' },
  under_review:  { label: 'Under Review',  cls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  kyc_submitted: { label: 'KYC Submitted', cls: 'bg-primary/10 text-primary border-blue-500/30' },
  cancelled:     { label: 'Cancelled',     cls: 'bg-rose-500/10 text-rose-500 border-rose-500/30' },
  rejected:      { label: 'Rejected',      cls: 'bg-rose-500/10 text-rose-500 border-rose-500/30' },
  refunded:      { label: 'Refunded',      cls: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' },
  suspended:     { label: 'Suspended',     cls: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  inactive:      { label: 'Inactive',      cls: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
  open:          { label: 'Open',          cls: 'bg-primary/10 text-primary border-blue-500/30' },
  generated:     { label: 'Generated',     cls: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  released:      { label: 'Released',      cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  reversed:      { label: 'Reversed',      cls: 'bg-rose-500/10 text-rose-500 border-rose-500/30' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || {
    label: status?.replace(/_/g, ' ') || 'Unknown',
    cls: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize', cfg.cls)}>
      {cfg.label}
    </span>
  )
}
