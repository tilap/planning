import { describe, expect, it } from "vitest";
import type { Memory } from "../cache/memory";
import type { StoredEvent } from "../events/types";
import { mergeSyncResult, type SyncResponse } from "./merge";

const TIME_ZONE = "Europe/Paris";
const CALENDAR = { id: "cal", name: "Perso", color: "x" };

function event(id: string, start: string, end: string): StoredEvent {
	return { id, calendarId: "cal", title: id, allDay: false, start, end };
}

const response = (events: StoredEvent[]): SyncResponse => ({
	calendars: [CALENDAR],
	events,
	syncedAt: "2026-11-18T08:00:00.000Z",
});

const memory = (events: StoredEvent[]): Memory => ({
	events,
	calendars: [CALENDAR],
	lastSync: null,
});

const ids = (result: Memory) => result.events.map((e) => e.id).sort();

describe("mergeSyncResult", () => {
	// A one-month future window, then a three-month one, from 11 November.
	const timeMin = "2026-11-10T23:00:00.000Z";
	const cutoff = timeMin;

	it("removes the events beyond the end of a shrunk future window", () => {
		const before = memory([
			event("soon", "2026-11-20T10:00:00Z", "2026-11-20T11:00:00Z"),
			event("far", "2027-02-01T10:00:00Z", "2027-02-01T11:00:00Z"),
		]);
		// The new, shorter window: Google only returns what is inside it.
		const result = mergeSyncResult(
			before,
			response([event("soon", "2026-11-20T10:00:00Z", "2026-11-20T11:00:00Z")]),
			{ timeMin, cutoff, timeZone: TIME_ZONE },
		);

		expect(ids(result)).toEqual(["soon"]);
	});

	it("keeps everything Google returns when the future window grows", () => {
		const before = memory([
			event("soon", "2026-11-20T10:00:00Z", "2026-11-20T11:00:00Z"),
		]);
		const result = mergeSyncResult(
			before,
			response([
				event("soon", "2026-11-20T10:00:00Z", "2026-11-20T11:00:00Z"),
				event("far", "2027-02-01T10:00:00Z", "2027-02-01T11:00:00Z"),
			]),
			{ timeMin, cutoff, timeZone: TIME_ZONE },
		);

		expect(ids(result)).toEqual(["far", "soon"]);
	});

	it("drops the events that end before the cutoff of a shrunk past window", () => {
		const before = memory([
			event("old", "2026-10-25T10:00:00Z", "2026-10-25T11:00:00Z"),
			event("recent", "2026-11-12T10:00:00Z", "2026-11-12T11:00:00Z"),
		]);
		const result = mergeSyncResult(
			before,
			response([
				event("recent", "2026-11-12T10:00:00Z", "2026-11-12T11:00:00Z"),
			]),
			{ timeMin, cutoff, timeZone: TIME_ZONE },
		);

		expect(ids(result)).toEqual(["recent"]);
	});

	it("takes the older events of a grown past window from the response", () => {
		const result = mergeSyncResult(
			memory([]),
			response([event("old", "2026-10-25T10:00:00Z", "2026-10-25T11:00:00Z")]),
			{
				timeMin: "2026-10-17T22:00:00.000Z",
				cutoff: "2026-10-17T22:00:00.000Z",
				timeZone: TIME_ZONE,
			},
		);

		expect(ids(result)).toEqual(["old"]);
	});
});
