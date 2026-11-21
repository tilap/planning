import type { Memory } from "../cache/memory";
import type { StoredCalendar, StoredEvent } from "../events/types";
import { startOfLocalDay } from "./window";

/** What the sync route returns. */
export type SyncResponse = {
	calendars: StoredCalendar[];
	events: StoredEvent[];
	syncedAt: string;
};

/** The instant an event ends. All-day events end at the start of their (exclusive) end date. */
export function eventEndInstant(event: StoredEvent, timeZone: string): number {
	return event.allDay
		? startOfLocalDay(event.end, timeZone).getTime()
		: new Date(event.end).getTime();
}

/**
 * Applies a successful sync to the memory:
 * - events of calendars that disappeared are removed;
 * - events before the window are kept, unless they end before the purge cutoff;
 * - events of the window are replaced by those of the response.
 */
export function mergeSyncResult(
	current: Memory,
	response: SyncResponse,
	{
		timeMin,
		cutoff,
		timeZone,
	}: { timeMin: string; cutoff: string; timeZone: string },
): Memory {
	const calendarIds = new Set(
		response.calendars.map((calendar) => calendar.id),
	);
	const windowStart = new Date(timeMin).getTime();
	const cutoffTime = new Date(cutoff).getTime();
	const kept = current.events.filter((event) => {
		if (!calendarIds.has(event.calendarId)) return false;
		const end = eventEndInstant(event, timeZone);
		return end <= windowStart && end >= cutoffTime;
	});
	return {
		events: [...kept, ...response.events],
		calendars: response.calendars,
		lastSync: response.syncedAt,
	};
}
