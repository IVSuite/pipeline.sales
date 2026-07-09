import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CurrentUserProvider } from "@/hooks/use-current-user";
import { AppShell } from "@/components/layout/app-shell";
import type { Profile } from "@/types/database";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    redirect("/login");
  }

  return (
    <CurrentUserProvider profile={profile as Profile}>
      <AppShell>{children}</AppShell>
    </CurrentUserProvider>
  );
}
