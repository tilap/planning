import { expect, type Page, test } from "@playwright/test";
import { allDay, calendars, NOW, timed } from "./support/fixtures";
import { readStore, seedCache } from "./support/seed-cache";

const E1 = timed(
	"E1",
	"Dentiste",
	"2026-11-18T09:00:00Z",
	"2026-11-18T09:45:00Z",
);
const E2 = timed(
	"E2",
	"Réunion",
	"2026-11-18T10:00:00Z",
	"2026-11-18T11:30:00Z",
);
const E3 = timed(
	"E3",
	"Atelier",
	"2026-11-18T13:00:00Z",
	"2026-11-18T17:00:00Z",
);
const E4 = allDay("E4", "Anniversaire", "2026-11-18", "2026-11-19");
const E5 = allDay("E5", "Voyage", "2026-11-20", "2026-11-23");
const E7 = timed("E7", "Passé", "2026-11-14T09:00:00Z", "2026-11-14T10:00:00Z");

/**
 * The sign-in screen only shows when no session is confirmed, and an empty
 * memory only shows its message when the first sync worked: a signed-in
 * session whose sync succeeds with no event.
 */
async function stubSignedIn(page: Page) {
	await page.route("**/api/auth/session", (route) =>
		route.fulfill({ json: { signedIn: true } }),
	);
	await page.route("**/api/sync*", (route) =>
		route.fulfill({
			json: {
				calendars: [],
				events: [],
				syncedAt: "2026-11-18T08:00:00.000Z",
			},
		}),
	);
}

test.describe("French locale in Paris", () => {
	test.use({ locale: "fr-FR", timezoneId: "Europe/Paris" });

	test("displays the list from memory with the network cut", async ({
		page,
	}) => {
		await page.clock.setFixedTime(NOW);
		await seedCache(page, { events: [E1, E2, E3, E4, E5], calendars });
		await page.route("**/api/**", (route) => route.abort());
		await page.goto("/");

		await expect(
			page.getByRole("heading", { name: "mer. 18 novembre" }),
		).toBeVisible();
		const firstOfDay = page.locator("#day-2026-11-18 li").first();
		await expect(firstOfDay).toHaveAttribute("data-testid", "event-E4");
		await expect(firstOfDay).toContainText("Journée");
		await expect(page.getByTestId("event-E1")).toContainText("10:00");
		await expect(page.getByTestId("event-E1")).toContainText("10:45");
		await expect(page.getByTestId("event-E1")).toContainText("45min");
		await expect(firstOfDay).not.toContainText("00:00");
		await expect(page.getByTestId("event-E2")).toContainText("1h30");
		await expect(page.getByTestId("event-E3")).toContainText("4h");
		await expect(page.getByTestId("event-E5")).toHaveCount(3);
		await expect(page.getByText("jour 1/3")).toBeVisible();
		await expect(page.getByText("jour 2/3")).toBeVisible();
		await expect(page.getByText("jour 3/3")).toBeVisible();
	});

	test("wraps a long event title on several lines", async ({ page }) => {
		const long = timed(
			"LONG",
			"Rendez-vous avec le dentiste de la famille pour le contrôle annuel",
			"2026-11-18T09:00:00Z",
			"2026-11-18T09:45:00Z",
		);
		await page.clock.setFixedTime(NOW);
		await seedCache(page, { events: [long], calendars });
		await page.route("**/api/**", (route) => route.abort());
		await page.goto("/");

		const title = page.getByTestId("event-LONG").getByText(long.title);
		await expect(title).toBeVisible();
		expect((await title.boundingBox())?.height ?? 0).toBeGreaterThan(40);
	});

	test("shows the empty message when the memory is empty", async ({ page }) => {
		await stubSignedIn(page);
		await page.clock.setFixedTime(NOW);
		await seedCache(page, { events: [], calendars: [] });
		await page.goto("/");
		await expect(page.getByText("Aucun événement en mémoire")).toBeVisible();
	});

	test("empties a memory of another version", async ({ page }) => {
		await stubSignedIn(page);
		await page.clock.setFixedTime(NOW);
		await seedCache(page, { version: 0, events: [E1], calendars });
		await page.goto("/");
		await expect(page.getByText("Aucun événement en mémoire")).toBeVisible();
		expect(await readStore(page, "events")).toEqual([]);
	});

	test("re-reads the device time zone when the app returns to the foreground", async ({
		page,
	}) => {
		await page.clock.setFixedTime(NOW);
		await seedCache(page, { events: [E3], calendars });
		await page.goto("/");
		await expect(page.getByTestId("event-E3")).toContainText("14:00");

		await page.evaluate(() => {
			const original = Intl.DateTimeFormat.prototype.resolvedOptions;
			Intl.DateTimeFormat.prototype.resolvedOptions = function () {
				return { ...original.call(this), timeZone: "Asia/Ho_Chi_Minh" };
			};
			document.dispatchEvent(new Event("visibilitychange"));
		});

		await expect(page.getByTestId("event-E3")).toContainText("20:00");
	});
});

test.describe("English locale in Paris", () => {
	test.use({ locale: "en-US", timezoneId: "Europe/Paris" });

	test("uses the device language and hour format by default", async ({
		page,
	}) => {
		await page.clock.setFixedTime(NOW);
		await seedCache(page, { events: [E1, E4], calendars });
		await page.goto("/");
		await expect(
			page.getByRole("heading", { name: "Wed, November 18" }),
		).toBeVisible();
		await expect(page.getByTestId("event-E1")).toContainText("10:00 AM");
		await expect(page.getByTestId("event-E1")).toContainText("10:45 AM");
		await expect(page.getByTestId("event-E4")).toContainText("All day");
	});

	test("opens on today and the Today button brings back to it", async ({
		page,
	}) => {
		await page.clock.setFixedTime(NOW);
		// The list stops when its end reaches the bottom of the screen, so
		// enough days follow today for it to reach the top.
		const later = Array.from({ length: 12 }, (_, index) =>
			timed(
				`L${index}`,
				"Later",
				`2026-11-${String(19 + index).padStart(2, "0")}T09:00:00Z`,
				`2026-11-${String(19 + index).padStart(2, "0")}T10:00:00Z`,
			),
		);
		await seedCache(page, { events: [E7, E1, ...later], calendars });
		await page.goto("/");

		const today = page.getByRole("heading", { name: "Wed, November 18" });
		const past = page.getByRole("heading", { name: "Sat, November 14" });
		await expect(today).toBeVisible();
		await expect
			.poll(async () => (await today.boundingBox())?.y ?? 999)
			.toBeLessThan(40);
		await expect(page.getByRole("button", { name: "Today" })).toHaveCount(0);

		await page.evaluate(() => window.scrollTo(0, 0));
		await expect(past).toBeInViewport();
		await expect(page.locator("#day-2026-11-14 ul")).toHaveCSS(
			"border-top-style",
			"dashed",
		);
		await expect(page.locator("#day-2026-11-18 ul")).toHaveCSS(
			"border-top-style",
			"solid",
		);
		await expect(page.getByRole("button", { name: "Today" })).toBeVisible();

		await page.getByRole("button", { name: "Today" }).click();
		await expect
			.poll(async () => (await today.boundingBox())?.y ?? 999)
			.toBeLessThan(40);
	});
});
