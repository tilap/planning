import { describe, expect, it } from "vitest";
import { fakeSync } from "./fake-data";

describe("fakeSync", () => {
	it("returns events of known calendars around today", () => {
		const { calendars, events } = fakeSync(new Date("2026-11-18T12:00:00Z"));
		const ids = new Set(calendars.map((calendar) => calendar.id));
		expect(events.length).toBeGreaterThan(0);
		expect(events.every((event) => ids.has(event.calendarId))).toBe(true);
		expect(events.some((event) => event.start.startsWith("2026-11-18"))).toBe(
			true,
		);
	});
});
