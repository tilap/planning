// Service worker of Planning.
// - The app shell (the page and its hashed assets) is cached so the app opens offline.
// - Navigations go to the network first and fall back to the cache.
// - A new version waits and only becomes active at the next launch: it never skips waiting
//   and never takes control of pages that are already open.
const CACHE = "planning-v1";
const NAVIGATION_TIMEOUT_MS = 2000;

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
			),
	);
});

// The page tells the worker which URLs make up the app shell.
self.addEventListener("message", (event) => {
	if (event.data?.type !== "precache") return;
	event.waitUntil(
		caches.open(CACHE).then((cache) =>
			Promise.allSettled(event.data.urls.map((url) => cache.add(url))),
		),
	);
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	if (request.method !== "GET") return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith("/api/")) return;

	if (request.mode === "navigate") {
		event.respondWith(networkFirst(request));
	} else if (url.pathname.startsWith("/_next/static/")) {
		event.respondWith(cacheFirst(request));
	}
});

async function networkFirst(request) {
	const cache = await caches.open(CACHE);
	try {
		const response = await Promise.race([
			fetch(request),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error("timeout")), NAVIGATION_TIMEOUT_MS),
			),
		]);
		if (response.ok) cache.put(request, response.clone());
		return response;
	} catch (error) {
		const cached =
			(await cache.match(request, { ignoreSearch: true })) ||
			(await cache.match("/", { ignoreSearch: true }));
		if (cached) return cached;
		throw error;
	}
}

async function cacheFirst(request) {
	const cache = await caches.open(CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) cache.put(request, response.clone());
	return response;
}
