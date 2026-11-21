import { expect, type Page, test } from "@playwright/test";
import { calendars, NOW, timed } from "./support/fixtures";
import { seedCache } from "./support/seed-cache";

test.use({
	locale: "fr-FR",
	timezoneId: "Europe/Paris",
	viewport: { width: 1100, height: 400 },
});

const day = (id: string, date: string) => ({
	...timed(id, `Event ${id}`, `${date}T09:00:00Z`, `${date}T10:00:00Z`),
	calendarId: calendars[0].id,
});
const EVENTS = [
	day("E1", "2026-11-16"),
	day("E2", "2026-11-18"),
	day("E3", "2026-11-19"),
	day("E4", "2026-11-20"),
	day("E5", "2026-11-23"),
	day("E6", "2026-11-25"),
];
const SYNCED_AT = "2026-11-18T08:00:00.000Z";

async function open(page: Page): Promise<string[]> {
	await page.clock.setFixedTime(NOW);
	await seedCache(page, {
		events: EVENTS,
		calendars,
		meta: { lastSync: SYNCED_AT },
	});
	const requests: string[] = [];
	await page.route("**/api/sync*", (route) => {
		requests.push(route.request().url());
		return route.fulfill({
			json: { calendars, events: EVENTS, syncedAt: SYNCED_AT },
		});
	});
	await page.goto("/");
	await expect(page.getByTestId("event-E2")).toBeVisible();
	await expect.poll(() => requests.length).toBe(1);
	// The launch sync is over: a sync that is running ignores another one.
	await expect(
		page.getByRole("button", { name: "Synchroniser" }).locator("svg"),
	).not.toHaveClass(/animate-spin/);
	return requests;
}

/** The date of the day section whose header is the closest to the top of the screen. */
const topDay = (page: Page) =>
	page.evaluate(() => {
		const sections = [...document.querySelectorAll("section[id^='day-']")];
		const current = sections.filter((s) => s.getBoundingClientRect().top <= 8);
		return current.at(-1)?.id ?? null;
	});

test("p toggles the settings panel", async ({ page }) => {
	await open(page);
	await page.keyboard.press("p");
	await expect(page.getByRole("dialog")).toBeVisible();
	await page.keyboard.press("p");
	await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("s opens the search with the field focused, and typing keeps the letters", async ({
	page,
}) => {
	await open(page);
	await page.keyboard.press("s");
	const field = page.getByRole("textbox", { name: "Rechercher" });
	await expect(field).toBeFocused();
	await expect(field).toHaveValue("");
	await page.keyboard.type("psn");
	await expect(field).toHaveValue("psn");
	await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("r synchronizes", async ({ page }) => {
	const requests = await open(page);
	await page.keyboard.press("r");
	await expect.poll(() => requests.length).toBe(2);
});

test("n, b and t move between days", async ({ page }) => {
	await open(page);
	await page.keyboard.press("t");
	await expect.poll(() => topDay(page)).toBe("day-2026-11-18");
	await page.keyboard.press("n");
	await expect.poll(() => topDay(page)).toBe("day-2026-11-19");
	await page.keyboard.press("n");
	await expect.poll(() => topDay(page)).toBe("day-2026-11-20");
	await page.keyboard.press("b");
	await expect.poll(() => topDay(page)).toBe("day-2026-11-19");
	await page.keyboard.press("b");
	await page.keyboard.press("b");
	await expect.poll(() => topDay(page)).toBe("day-2026-11-16");
	await page.keyboard.press("t");
	await expect.poll(() => topDay(page)).toBe("day-2026-11-18");
});
