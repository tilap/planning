import { useEffect, useState } from "react";

/** Today's header counts as "at the top" inside this band, in pixels. */
const TOP_BAND_ABOVE = -24;
const TOP_BAND_BELOW = 80;

/**
 * The Today button stays hidden while today's header sits at the top of the
 * screen, and appears once the list has moved away from it.
 */
export function useTodayButtonVisible(
	today: string,
	enabled: boolean,
): boolean {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!enabled) {
			setVisible(false);
			return;
		}
		let frame = 0;
		const update = () => {
			const header = document
				.getElementById(`day-${today}`)
				?.querySelector("h2");
			if (!(header instanceof HTMLElement)) {
				setVisible(window.scrollY > TOP_BAND_BELOW);
				return;
			}
			const top = header.getBoundingClientRect().top;
			setVisible(top < TOP_BAND_ABOVE || top > TOP_BAND_BELOW);
		};
		const schedule = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(update);
		};
		schedule();
		window.addEventListener("scroll", schedule, { passive: true });
		const observer = new ResizeObserver(schedule);
		observer.observe(document.body);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", schedule);
			observer.disconnect();
		};
	}, [today, enabled]);

	return visible;
}
