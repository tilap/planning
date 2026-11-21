/** Shared test data. Times are given in Paris (UTC+1) unless noted. */

export const NOW = new Date("2026-11-18T09:00:00+01:00");

export const calendars = [
	{
		id: "cal-a",
		name: "Perso",
		// biome-ignore lint/plugin: calendar colors come from Google as hexadecimal values
		color: "#1a73e8",
	},
];

export function timed(id: string, title: string, start: string, end: string) {
	return { id, calendarId: "cal-a", title, allDay: false, start, end };
}

export function allDay(id: string, title: string, start: string, end: string) {
	return { id, calendarId: "cal-a", title, allDay: true, start, end };
}
