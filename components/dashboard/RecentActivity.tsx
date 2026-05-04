import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

const activities = [
  { user: "Alice Johnson", action: "Created new project", time: "2m ago", type: "create" },
  { user: "Bob Smith", action: "Updated user settings", time: "15m ago", type: "update" },
  { user: "Carol White", action: "Deleted old records", time: "1h ago", type: "delete" },
  { user: "David Brown", action: "Invited team member", time: "2h ago", type: "invite" },
  { user: "Eva Martinez", action: "Exported report", time: "3h ago", type: "export" },
];

const typeColors: Record<string, any> = {
  create: "success",
  update: "default",
  delete: "destructive",
  invite: "secondary",
  export: "warning",
};

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-start gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(activity.user)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activity.user}</p>
              <p className="text-xs text-muted-foreground">{activity.action}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={typeColors[activity.type]} className="text-xs capitalize">
                {activity.type}
              </Badge>
              <span className="text-xs text-muted-foreground">{activity.time}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
