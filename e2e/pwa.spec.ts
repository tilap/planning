import { expect, test } from "@playwright/test";
import { calendars, timed } from "./support/fixtures";
import { seedCache } from "./support/seed-cache";

test.use({ locale: "fr-FR", timezoneId: "Europe/Paris" });

const events = [
	timed("E1", "Dentiste", "2026-11-18T09:00:00Z", "2026-11-18T09:45:00Z"),
	timed("E2", "Réunion", "2026-11-18T10:00:00Z", "2026-11-18T11:30:00Z"),
];

test("opens offline after a first online load and shows the list from memory", async ({
	page,
	context,
}) => {
	await page.route("**/api/**", (route) => route.abort());
	await seedCache(page, {
		events,
		calendars,
		meta: { lastSync: "2026-11-18T07:30:00.000Z" },
	});
	await page.goto("/");
	await expect(page.getByTestId("event-E1")).toBeVisible();

	// Wait for the service worker to be active and to have cached the app shell.
	await page.evaluate(() => navigator.serviceWorker.ready);
	await expect
		.poll(() =>
			page.evaluate(async () => {
				const cache = await caches.open("planning-v1");
				return (await cache.keys()).length;
			}),
		)
		.toBeGreaterThan(1);

	await context.setOffline(true);
	await page.reload();

	await expect(page.getByTestId("event-E1")).toBeVisible();
	await expect(page.getByTestId("event-E2")).toBeVisible();
});

test("serves a manifest and references it with an Apple touch icon", async ({
	page,
	request,
}) => {
	await page.goto("/");

	const response = await request.get("/manifest.webmanifest");
	expect(response.ok()).toBe(true);
	const manifest = await response.json();
	expect(manifest.name).toBe("Planning");
	expect(manifest.display).toBe("standalone");
	expect(manifest.start_url).toBe("/");
	const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
	expect(sizes).toContain("192x192");
	expect(sizes).toContain("512x512");
	for (const icon of manifest.icons as { src: string }[]) {
		expect((await request.get(icon.src)).ok()).toBe(true);
	}

	await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
	await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});
