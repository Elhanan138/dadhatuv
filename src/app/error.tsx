"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
      <p className="font-display text-xl font-bold">משהו נשבר</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error.message || "אירעה שגיאה בטעינת המסך. הנתונים שלך שמורים על המכשיר."}
      </p>
      <Button onClick={reset}>נסה שוב</Button>
    </div>
  );
}
