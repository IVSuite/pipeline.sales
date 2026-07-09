"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import { taskSchema, type TaskInput } from "@/lib/validation/schemas";
import { useProfiles } from "@/hooks/use-profiles";
import { PRIORITY_LEVELS, TASK_STATUSES } from "@/types/database";
import type { TaskWithRelations } from "@/types/api";

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskForm({
  open,
  onClose,
  onSubmit,
  task,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaskInput) => void;
  task?: TaskWithRelations;
  submitting?: boolean;
}) {
  const { data: profilesData } = useProfiles();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof taskSchema>, unknown, TaskInput>({ resolver: zodResolver(taskSchema) });

  useEffect(() => {
    if (open) {
      reset({
        title: task?.title ?? "",
        description: task?.description ?? "",
        due_date: toDatetimeLocal(task?.due_date),
        priority: task?.priority ?? "medium",
        status: task?.status ?? "pending",
        assigned_to: task?.assigned_to ?? "",
        reminder_at: toDatetimeLocal(task?.reminder_at),
      });
    }
  }, [open, task, reset]);

  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...register("title")} />
          <FieldError>{errors.title?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} {...register("description")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="due_date">Due date</Label>
            <Input id="due_date" type="datetime-local" {...register("due_date")} />
          </div>
          <div>
            <Label htmlFor="reminder_at">Reminder</Label>
            <Input id="reminder_at" type="datetime-local" {...register("reminder_at")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" {...register("priority")}>
              {PRIORITY_LEVELS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" {...register("status")}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="assigned_to">Assigned user</Label>
          <Select id="assigned_to" {...register("assigned_to")}>
            <option value="">Unassigned</option>
            {profilesData?.data.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>{task ? "Save changes" : "Create task"}</Button>
        </div>
      </form>
    </Modal>
  );
}
