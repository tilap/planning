import { expect, type Page, test } from "@playwright/test";
import { calendars, NOW, timed } from "./support/fixtures";
import { seedCache } from "./support/seed-cache";

test.use({
	locale: "fr-FR",
	timezoneId: "Europe/Paris",
	viewport: { width: 375, height: 812 },
});

const EVENT_A = {
	...timed("EA", "Dentiste", "2026-11-18T09:00:00Z", "2026-11-18T09:45:00Z"),
	calendarId: calendars[0].id,
};
const EVENT_B = {
	...timed("EB", "Réunion", "2026-11-18T10:00:00Z", "2026-11-18T11:00:00Z"),
	calendarId: calendars[0].id,
};
const SYNCED_AT = "2026-11-18T08:00:00.000Z";

async function open(page: Page) {
	await page.clock.setFixedTime(NOW);
	await seedCache(page, {
		events: [EVENT_A, EVENT_B],
		calendars,
		meta: { lastSync: SYNCED_AT },
	});
	await page.route("**/api/sync*", (route) =>
		route.fulfill({
			json: { calendars, events: [EVENT_A, EVENT_B], syncedAt: SYNCED_AT },
		}),
	);
	await page.goto("/");
	await expect(page.getByTestId("event-EA")).toBeVisible();
}

test("the search bar replaces the navigation bar, is focused, filters as the user types and clears on close", async ({
	page,
}) => {
	await open(page);
	const field = page.getByRole("textbox", { name: "Rechercher" });
	await expect(field).not.toBeInViewport();

	await page.getByRole("button", { name: "Rechercher" }).click();
	await expect(field).toBeInViewport();
	await expect(field).toBeFocused();
	await expect(page.getByRole("button", { name: "Réglages" })).toBeHidden();

	await field.fill("réunion");
	await expect(page.getByTestId("event-EA")).toHaveCount(0);
	await expect(page.getByTestId("event-EB")).toBeVisible();

	await field.fill("zzz");
	await expect(page.getByText("Aucun résultat")).toBeVisible();

	await page.getByRole("button", { name: "Fermer la recherche" }).click();
	await expect(field).not.toBeInViewport();
	await expect(page.getByRole("button", { name: "Réglages" })).toBeVisible();
	await expect(page.getByTestId("event-EA")).toBeVisible();
	await expect(page.getByTestId("event-EB")).toBeVisible();
});
