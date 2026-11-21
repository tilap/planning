import type { DayGroup } from "@/lib/events/display";

/** Scrolls so the first day that is today or later is at the top of the screen. */
export function scrollToToday(groups: DayGroup[], today: string): void {
	const target = groups.find((group) => group.date >= today);
	if (!target) return;
	document
		.getElementById(`day-${target.date}`)
		?.scrollIntoView({ block: "start" });
}
