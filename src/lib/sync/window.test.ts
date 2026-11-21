import { describe, expect, it } from "vitest";
import {
	AHEAD_WINDOWS,
	type AheadWindow,
	DEFAULT_SYNC_RANGE,
	PAST_WINDOWS,
	type PastWindow,
} from "@/config/sync";
import { computePurgeCutoff, computeSyncWindow } from "./window";

// 18 November 2026, 09:00 in Paris (UTC+1; the clocks went back on 25 October).
const NOW = new Date("2026-11-18T09:00:00+01:00");

describe("computeSyncWindow", () => {
	it("goes from seven days ago to three months later by default", () => {
		expect(computeSyncWindow(NOW, "Europe/Paris", DEFAULT_SYNC_RANGE)).toEqual({
			timeMin: "2026-11-10T23:00:00.000Z",
			timeMax: "2027-02-17T23:00:00.000Z",
		});
	});

	it.each([
		["1w", "2026-11-10T23:00:00.000Z"],
		["2w", "2026-11-03T23:00:00.000Z"],
		// One calendar month back crosses the change to winter time: 18 October is UTC+2.
		["1m", "2026-10-17T22:00:00.000Z"],
	] as [PastWindow, string][])(
		"reaches back %s to the start of that day",
		(past, timeMin) => {
			expect(
				computeSyncWindow(NOW, "Europe/Paris", { past, ahead: "3m" }).timeMin,
			).toBe(timeMin);
		},
	);

	it.each([
		["1m", "2026-12-17T23:00:00.000Z"],
		["2m", "2027-01-17T23:00:00.000Z"],
		["3m", "2027-02-17T23:00:00.000Z"],
	] as [AheadWindow, string][])(
		"reaches %s ahead to the start of that day",
		(ahead, timeMax) => {
			expect(
				computeSyncWindow(NOW, "Europe/Paris", { past: "1w", ahead }).timeMax,
			).toBe(timeMax);
		},
	);

	it("clamps a month to the end of a shorter month", () => {
		const end = new Date("2026-03-31T12:00:00+02:00");
		expect(
			computeSyncWindow(end, "Europe/Paris", { past: "1m", ahead: "1m" }),
		).toEqual({
			timeMin: "2026-02-27T23:00:00.000Z",
			timeMax: "2026-04-29T22:00:00.000Z",
		});
	});

	it("follows the time zone, across the change of its offset", () => {
		// 09:00 in New York (UTC-5; 18 October is still UTC-4).
		const newYork = new Date("2026-11-18T14:00:00Z");
		expect(
			computeSyncWindow(newYork, "America/New_York", {
				past: "1m",
				ahead: "3m",
			}),
		).toEqual({
			timeMin: "2026-10-18T04:00:00.000Z",
			timeMax: "2027-02-18T05:00:00.000Z",
		});
	});

	it("is defined for every allowed pair", () => {
		for (const past of PAST_WINDOWS) {
			for (const ahead of AHEAD_WINDOWS) {
				const { timeMin, timeMax } = computeSyncWindow(NOW, "Europe/Paris", {
					past,
					ahead,
				});
				expect(new Date(timeMin).getTime()).toBeLessThan(NOW.getTime());
				expect(new Date(timeMax).getTime()).toBeGreaterThan(NOW.getTime());
			}
		}
	});
});

describe("computePurgeCutoff", () => {
	it.each([
		["1w", "2026-11-10T23:00:00.000Z"],
		["2w", "2026-11-03T23:00:00.000Z"],
		["1m", "2026-10-17T22:00:00.000Z"],
	] as [PastWindow, string][])(
		"is the start of the day %s back",
		(past, cutoff) => {
			expect(
				computePurgeCutoff(NOW, "Europe/Paris", { past, ahead: "3m" }),
			).toBe(cutoff);
		},
	);
});
