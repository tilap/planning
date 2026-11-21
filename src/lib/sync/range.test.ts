import { describe, expect, it } from "vitest";
import type { Preferences } from "../cache/preferences";
import { syncRangeOf } from "./range";

describe("syncRangeOf", () => {
	it("is a week back and three months ahead without preferences", () => {
		expect(syncRangeOf(null)).toEqual({ past: "1w", ahead: "3m" });
		expect(syncRangeOf({})).toEqual({ past: "1w", ahead: "3m" });
	});

	it("reads the stored values", () => {
		expect(syncRangeOf({ syncPast: "1m", syncAhead: "1m" })).toEqual({
			past: "1m",
			ahead: "1m",
		});
	});

	it("falls back to the default for an unknown stored value", () => {
		const stored = { syncPast: "3w", syncAhead: 90 } as unknown as Preferences;
		expect(syncRangeOf(stored)).toEqual({ past: "1w", ahead: "3m" });
	});
});
