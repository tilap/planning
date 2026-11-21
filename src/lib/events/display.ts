import type { DateFormat } from "../cache/preferences";
import type { Attendee, StoredEvent } from "./types";

export type DayEntry = {
	event: StoredEvent;
	/** Position of this day in the event, starting at 1. */
	dayIndex: number;
	/** Number of days the event covers. */
	dayCount: number;
};

export type DayGroup = {
	/** Local date, `YYYY-MM-DD`. */
	date: string;
	entries: DayEntry[];
};

export type TimeFormat = {
	timeZone: string;
	hour12: boolean;
	locale: string;
};

/** Formats a duration in minutes: "45min", "1h30", "4h", "2h05". */
export function formatDuration(minutes: number): string {
	if (minutes < 60) return `${minutes}min`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`;
}

/** Duration of a timed event, in whole minutes. */
export function eventDurationMinutes(event: StoredEvent): number {
	const ms = new Date(event.end).getTime() - new Date(event.start).getTime();
	return Math.max(0, Math.round(ms / 60_000));
}

/** The local date (`YYYY-MM-DD`) of an instant in a time zone. */
export function localDate(instant: Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(instant);
	const get = (type: string) =>
		parts.find((part) => part.type === type)?.value ?? "";
	return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Adds days to a `YYYY-MM-DD` date. */
export function addDays(date: string, days: number): string {
	const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
	const shifted = new Date(Date.UTC(year, month - 1, day + days));
	return shifted.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`. */
export function daysBetween(from: string, to: string): number {
	const ms = (date: string) => new Date(`${date}T00:00:00Z`).getTime();
	return Math.round((ms(to) - ms(from)) / 86_400_000);
}

export type OffsetUnits = { day: string; week: string };

/**
 * Distance of a day from today: nothing for today and the past, "+3d" up to
 * two weeks, then weeks and days: "+2w", "+2w+1d", "+10w+2d".
 */
export function formatDayOffset(
	days: number,
	units: OffsetUnits,
): string | null {
	if (days < 1) return null;
	if (days <= 14) return `+${days}${units.day}`;
	const weeks = Math.floor(days / 7);
	const rest = days % 7;
	return rest === 0
		? `+${weeks}${units.week}`
		: `+${weeks}${units.week}+${rest}${units.day}`;
}

function datesBetween(first: string, last: string): string[] {
	const dates = [first];
	for (let date = first; date < last; ) {
		date = addDays(date, 1);
		dates.push(date);
	}
	return dates;
}

export function coveredDates(event: StoredEvent, timeZone: string): string[] {
	if (event.allDay) {
		return datesBetween(event.start, addDays(event.end, -1));
	}
	const start = new Date(event.start);
	const end = new Date(event.end);
	const lastInstant = new Date(Math.max(start.getTime(), end.getTime() - 1));
	return datesBetween(
		localDate(start, timeZone),
		localDate(lastInstant, timeZone),
	);
}

function compareEntries(a: DayEntry, b: DayEntry): number {
	if (a.event.allDay !== b.event.allDay) return a.event.allDay ? -1 : 1;
	if (a.event.start !== b.event.start) {
		return a.event.start < b.event.start ? -1 : 1;
	}
	return a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0;
}

/**
 * Groups events by local day. A multi-day event appears on every day it covers.
 * Inside a day, all-day events come first, then timed events by start.
 */
export function buildDayGroups(
	events: StoredEvent[],
	{ timeZone }: { timeZone: string },
): DayGroup[] {
	const byDate = new Map<string, DayEntry[]>();
	for (const event of events) {
		const dates = coveredDates(event, timeZone);
		dates.forEach((date, index) => {
			const entries = byDate.get(date) ?? [];
			entries.push({ event, dayIndex: index + 1, dayCount: dates.length });
			byDate.set(date, entries);
		});
	}
	return [...byDate.entries()]
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([date, entries]) => ({
			date,
			entries: entries.sort(compareEntries),
		}));
}

/** Formats the time of an instant, e.g. "08:00" or "8:00 AM". */
export function formatEventTime(
	iso: string,
	{ timeZone, hour12, locale }: TimeFormat,
): string {
	return new Intl.DateTimeFormat(locale, {
		timeZone,
		hour: hour12 ? "numeric" : "2-digit",
		minute: "2-digit",
		hourCycle: hour12 ? "h12" : "h23",
	}).format(new Date(iso));
}

const DAY_HEADER_OPTIONS: Record<DateFormat, Intl.DateTimeFormatOptions> = {
	numeric: { day: "2-digit", month: "2-digit", year: "numeric" },
	short: { weekday: "short", day: "numeric", month: "long" },
	long: { weekday: "long", day: "numeric", month: "long" },
};

/**
 * Formats a local date as a day header: "18/11/2026" (numeric),
 * "mer. 18 novembre" (short) or "mercredi 18 novembre" (long).
 */
export function formatDayHeader(
	date: string,
	locale: string,
	format: DateFormat = "short",
): string {
	return new Intl.DateTimeFormat(locale, {
		timeZone: "UTC",
		...DAY_HEADER_OPTIONS[format],
	}).format(new Date(`${date}T12:00:00Z`));
}

/**
 * Formats the date of an event with the year: one date, e.g. "mercredi 18
 * novembre 2026", or two (the first and the last day) for several days.
 */
export function formatEventDates(
	event: StoredEvent,
	timeZone: string,
	locale: string,
): string[] {
	const dates = coveredDates(event, timeZone);
	const format = (date: string) =>
		new Intl.DateTimeFormat(locale, {
			timeZone: "UTC",
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		}).format(new Date(`${date}T12:00:00Z`));
	const first = dates[0] ?? event.start;
	const last = dates[dates.length - 1] ?? first;
	return first === last ? [format(first)] : [format(first), format(last)];
}

/**
 * Formats the date of the last sync: the time if it is today, otherwise
 * the date, with the month in full, and the time.
 */
export function formatSyncTime(
	iso: string,
	now: Date,
	format: TimeFormat,
): string {
	const instant = new Date(iso);
	const time = formatEventTime(iso, format);
	if (localDate(instant, format.timeZone) === localDate(now, format.timeZone)) {
		return time;
	}
	const day = new Intl.DateTimeFormat(format.locale, {
		timeZone: format.timeZone,
		day: "numeric",
		month: "long",
	}).format(instant);
	return `${day} ${time}`;
}

/** The guests of an event, the organizer first (flagged by Google, else matched by email), the others in their order. */
export function sortAttendees(event: StoredEvent): Attendee[] {
	const organizerEmail = event.organizer?.email?.toLowerCase();
	const isOrganizer = (attendee: Attendee) =>
		attendee.organizer === true ||
		(organizerEmail !== undefined &&
			attendee.email?.toLowerCase() === organizerEmail);
	const attendees = event.attendees ?? [];
	return [
		...attendees.filter(isOrganizer),
		...attendees.filter((attendee) => !isOrganizer(attendee)),
	];
}
