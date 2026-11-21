import { expect, type Page, test } from "@playwright/test";
import { calendars, NOW, timed } from "./support/fixtures";
import { readStore, seedCache } from "./support/seed-cache";

test.use({ locale: "fr-FR", timezoneId: "Europe/Paris" });

const CAL_A = calendars[0];
const CAL_B = { ...calendars[0], id: "cal-b", name: "Travail" };
const CAL_C = { ...calendars[0], id: "cal-c", name: "Famille" };

const EVENT_A = {
	...timed("EA", "Dentiste", "2026-11-18T09:00:00Z", "2026-11-18T09:45:00Z"),
	calendarId: "cal-a",
};
const EVENT_B = {
	...timed("EB", "Réunion", "2026-11-18T10:00:00Z", "2026-11-18T11:00:00Z"),
	calendarId: "cal-b",
};
const EVENT_C = {
	...timed("EC", "Goûter", "2026-11-18T15:00:00Z", "2026-11-18T16:00:00Z"),
	calendarId: "cal-c",
};

const SYNCED_AT = "2026-11-18T08:00:00.000Z";

/** The sync route answers with the same data, so a launch sync changes nothing. */
async function stubSync(
	page: Page,
	body: { calendars: unknown[]; events: unknown[] } = {
		calendars: [CAL_A, CAL_B],
		events: [EVENT_A, EVENT_B],
	},
): Promise<string[]> {
	const requests: string[] = [];
	await page.route("**/api/sync*", (route) => {
		requests.push(route.request().url());
		return route.fulfill({ json: { ...body, syncedAt: SYNCED_AT } });
	});
	return requests;
}

async function open(page: Page, meta: Record<string, unknown> = {}) {
	await page.clock.setFixedTime(NOW);
	await seedCache(page, {
		events: [EVENT_A, EVENT_B],
		calendars: [CAL_A, CAL_B],
		meta: { lastSync: SYNCED_AT, ...meta },
	});
}

const panel = (page: Page) => page.getByRole("dialog");

/** Waits until the preferences stored on the device satisfy a condition. */
async function expectStoredPreferences(
	page: Page,
	matches: (preferences: Record<string, unknown>) => boolean,
) {
	await expect
		.poll(async () => {
			const meta = (await readStore(page, "meta")) as unknown[];
			return meta.some(
				(value) =>
					typeof value === "object" &&
					value !== null &&
					"hiddenCalendarIds" in value &&
					matches(value as Record<string, unknown>),
			);
		})
		.toBe(true);
}

async function openSettings(page: Page) {
	await page.getByRole("button", { name: "Réglages" }).click();
	await expect(panel(page)).toBeVisible();
}

test("lists the calendars with an active switch each", async ({ page }) => {
	await open(page);
	await stubSync(page);
	await page.goto("/");
	await openSettings(page);

	for (const name of ["Perso", "Travail"]) {
		await expect(panel(page).getByRole("switch", { name })).toHaveAttribute(
			"aria-checked",
			"true",
		);
	}
});

test("hides and shows a calendar without any network call", async ({
	page,
	context,
}) => {
	await open(page);
	const requests = await stubSync(page);
	await page.goto("/");
	await expect(page.getByTestId("event-EB")).toBeVisible();
	await expect.poll(() => requests.length).toBe(1);
	await context.setOffline(true);
	await openSettings(page);

	await panel(page).getByRole("switch", { name: "Travail" }).click();
	await expect(page.getByTestId("event-EB")).toHaveCount(0);
	await expect(page.getByTestId("event-EA")).toBeVisible();

	await panel(page).getByRole("switch", { name: "Travail" }).click();
	await expect(page.getByTestId("event-EB")).toBeVisible();
	expect(requests).toHaveLength(1);
});

test("keeps a hidden calendar hidden after a reload", async ({ page }) => {
	await open(page);
	await stubSync(page);
	await page.goto("/");
	await openSettings(page);
	await panel(page).getByRole("switch", { name: "Travail" }).click();
	await expect(page.getByTestId("event-EB")).toHaveCount(0);
	await expectStoredPreferences(page, (value) =>
		(value.hiddenCalendarIds as string[]).includes("cal-b"),
	);

	await page.reload();

	await expect(page.getByTestId("event-EA")).toBeVisible();
	await expect(page.getByTestId("event-EB")).toHaveCount(0);
	await openSettings(page);
	await expect(
		panel(page).getByRole("switch", { name: "Travail" }),
	).toHaveAttribute("aria-checked", "false");
});

