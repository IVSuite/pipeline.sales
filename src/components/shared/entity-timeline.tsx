"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Phone, Users as MeetingIcon, FileText, RefreshCw, Paperclip, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { EntityType, ActivityType } from "@/types/database";
import type { NoteWithAuthor, ActivityWithCreator } from "@/types/api";

const ACTIVITY_ICON: Record<ActivityType, React.ElementType> = {
  note: FileText,
  email: Mail,
  call: Phone,
  meeting: MeetingIcon,
  status_change: RefreshCw,
  attachment: Paperclip,
};

const LOGGABLE_TYPES: { value: ActivityType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
];

export function EntityTimeline({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const queryClient = useQueryClient();
  const [noteBody, setNoteBody] = useState("");
  const [logType, setLogType] = useState<ActivityType>("call");
  const [logBody, setLogBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const notesQuery = useQuery<{ data: NoteWithAuthor[] }>({
    queryKey: ["notes", entityType, entityId],
    queryFn: () =>
      fetch(`/api/notes?entity_type=${entityType}&entity_id=${entityId}`).then((r) => r.json()),
  });

  const activitiesQuery = useQuery<{ data: ActivityWithCreator[] }>({
    queryKey: ["activities", entityType, entityId],
    queryFn: () =>
      fetch(`/api/activities?entity_type=${entityType}&entity_id=${entityId}&limit=50`).then((r) =>
        r.json()
      ),
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["notes", entityType, entityId] });
    queryClient.invalidateQueries({ queryKey: ["activities", entityType, entityId] });
  }

  async function submitNote() {
    if (!noteBody.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, body: noteBody }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Failed to add note");
      return;
    }
    setNoteBody("");
    toast.success("Note added");
    invalidateAll();
  }

  async function submitLog() {
    if (!logBody.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, type: logType, body: logBody }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Failed to log activity");
      return;
    }
    setLogBody("");
    toast.success("Activity logged");
    invalidateAll();
  }

  async function deleteNote(id: string) {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete note");
      return;
    }
    invalidateAll();
  }

  const notes = notesQuery.data?.data ?? [];
  const activities = activitiesQuery.data?.data ?? [];

  const combined = [
    ...notes.map((n) => ({ kind: "note" as const, at: n.created_at, note: n })),
    ...activities.map((a) => ({ kind: "activity" as const, at: a.created_at, activity: a })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">Add a note</p>
          <Textarea
            rows={3}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Write a note…"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submitNote} loading={submitting} disabled={!noteBody.trim()}>
              Add note
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">Log an activity</p>
          <div className="flex flex-wrap gap-2">
            {LOGGABLE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setLogType(t.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  logType === t.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-surface-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Textarea
            rows={2}
            value={logBody}
            onChange={(e) => setLogBody(e.target.value)}
            placeholder="What happened?"
          />
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={submitLog} loading={submitting} disabled={!logBody.trim()}>
              Log activity
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Timeline</p>
        {combined.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="space-y-4 border-l border-border pl-4">
            {combined.map((item, idx) => {
              if (item.kind === "note") {
                return (
                  <li key={`note-${item.note.id}`} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm">{item.note.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Note by {item.note.author?.full_name ?? "Unknown"} · {formatDateTime(item.at)}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteNote(item.note.id)}
                        className="text-muted-foreground hover:text-red-500"
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              }
              const Icon = ACTIVITY_ICON[item.activity.type];
              return (
                <li key={`activity-${idx}-${item.activity.id}`} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      {item.activity.body && <p className="text-sm">{item.activity.body}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.activity.creator?.full_name ?? "System"} · {formatDateTime(item.at)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
