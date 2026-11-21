import { descriptionText } from "@/utils/description-text";
import type { StoredEvent } from "./types";

/** Lower case without accents, so "cafe" finds "Café". */
function normalize(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

/**
 * Whether an event matches a search: every word of the query must appear in
 * its title, location, description or calendar name. An empty query matches all.
 */
export function matchesQuery(
	event: StoredEvent,
	calendarName: string | undefined,
	query: string,
): boolean {
	const words = normalize(query).split(/\s+/).filter(Boolean);
	if (words.length === 0) return true;
	const haystack = normalize(
		[
			event.title,
			event.location,
			event.description ? descriptionText(event.description) : undefined,
			calendarName,
		]
			.filter(Boolean)
			.join("\n"),
	);
	return words.every((word) => haystack.includes(word));
}
