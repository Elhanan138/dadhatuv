import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cn,
  formatDateHe,
  formatShort,
  fromKey,
  lastNDays,
  nowTime,
  relativeDayHe,
  shiftKey,
  toKey,
  todayKey,
  uid,
} from "@/lib/utils";

afterEach(() => {
  vi.useRealTimers();
});

/** Freezes the clock at a local-time instant, so date keys never depend on the runner's timezone. */
function freeze(y: number, m: number, d: number, h = 9, min = 30) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(y, m - 1, d, h, min, 0));
}

describe("cn", () => {
  it("merges conditional classes", () => {
    expect(cn("p-2", false && "hidden", "text-sm")).toBe("p-2 text-sm");
  });

  it("lets a later tailwind class win", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("uid", () => {
  it("prefixes and never repeats", () => {
    const ids = new Set(Array.from({ length: 500 }, () => uid("log")));
    expect(ids.size).toBe(500);
    expect([...ids][0]).toMatch(/^log_/);
  });
});

describe("toKey / fromKey", () => {
  it("formats a local date as yyyy-MM-dd", () => {
    expect(toKey(new Date(2026, 7, 5))).toBe("2026-08-05");
  });

  it("does not shift the day near midnight in any timezone", () => {
    // 00:30 local — a UTC-based formatter would roll this back a day west of Greenwich
    expect(toKey(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
    // 23:30 local — and forward a day east of it
    expect(toKey(new Date(2026, 0, 1, 23, 30))).toBe("2026-01-01");
  });

  it("round-trips through fromKey", () => {
    expect(toKey(fromKey("2026-02-28"))).toBe("2026-02-28");
  });
});

describe("shiftKey", () => {
  it("moves forward and back", () => {
    expect(shiftKey("2026-08-30", 1)).toBe("2026-08-31");
    expect(shiftKey("2026-08-30", -1)).toBe("2026-08-29");
  });

  it("crosses a month boundary", () => {
    expect(shiftKey("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("crosses a year boundary", () => {
    expect(shiftKey("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles a leap day", () => {
    expect(shiftKey("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("lastNDays", () => {
  it("returns an ascending window ending on the given day", () => {
    expect(lastNDays(3, "2026-08-30")).toEqual(["2026-08-28", "2026-08-29", "2026-08-30"]);
  });

  it("returns a single day for n = 1", () => {
    expect(lastNDays(1, "2026-08-30")).toEqual(["2026-08-30"]);
  });
});

describe("todayKey", () => {
  it("tracks the frozen clock", () => {
    freeze(2026, 8, 30);
    expect(todayKey()).toBe("2026-08-30");
  });
});

describe("relativeDayHe", () => {
  it("names today, yesterday and tomorrow", () => {
    freeze(2026, 8, 30);
    expect(relativeDayHe("2026-08-30")).toBe("היום");
    expect(relativeDayHe("2026-08-29")).toBe("אתמול");
    expect(relativeDayHe("2026-08-31")).toBe("מחר");
  });

  it("returns null for anything further out", () => {
    freeze(2026, 8, 30);
    expect(relativeDayHe("2026-08-20")).toBeNull();
  });
});

describe("formatting", () => {
  it("formats a Hebrew long date", () => {
    // 2026-08-30 is a Sunday
    expect(formatDateHe("2026-08-30")).toBe("יום ראשון, 30 באוגוסט");
  });

  it("formats a short day/month", () => {
    expect(formatShort("2026-08-05")).toBe("5/8");
  });

  it("pads the current time to HH:mm", () => {
    freeze(2026, 8, 30, 7, 5);
    expect(nowTime()).toBe("07:05");
  });
});
