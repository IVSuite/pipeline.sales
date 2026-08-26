"use client";

/* ---------------------------------------------------------------------------
 * Shown when a signed-in account is not permitted to use the Sales Pipeline.
 *
 * Reached only from proxy.ts, which decides using shared.my_access() on the
 * server. This page renders the reason; it does not evaluate permission itself.
 * ------------------------------------------------------------------------- */

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandMark, BrandDivider } from "@/components/shared/brand-mark";

const MESSAGES: Record<string, { title: string; body: string }> = {
  pending: {
    title: "Waiting for approval",
    body:
      "Your account has been created but an administrator has not approved it yet. " +
      "You will be able to sign in here once it is approved and the Sales Pipeline is assigned to you.",
  },
  disabled: {
    title: "Account disabled",
    body: "This account is currently disabled. Please contact an administrator.",
  },
  rejected: {
    title: "Request declined",
    body: "This account's access request was declined. Please contact an administrator.",
  },
  "no-app": {
    title: "No access to Sales Pipeline",
    body:
      "Your IV Suite account is approved, but it has not been granted access to the " +
      "Sales Pipeline. Ask an administrator to assign it in IV Suite.",
  },
  unavailable: {
    title: "Could not verify access",
    body:
      "IV Suite could not confirm your permissions just now, so access was refused. " +
      "Please try again in a moment.",
  },
};

function AccessDeniedInner() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get("reason") || "no-app";
  const copy = MESSAGES[reason] ?? MESSAGES["no-app"];

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm animate-fade-in rounded-lg border border-border bg-surface p-8 shadow-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <BrandMark layout="stacked" size="lg" />
        <BrandDivider className="mt-4 mb-1" />
        <h1 className="mt-3 text-base font-semibold text-foreground">{copy.title}</h1>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
      <Button type="button" className="mt-6 w-full" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense>
      <AccessDeniedInner />
    </Suspense>
  );
}
