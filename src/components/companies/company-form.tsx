"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Select } from "@/components/ui/input";
import { companySchema, type CompanyInput } from "@/lib/validation/schemas";
import { useProfiles } from "@/hooks/use-profiles";
import type { CompanyWithRelations } from "@/types/api";

export function CompanyForm({
  open,
  onClose,
  onSubmit,
  company,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CompanyInput) => void;
  company?: CompanyWithRelations;
  submitting?: boolean;
}) {
  const { data: profilesData } = useProfiles();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyInput>({ resolver: zodResolver(companySchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: company?.name ?? "",
        industry: company?.industry ?? "",
        website: company?.website ?? "",
        phone: company?.phone ?? "",
        address: company?.address ?? "",
        owner_id: company?.owner_id ?? "",
      });
    }
  }, [open, company, reset]);

  return (
    <Modal open={open} onClose={onClose} title={company ? "Edit company" : "New company"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Company name</Label>
          <Input id="name" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" {...register("industry")} />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...register("website")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div>
            <Label htmlFor="owner_id">Owner</Label>
            <Select id="owner_id" {...register("owner_id")}>
              <option value="">Unassigned</option>
              {profilesData?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input id="address" {...register("address")} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {company ? "Save changes" : "Create company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
