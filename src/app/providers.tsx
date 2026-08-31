"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceWorkerManager } from "@/components/layout/pwa";
import { StoreProvider, useStore } from "@/lib/store";
import { PageSkeleton } from "@/components/ui/skeleton";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <StoreProvider>
        <ToastProvider>
          <OnboardingGate>
            <AppShell>{children}</AppShell>
          </OnboardingGate>
          <ServiceWorkerManager />
        </ToastProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}

/** Blocks the app until persisted state is hydrated, and pushes first-run users to onboarding. */
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { state, ready } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!ready) return;
    if (!state.onboarded && pathname !== "/onboarding") router.replace("/onboarding");
    if (state.onboarded && pathname === "/onboarding") router.replace("/");
  }, [ready, state.onboarded, pathname, router]);

  const blocked = !ready || (!state.onboarded && pathname !== "/onboarding");

  if (blocked) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }
  return <>{children}</>;
}
