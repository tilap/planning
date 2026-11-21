/** A calendar of the allowed Google account, as kept in the local memory. */
export type StoredCalendar = {
	id: string;
	name: string;
	/** CSS color of the calendar, as given by Google. */
	color: string;
};

/** The answer of a guest to the invitation. */
export type ResponseStatus = "accepted" | "declined" | "tentative" | "pending";

export type Attendee = {
	/** Display name, or the email address when Google gives no name. */
	name: string;
	email?: string;
	status: ResponseStatus;
	/** The guest who organizes the event. */
	organizer?: boolean;
	/** The signed-in user. */
	self?: boolean;
};

/** Who created the event. */
export type Organizer = {
	name: string;
	email?: string;
	self?: boolean;
};

/**
 * An event occurrence, as kept in the local memory.
 * `start` and `end` are ISO instants for timed events and `YYYY-MM-DD` dates
 * (end exclusive, as in Google) for all-day events.
 */
export type StoredEvent = {
	id: string;
	calendarId: string;
	title: string;
	allDay: boolean;
	start: string;
	end: string;
	location?: string;
	description?: string;
	meetingUrl?: string;
	/** Dial-in number of the meeting, with its PIN. */
	meetingPhone?: { number: string; pin?: string };
	organizer?: Organizer;
	attendees?: Attendee[];
	htmlLink?: string;
};
