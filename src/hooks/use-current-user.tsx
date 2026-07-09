"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/types/database";

const CurrentUserContext = createContext<Profile | null>(null);

export function CurrentUserProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return <CurrentUserContext.Provider value={profile}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): Profile {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return ctx;
}