test("shows a new calendar and keeps a hidden one hidden after a sync", async ({
	page,
}) => {
	await open(page, { preferences: { hiddenCalendarIds: ["cal-b"] } });
	await stubSync(page, {
		calendars: [CAL_A, CAL_B, CAL_C],
		events: [EVENT_A, EVENT_B, EVENT_C],
	});
	await page.goto("/");

	await expect(page.getByTestId("event-EC")).toBeVisible();
	await expect(page.getByTestId("event-EA")).toBeVisible();
	await expect(page.getByTestId("event-EB")).toHaveCount(0);
});

test("changes the language immediately and keeps it after a reload", async ({
	page,
}) => {
	await open(page);
	await stubSync(page);
	await page.goto("/");
	await openSettings(page);

	await panel(page).getByLabel("Langue").selectOption("en");

	await expect(
		panel(page).getByRole("heading", { name: "Settings" }),
	).toBeVisible();
	await expectStoredPreferences(page, (value) => value.language === "en");
	await page.goBack();
	await expect(
		page.getByRole("heading", { name: "Wed, November 18" }),
	).toBeVisible();

	await page.reload();
	await expect(
		page.getByRole("heading", { name: "Wed, November 18" }),
	).toBeVisible();
});

test("changes the synced range, saves it and syncs with it at once", async ({
	page,
}) => {
	await open(page);
	const requests = await stubSync(page);
	await page.goto("/");
	await expect.poll(() => requests.length).toBe(1);
	const first = new URL(requests[0] ?? "");
	expect(first.searchParams.get("past")).toBe("1w");
	expect(first.searchParams.get("ahead")).toBe("3m");
	await openSettings(page);

	await panel(page).getByLabel("Passé").selectOption("1m");

	await expect.poll(() => requests.length).toBe(2);
	const second = new URL(requests[1] ?? "");
	expect(second.searchParams.get("past")).toBe("1m");
	expect(second.searchParams.get("ahead")).toBe("3m");
	await expectStoredPreferences(page, (value) => value.syncPast === "1m");

	await panel(page).getByLabel("À venir").selectOption("1m");

	await expect.poll(() => requests.length).toBe(3);
	const third = new URL(requests[2] ?? "");
	expect(third.searchParams.get("past")).toBe("1m");
	expect(third.searchParams.get("ahead")).toBe("1m");
	await expectStoredPreferences(
		page,
		(value) => value.syncPast === "1m" && value.syncAhead === "1m",
	);
});

test("offers only the allowed ranges", async ({ page }) => {
	await open(page);
	await stubSync(page);
	await page.goto("/");
	await openSettings(page);

	await expect(panel(page).getByLabel("Passé").getByRole("option")).toHaveText([
		"-1 semaine",
		"-2 semaines",
		"-1 mois",
	]);
	await expect(
		panel(page).getByLabel("À venir").getByRole("option"),
	).toHaveText(["+1 mois", "+2 mois", "+3 mois"]);
});

test("changes the hour format immediately and keeps it after a reload", async ({
	page,
}) => {
	await open(page);
	await stubSync(page);
	await page.goto("/");
	await expect(page.getByTestId("event-EA")).toContainText("10:00");
	await openSettings(page);

	await panel(page).getByLabel("Format de l'heure").selectOption("12");
	await expect(page.getByTestId("event-EA")).toContainText("10:00 AM");
	await expectStoredPreferences(page, (value) => value.hourFormat === "12");

	await page.reload();
	await expect(page.getByTestId("event-EA")).toContainText("10:00 AM");

	await openSettings(page);
	await panel(page).getByLabel("Format de l'heure").selectOption("24");
	await expect(page.getByTestId("event-EA")).not.toContainText("AM");
});

test("plays the interface sounds only once they are turned on", async ({
	page,
}) => {
	// Counts the notes the page asks the audio engine to play.
	await page.addInitScript(() => {
		const counter = window as unknown as { notes: number };
		counter.notes = 0;
		const createOscillator = AudioContext.prototype.createOscillator;
		AudioContext.prototype.createOscillator = function () {
			counter.notes += 1;
			return createOscillator.call(this);
		};
	});
	const notes = () =>
		page.evaluate(() => (window as unknown as { notes: number }).notes);
	await open(page);
	await stubSync(page);
	await page.goto("/");
	await expect(page.getByTestId("event-EA")).toBeVisible();

	await openSettings(page);
	const sounds = panel(page).getByRole("switch", { name: "Sons" });
	await expect(sounds).toHaveAttribute("aria-checked", "false");
	expect(await notes()).toBe(0);

	await sounds.click();
	await expect(sounds).toHaveAttribute("aria-checked", "true");
	await expectStoredPreferences(page, (value) => value.sound === true);
	await page.keyboard.press("Escape");
	await expect(panel(page)).toBeHidden();
	await expect.poll(notes).toBeGreaterThan(0);

	await page.reload();
	await openSettings(page);
	await expect(
		panel(page).getByRole("switch", { name: "Sons" }),
	).toHaveAttribute("aria-checked", "true");
	await expect.poll(notes).toBeGreaterThan(0);

	await panel(page).getByRole("switch", { name: "Sons" }).click();
	await expectStoredPreferences(page, (value) => value.sound === false);
	await page.evaluate(() => {
		(window as unknown as { notes: number }).notes = 0;
	});
	await page.keyboard.press("Escape");
	await expect(panel(page)).toBeHidden();
	await openSettings(page);
	expect(await notes()).toBe(0);
});

