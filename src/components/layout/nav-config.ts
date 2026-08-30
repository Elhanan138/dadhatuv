import { CalendarDays, Home, LineChart, Salad, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  short: string;
}

export const NAV: NavItem[] = [
  { href: "/", label: "היום", icon: Home, short: "היום" },
  { href: "/log", label: "יומן יומי", icon: CalendarDays, short: "יומן" },
  { href: "/food", label: "מאגר מזון", icon: Salad, short: "מזון" },
  { href: "/progress", label: "התקדמות", icon: LineChart, short: "מדדים" },
  { href: "/settings", label: "הגדרות", icon: Settings2, short: "הגדרות" },
];
