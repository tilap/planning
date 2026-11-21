import { pressable } from "@/components/pressable";
import type { DayEntry } from "@/lib/events/display";
import {
	eventDurationMinutes,
	formatDuration,
	formatEventTime,
} from "@/lib/events/display";
import type { StoredCalendar } from "@/lib/events/types";
import type { Messages } from "@/lib/i18n/messages";

type EventRowProps = {
	entry: DayEntry;
	calendar: StoredCalendar | undefined;
	timeZone: string;
	hour12: boolean;
	locale: string;
	messages: Messages;
	/** A day before today: its separators are dashed and its titles struck through. */
	past?: boolean;
	/** Its details are open: the row stays highlighted, then fades back when they close. */
	selected?: boolean;
	onSelect: (entry: DayEntry) => void;
};

export function EventRow({
	entry,
	calendar,
	timeZone,
	hour12,
	locale,
	messages,
	past = false,
	selected = false,
	onSelect,
}: EventRowProps) {
	const { event, dayIndex, dayCount } = entry;
	const format = { timeZone, hour12, locale };
	const details = [
		calendar?.name,
		event.allDay ? null : formatDuration(eventDurationMinutes(event)),
		dayCount > 1 ? messages.dayOf(dayIndex, dayCount) : null,
	].filter((part): part is string => Boolean(part));

	return (
		<li
			data-testid={`event-${event.id}`}
			className={`border-b border-line last:border-b-0 ${past ? "border-dashed" : ""}`}
		>
			<button
				type="button"
				onClick={() => onSelect(entry)}
				className={`${pressable} flex min-h-touch w-full items-stretch gap-3 px-3 py-3 text-left ${selected ? "bg-accent-soft" : ""}`}
			>
				<span
					aria-hidden
					className="my-1 w-1 shrink-0 self-stretch rounded-pill bg-fg-muted"
					style={calendar ? { backgroundColor: calendar.color } : undefined}
				/>
				<span className="w-time shrink-0 pt-0.5 text-sm font-semibold tabular-nums leading-5">
					{event.allDay ? (
						messages.allDay
					) : (
						<>
							<span className="block whitespace-nowrap">
								{formatEventTime(event.start, format)}
							</span>
							<span className="block whitespace-nowrap font-normal text-fg-muted">
								{formatEventTime(event.end, format)}
							</span>
						</>
					)}
				</span>
				<span className="min-w-0 flex-1">
					<span
						className={`block whitespace-normal break-words font-medium leading-snug ${past ? "line-through" : ""}`}
					>
						{event.title}
					</span>
					{details.length > 0 ? (
						<span className="mt-0.5 block whitespace-normal break-words text-sm leading-5 text-fg-muted">
							{details.join(" · ")}
						</span>
					) : null}
				</span>
			</button>
		</li>
	);
}
