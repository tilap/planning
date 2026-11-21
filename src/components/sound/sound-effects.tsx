"use client";

import { useEffect } from "react";
import { play, type SoundName, setSoundEnabled } from "@/lib/sound/sound";

/**
 * The sound of an interaction, or null for none. Buttons and links tap, switches
 * click on or off, a select answers when its value changes. An element inside
 * `data-sound="none"` is silent: it already has a sound of its own.
 */
export function soundFor(
	type: "click" | "change",
	target: Element,
): SoundName | null {
	if (target.closest('[data-sound="none"]')) return null;
	if (type === "change") return target.closest("select") ? "select" : null;
	const control = target.closest<HTMLElement>(
		'button, a[href], [role="switch"]',
	);
	if (!control || control.matches(':disabled, [aria-disabled="true"]')) {
		return null;
	}
	if (control.getAttribute("role") === "switch") {
		// The click has not been handled yet: the state read is the one being left.
		return control.getAttribute("aria-checked") === "true"
			? "toggleOff"
			: "toggleOn";
	}
	return "tap";
}

/** Plays the interface sounds for the whole page while `enabled`. Renders nothing. */
export function SoundEffects({ enabled }: { enabled: boolean }) {
	useEffect(() => {
		setSoundEnabled(enabled);
		return () => setSoundEnabled(false);
	}, [enabled]);

	useEffect(() => {
		const onEvent = (event: Event) => {
			if (!(event.target instanceof Element)) return;
			const name = soundFor(
				event.type === "change" ? "change" : "click",
				event.target,
			);
			if (name) play(name);
		};
		document.addEventListener("click", onEvent, true);
		document.addEventListener("change", onEvent, true);
		return () => {
			document.removeEventListener("click", onEvent, true);
			document.removeEventListener("change", onEvent, true);
		};
	}, []);

	return null;
}
