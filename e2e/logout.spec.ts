import { expect, test } from "@playwright/test";
import { calendars, NOW, timed } from "./support/fixtures";
import { readStore, seedCache } from "./support/seed-cache";

test.use({ locale: "fr-FR", timezoneId: "Europe/Paris" });

const events = [
	timed("E1", "Dentiste", "2026-11-18T09:00:00Z", "2026-11-18T09:45:00Z"),
	timed("E2", "Réunion", "2026-11-18T10:00:00Z", "2026-11-18T11:30:00Z"),
	timed("E3", "Atelier", "2026-11-18T13:00:00Z", "2026-11-18T17:00:00Z"),
];

test("signs out: empties the memory, shows the sign-in screen and keeps the preferences", async ({
	page,
}) => {
	await page.clock.setFixedTime(NOW);
	await seedCache(page, {
		events,
		calendars,
		meta: {
			lastSync: "2026-11-18T07:30:00.000Z",
			preferences: { hiddenCalendarIds: [], language: "en" },
		},
	});
	await page.route("**/api/sync*", (route) => route.abort());
	let logoutCalls = 0;
	await page.route("**/api/auth/logout", (route) => {
		logoutCalls += 1;
		return route.fulfill({ json: { revoked: true } });
	});
	await page.goto("/");
	await page.getByRole("button", { name: "Settings" }).click();

	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Sign out" })
		.click();

	await expect(
		page.getByRole("heading", { name: "Sign in with Google" }),
	).toBeVisible();
	expect(logoutCalls).toBe(1);
	expect(await readStore(page, "events")).toEqual([]);
	expect(await readStore(page, "calendars")).toEqual([]);
	const meta = (await readStore(page, "meta")) as unknown[];
	expect(meta).not.toContain("2026-11-18T07:30:00.000Z");
	expect(meta).toContainEqual({ hiddenCalendarIds: [], language: "en" });
});

test("signs out even when the sign-out route cannot be reached", async ({
	page,
}) => {
	await page.clock.setFixedTime(NOW);
	await seedCache(page, {
		events,
		calendars,
		meta: { lastSync: "2026-11-18T07:30:00.000Z" },
	});
	await page.route("**/api/sync*", (route) => route.abort());
	await page.route("**/api/auth/logout", (route) => route.abort());
	await page.goto("/");
	await page.getByRole("button", { name: "Réglages" }).click();

	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Se déconnecter" })
		.click();

	await expect(
		page.getByRole("heading", { name: "Se connecter avec Google" }),
	).toBeVisible();
	expect(await readStore(page, "events")).toEqual([]);
});
