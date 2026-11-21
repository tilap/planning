import { expect, type Page, test } from "@playwright/test";
import { calendars, NOW, timed } from "./support/fixtures";
import { readStore, seedCache } from "./support/seed-cache";

test.use({ locale: "fr-FR", timezoneId: "Europe/Paris" });

const events = [
	timed("E1", "Dentiste", "2026-11-18T09:00:00Z", "2026-11-18T09:45:00Z"),
	timed("E2", "Réunion", "2026-11-18T10:00:00Z", "2026-11-18T11:30:00Z"),
	timed("E3", "Atelier", "2026-11-18T13:00:00Z", "2026-11-18T17:00:00Z"),
];

// 07:30 UTC is 08:30 in Paris. The fixed clock is 08:00 UTC (09:00 in Paris).
const LAST_SYNC = "2026-11-18T07:30:00.000Z";

test.beforeEach(async ({ page }) => {
	await page.clock.setFixedTime(NOW);
	await seedCache(page, {
		events,
		calendars,
		meta: { lastSync: LAST_SYNC },
	});
});

async function stubSyncStatus(page: Page, status: number, code: string) {
	await page.route("**/api/sync*", (route) =>
		route.fulfill({ status, json: { code } }),
	);
}

async function expectListIntact(page: Page) {
	for (const id of ["E1", "E2", "E3"]) {
		await expect(page.getByTestId(`event-${id}`)).toBeVisible();
	}
}

test("keeps the list and explains a network failure", async ({ page }) => {
	await page.route("**/api/sync*", (route) => route.abort());
	await page.goto("/");

	await expect(
		page.getByText("Tes agendas n'ont pas pu être mis à jour"),
	).toBeVisible();
	await expect(
		page.getByText(/Il n'y a pas de connexion à internet/),
	).toBeVisible();
	await expect(page.getByText(/Dernière synchro :.*08:30/)).toBeVisible();
	await expectListIntact(page);
});

test("explains a quota failure", async ({ page }) => {
	await stubSyncStatus(page, 429, "quota");
	await page.goto("/");

	await expect(
		page.getByText("Tes agendas n'ont pas pu être mis à jour"),
	).toBeVisible();
	await expect(
		page.getByText(/Google limite temporairement les demandes/),
	).toBeVisible();
	await expectListIntact(page);
});

test("offers to sign in again when the Google access is revoked, without emptying the memory", async ({
	page,
}) => {
	await stubSyncStatus(page, 401, "access_revoked");
	await page.goto("/");

	await expect(
		page.getByText(/L'accès à ton compte Google a expiré/),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Se reconnecter" }),
	).toHaveAttribute("href", "/api/auth/google");
	await expectListIntact(page);
	expect(await readStore(page, "events")).toHaveLength(3);
});

test("explains a Google outage", async ({ page }) => {
	await stubSyncStatus(page, 502, "upstream");
	await page.goto("/");

	await expect(
		page.getByText(/Google ne répond pas correctement/),
	).toBeVisible();
	await expectListIntact(page);
});

test("keeps the list readable and offers to sign in again when the session expired", async ({
	page,
}) => {
	await stubSyncStatus(page, 401, "not_signed_in");
	await page.goto("/");

	await expect(
		page.getByRole("link", { name: "Se reconnecter" }),
	).toBeVisible();
	await expectListIntact(page);
	await expect(
		page.getByRole("heading", { name: "Se connecter avec Google" }),
	).toHaveCount(0);
});

test("disables Sync offline and makes no request", async ({
	page,
	context,
}) => {
	const requests: string[] = [];
	await page.route("**/api/sync*", async (route) => {
		requests.push(route.request().url());
		await route.fulfill({
			json: { calendars, events, syncedAt: "2026-11-18T07:59:00.000Z" },
		});
	});
	await page.goto("/");
	await expect.poll(() => requests.length).toBe(1);
	const sync = page.getByRole("button", { name: "Synchroniser" });
	await expect(sync).not.toHaveAttribute("aria-disabled", "true");

	await context.setOffline(true);
	await expect(sync).toHaveAttribute("aria-disabled", "true");
	await sync.dispatchEvent("click");
	await page.waitForTimeout(300);
	expect(requests).toHaveLength(1);

	await context.setOffline(false);
	await expect(sync).not.toHaveAttribute("aria-disabled", "true");
});

test("resyncs on return to the foreground only after more than 15 minutes", async ({
	page,
}) => {
	let syncedAt = "2026-11-18T07:40:00.000Z"; // 20 minutes before the fixed clock
	const requests: string[] = [];
	await page.route("**/api/sync*", async (route) => {
		requests.push(route.request().url());
		await route.fulfill({ json: { calendars, events, syncedAt } });
	});
	await page.goto("/");
	await expect.poll(() => requests.length).toBe(1);
	await expect(page.getByText(/Dernière synchro :.*08:40/)).toBeVisible();

	await page.evaluate(() =>
		document.dispatchEvent(new Event("visibilitychange")),
	);
	await expect.poll(() => requests.length).toBe(2);
	await expect(page.getByText("Synchronisation…")).toHaveCount(0);

	syncedAt = "2026-11-18T07:50:00.000Z"; // 10 minutes before the fixed clock
	await page.evaluate(() =>
		document.dispatchEvent(new Event("visibilitychange")),
	);
	await expect.poll(() => requests.length).toBe(3);
	await expect(page.getByText(/Dernière synchro :.*08:50/)).toBeVisible();
	await expect(page.getByText("Synchronisation…")).toHaveCount(0);

	await page.evaluate(() =>
		document.dispatchEvent(new Event("visibilitychange")),
	);
	await page.waitForTimeout(400);
	expect(requests).toHaveLength(3);
});

test("updates the last sync date after a success", async ({ page }) => {
	await page.route("**/api/sync*", async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await route.fulfill({
			json: { calendars, events, syncedAt: "2026-11-18T08:00:00.000Z" },
		});
	});
	await page.goto("/");

	await expect(page.getByText(/Dernière synchro :.*08:30/)).toBeVisible();
	await expect(page.getByText(/Dernière synchro :.*09:00/)).toBeVisible();
});
