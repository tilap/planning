import { useEffect, useRef } from "react";

/** Single-letter shortcuts: lower case letter to action. */
export type Shortcuts = Record<string, () => void>;

function isTyping(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.isContentEditable ||
		target.matches("input, textarea, select") ||
		target.closest("[contenteditable]") !== null
	);
}

/**
 * Runs the action of a pressed letter. Ignored while typing in a field, with
 * Ctrl, Cmd or Alt held (browser shortcuts), while a sheet is open, and while
 * `enabled` is false.
 */
export function useKeyboardShortcuts(
	shortcuts: Shortcuts,
	enabled: boolean,
): void {
	const latest = useRef(shortcuts);
	latest.current = shortcuts;

	useEffect(() => {
		if (!enabled) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.isComposing ||
				event.ctrlKey ||
				event.metaKey ||
				event.altKey ||
				isTyping(event.target) ||
				document.querySelector("[data-sheet]") !== null
			) {
				return;
			}
			const action = latest.current[event.key.toLowerCase()];
			if (!action) return;
			// Also keeps the letter out of a field the action focuses.
			event.preventDefault();
			action();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [enabled]);
}
