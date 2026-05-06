"use client";

import { Sparkles, TrendingDown, BadgePercent, Wallet } from "lucide-react";

export function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">Exclusive Series Fares</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Search to discover Tramps Aviation&apos;s exclusive contracted fares — lower base prices with agent commission built in.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-4 max-w-md mx-auto text-sm">
        {[
          { icon: TrendingDown, label: "Lower base fares", sub: "Directly contracted" },
          { icon: BadgePercent, label: "Agent commission", sub: "Built into every fare" },
          { icon: Wallet, label: "Wallet payment", sub: "Instant confirmation" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-2 p-3 bg-muted/40 rounded-xl">
            <item.icon className="h-5 w-5 text-primary" />
            <p className="font-medium text-xs">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
