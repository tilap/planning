import {
	AHEAD_WINDOW_MONTHS,
	PAST_WINDOW_SPAN,
	type PastWindow,
	type SyncRange,
} from "@/config/sync";
import { addDays, localDate } from "../events/display";

/** Offset of a time zone from UTC at an instant, in milliseconds. */
function offsetMs(instant: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		hourCycle: "h23",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).formatToParts(new Date(instant));
	const get = (type: string) =>
		Number(parts.find((part) => part.type === type)?.value);
	const asUtc = Date.UTC(
		get("year"),
		get("month") - 1,
		get("day"),
		get("hour") % 24,
		get("minute"),
		get("second"),
	);
	return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The instant a local date starts, in a time zone. */
export function startOfLocalDay(date: string, timeZone: string): Date {
	const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
	const guess = Date.UTC(year, month - 1, day);
	const first = guess - offsetMs(guess, timeZone);
	return new Date(guess - offsetMs(first, timeZone));
}

/** Adds months to a `YYYY-MM-DD` date, clamping to the end of a shorter month. */
export function addMonths(date: string, months: number): string {
	const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
	const target = new Date(Date.UTC(year, month - 1 + months, 1));
	const lastDay = new Date(
		Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
	).getUTCDate();
	target.setUTCDate(Math.min(day, lastDay));
	return target.toISOString().slice(0, 10);
}

export type SyncWindow = { timeMin: string; timeMax: string };

/** The local date a past range starts on, counted back from today. */
function pastStart(today: string, past: PastWindow): string {
	const span = PAST_WINDOW_SPAN[past];
	return "days" in span
		? addDays(today, -span.days)
		: addMonths(today, -span.months);
}

/**
 * From the start of the day the past range reaches back to, to the start of
 * the day the future range reaches, in the given time zone. The past days are
 * part of the fetch, so a first sync already has them.
 */
export function computeSyncWindow(
	now: Date,
	timeZone: string,
	range: SyncRange,
): SyncWindow {
	const today = localDate(now, timeZone);
	return {
		timeMin: startOfLocalDay(
			pastStart(today, range.past),
			timeZone,
		).toISOString(),
		timeMax: startOfLocalDay(
			addMonths(today, AHEAD_WINDOW_MONTHS[range.ahead]),
			timeZone,
		).toISOString(),
	};
}

/** Events that end before this instant are purged: the start of the day the past range reaches back to. */
export function computePurgeCutoff(
	now: Date,
	timeZone: string,
	range: SyncRange,
): string {
	return computeSyncWindow(now, timeZone, range).timeMin;
}
