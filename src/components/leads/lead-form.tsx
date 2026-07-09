"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import { leadSchema, type LeadInput } from "@/lib/validation/schemas";
import { useProfiles } from "@/hooks/use-profiles";
import { useResourceList } from "@/hooks/use-resource";
import { LEAD_STATUSES, PRIORITY_LEVELS } from "@/types/database";
import type { LeadWithRelations } from "@/types/api";
import type { CompanyWithRelations } from "@/types/api";

export function LeadForm({
  open,
  onClose,
  onSubmit,
  lead,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: LeadInput) => void;
  lead?: LeadWithRelations;
  submitting?: boolean;
}) {
  const { data: profilesData } = useProfiles();
  const { data: companiesData } = useResourceList<CompanyWithRelations>("companies", { pageSize: 100 });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof leadSchema>, unknown, LeadInput>({ resolver: zodResolver(leadSchema) });

  useEffect(() => {
    if (open) {
      reset({
        full_name: lead?.full_name ?? "",
        company_id: lead?.company_id ?? "",
        email: lead?.email ?? "",
        phone: lead?.phone ?? "",
        position: lead?.position ?? "",
        lead_source: lead?.lead_source ?? "",
        assigned_to: lead?.assigned_to ?? "",
        deal_value: lead?.deal_value ?? 0,
        status: lead?.status ?? "new",
        priority: lead?.priority ?? "medium",
        notes: lead?.notes ?? "",
      });
    }
  }, [open, lead, reset]);

  return (
    <Modal open={open} onClose={onClose} title={lead ? "Edit lead" : "New lead"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" {...register("full_name")} />
            <FieldError>{errors.full_name?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="company_id">Company</Label>
            <Select id="company_id" {...register("company_id")}>
              <option value="">None</option>
              {companiesData?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="position">Position</Label>
            <Input id="position" {...register("position")} />
          </div>
          <div>
            <Label htmlFor="lead_source">Lead source</Label>
            <Input id="lead_source" placeholder="Website, referral, event…" {...register("lead_source")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="assigned_to">Assigned salesperson</Label>
            <Select id="assigned_to" {...register("assigned_to")}>
              <option value="">Unassigned</option>
              {profilesData?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="deal_value">Deal value ($)</Label>
            <Input id="deal_value" type="number" min={0} step="0.01" {...register("deal_value")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" {...register("status")}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" {...register("priority")}>
              {PRIORITY_LEVELS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} {...register("notes")} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {lead ? "Save changes" : "Create lead"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
