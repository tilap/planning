import type { AheadWindow, PastWindow } from "@/config/sync";
import type { MapApp } from "@/utils/maps-url";
import type { Language } from "../i18n/messages";
import { openMemory } from "./memory";
import { META_STORE, PREFERENCES_KEY } from "./schema";

export type HourFormat = "12" | "24";

/** Day headers: 18/11/2026, "mer. 18 novembre" or "mercredi 18 novembre". */
export type DateFormat = "numeric" | "short" | "long";

/** Light, dark, or whatever the device is using. */
export type ColorScheme = "light" | "dark" | "system";

/** The color palette: warm paper (follows the appearance) or an always-dark one. */
export type Palette = "paper" | "violet" | "rose" | "gold";

/** Preferences stored on the device only. Missing values fall back to the device's. */
export type Preferences = {
	hiddenCalendarIds: string[];
	language?: Language;
	hourFormat?: HourFormat;
	dateFormat?: DateFormat;
	mapApp?: MapApp;
	colorScheme?: ColorScheme;
	palette?: Palette;
	/** Mirrors the interface for the left hand. */
	leftHanded?: boolean;
	/** Interface sounds; off when absent. */
	sound?: boolean;
	/** How far back a sync reaches; `1w` when absent or unknown. */
	syncPast?: PastWindow;
	/** How far ahead a sync reaches; `3m` when absent or unknown. */
	syncAhead?: AheadWindow;
};

export const defaultPreferences: Preferences = { hiddenCalendarIds: [] };

export async function loadPreferences(): Promise<Preferences> {
	const db = await openMemory();
	try {
		const stored = (await db.get(META_STORE, PREFERENCES_KEY)) as
			| Partial<Preferences>
			| undefined;
		return { ...defaultPreferences, ...stored };
	} finally {
		db.close();
	}
}

export async function savePreferences(preferences: Preferences): Promise<void> {
	const db = await openMemory();
	try {
		await db.put(META_STORE, preferences, PREFERENCES_KEY);
	} finally {
		db.close();
	}
}
