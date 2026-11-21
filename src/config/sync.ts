/** The only past ranges a sync can keep and fetch: 1 week, 2 weeks, 1 month. */
export const PAST_WINDOWS = ["1w", "2w", "1m"] as const;

/** The only future ranges a sync can fetch: 1, 2 or 3 months. */
export const AHEAD_WINDOWS = ["1m", "2m", "3m"] as const;

export type PastWindow = (typeof PAST_WINDOWS)[number];
export type AheadWindow = (typeof AHEAD_WINDOWS)[number];

/** The past range as calendar units: whole days, or whole calendar months. */
export const PAST_WINDOW_SPAN: Record<
	PastWindow,
	{ days: number } | { months: number }
> = {
	"1w": { days: 7 },
	"2w": { days: 14 },
	"1m": { months: 1 },
};

/** The future range in calendar months. */
export const AHEAD_WINDOW_MONTHS: Record<AheadWindow, number> = {
	"1m": 1,
	"2m": 2,
	"3m": 3,
};

export const DEFAULT_PAST_WINDOW: PastWindow = "1w";
export const DEFAULT_AHEAD_WINDOW: AheadWindow = "3m";

/** The range a sync covers around today. */
export type SyncRange = { past: PastWindow; ahead: AheadWindow };

export const DEFAULT_SYNC_RANGE: SyncRange = {
	past: DEFAULT_PAST_WINDOW,
	ahead: DEFAULT_AHEAD_WINDOW,
};

export function isPastWindow(value: unknown): value is PastWindow {
	return PAST_WINDOWS.some((known) => known === value);
}

export function isAheadWindow(value: unknown): value is AheadWindow {
	return AHEAD_WINDOWS.some((known) => known === value);
}

/** Minutes after which a return to the foreground starts a new sync. */
export const foregroundResyncMinutes = 15;

/** A sync request that has not answered after this long counts as offline. */
export const syncRequestTimeoutMs = 20_000;

/** A session check that has not answered after this long counts as unreachable. */
export const sessionCheckTimeoutMs = 8_000;
