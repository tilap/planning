import { describe, expect, it } from "vitest";
import { isApplePlatform, mapsUrl } from "./maps-url";

describe("mapsUrl", () => {
	it("targets Apple Plans on Apple devices and Google Maps elsewhere", () => {
		const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)";
		const android = "Mozilla/5.0 (Linux; Android 15)";
		const apple = "https://maps.apple.com/?q=1%20rue%20de%20Rivoli%2C%20Paris";
		const google =
			"https://www.google.com/maps/search/?api=1&query=1%20rue%20de%20Rivoli%2C%20Paris";
		const address = "1 rue de Rivoli, Paris";
		expect(mapsUrl(address, "auto", iphone)).toBe(apple);
		expect(mapsUrl(address, "auto", android)).toBe(google);
		expect(mapsUrl(address, "google", iphone)).toBe(google);
		expect(mapsUrl(address, "apple", android)).toBe(apple);
	});

	it("detects Apple devices from the user agent", () => {
		expect(isApplePlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)")).toBe(
			true,
		);
		expect(isApplePlatform("Mozilla/5.0 (Linux; Android 15)")).toBe(false);
	});
});
