import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  iconColor?: string
  iconBg?: string
  trend?: number
  isLoading?: boolean
}

export function StatCard({ title, value, subtitle, icon: Icon, iconColor, iconBg, trend, isLoading }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          {isLoading ? (
            <div className="h-7 w-24 bg-muted rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold font-display">{value}</p>
          )}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', trend >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend)}% vs last month
            </div>
          )}
        </div>
        <div className={cn('p-2.5 rounded-xl', iconBg || 'bg-primary/10')}>
          <Icon className={cn('h-5 w-5', iconColor || 'text-primary')} />
        </div>
      </div>
    </div>
  )
}
