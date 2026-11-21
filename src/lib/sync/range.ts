import {
	DEFAULT_AHEAD_WINDOW,
	DEFAULT_PAST_WINDOW,
	isAheadWindow,
	isPastWindow,
	type SyncRange,
} from "@/config/sync";
import type { Preferences } from "../cache/preferences";

/** The sync range of the stored preferences; a missing or unknown value is the default. */
export function syncRangeOf(
	preferences: Pick<Preferences, "syncPast" | "syncAhead"> | null,
): SyncRange {
	return {
		past: isPastWindow(preferences?.syncPast)
			? preferences.syncPast
			: DEFAULT_PAST_WINDOW,
		ahead: isAheadWindow(preferences?.syncAhead)
			? preferences.syncAhead
			: DEFAULT_AHEAD_WINDOW,
	};
}
