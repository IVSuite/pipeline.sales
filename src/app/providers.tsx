"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { Suspense, useState } from "react";
import { PwaRegister } from "@/components/shared/pwa-register";
import { IvSuiteBridge } from "@/components/shared/iv-suite-bridge";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <PwaRegister />
        {/* Suspense because the bridge reads useSearchParams, and /login is
            statically rendered — without it the whole page opts out of static
            generation and gets slower, which is the opposite of the goal. */}
        <Suspense fallback={null}>
          <IvSuiteBridge />
        </Suspense>
        {children}
        <Toaster richColors position="top-right" theme="system" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
