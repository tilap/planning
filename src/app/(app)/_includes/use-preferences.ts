import { useCallback, useEffect, useRef, useState } from "react";
import {
	defaultPreferences,
	loadPreferences,
	type Preferences,
	savePreferences,
} from "@/lib/cache/preferences";

/** The preferences stored on the device, or null while they load. */
export function usePreferences() {
	const [preferences, setPreferences] = useState<Preferences | null>(null);
	const latest = useRef<Preferences>(defaultPreferences);

	useEffect(() => {
		loadPreferences().then((loaded) => {
			latest.current = loaded;
			setPreferences(loaded);
		});
	}, []);

	const update = useCallback((patch: Partial<Preferences>) => {
		const next = { ...latest.current, ...patch };
		latest.current = next;
		setPreferences(next);
		void savePreferences(next);
	}, []);

	return { preferences, update };
}
