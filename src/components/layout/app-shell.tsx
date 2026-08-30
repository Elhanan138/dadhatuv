"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { NAV } from "@/components/layout/nav-config";
import { ThemeToggle } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const { state } = useStore();

  if (pathname === "/onboarding") return <>{children}</>;

  const title = NAV.find((n) => n.href === pathname)?.label ?? "אבא חטוב";

  return (
    <div className="flex min-h-dvh">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-s bg-card transition-[width] duration-200 md:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div className={cn("flex h-16 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
          <Mark />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold leading-tight">אבא חטוב</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {state.profile?.name || "ניהול הרכב גוף"}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn("flex items-center gap-1 border-t p-2", collapsed && "flex-col")}>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "פתיחת התפריט" : "כיווץ התפריט"}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b bg-background/85 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <Mark />
            <span className="font-display font-bold">{title}</span>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        <BottomNav pathname={pathname} />
      </div>
    </div>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
              {item.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Mark() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary font-display text-sm font-black text-primary-foreground">
      א״ח
    </span>
  );
}
