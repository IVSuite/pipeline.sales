import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { TaskWithRelations } from "@/types/api";

export function UpcomingTasks({ tasks }: { tasks: TaskWithRelations[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing due — you&apos;re all caught up.</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.assignee?.full_name ?? "Unassigned"} · {formatDateTime(task.due_date)}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                  <Badge tone={statusTone(task.status)}>{task.status.replace("_", " ")}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <div className="border-t border-border p-3 text-center">
        <Link href="/tasks" className="text-xs font-medium text-primary hover:underline">
          View all tasks
        </Link>
      </div>
    </Card>
  );
}
