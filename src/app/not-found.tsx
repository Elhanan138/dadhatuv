import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
      <p className="font-display text-4xl font-black">404</p>
      <p className="text-sm text-muted-foreground">הדף הזה לא קיים.</p>
      <Button asChild variant="outline">
        <Link href="/">חזרה למסך היום</Link>
      </Button>
    </div>
  );
}
