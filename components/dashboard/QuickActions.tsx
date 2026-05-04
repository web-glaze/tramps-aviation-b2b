"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function QuickActions() {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.info("Refreshing data...")}
      >
        <RefreshCw className="h-4 w-4 mr-1.5" />
        Refresh
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.success("Exporting report...")}
      >
        <Download className="h-4 w-4 mr-1.5" />
        Export
      </Button>
      <Button size="sm" onClick={() => toast.success("Create dialog would open here")}>
        <PlusIcon className="h-4 w-4 mr-1.5" />
        New
      </Button>
    </div>
  );
}
