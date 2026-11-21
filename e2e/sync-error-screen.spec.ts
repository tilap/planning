import { expect, type Page, test } from "@playwright/test";
import { calendars, NOW, timed } from "./support/fixtures";
import { seedCache } from "./support/seed-cache";

test.use({ locale: "fr-FR", timezoneId: "Europe/Paris" });

const TITLE = "Impossible de charger tes agendas";
const SYNCED_AT = "2026-11-18T08:00:00.000Z";

test.beforeEach(async ({ page }) => {
	await page.clock.setFixedTime(NOW);
	// Signed in, but nothing was ever synced.
	await page.route("**/api/auth/session", (route) =>
		route.fulfill({ json: { signedIn: true } }),
	);
	await seedCache(page, { events: [], calendars: [] });
});

async function stubFailure(page: Page, status: number, code: string) {
	await page.route("**/api/sync*", (route) =>
		route.fulfill({ status, json: { code } }),
	);
}

test("explains a failed first sync and offers to retry or sign out", async ({
	page,
}) => {
	await stubFailure(page, 502, "upstream");
	await page.goto("/");

	await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
	await expect(
		page.getByText("Google ne répond pas correctement pour le moment"),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Se déconnecter" }),
	).toBeVisible();
	await expect(page.getByText("Aucun événement en mémoire")).toHaveCount(0);
	await expect(page.getByText("Synchro échouée")).toHaveCount(0);
});

test("retries and shows the events when the second sync works", async ({
	page,
}) => {
	let calls = 0;
	await page.route("**/api/sync*", (route) => {
		calls += 1;
		if (calls === 1) {
			return route.fulfill({ status: 502, json: { code: "upstream" } });
		}
		return route.fulfill({
			json: {
				calendars,
				events: [
					timed(
						"R1",
						"Dentiste",
						"2026-11-18T09:00:00Z",
						"2026-11-18T09:45:00Z",
					),
				],
				syncedAt: SYNCED_AT,
			},
		});
	});
	await page.goto("/");
	await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();

	await page.getByRole("button", { name: "Réessayer" }).click();

	await expect(page.getByTestId("event-R1")).toBeVisible();
	await expect(page.getByRole("heading", { name: TITLE })).toHaveCount(0);
});

test("signs out from the error screen", async ({ page }) => {
	await stubFailure(page, 502, "upstream");
	await page.route("**/api/auth/logout", (route) =>
		route.fulfill({ json: { revoked: true } }),
	);
	await page.goto("/");
	await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
	// After signing out the server no longer knows the session.
	await page.unroute("**/api/auth/session");

	await page.getByRole("button", { name: "Se déconnecter" }).click();

	await expect(
		page.getByRole("heading", { name: "Se connecter avec Google" }),
	).toBeVisible();
});

test("explains a disabled Calendar API", async ({ page }) => {
	await stubFailure(page, 502, "calendar_api_disabled");
	await page.goto("/");

	await expect(
		page.getByText(/L'API Google Calendar n'est pas activée/),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
});

test("offers to sign in again when the calendar permission was not granted", async ({
	page,
}) => {
	await stubFailure(page, 403, "calendar_permission_missing");
	await page.goto("/");

	await expect(
		page.getByText(/autorisation de lire tes agendas/),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Se reconnecter" }),
	).toHaveAttribute("href", "/api/auth/google");
	await expect(
		page.getByRole("button", { name: "Se déconnecter" }),
	).toBeVisible();
});

test("says the calendars are loading during the first sync", async ({
	page,
}) => {
	await page.route("**/api/sync*", async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 1500));
		await route.fulfill({
			json: {
				calendars,
				events: [
					timed(
						"L1",
						"Dentiste",
						"2026-11-18T09:00:00Z",
						"2026-11-18T09:45:00Z",
					),
				],
				syncedAt: SYNCED_AT,
			},
		});
	});
	await page.goto("/");

	await expect(
		page.getByRole("status", { name: "Chargement de tes agendas…" }),
	).toBeVisible();
	await expect(page.getByText("Aucun événement en mémoire")).toHaveCount(0);
	await expect(page.getByTestId("event-L1")).toBeVisible();
});