test("closes with the back gesture", async ({ page }) => {
	await open(page);
	await stubSync(page);
	await page.goto("/");
	await openSettings(page);

	await page.goBack();

	await expect(panel(page)).toHaveCount(0);
	await expect(page.getByTestId("event-EA")).toBeVisible();
});

test("keeps the appearance on the device and applies it", async ({ page }) => {
	await open(page);
	await stubSync(page);
	await page.goto("/");
	await openSettings(page);

	await panel(page).getByLabel("Apparence").selectOption("dark");
	await expect
		.poll(() => page.evaluate(() => document.documentElement.dataset.theme))
		.toBe("dark");
	const darkCanvas = await page.evaluate(
		() => getComputedStyle(document.documentElement).backgroundColor,
	);
	await expectStoredPreferences(page, (value) => value.colorScheme === "dark");

	await page.reload();
	await expect
		.poll(() => page.evaluate(() => document.documentElement.dataset.theme))
		.toBe("dark");

	await openSettings(page);
	await panel(page).getByLabel("Apparence").selectOption("light");
	await expect
		.poll(() => page.evaluate(() => document.documentElement.dataset.theme))
		.toBe("light");
	const lightCanvas = await page.evaluate(
		() => getComputedStyle(document.documentElement).backgroundColor,
	);
	expect(lightCanvas).not.toBe(darkCanvas);

	await panel(page).getByLabel("Apparence").selectOption("system");
	await expect
		.poll(() =>
			page.evaluate(() => document.documentElement.dataset.theme ?? "system"),
		)
		.toBe("system");
	await expectStoredPreferences(
		page,
		(value) => value.colorScheme === "system",
	);
});

test("has touch-sized switches and readable fields", async ({ page }) => {
	await open(page);
	await stubSync(page);
	await page.goto("/");
	await openSettings(page);

	for (const name of ["Perso", "Travail"]) {
		const box = await panel(page).getByRole("switch", { name }).boundingBox();
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
	}
	const fontSize = await panel(page)
		.getByLabel("Langue")
		.evaluate((element) =>
			Number.parseFloat(getComputedStyle(element).fontSize),
		);
	expect(fontSize).toBeGreaterThanOrEqual(16);
});

test("shows the build version", async ({ page }) => {
	await open(page);
	await stubSync(page);
	await page.goto("/");
	await openSettings(page);

	await expect(panel(page).getByText(/^Version /)).toBeVisible();
});

test("offers the appearance only with the paper theme", async ({ page }) => {
	await open(page);
	await stubSync(page);
	await page.goto("/");
	await openSettings(page);
	await expect(panel(page).getByLabel("Apparence")).toBeVisible();

	await panel(page).getByLabel("Thème").selectOption("violet");
	await expect(panel(page).getByLabel("Apparence")).toHaveCount(0);

	await panel(page).getByLabel("Thème").selectOption("paper");
	await expect(panel(page).getByLabel("Apparence")).toBeVisible();
});

test("shows the administrator section only to an admin, and opens a sheet from it", async ({
	page,
}) => {
	await open(page);
	await stubSync(page);
	await page.route("**/api/auth/session", (route) =>
		route.fulfill({
			json: { signedIn: true, admin: true, usersEnabled: true },
		}),
	);
	await page.goto("/");
	await openSettings(page);

	await expect(
		panel(page).getByRole("heading", { name: "Administrateur" }),
	).toBeVisible();
	await panel(page).getByRole("button", { name: "Utilisateurs" }).click();

	const sheet = page.getByRole("dialog", { name: "Utilisateurs" });
	await expect(sheet).toBeVisible();
	// It stops 20px below the top of the screen.
	await expect
		.poll(async () => Math.round((await sheet.boundingBox())?.y ?? -1))
		.toBe(20);

	// The back gesture closes the sheet only.
	await page.goBack();
	await expect(sheet).toHaveCount(0);
	await expect(page.getByRole("dialog", { name: "Réglages" })).toBeVisible();

	await panel(page).getByRole("button", { name: "Utilisateurs" }).click();
	await expect(sheet).toBeVisible();
	await sheet.getByRole("button", { name: "Fermer" }).click();
	await expect(sheet).toHaveCount(0);
	await expect(page.getByRole("dialog", { name: "Réglages" })).toBeVisible();
});

