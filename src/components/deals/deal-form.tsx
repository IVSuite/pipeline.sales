"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Select } from "@/components/ui/input";
import { dealSchema, type DealInput } from "@/lib/validation/schemas";
import { useProfiles } from "@/hooks/use-profiles";
import { useResourceList } from "@/hooks/use-resource";
import { DEAL_STAGES } from "@/types/database";
import type { DealWithRelations, CompanyWithRelations, LeadWithRelations, CustomerWithRelations } from "@/types/api";

export function DealForm({
  open,
  onClose,
  onSubmit,
  deal,
  defaultStage,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: DealInput) => void;
  deal?: DealWithRelations;
  defaultStage?: string;
  submitting?: boolean;
}) {
  const { data: profilesData } = useProfiles();
  const { data: companiesData } = useResourceList<CompanyWithRelations>("companies", { pageSize: 100 });
  const { data: leadsData } = useResourceList<LeadWithRelations>("leads", { pageSize: 100 });
  const { data: customersData } = useResourceList<CustomerWithRelations>("customers", { pageSize: 100 });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof dealSchema>, unknown, DealInput>({ resolver: zodResolver(dealSchema) });

  useEffect(() => {
    if (open) {
      reset({
        title: deal?.title ?? "",
        lead_id: deal?.lead_id ?? "",
        customer_id: deal?.customer_id ?? "",
        company_id: deal?.company_id ?? "",
        value: deal?.value ?? 0,
        stage: (deal?.stage as DealInput["stage"]) ?? (defaultStage as DealInput["stage"]) ?? "new_lead",
        owner_id: deal?.owner_id ?? "",
        expected_close_date: deal?.expected_close_date ?? "",
      });
    }
  }, [open, deal, defaultStage, reset]);

  return (
    <Modal open={open} onClose={onClose} title={deal ? "Edit deal" : "New deal"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="title">Deal title</Label>
          <Input id="title" {...register("title")} />
          <FieldError>{errors.title?.message}</FieldError>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_id">Company</Label>
            <Select id="company_id" {...register("company_id")}>
              <option value="">None</option>
              {companiesData?.data.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="value">Value ($)</Label>
            <Input id="value" type="number" min={0} step="0.01" {...register("value")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lead_id">Linked lead</Label>
            <Select id="lead_id" {...register("lead_id")}>
              <option value="">None</option>
              {leadsData?.data.map((l) => (
                <option key={l.id} value={l.id}>{l.full_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="customer_id">Linked customer</Label>
            <Select id="customer_id" {...register("customer_id")}>
              <option value="">None</option>
              {customersData?.data.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="stage">Stage</Label>
            <Select id="stage" {...register("stage")}>
              {DEAL_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="owner_id">Owner</Label>
            <Select id="owner_id" {...register("owner_id")}>
              <option value="">Unassigned</option>
              {profilesData?.data.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="expected_close_date">Expected close date</Label>
          <Input id="expected_close_date" type="date" {...register("expected_close_date")} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>{deal ? "Save changes" : "Create deal"}</Button>
        </div>
      </form>
    </Modal>
  );
}
