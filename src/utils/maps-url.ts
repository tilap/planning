/** True on iPhone, iPad and Mac, where Apple Plans is the default map app. */
export function isApplePlatform(userAgent: string): boolean {
	return /iPhone|iPad|iPod|Macintosh/.test(userAgent);
}

export type MapApp = "auto" | "apple" | "google";

/**
 * A link that opens an address in a map app: the chosen one, or with "auto"
 * Apple Plans on Apple devices and Google Maps elsewhere (a Google Maps link
 * opens the Google Maps app when it is installed).
 */
export function mapsUrl(
	address: string,
	app: MapApp,
	userAgent: string,
): string {
	const query = encodeURIComponent(address);
	const apple = app === "auto" ? isApplePlatform(userAgent) : app === "apple";
	return apple
		? `https://maps.apple.com/?q=${query}`
		: `https://www.google.com/maps/search/?api=1&query=${query}`;
}
