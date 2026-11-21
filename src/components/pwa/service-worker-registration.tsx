"use client";

import { useEffect } from "react";

/** Static illustrations shown by screens that can appear offline. */
const ILLUSTRATIONS = ["/illustrations/ghost-search.svg"];

/** The app shell: the page, the hashed assets it loaded and the illustrations. */
function appShellUrls(): string[] {
	const assets = performance
		.getEntriesByType("resource")
		.map((entry) => new URL(entry.name))
		.filter(
			(url) =>
				url.origin === location.origin &&
				url.pathname.startsWith("/_next/static/"),
		)
		.map((url) => url.pathname + url.search);
	return ["/", ...new Set(assets), ...ILLUSTRATIONS];
}

/** Registers the service worker when `enabled` (production only) and hands it the app shell to cache. */
export function ServiceWorkerRegistration({ enabled }: { enabled: boolean }) {
	useEffect(() => {
		if (!enabled) return;
		if (!("serviceWorker" in navigator)) return;
		navigator.serviceWorker
			.register("/sw.js")
			.then(() => navigator.serviceWorker.ready)
			.then((registration) => {
				registration.active?.postMessage({
					type: "precache",
					urls: appShellUrls(),
				});
			})
			.catch(() => {
				// The app works without a service worker; it just does not open offline.
			});
	}, [enabled]);

	return null;
}
