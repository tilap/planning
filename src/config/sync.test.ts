import { describe, expect, it } from "vitest";
import * as config from "./sync";

describe("sync config", () => {
	it("allows exactly the documented past and future ranges", () => {
		expect(config.PAST_WINDOWS).toEqual(["1w", "2w", "1m"]);
		expect(config.AHEAD_WINDOWS).toEqual(["1m", "2m", "3m"]);
		expect(config.DEFAULT_SYNC_RANGE).toEqual({ past: "1w", ahead: "3m" });
		expect(config.foregroundResyncMinutes).toBe(15);
		expect(config.syncRequestTimeoutMs).toBe(20_000);
		expect(config.sessionCheckTimeoutMs).toBe(8_000);
	});

	it("maps every range to calendar units", () => {
		expect(config.PAST_WINDOW_SPAN).toEqual({
			"1w": { days: 7 },
			"2w": { days: 14 },
			"1m": { months: 1 },
		});
		expect(config.AHEAD_WINDOW_MONTHS).toEqual({ "1m": 1, "2m": 2, "3m": 3 });
	});

	it("recognises only the allowed values", () => {
		expect(config.isPastWindow("2w")).toBe(true);
		expect(config.isAheadWindow("2m")).toBe(true);
		for (const value of ["3w", "0", "999", "7", "1y", "", null, undefined, 7]) {
			expect(config.isPastWindow(value)).toBe(false);
		}
		for (const value of ["1w", "4m", "0", "90", "", null, undefined, 3]) {
			expect(config.isAheadWindow(value)).toBe(false);
		}
	});
});
