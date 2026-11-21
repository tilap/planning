import type { ReactNode } from "react";
import { pressable } from "@/components/pressable";
import {
	coveredDates,
	type DayEntry,
	eventDurationMinutes,
	formatDuration,
	formatEventDates,
	formatEventTime,
	sortAttendees,
} from "@/lib/events/display";
import type {
	Attendee,
	Organizer,
	ResponseStatus,
	StoredCalendar,
} from "@/lib/events/types";
import type { Messages } from "@/lib/i18n/messages";
import { descriptionText } from "@/utils/description-text";
import { type MapApp, mapsUrl } from "@/utils/maps-url";
import { safeHttpUrl } from "@/utils/safe-url";
import { LinkedText } from "./linked-text";

type EventDetailsProps = {
	/** The event, and which of its days was opened. */
	entry: DayEntry;
	calendar: StoredCalendar | undefined;
	timeZone: string;
	hour12: boolean;
	locale: string;
	mapApp: MapApp;
	messages: Messages;
};

const ICONS = {
	clock: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		</>
	),
	calendar: (
		<>
			<rect x="4" y="5" width="16" height="15" rx="2" />
			<path d="M4 10h16M9 3v4M15 3v4" />
		</>
	),
	pin: (
		<>
			<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11Z" />
			<circle cx="12" cy="10" r="2" />
		</>
	),
	text: <path d="M5 7h14M5 12h14M5 17h9" />,
	phone: (
		<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" />
	),
	person: (
		<>
			<circle cx="12" cy="8" r="3.5" />
			<path d="M5 20a7 7 0 0 1 14 0" />
		</>
	),
	people: (
		<>
			<circle cx="9" cy="8" r="3" />
			<path d="M3 20a6 6 0 0 1 12 0M16 5.2a3 3 0 0 1 0 5.6M17 14.3A6 6 0 0 1 21 20" />
		</>
	),
};

const STATUS_ICONS: Record<ResponseStatus, ReactNode> = {
	accepted: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="m8 12.5 3 3 5-6" />
		</>
	),
	declined: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="m9 9 6 6M15 9l-6 6" />
		</>
	),
	tentative: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01" />
		</>
	),
	pending: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		</>
	),
};

/** A guest: name, email as a link, and the answer to the invitation. */
function AttendeeItem({
	attendee,
	messages,
}: {
	attendee: Attendee;
	messages: Messages;
}) {
	const label = {
		accepted: messages.responseAccepted,
		declined: messages.responseDeclined,
		tentative: messages.responseTentative,
		pending: messages.responsePending,
	}[attendee.status];
	const showEmail = attendee.email && attendee.email !== attendee.name;
	return (
		<li className="flex items-start justify-between gap-3">
			<div className="min-w-0">
				<p
					className={`break-words ${attendee.status === "declined" ? "text-fg-muted line-through" : ""}`}
				>
					{attendee.email && !showEmail ? (
						<a href={`mailto:${attendee.email}`} className={LINK}>
							{attendee.name}
						</a>
					) : (
						attendee.name
					)}
					{attendee.self ? (
						<span className="text-fg-muted"> ({messages.you})</span>
					) : null}
				</p>
				{showEmail ? (
					<a
						href={`mailto:${attendee.email}`}
						className={`${LINK} block break-all text-sm`}
					>
						{attendee.email}
					</a>
				) : null}
			</div>
			<span className="flex shrink-0 items-center gap-1 text-sm text-fg-muted">
				<svg
					aria-hidden
					viewBox="0 0 24 24"
					className="size-4"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.75"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					{STATUS_ICONS[attendee.status]}
				</svg>
				{label}
			</span>
		</li>
	);
}

/** "Organized by <name>": the name is the email link when Google gives no other name. */
function OrganizerLine({
	organizer,
	messages,
}: {
	organizer: Organizer;
	messages: Messages;
}) {
	const [before, after] = messages.organizedBy("\u0000").split("\u0000");
	return (
		<>
			{before}
			{organizer.email && organizer.email === organizer.name ? (
				<a href={`mailto:${organizer.email}`} className={`${LINK} break-all`}>
					{organizer.name}
				</a>
			) : (
				organizer.name
			)}
			{after}
		</>
	);
}

const LINK = `${pressable} text-accent underline underline-offset-2`;

