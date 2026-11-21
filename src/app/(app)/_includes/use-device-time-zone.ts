import { useEffect, useState } from "react";

function readTimeZone(): string {
	return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** The device time zone, re-read every time the app returns to the foreground. */
export function useDeviceTimeZone(): string {
	const [timeZone, setTimeZone] = useState("UTC");

	useEffect(() => {
		setTimeZone(readTimeZone());
		const refresh = () => {
			if (document.visibilityState === "visible") setTimeZone(readTimeZone());
		};
		document.addEventListener("visibilitychange", refresh);
		window.addEventListener("focus", refresh);
		return () => {
			document.removeEventListener("visibilitychange", refresh);
			window.removeEventListener("focus", refresh);
		};
	}, []);

	return timeZone;
}
