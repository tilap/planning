import { env } from "@/env";
import type {
	Attendee,
	Organizer,
	ResponseStatus,
	StoredCalendar,
	StoredEvent,
} from "../events/types";

export type SyncFailureCode =
	| "access_revoked"
	| "quota"
	| "upstream"
	| "calendar_api_disabled"
	| "calendar_permission_missing";

export class SyncFailure extends Error {
	constructor(readonly code: SyncFailureCode) {
		super(code);
	}
}

const API = "https://www.googleapis.com/calendar/v3";
const QUOTA_REASONS = [
	"rateLimitExceeded",
	"userRateLimitExceeded",
	"quotaExceeded",
	"dailyLimitExceeded",
];

/** Gets a short-lived access token from the refresh token. */
export async function refreshAccessToken(
	refreshToken: string,
): Promise<string> {
	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			refresh_token: refreshToken,
			grant_type: "refresh_token",
		}),
	});
	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as {
			error?: string;
		};
		if (body.error === "invalid_grant") throw new SyncFailure("access_revoked");
		throw new SyncFailure(response.status === 429 ? "quota" : "upstream");
	}
	const body = (await response.json()) as { access_token?: string };
	if (!body.access_token) throw new SyncFailure("upstream");
	return body.access_token;
}

type GoogleErrorBody = {
	error?: { message?: string; errors?: { reason?: string }[] };
};

/** Logs what Google answered, so the cause can be read in the hosting logs. Never a token. */
function logGoogleError(where: string, status: number, body: GoogleErrorBody) {
	console.error(
		`Google ${where} error: status ${status}, reason ${body.error?.errors?.[0]?.reason ?? "none"}, message ${body.error?.message ?? "none"}`,
	);
}

async function googleGet<T>(url: URL, accessToken: string): Promise<T> {
	const response = await fetch(url, {
		headers: { authorization: `Bearer ${accessToken}` },
	});
	if (response.ok) return (await response.json()) as T;

	const body = (await response.json().catch(() => ({}))) as GoogleErrorBody;
	logGoogleError("Calendar API", response.status, body);
	const reason = body.error?.errors?.[0]?.reason ?? "";
	if (response.status === 401) throw new SyncFailure("access_revoked");
	if (response.status === 429) throw new SyncFailure("quota");
	if (response.status === 403) {
		if (QUOTA_REASONS.includes(reason)) throw new SyncFailure("quota");
		if (reason === "accessNotConfigured") {
			throw new SyncFailure("calendar_api_disabled");
		}
		if (reason === "insufficientPermissions") {
			throw new SyncFailure("calendar_permission_missing");
		}
	}
	throw new SyncFailure("upstream");
}

type CalendarListItem = {
	id: string;
	summary?: string;
	summaryOverride?: string;
	backgroundColor?: string;
};

export async function listCalendars(
	accessToken: string,
): Promise<StoredCalendar[]> {
	const calendars: StoredCalendar[] = [];
	let pageToken: string | undefined;
	do {
		const url = new URL(`${API}/users/me/calendarList`);
		if (pageToken) url.searchParams.set("pageToken", pageToken);
		const page = await googleGet<{
			items?: CalendarListItem[];
			nextPageToken?: string;
		}>(url, accessToken);
		for (const item of page.items ?? []) {
			calendars.push({
				id: item.id,
				name: item.summaryOverride ?? item.summary ?? item.id,
				color: item.backgroundColor ?? "gray",
			});
		}
		pageToken = page.nextPageToken;
	} while (pageToken);
	return calendars;
}

type GooglePerson = {
	displayName?: string;
	email?: string;
	self?: boolean;
	organizer?: boolean;
};

const STATUSES: Record<string, ResponseStatus> = {
	accepted: "accepted",
	declined: "declined",
	tentative: "tentative",
};

