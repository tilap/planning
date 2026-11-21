import { useLayoutEffect, useState } from "react";
import type { DateFormat, Preferences } from "@/lib/cache/preferences";
import {
	detectHour12,
	detectLanguage,
	getMessages,
	type Language,
	type Messages,
} from "@/lib/i18n/messages";
import type { MapApp } from "@/utils/maps-url";

export type DisplaySettings = {
	language: Language;
	hour12: boolean;
	dateFormat: DateFormat;
	mapApp: MapApp;
	leftHanded: boolean;
	/** Interface sounds: off unless turned on, and silent until the preferences have loaded. */
	sound: boolean;
	messages: Messages;
};

/** Language, hour format and date format: the stored preference, otherwise the device's or the default. */
export function useDisplaySettings(
	preferences: Preferences | null,
): DisplaySettings {
	const [deviceLanguage, setDeviceLanguage] = useState<Language>("en");
	const [deviceHour12, setDeviceHour12] = useState(false);

	useLayoutEffect(() => {
		setDeviceLanguage(detectLanguage(navigator.language));
		setDeviceHour12(detectHour12(navigator.language));
	}, []);

	const language = preferences?.language ?? deviceLanguage;
	const hour12 = preferences?.hourFormat
		? preferences.hourFormat === "12"
		: deviceHour12;
	const dateFormat = preferences?.dateFormat ?? "short";
	const mapApp = preferences?.mapApp ?? "auto";
	return {
		language,
		hour12,
		dateFormat,
		mapApp,
		leftHanded: preferences?.leftHanded ?? false,
		sound: preferences?.sound ?? false,
		messages: getMessages(language),
	};
}
