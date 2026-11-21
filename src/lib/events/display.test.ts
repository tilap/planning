import { describe, expect, it } from "vitest";
import {
	buildDayGroups,
	formatDayHeader,
	formatDayOffset,
	formatDuration,
	formatEventDates,
	formatEventTime,
	formatSyncTime,
	sortAttendees,
} from "./display";
import type { StoredEvent } from "./types";

function timed(
	id: string,
	start: string,
	end: string,
	extra: Partial<StoredEvent> = {},
): StoredEvent {
	return {
		id,
		calendarId: "cal-a",
		title: id,
		allDay: false,
		start,
		end,
		...extra,
	};
}

function allDay(id: string, start: string, end: string): StoredEvent {
	return {
		id,
		calendarId: "cal-a",
		title: id,
		allDay: true,
		start,
		end,
	};
}

// Paris is UTC+1 on 18 November 2026.
const E1 = timed("E1", "2026-11-18T09:00:00Z", "2026-11-18T09:45:00Z");
const E2 = timed("E2", "2026-11-18T10:00:00Z", "2026-11-18T11:30:00Z");
const E3 = timed("E3", "2026-11-18T13:00:00Z", "2026-11-18T17:00:00Z");
const E4 = allDay("E4", "2026-11-18", "2026-11-19");
const E5 = allDay("E5", "2026-11-20", "2026-11-23");

describe("formatDuration", () => {
	it("formats minutes in a human way", () => {
		expect(formatDuration(45)).toBe("45min");
		expect(formatDuration(90)).toBe("1h30");
		expect(formatDuration(240)).toBe("4h");
		expect(formatDuration(60)).toBe("1h");
		expect(formatDuration(125)).toBe("2h05");
	});
});

describe("buildDayGroups", () => {
	it("orders all-day events first, then timed events by start", () => {
		const groups = buildDayGroups([E3, E1, E4, E2], {
			timeZone: "Europe/Paris",
		});
		expect(groups).toHaveLength(1);
		expect(groups[0]?.date).toBe("2026-11-18");
		expect(groups[0]?.entries.map((entry) => entry.event.id)).toEqual([
			"E4",
			"E1",
			"E2",
			"E3",
		]);
	});

	it("repeats a multi-day all-day event on every covered day", () => {
		const groups = buildDayGroups([E5], { timeZone: "Europe/Paris" });
		expect(groups.map((group) => group.date)).toEqual([
			"2026-11-20",
			"2026-11-21",
			"2026-11-22",
		]);
		expect(
			groups.map((group) => [
				group.entries[0]?.dayIndex,
				group.entries[0]?.dayCount,
			]),
		).toEqual([
			[1, 3],
			[2, 3],
			[3, 3],
		]);
	});

	it("repeats a multi-day timed event on every covered day", () => {
		const event = timed("T1", "2026-11-20T21:00:00Z", "2026-11-22T01:00:00Z");
		const groups = buildDayGroups([event], { timeZone: "Europe/Paris" });
		expect(groups.map((group) => group.date)).toEqual([
			"2026-11-20",
			"2026-11-21",
			"2026-11-22",
		]);
		expect(groups[0]?.entries[0]?.dayCount).toBe(3);
	});

	it("groups a timed event in the given time zone", () => {
		const groups = buildDayGroups([E3], { timeZone: "America/New_York" });
		expect(groups.map((group) => group.date)).toEqual(["2026-11-18"]);
	});

	it("moves a late event to the next day in a faraway time zone", () => {
		const late = timed("L1", "2026-11-18T22:00:00Z", "2026-11-18T23:00:00Z");
		const groups = buildDayGroups([late], { timeZone: "Asia/Ho_Chi_Minh" });
		expect(groups.map((group) => group.date)).toEqual(["2026-11-19"]);
		expect(
			formatEventTime(late.start, {
				timeZone: "Asia/Ho_Chi_Minh",
				hour12: false,
				locale: "en",
			}),
		).toBe("05:00");
	});

	it("keeps an all-day event on its date in every time zone", () => {
		for (const timeZone of ["America/New_York", "Asia/Ho_Chi_Minh"]) {
			const groups = buildDayGroups([E4], { timeZone });
			expect(groups.map((group) => group.date)).toEqual(["2026-11-18"]);
		}
	});
});