/** A line of the sheet: an icon in front of its content. */
function Row({
	icon,
	children,
}: {
	icon: keyof typeof ICONS;
	children: ReactNode;
}) {
	return (
		<div className="flex items-start gap-3">
			<svg
				aria-hidden
				viewBox="0 0 24 24"
				className="mt-0.5 size-5 shrink-0 text-fg-muted"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				{ICONS[icon]}
			</svg>
			<div className="min-w-0 flex-1 leading-relaxed">{children}</div>
		</div>
	);
}

export function EventDetails({
	entry,
	calendar,
	timeZone,
	hour12,
	locale,
	mapApp,
	messages,
}: EventDetailsProps) {
	const { event, dayIndex, dayCount } = entry;
	const format = { timeZone, hour12, locale };
	const meetingUrl = safeHttpUrl(event.meetingUrl);
	const htmlLink = safeHttpUrl(event.htmlLink);
	const dates = formatEventDates(event, timeZone, locale);
	const attendees = sortAttendees(event);
	const description = event.description
		? descriptionText(event.description)
		: "";
	// The length is only given to a timed event that starts and ends on the same day.
	const duration =
		!event.allDay && coveredDates(event, timeZone).length === 1
			? formatDuration(eventDurationMinutes(event))
			: null;
	const when = event.allDay
		? messages.allDay
		: `${formatEventTime(event.start, format)}–${formatEventTime(event.end, format)}`;

	return (
		<div className="space-y-5 p-5">
			<Row icon="calendar">
				{dates.length === 1 ? (
					<p className="font-medium first-letter:uppercase">{dates[0]}</p>
				) : (
					<>
						<p className="font-medium">{messages.fromDate(dates[0])}</p>
						<p className="font-medium">{messages.toDate(dates[1])}</p>
						<p className="text-fg-muted">
							{messages.dayOf(dayIndex, dayCount)}
						</p>
					</>
				)}
			</Row>
			<Row icon="clock">
				{when}
				{duration ? <span className="text-fg-muted"> · {duration}</span> : null}
			</Row>
			{calendar ? <Row icon="calendar">{calendar.name}</Row> : null}
			{event.meetingPhone ? (
				<Row icon="phone">
					<a
						href={`tel:${event.meetingPhone.number.replace(/[^\d+]/g, "")}${event.meetingPhone.pin ? `,,${event.meetingPhone.pin}#` : ""}`}
						className={`${LINK} whitespace-nowrap`}
					>
						{event.meetingPhone.number}
					</a>
					{event.meetingPhone.pin ? (
						<p className="text-sm text-fg-muted">
							{messages.pinLabel} : {event.meetingPhone.pin}
						</p>
					) : null}
				</Row>
			) : null}
			{event.organizer && !event.organizer.self ? (
				<Row icon="person">
					<p>
						<OrganizerLine organizer={event.organizer} messages={messages} />
					</p>
					{event.organizer.email &&
					event.organizer.email !== event.organizer.name ? (
						<a
							href={`mailto:${event.organizer.email}`}
							className={`${LINK} block break-all text-sm`}
						>
							{event.organizer.email}
						</a>
					) : null}
				</Row>
			) : null}
			{event.location ? (
				<Row icon="pin">
					<a
						href={mapsUrl(event.location, mapApp, navigator.userAgent)}
						target="_blank"
						rel="noopener noreferrer"
						className={`${pressable} text-accent underline underline-offset-2`}
					>
						{event.location}
					</a>
				</Row>
			) : null}
			{description ? (
				<Row icon="text">
					<p className="whitespace-pre-wrap break-words text-fg-muted">
						<LinkedText text={description} />
					</p>
				</Row>
			) : null}
			{attendees.length > 0 ? (
				<Row icon="people">
					<ul className="space-y-3">
						{attendees.map((attendee) => (
							<AttendeeItem
								key={attendee.email ?? attendee.name}
								attendee={attendee}
								messages={messages}
							/>
						))}
					</ul>
				</Row>
			) : null}
			<div className="space-y-2">
				{meetingUrl ? (
					<a
						href={meetingUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={`${pressable} flex min-h-touch items-center justify-center rounded-control bg-accent px-4 font-medium text-accent-fg active:opacity-80`}
					>
						{messages.joinMeeting}
					</a>
				) : null}
				{htmlLink ? (
					<a
						href={htmlLink}
						target="_blank"
						rel="noopener noreferrer"
						className={`${pressable} flex min-h-touch items-center justify-center rounded-control border border-line bg-surface px-4 font-medium text-accent active:bg-accent-soft`}
					>
						{messages.openInGoogleCalendar}
					</a>
				) : null}
			</div>
		</div>
	);
}