function toOrganizer(item: GoogleEvent): Organizer | undefined {
	const person = item.organizer ?? item.creator;
	const name = person?.displayName ?? person?.email;
	if (!person || !name) return undefined;
	return {
		name,
		...(person.email ? { email: person.email } : {}),
		...(person.self ? { self: true } : {}),
	};
}

function toAttendees(item: GoogleEvent): Attendee[] {
	const attendees: Attendee[] = [];
	for (const guest of item.attendees ?? []) {
		const name = guest.displayName ?? guest.email;
		if (!name) continue;
		attendees.push({
			name,
			...(guest.email ? { email: guest.email } : {}),
			status: STATUSES[guest.responseStatus ?? ""] ?? "pending",
			...(guest.organizer ? { organizer: true } : {}),
			...(guest.self ? { self: true } : {}),
		});
	}
	return attendees;
}

type GoogleEvent = {
	id: string;
	status?: string;
	summary?: string;
	location?: string;
	description?: string;
	htmlLink?: string;
	hangoutLink?: string;
	conferenceData?: {
		entryPoints?: {
			entryPointType?: string;
			uri?: string;
			label?: string;
			pin?: string;
		}[];
	};
	organizer?: GooglePerson;
	creator?: GooglePerson;
	attendees?: (GooglePerson & { responseStatus?: string })[];
	start?: { date?: string; dateTime?: string };
	end?: { date?: string; dateTime?: string };
};

function toStoredEvent(
	calendarId: string,
	item: GoogleEvent,
): StoredEvent | null {
	if (item.status === "cancelled") return null;
	const allDay = Boolean(item.start?.date);
	const start = item.start?.date ?? item.start?.dateTime;
	const end = item.end?.date ?? item.end?.dateTime;
	if (!start || !end) return null;
	const video = item.conferenceData?.entryPoints?.find(
		(entry) => entry.entryPointType === "video",
	);
	const phone = item.conferenceData?.entryPoints?.find(
		(entry) => entry.entryPointType === "phone",
	);
	const phoneNumber = phone?.label ?? phone?.uri?.replace(/^tel:/, "");
	const attendees = toAttendees(item);
	const organizer = toOrganizer(item);
	return {
		id: `${calendarId}:${item.id}`,
		calendarId,
		title: item.summary ?? "(No title)",
		allDay,
		start: allDay ? start : new Date(start).toISOString(),
		end: allDay ? end : new Date(end).toISOString(),
		...(item.location ? { location: item.location } : {}),
		...(item.description ? { description: item.description } : {}),
		...(item.hangoutLink || video?.uri
			? { meetingUrl: item.hangoutLink ?? video?.uri }
			: {}),
		...(phoneNumber
			? {
					meetingPhone: {
						number: phoneNumber,
						...(phone?.pin ? { pin: phone.pin } : {}),
					},
				}
			: {}),
		...(organizer ? { organizer } : {}),
		...(attendees.length > 0 ? { attendees } : {}),
		...(item.htmlLink ? { htmlLink: item.htmlLink } : {}),
	};
}

/** Events of a calendar in a window, with recurring events expanded into occurrences. */
export async function listEvents(
	accessToken: string,
	calendarId: string,
	timeMin: string,
	timeMax: string,
): Promise<StoredEvent[]> {
	const events: StoredEvent[] = [];
	let pageToken: string | undefined;
	do {
		const url = new URL(
			`${API}/calendars/${encodeURIComponent(calendarId)}/events`,
		);
		url.searchParams.set("singleEvents", "true");
		url.searchParams.set("timeMin", timeMin);
		url.searchParams.set("timeMax", timeMax);
		url.searchParams.set("maxResults", "2500");
		if (pageToken) url.searchParams.set("pageToken", pageToken);
		const page = await googleGet<{
			items?: GoogleEvent[];
			nextPageToken?: string;
		}>(url, accessToken);
		for (const item of page.items ?? []) {
			const stored = toStoredEvent(calendarId, item);
			if (stored) events.push(stored);
		}
		pageToken = page.nextPageToken;
	} while (pageToken);
	return events;
}
