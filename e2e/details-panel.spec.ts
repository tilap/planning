import { expect, type Page, test } from "@playwright/test";
import { calendars, NOW, timed } from "./support/fixtures";
import { seedCache } from "./support/seed-cache";

// Times are given in Paris (UTC+1).
const E1 = {
	...timed("E1", "Dentiste", "2026-11-18T09:00:00Z", "2026-11-18T09:45:00Z"),
	location: "12 rue Neuve",
	description:
		"Apporter la carte. Plus d'infos sur https://exemple.fr/info, écrire à alice@example.com ou appeler le 06 12 34 56 78.",
	meetingUrl: "https://meet.example/abc",
	meetingPhone: { number: "+33 1 23 45 67 89", pin: "424242" },
	organizer: { name: "Alice", email: "alice@example.com" },
	attendees: [
		{ name: "Alice", email: "alice@example.com", status: "accepted" },
		{ name: "Bruno", email: "bruno@example.com", status: "declined" },
	],
	htmlLink: "https://calendar.example/e1",
};
const E2 = timed(
	"E2",
	"Réunion",
	"2026-11-18T10:00:00Z",
	"2026-11-18T11:30:00Z",
);

test.use({ locale: "fr-FR", timezoneId: "Europe/Paris" });

async function openList(page: Page) {
	await page.clock.setFixedTime(NOW);
	await seedCache(page, { events: [E1, E2], calendars });
	await page.goto("/");
	await expect(page.getByTestId("event-E1")).toBeVisible();
}

const panel = (page: Page) => page.getByRole("dialog");

async function drag(page: Page, dx: number) {
	// Wait for the entry animation to end, so the panel is under the pointer.
	await expect.poll(async () => (await panel(page).boundingBox())?.x).toBe(0);
	const y = 400;
	const startX = dx >= 0 ? 100 : 300;
	await page.mouse.move(startX, y);
	await page.mouse.down();
	await page.mouse.move(startX + dx / 2, y);
	await page.mouse.move(startX + dx, y);
	await page.mouse.up();
}

test("shows the details of an event in a panel", async ({ page }) => {
	await openList(page);
	await page.getByTestId("event-E1").click();

	const dialog = panel(page);
	await expect(dialog).toBeVisible();
	await expect(dialog).toContainText("Dentiste");
	await expect(dialog).toContainText("10:00–10:45 · 45min");
	await expect(dialog).toContainText("Perso");
	await expect(dialog).toContainText("12 rue Neuve");
	await expect(dialog).toContainText("Apporter la carte");
	await expect(
		dialog.getByRole("link", { name: "https://exemple.fr/info" }),
	).toHaveAttribute("href", "https://exemple.fr/info");
	await expect(
		dialog.getByRole("link", { name: "06 12 34 56 78" }),
	).toHaveAttribute("href", "tel:0612345678");
	await expect(dialog).toContainText("Organisé par Alice");
	await expect(
		dialog.getByRole("link", { name: "alice@example.com" }).first(),
	).toHaveAttribute("href", "mailto:alice@example.com");
	await expect(
		dialog.getByRole("link", { name: "+33 1 23 45 67 89" }),
	).toHaveAttribute("href", "tel:+33123456789,,424242#");
	await expect(dialog).toContainText("Code PIN : 424242");
	await expect(dialog).toContainText("Accepté");
	await expect(dialog).toContainText("Refusé");
	await expect(dialog).toContainText("Alice");
	await expect(dialog).toContainText("Bruno");
	await expect(
		dialog.locator('a[href="https://meet.example/abc"]'),
	).toBeVisible();
	await expect(
		dialog.getByRole("link", { name: "Ouvrir dans Google Agenda" }),
	).toHaveAttribute("href", "https://calendar.example/e1");
});

test("hides the Google Calendar link when the event has none", async ({
	page,
}) => {
	await openList(page);
	await page.getByTestId("event-E2").click();
	await expect(panel(page)).toBeVisible();
	await expect(
		panel(page).getByRole("link", { name: "Ouvrir dans Google Agenda" }),
	).toHaveCount(0);
});

test("closes with the cross without adding history entries", async ({
	page,
}) => {
	await openList(page);
	const before = await page.evaluate(() => history.length);
	await page.getByTestId("event-E1").click();
	await expect(panel(page)).toBeVisible();
	expect(await page.evaluate(() => history.length)).toBe(before + 1);

	await panel(page).getByRole("button", { name: "Fermer" }).click();
	await expect(panel(page)).toHaveCount(0);
	await expect(page.getByTestId("event-E1")).toBeVisible();
	expect(await page.evaluate(() => history.length)).toBe(before + 1);
	expect(await page.evaluate(() => history.state?.sidePanel ?? false)).toBe(
		false,
	);
});

test("closes with a swipe to the right only", async ({ page }) => {
	await openList(page);
	await page.getByTestId("event-E1").click();
	await expect(panel(page)).toBeVisible();

	await drag(page, 120);
	await expect(panel(page)).toHaveCount(0);

	await page.getByTestId("event-E1").click();
	await expect(panel(page)).toBeVisible();
	await drag(page, 40);
	await expect(panel(page)).toBeVisible();

	await drag(page, -120);
	await expect(panel(page)).toBeVisible();
});

test("closes with the back gesture without leaving the app", async ({
	page,
}) => {
	await openList(page);
	await page.getByTestId("event-E1").click();
	await expect(panel(page)).toBeVisible();

	await page.goBack();
	await expect(panel(page)).toHaveCount(0);
	await expect(page.getByTestId("event-E1")).toBeVisible();
	expect(new URL(page.url()).pathname).toBe("/");
});
