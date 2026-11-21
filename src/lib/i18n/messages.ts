import type { AheadWindow, PastWindow } from "@/config/sync";
import { de } from "./locales/de";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { it } from "./locales/it";
import { vi } from "./locales/vi";

export type Language = "fr" | "en" | "es" | "it" | "de" | "vi";

/** Supported languages, each named in its own language, English first. */
export const LANGUAGES: { value: Language; label: string }[] = [
	{ value: "en", label: "English" },
	{ value: "fr", label: "Français" },
	{ value: "es", label: "Español" },
	{ value: "it", label: "Italiano" },
	{ value: "de", label: "Deutsch" },
	{ value: "vi", label: "Tiếng Việt" },
];

/** The reasons a sync can fail, as shown to the user. */
export type SyncFailureCause =
	| "offline"
	| "not_signed_in"
	| "access_revoked"
	| "quota"
	| "upstream"
	| "calendar_api_disabled"
	| "calendar_permission_missing";

export type Messages = {
	allDay: string;
	today: string;
	/** Unit letters of the day offset, e.g. "+3d" / "+2w+1d". */
	dayUnit: string;
	weekUnit: string;
	emptyMemory: string;
	dayOf: (index: number, count: number) => string;
	fromDate: (date: string) => string;
	toDate: (date: string) => string;
	organizedBy: (name: string) => string;
	responseAccepted: string;
	responseDeclined: string;
	responseTentative: string;
	responsePending: string;
	you: string;
	pinLabel: string;
	syncing: string;
	sync: string;
	settings: string;
	calendarsHeading: string;
	preferencesHeading: string;
	adminHeading: string;
	usersLabel: string;
	usersAddPlaceholder: string;
	usersAdd: string;
	usersRemove: (email: string) => string;
	usersAdminTag: string;
	usersEmpty: string;
	usersInvalidEmail: string;
	usersAlreadyAdmin: string;
	usersError: string;
	languageLabel: string;
	hourFormatLabel: string;
	dateFormatLabel: string;
	dateFormatNumeric: string;
	dateFormatShort: string;
	dateFormatLong: string;
	mapAppLabel: string;
	mapAppAuto: string;
	paletteLabel: string;
	palettePaper: string;
	paletteGold: string;
	colorSchemeLabel: string;
	colorSchemeSystem: string;
	colorSchemeLight: string;
	colorSchemeDark: string;
	leftHandedLabel: string;
	calendarDataHeading: string;
	syncPastLabel: string;
	syncAheadLabel: string;
	/** The options of the past range, "-1 week" style. */
	syncPastOptions: Record<PastWindow, string>;
	/** The options of the future range, "+1 month" style. */
	syncAheadOptions: Record<AheadWindow, string>;
	soundLabel: string;
	loading: string;
	signOut: string;
	buildVersion: (sha: string) => string;
	syncFailed: string;
	signInAgain: string;
	loadingCalendars: string;
	retry: string;
	firstSyncFailedTitle: string;
	failureExplanation: Record<SyncFailureCause, string>;
	lastSync: (when: string) => string;
	appName: string;
	homeLead: string;
	signInWithGoogle: string;
	networkNeededFirstSignIn: string;
	accountNotAllowed: string;
	close: string;
	search: string;
	closeSearch: string;
	noResults: string;
	openInGoogleCalendar: string;
	joinMeeting: string;
};

const dictionaries: Record<Language, Messages> = { en, fr, es, it, de, vi };

export function getMessages(language: Language): Messages {
	return dictionaries[language];
}

/** The supported language of the device, English when it is not supported. */
export function detectLanguage(deviceLanguage: string): Language {
	const code = deviceLanguage.toLowerCase().split("-")[0];
	return LANGUAGES.find((language) => language.value === code)?.value ?? "en";
}

/** Whether the device region uses a 12-hour clock. */
export function detectHour12(deviceLanguage: string): boolean {
	const cycle = new Intl.DateTimeFormat(deviceLanguage, {
		hour: "numeric",
	}).resolvedOptions().hourCycle;
	return cycle === "h12" || cycle === "h11";
}
