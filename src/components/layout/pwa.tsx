"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The install event isn't in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "abba-hatuv:install-dismissed";

/**
 * Registers the service worker and surfaces a new deploy as a prompt rather than
 * swapping the app out from under someone mid-entry.
 */
export function ServiceWorkerManager() {
  const [waiting, setWaiting] = React.useState<ServiceWorker | null>(null);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker
      // updateViaCache:"none" so the browser re-checks sw.js itself on every load
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (cancelled) return;

        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaiting(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // a worker that installs with no controller is the very first one — not an update
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(installing);
            }
          });
        });
      })
      .catch(() => {
        // offline support is a bonus; never let a failed registration surface to the user
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function applyUpdate() {
    waiting?.postMessage("SKIP_WAITING");
    // controllerchange fires once the new worker takes over
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
      once: true,
    });
    setWaiting(null);
  }

  return (
    <AnimatePresence>
      {waiting && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 bottom-24 z-[70] mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border bg-card/95 py-2 pe-2 ps-4 shadow-lg backdrop-blur sm:bottom-6"
        >
          <span className="text-sm">גרסה חדשה זמינה</span>
          <Button size="sm" onClick={applyUpdate}>
            <RefreshCw className="h-3.5 w-3.5" />
            רענן
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Chrome/Edge fire `beforeinstallprompt` when the app qualifies for installation.
 * Returns null on iOS and on browsers that never fire it, so callers can hide the UI.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = React.useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome === "accepted";
  }, [deferred]);

  return { canInstall: !!deferred && !installed, installed, install };
}

/** A one-time, dismissible nudge to install. Shown only where the browser supports it. */
export function InstallBanner() {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // a browser that blocks storage just gets the banner again next time
    }
  }

  if (!canInstall || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
      <Download className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-sm">
        התקן את אבא חטוב על המסך הראשי — נפתח מיידית ועובד גם בלי אינטרנט.
      </p>
      <Button size="sm" onClick={() => void install()}>
        התקן
      </Button>
      <Button variant="ghost" size="icon" aria-label="סגירה" onClick={dismiss}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
