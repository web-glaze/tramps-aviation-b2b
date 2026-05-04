"use client";
import { useEffect } from "react";
import { useStatsStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardChart() {
  const { stats, loading, fetchStats } = useStatsStore();

  useEffect(() => { fetchStats(); }, []);

  const chartData = stats?.chartData ?? [];

  if (loading) return (
    <Card>
      <CardHeader><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-56" /></CardHeader>
      <CardContent><Skeleton className="h-64 w-full" /></CardContent>
    </Card>
  );

  if (!chartData.length) return (
    <Card>
      <CardHeader><CardTitle>Revenue Overview</CardTitle><CardDescription>Monthly revenue</CardDescription></CardHeader>
      <CardContent><div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data yet</div></CardContent>
    </Card>
  );

  const maxRevenue = Math.max(...chartData.map((d: any) => d.revenue), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>Monthly revenue for the current year</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end gap-3 px-2">
          {chartData.map((point: any) => {
            const h = (point.revenue / maxRevenue) * 100;
            return (
              <div key={point.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative group" style={{ height:"200px" }}>
                  <div className="absolute bottom-0 w-full bg-primary/20 hover:bg-primary/40 rounded-t-md transition-all duration-300 cursor-pointer" style={{ height:`${h}%` }}>
                    <div className="absolute bottom-0 w-full bg-primary rounded-t-md" style={{ height:"40%" }}/>
                  </div>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    ₹{(point.revenue/1000).toFixed(1)}k
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{point.month}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
