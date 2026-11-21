import { readFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "@/env";
import { addDays } from "@/lib/events/display";
import type { StoredCalendar, StoredEvent } from "@/lib/events/types";

/**
 * Development only: true when `DEV_FAKE_DATA=1`. The session and sync routes
 * then answer with the fixtures below and never reach Google.
 * Setting it in production is a configuration error, not something to ignore.
 */
export function isFakeData(): boolean {
	if (env.DEV_FAKE_DATA !== "1") return false;
	if (env.NODE_ENV === "production") {
		throw new Error("DEV_FAKE_DATA must not be set in production.");
	}
	return true;
}

const CALENDARS: StoredCalendar[] = [
	// biome-ignore lint/plugin: calendar colors are data, as Google gives them
	{ id: "work", name: "Work", color: "#33b679" },
	// biome-ignore lint/plugin: calendar colors are data, as Google gives them
	{ id: "home", name: "Home", color: "#7986cb" },
	// biome-ignore lint/plugin: calendar colors are data, as Google gives them
	{ id: "leisure", name: "Leisure", color: "#ba68c8" },
];

type Draft = Omit<StoredEvent, "id" | "start" | "end" | "allDay"> & {
	/** Days from today (negative: past). */
	day: number;
	/** `HH:MM` in UTC, with the length in minutes; omitted for an all-day event. */
	at?: [string, number];
	/** Number of days of an all-day event. */
	days?: number;
};

const DRAFTS: Draft[] = [
	{ day: -1, calendarId: "home", title: "Take out the trash", days: 1 },
	{
		day: 0,
		calendarId: "work",
		title: "Team stand-up",
		at: ["08:30", 15],
		meetingUrl: "https://meet.example.com/stand-up",
		attendees: [
			{ name: "Ada Lovelace", status: "accepted" },
			{ name: "Grace Hopper", status: "accepted" },
			{ name: "Alan Turing", status: "tentative" },
		],
	},
	{
		day: 0,
		calendarId: "work",
		title: "Pick up the registered mail at the post office",
		at: ["10:00", 60],
		location: "1 rue de Rivoli, 75001 Paris",
		description: "Bring an ID.\nAsk for the parcel from the notary.",
	},
	{ day: 0, calendarId: "leisure", title: "Climbing", at: ["17:30", 90] },
	{
		day: 1,
		calendarId: "home",
		title: "Dentist",
		at: ["13:00", 30],
		location: "12 avenue Foch, Paris",
	},
	{
		// An appointment organized by someone else: several guests, a Google Meet
		// link, an invitation text with HTML as Google sends it.
		day: 1,
		calendarId: "work",
		title: "Product review with Marie Dupont",
		at: ["15:00", 45],
		meetingUrl: "https://meet.google.com/abc-defg-hij",
		meetingPhone: { number: "+33 1 00 00 00 00", pin: "123456789" },
		htmlLink: "https://calendar.google.com/calendar/event?eid=fake",
		organizer: { name: "Marie Dupont", email: "marie.dupont@example.com" },
		attendees: [
			{
				name: "Marie Dupont",
				email: "marie.dupont@example.com",
				status: "accepted",
				organizer: true,
			},
			{
				name: "Me",
				email: "me@example.com",
				status: "pending",
				self: true,
			},
			{
				name: "Jean Martin",
				email: "jean.martin@example.com",
				status: "accepted",
			},
			{
				name: "Sofia Rossi",
				email: "sofia.rossi@example.com",
				status: "declined",
			},
			{
				name: "Karim Benali",
				email: "karim.benali@example.com",
				status: "tentative",
			},
			{
				name: "jules.moreau@example.com",
				email: "jules.moreau@example.com",
				status: "pending",
			},
		],
		description:
			'Hi all,<br><br>Let\'s go through the roadmap and the open questions.<br><b>Agenda</b><br>- Status of the release<br>- Priorities for next month<br><br>Slides: <a href="https://example.com/slides">the slides</a><br>Questions: marie.dupont@example.com or +33 1 87 66 12 34<br><br>-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-<br>Join with Google Meet: https://meet.google.com/abc-defg-hij<br>Learn more about Meet at: https://support.google.com/a/users/answer/9282720<br>Please do not edit this section.<br>-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-',
	},
	{ day: 2, calendarId: "leisure", title: "Weekend in the mountains", days: 3 },
	{
		day: 4,
		calendarId: "work",
		title: "Renew the domain name",
		at: ["14:00", 15],
	},
];

/**
 * Optional, never committed: `.dev-fake-events.local.json` at the project root
 * holds more drafts (same shape as above), e.g. a copy of a real event to see
 * how the app shows it. Missing or invalid, it is ignored.
 */
function localDrafts(): Draft[] {
	try {
		const parsed: unknown = JSON.parse(
			readFileSync(join(process.cwd(), ".dev-fake-events.local.json"), "utf8"),
		);
		return Array.isArray(parsed) ? (parsed as Draft[]) : [];
	} catch {
		return [];
	}
}

function pad(value: number): string {
	return String(value).padStart(2, "0");
}

function toEvent(draft: Draft, index: number, today: string): StoredEvent {
	const date = addDays(today, draft.day);
	const { day: _day, at, days, ...rest } = draft;
	const base = { ...rest, id: `${draft.calendarId}:fake-${index}` };
	if (!at) {
		return {
			...base,
			allDay: true,
			start: date,
			end: addDays(date, days ?? 1),
		};
	}
	const start = new Date(`${date}T${at[0]}:00Z`);
	const end = new Date(start.getTime() + at[1] * 60_000);
	return {
		...base,
		allDay: false,
		start: start.toISOString(),
		end: end.toISOString(),
	};
}

/** Fake calendars and events around today, to browse the app without Google. */
export function fakeSync(now: Date): {
	calendars: StoredCalendar[];
	events: StoredEvent[];
} {
	const today = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
	return {
		calendars: CALENDARS,
		events: [...DRAFTS, ...localDrafts()].map((draft, index) =>
			toEvent(draft, index, today),
		),
	};
}
