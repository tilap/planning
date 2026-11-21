import { describe, expect, it } from "vitest";
import { matchesQuery } from "./search";
import type { StoredEvent } from "./types";

const event: StoredEvent = {
	id: "e1",
	calendarId: "c1",
	title: "Café avec Marie",
	allDay: false,
	start: "2026-11-18T09:00:00Z",
	end: "2026-11-18T10:00:00Z",
	location: "Rue des Lilas",
	description: "Parler du projet",
};

describe("matchesQuery", () => {
	it("matches everything when the query is empty", () => {
		expect(matchesQuery(event, undefined, "")).toBe(true);
		expect(matchesQuery(event, undefined, "   ")).toBe(true);
	});

	it("ignores case and accents", () => {
		expect(matchesQuery(event, undefined, "CAFE")).toBe(true);
		expect(matchesQuery(event, undefined, "cafe marie")).toBe(true);
	});

	it("looks in the location, the description and the calendar name", () => {
		expect(matchesQuery(event, undefined, "lilas")).toBe(true);
		expect(matchesQuery(event, undefined, "projet")).toBe(true);
		expect(matchesQuery(event, "Travail", "travail")).toBe(true);
	});

	it("requires every word", () => {
		expect(matchesQuery(event, undefined, "cafe paul")).toBe(false);
	});
});
