import type { DayGroup } from "@/lib/events/display";

/** A day whose header is within this many pixels of the top counts as the current one. */
const TOP_TOLERANCE = 8;

/** Scrolls so the day after (1) or before (-1) the one at the top of the screen is at the top. */
export function scrollToAdjacentDay(
	groups: DayGroup[],
	direction: 1 | -1,
): void {
	const tops = groups.map(
		(group) =>
			document.getElementById(`day-${group.date}`)?.getBoundingClientRect()
				.top ?? Number.POSITIVE_INFINITY,
	);
	let current = -1;
	for (const [index, top] of tops.entries()) {
		if (top <= TOP_TOLERANCE) current = index;
	}
	const target = groups[current + direction];
	if (!target) return;
	document
		.getElementById(`day-${target.date}`)
		?.scrollIntoView({ block: "start" });
}