describe("formatDayHeader", () => {
	it("spells the month in full in French and in English", () => {
		expect(formatDayHeader("2026-11-18", "fr")).toBe("mer. 18 novembre");
		expect(formatDayHeader("2026-11-18", "en")).toBe("Wed, November 18");
	});

	it("formats numerically and with the weekday in full", () => {
		expect(formatDayHeader("2026-11-18", "fr", "numeric")).toBe("18/11/2026");
		expect(formatDayHeader("2026-11-18", "en", "numeric")).toBe("11/18/2026");
		expect(formatDayHeader("2026-11-18", "fr", "long")).toBe(
			"mercredi 18 novembre",
		);
		expect(formatDayHeader("2026-11-18", "en", "long")).toBe(
			"Wednesday, November 18",
		);
	});
});

describe("formatEventDates", () => {
	it("spells the full date with the year, and the first and last dates for several days", () => {
		const allDay = {
			id: "x",
			calendarId: "c",
			title: "t",
			allDay: true,
			start: "2026-11-16",
			end: "2026-11-19",
		};
		expect(
			formatEventDates({ ...allDay, end: "2026-11-17" }, "UTC", "fr"),
		).toEqual(["lundi 16 novembre 2026"]);
		expect(formatEventDates(allDay, "UTC", "en")).toEqual([
			"Monday, November 16, 2026",
			"Wednesday, November 18, 2026",
		]);
	});
});

describe("formatSyncTime", () => {
	it("spells the month in full when the sync was on another day in French", () => {
		expect(
			formatSyncTime(
				"2026-11-17T08:30:00Z",
				new Date("2026-11-18T09:00:00+01:00"),
				{
					timeZone: "Europe/Paris",
					hour12: false,
					locale: "fr",
				},
			),
		).toBe("17 novembre 09:30");
	});
});

describe("formatEventTime", () => {
	it("formats the 14:00 Paris event in New York", () => {
		const options = { timeZone: "America/New_York", locale: "en" };
		expect(
			formatEventTime("2026-11-18T13:00:00Z", { ...options, hour12: false }),
		).toBe("08:00");
		expect(
			formatEventTime("2026-11-18T13:00:00Z", { ...options, hour12: true }),
		).toBe("8:00 AM");
	});
});

describe("formatDayOffset", () => {
	const units = { day: "d", week: "w" };

	it("shows nothing for today and the past", () => {
		expect(formatDayOffset(0, units)).toBeNull();
		expect(formatDayOffset(-3, units)).toBeNull();
	});

	it("counts days up to two weeks", () => {
		expect(formatDayOffset(1, units)).toBe("+1d");
		expect(formatDayOffset(14, units)).toBe("+14d");
	});

	it("counts weeks and days beyond two weeks", () => {
		expect(formatDayOffset(15, units)).toBe("+2w+1d");
		expect(formatDayOffset(21, units)).toBe("+3w");
		expect(formatDayOffset(72, units)).toBe("+10w+2d");
	});
});

describe("sortAttendees", () => {
	const guest = (name: string, extra: object = {}) => ({
		name,
		email: `${name.toLowerCase()}@example.com`,
		status: "accepted" as const,
		...extra,
	});
	const event = (extra: Partial<StoredEvent>): StoredEvent => ({
		id: "e",
		calendarId: "c",
		title: "t",
		allDay: false,
		start: "2026-11-18T09:00:00Z",
		end: "2026-11-18T10:00:00Z",
		...extra,
	});

	it("puts the guest flagged as organizer first and keeps the others in order", () => {
		const sorted = sortAttendees(
			event({
				attendees: [
					guest("Ana"),
					guest("Bob"),
					guest("Cy", { organizer: true }),
				],
			}),
		);
		expect(sorted.map((a) => a.name)).toEqual(["Cy", "Ana", "Bob"]);
	});

	it("matches the organizer by email when no guest is flagged", () => {
		const sorted = sortAttendees(
			event({
				organizer: { name: "Bob", email: "BOB@example.com" },
				attendees: [guest("Ana"), guest("Bob")],
			}),
		);
		expect(sorted.map((a) => a.name)).toEqual(["Bob", "Ana"]);
	});

	it("returns an empty list without guests", () => {
		expect(sortAttendees(event({}))).toEqual([]);
	});
});