test("hides the administrator section from a user who is not an admin", async ({
	page,
}) => {
	await open(page);
	await stubSync(page);
	await page.route("**/api/auth/session", (route) =>
		route.fulfill({
			json: { signedIn: true, admin: false, usersEnabled: true },
		}),
	);
	await page.goto("/");
	await openSettings(page);

	await expect(
		panel(page).getByRole("heading", { name: "Personnalisation" }),
	).toBeVisible();
	await expect(
		panel(page).getByRole("heading", { name: "Administrateur" }),
	).toHaveCount(0);
});

test("hides the administrator section when the allowed addresses are not managed in the app", async ({
	page,
}) => {
	await open(page);
	await stubSync(page);
	await page.route("**/api/auth/session", (route) =>
		route.fulfill({
			json: { signedIn: true, admin: true, usersEnabled: false },
		}),
	);
	await page.goto("/");
	await openSettings(page);

	await expect(
		panel(page).getByRole("heading", { name: "Personnalisation" }),
	).toBeVisible();
	await expect(
		panel(page).getByRole("heading", { name: "Administrateur" }),
	).toHaveCount(0);
	await expect(
		panel(page).getByRole("button", { name: "Utilisateurs" }),
	).toHaveCount(0);
});

test("lists, adds and removes the addresses allowed to sign in", async ({
	page,
}) => {
	await open(page);
	await stubSync(page);
	await page.route("**/api/auth/session", (route) =>
		route.fulfill({
			json: { signedIn: true, admin: true, usersEnabled: true },
		}),
	);
	// A tiny in-memory copy of the server's list.
	let users = [
		{ email: "friend@example.com", addedBy: "me@example.com", addedAt: "x" },
	];
	const calls: string[] = [];
	await page.route("**/api/admin/users", async (route) => {
		const request = route.request();
		const snapshot = () => ({ admins: ["me@example.com"], users });
		if (request.method() === "GET") return route.fulfill({ json: snapshot() });
		const { email } = request.postDataJSON() as { email: string };
		calls.push(`${request.method()} ${email}`);
		if (request.method() === "POST") {
			if (email === "me@example.com") {
				return route.fulfill({
					status: 409,
					json: { code: "already_admin" },
				});
			}
			users = [...users, { email, addedBy: "me@example.com", addedAt: "x" }];
			return route.fulfill({ status: 201, json: snapshot() });
		}
		users = users.filter((user) => user.email !== email);
		return route.fulfill({ json: snapshot() });
	});
	await page.goto("/");
	await openSettings(page);
	await panel(page).getByRole("button", { name: "Utilisateurs" }).click();
	const sheet = page.getByRole("dialog", { name: "Utilisateurs" });

	await expect(sheet.getByText("me@example.com")).toBeVisible();
	await expect(sheet.getByText("Admin", { exact: true })).toBeVisible();
	await expect(sheet.getByText("friend@example.com")).toBeVisible();
	// An admin cannot be removed from here.
	await expect(
		sheet.getByRole("button", { name: "Retirer me@example.com" }),
	).toHaveCount(0);

	await sheet.getByLabel("Adresse Google à autoriser").fill("new@example.com");
	await sheet.getByRole("button", { name: "Ajouter" }).click();
	await expect(sheet.getByText("new@example.com")).toBeVisible();
	await expect(sheet.getByLabel("Adresse Google à autoriser")).toHaveValue("");

	await sheet.getByLabel("Adresse Google à autoriser").fill("me@example.com");
	await sheet.getByRole("button", { name: "Ajouter" }).click();
	await expect(
		sheet.getByText("Cette adresse est déjà administrateur"),
	).toBeVisible();

	await sheet
		.getByRole("button", { name: "Retirer friend@example.com" })
		.click();
	await expect(sheet.getByText("friend@example.com")).toHaveCount(0);
	expect(calls).toEqual([
		"POST new@example.com",
		"POST me@example.com",
		"DELETE friend@example.com",
	]);
});
