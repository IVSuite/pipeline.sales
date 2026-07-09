"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Select } from "@/components/ui/input";
import { customerSchema, type CustomerInput } from "@/lib/validation/schemas";
import { useProfiles } from "@/hooks/use-profiles";
import { useResourceList } from "@/hooks/use-resource";
import type { CustomerWithRelations, CompanyWithRelations } from "@/types/api";

export function CustomerForm({
  open,
  onClose,
  onSubmit,
  customer,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CustomerInput) => void;
  customer?: CustomerWithRelations;
  submitting?: boolean;
}) {
  const { data: profilesData } = useProfiles();
  const { data: companiesData } = useResourceList<CompanyWithRelations>("companies", { pageSize: 100 });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerInput>({ resolver: zodResolver(customerSchema) });

  useEffect(() => {
    if (open) {
      reset({
        full_name: customer?.full_name ?? "",
        email: customer?.email ?? "",
        phone: customer?.phone ?? "",
        company_id: customer?.company_id ?? "",
        assigned_to: customer?.assigned_to ?? "",
      });
    }
  }, [open, customer, reset]);

  return (
    <Modal open={open} onClose={onClose} title={customer ? "Edit customer" : "New customer"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" {...register("full_name")} />
          <FieldError>{errors.full_name?.message}</FieldError>
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
          <div>
            <Label htmlFor="assigned_to">Assigned to</Label>
            <Select id="assigned_to" {...register("assigned_to")}>
              <option value="">Unassigned</option>
              {profilesData?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {customer ? "Save changes" : "Create customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
