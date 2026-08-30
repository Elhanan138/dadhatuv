import { describe, expect, it } from "vitest";
import { migrate, parseImport } from "@/lib/storage";
import { INITIAL_STATE, STATE_VERSION } from "@/lib/seed/defaults";

describe("migrate", () => {
  it("returns a clean state for junk input", () => {
    expect(migrate(null)).toEqual(INITIAL_STATE);
    expect(migrate("nope")).toEqual(INITIAL_STATE);
    expect(migrate(42)).toEqual(INITIAL_STATE);
  });

  it("stamps the current state version", () => {
    expect(migrate({ version: 0 }).version).toBe(STATE_VERSION);
  });

  it("keeps user data that is present", () => {
    const entries = [{ id: "e1" }] as never;
    const state = migrate({ onboarded: true, entries, days: { "2026-08-30": { date: "2026-08-30" } } });
    expect(state.onboarded).toBe(true);
    expect(state.entries).toBe(entries);
    expect(state.days["2026-08-30"]).toBeDefined();
  });

  it("backfills engine keys added in a newer version", () => {
    const state = migrate({ engine: { proteinPerKg: 2.5 } });
    expect(state.engine.proteinPerKg).toBe(2.5);
    expect(state.engine.formula).toBe(INITIAL_STATE.engine.formula);
    expect(state.engine.waterMlPerKg).toBe(INITIAL_STATE.engine.waterMlPerKg);
  });

  it("backfills nested manual targets", () => {
    const state = migrate({ settings: { manualTargets: { kcal: 1800 } } });
    expect(state.settings.manualTargets.kcal).toBe(1800);
    expect(state.settings.manualTargets.protein).toBe(INITIAL_STATE.settings.manualTargets.protein);
  });

  it("restores seed foods when the stored list is empty", () => {
    expect(migrate({ foods: [] }).foods).toBe(INITIAL_STATE.foods);
  });

  it("restores default alerts and categories when they were wiped", () => {
    const state = migrate({ settings: { alerts: [], categories: [] } });
    expect(state.settings.alerts).toBe(INITIAL_STATE.settings.alerts);
    expect(state.settings.categories).toBe(INITIAL_STATE.settings.categories);
  });

  it("defaults collections that were never written", () => {
    const state = migrate({});
    expect(state.recipes).toEqual([]);
    expect(state.entries).toEqual([]);
    expect(state.days).toEqual({});
    expect(state.profile).toBeNull();
  });
});

describe("parseImport", () => {
  const backup = JSON.stringify({ version: 1, foods: [], entries: [], onboarded: true });

  it("accepts a real backup", () => {
    const result = parseImport(backup);
    expect(result.ok).toBe(true);
    expect(result.state?.onboarded).toBe(true);
  });

  it("rejects malformed JSON", () => {
    const result = parseImport("{ not json");
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects JSON that is not an abba-hatuv backup", () => {
    expect(parseImport(JSON.stringify({ hello: "world" })).ok).toBe(false);
  });

  it("rejects a backup missing the version marker", () => {
    expect(parseImport(JSON.stringify({ foods: [] })).ok).toBe(false);
  });

  it("rejects a JSON literal that is not an object", () => {
    expect(parseImport("null").ok).toBe(false);
  });

  it("runs the import through migrate", () => {
    const result = parseImport(JSON.stringify({ version: 0, foods: [], engine: { proteinPerKg: 1.6 } }));
    expect(result.state?.version).toBe(STATE_VERSION);
    expect(result.state?.engine.proteinPerKg).toBe(1.6);
  });
});
