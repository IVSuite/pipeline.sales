import { Mail, Phone, Users as MeetingIcon, FileText, RefreshCw, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { ActivityType } from "@/types/database";
import type { ActivityWithCreator } from "@/types/api";

const ACTIVITY_ICON: Record<ActivityType, React.ElementType> = {
  note: FileText,
  email: Mail,
  call: Phone,
  meeting: MeetingIcon,
  status_change: RefreshCw,
  attachment: Paperclip,
};

export function RecentActivities({ activities }: { activities: ActivityWithCreator[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-4">
            {activities.map((activity) => {
              const Icon = ACTIVITY_ICON[activity.type];
              return (
                <li key={activity.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm">{activity.body || `${activity.type} on ${activity.entity_type}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.creator?.full_name ?? "System"} · {formatDateTime(activity.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
