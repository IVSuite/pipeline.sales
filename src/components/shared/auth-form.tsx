"use client";

/* ---------------------------------------------------------------------------
 * Sign-in only.
 *
 * Account creation moved to IV Suite on 2026-08-26 and is deliberately NOT
 * available here. The old signup form let the visitor choose their own role
 * (admin / manager / sales_rep) and passed it through
 * `signUp({ options: { data: { role } } })`, which crm.handle_new_user() then
 * trusted — a self-service route to a CRM admin account on a publicly reachable
 * deployment. The database side of that hole is closed too (the trigger no
 * longer reads a role out of user metadata).
 *
 * The Pipeline runs on its own origin, so it cannot share the desktop shell's
 * stored session and still needs a sign-in box. Authorization does not depend on
 * that: proxy.ts checks approved-status and `pipeline` app access on every
 * request, and the crm.* tables carry RESTRICTIVE app_access_guard policies that
 * enforce the same rule independently.
 * ------------------------------------------------------------------------- */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { BrandMark, BrandDivider } from "@/components/shared/brand-mark";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push(searchParams.get("redirectTo") || "/dashboard");
    router.refresh();
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in with your IV Suite account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Accounts are created in IV Suite. Ask an administrator for access.
      </p>
    </AuthCard>
  );
}

function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-sm animate-fade-in rounded-lg border border-border bg-surface p-8 shadow-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <BrandMark layout="stacked" size="lg" />
        <BrandDivider className="mt-4 mb-1" />
        <h1 className="mt-3 text-base font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
