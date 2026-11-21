import { expect, type Page, type Route, test } from "@playwright/test";
import { calendars, NOW, timed } from "./support/fixtures";
import { readStore, seedCache } from "./support/seed-cache";

test.use({ locale: "fr-FR", timezoneId: "Europe/Paris" });

const CAL_A = calendars[0];
const CAL_B = { ...calendars[0], id: "cal-b", name: "Travail" };

function inCalendar(calendarId: string, event: ReturnType<typeof timed>) {
	return { ...event, calendarId };
}

/** Answers the sync route and records the requests it receives. */
async function stubSync(
	page: Page,
	body: unknown,
	{ delayMs = 0 }: { delayMs?: number } = {},
): Promise<URL[]> {
	const requests: URL[] = [];
	await page.route("**/api/sync*", async (route: Route) => {
		requests.push(new URL(route.request().url()));
		if (delayMs > 0)
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		await route.fulfill({ json: body });
	});
	return requests;
}

async function stubSignedIn(page: Page) {
	await page.route("**/api/auth/session", (route) =>
		route.fulfill({ json: { signedIn: true } }),
	);
}

async function eventIds(page: Page): Promise<string[]> {
	const events = (await readStore(page, "events")) as { id: string }[];
	return events.map((event) => event.id).sort();
}

const SYNCED_AT = "2026-11-18T08:00:05.000Z";

test.beforeEach(async ({ page }) => {
	await page.clock.setFixedTime(NOW);
});

test("shows the memory first and syncs without blocking", async ({ page }) => {
	const old = timed(
		"OLD",
		"Ancien",
		"2026-11-18T09:00:00Z",
		"2026-11-18T09:30:00Z",
	);
	const fresh = timed(
		"NEW",
		"Nouveau",
		"2026-11-18T10:00:00Z",
		"2026-11-18T10:30:00Z",
	);
	await seedCache(page, { events: [old], calendars: [CAL_A] });
	await stubSync(
		page,
		{ calendars: [CAL_A], events: [fresh], syncedAt: SYNCED_AT },
		// Longer than the 0.8 s the splash screen stays up.
		{ delayMs: 3000 },
	);
	await page.goto("/");

	await expect(page.getByTestId("event-OLD")).toBeVisible();
	await expect(page.getByText("Synchronisation…")).toBeVisible();

	// The list stays usable while the sync is pending.
	await page.getByTestId("event-OLD").click();
	await expect(page.getByRole("dialog")).toBeVisible();
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Fermer" })
		.click();
	await expect(page.getByRole("dialog")).toHaveCount(0);

	await expect(page.getByTestId("event-NEW")).toBeVisible();
	await expect(page.getByText("Synchronisation…")).toHaveCount(0);
});

test("asks the route for the default range in the device time zone", async ({
	page,
}) => {
	await seedCache(page, { events: [], calendars: [CAL_A] });
	const requests = await stubSync(page, {
		calendars: [CAL_A],
		events: [],
		syncedAt: SYNCED_AT,
	});
	await page.goto("/");

	await expect.poll(() => requests.length).toBeGreaterThan(0);
	const params = requests[0]?.searchParams;
	expect(params?.get("past")).toBe("1w");
	expect(params?.get("ahead")).toBe("3m");
	expect(params?.get("tz")).toBe("Europe/Paris");
	// The server computes the window: the client sends no free range.
	expect(params?.has("timeMin")).toBe(false);
	expect(params?.has("timeMax")).toBe(false);
});

test("deletes the events older than the purge cutoff and keeps the others", async ({
	page,
}) => {
	// The window and the cutoff both start at 2026-11-10T23:00:00.000Z
	// (start of the day 7 days ago, in Paris). P1 ends before that.
	// P2 and P3 are inside the window, so only the response can keep them.
	const p1 = timed(
		"P1",
		"Trop vieux",
		"2026-11-10T21:00:00Z",
		"2026-11-10T22:00:00Z",
	);
	const p2 = timed(
		"P2",
		"Limite",
		"2026-11-10T23:00:00Z",
		"2026-11-11T00:00:00Z",
	);
	const p3 = timed(
		"P3",
		"Récent",
		"2026-11-15T09:00:00Z",
		"2026-11-15T10:00:00Z",
	);
	await seedCache(page, { events: [p1, p2, p3], calendars: [CAL_A] });
	await stubSync(page, {
		calendars: [CAL_A],
		events: [p2, p3],
		syncedAt: SYNCED_AT,
	});
	await page.goto("/");

	await expect.poll(() => eventIds(page)).toEqual(["P2", "P3"]);
});

test("replaces the events of the window and keeps one that ends as the window starts", async ({
	page,
}) => {
	const x = timed(
		"X",
		"À venir",
		"2026-11-20T09:00:00Z",
		"2026-11-20T10:00:00Z",
	);
	const y = timed(
		"Y",
		"Limite",
		"2026-11-10T22:00:00.000Z",
		"2026-11-10T23:00:00.000Z",
	);
	await seedCache(page, { events: [x, y], calendars: [CAL_A] });
	await stubSync(page, { calendars: [CAL_A], events: [], syncedAt: SYNCED_AT });
	await page.goto("/");

	await expect.poll(() => eventIds(page)).toEqual(["Y"]);
});

test("removes a deleted calendar with all its events", async ({ page }) => {
	const a = inCalendar(
		"cal-a",
		timed(
			"AY",
			"Perso passé",
			"2026-11-10T22:00:00.000Z",
			"2026-11-10T23:00:00.000Z",
		),
	);
	const b = inCalendar(
		"cal-b",
		timed(
			"BY",
			"Travail passé",
			"2026-11-10T22:00:00.000Z",
			"2026-11-10T23:00:00.000Z",
		),
	);
	await seedCache(page, { events: [a, b], calendars: [CAL_A, CAL_B] });
	await stubSync(page, { calendars: [CAL_A], events: [], syncedAt: SYNCED_AT });
	await page.goto("/");

	await expect.poll(() => eventIds(page)).toEqual(["AY"]);
	const calendarIds = (
		(await readStore(page, "calendars")) as { id: string }[]
	).map((c) => c.id);
	expect(calendarIds).toEqual(["cal-a"]);
});

test("still syncs a hidden calendar", async ({ page }) => {
	const n1 = inCalendar(
		"cal-a",
		timed("N1", "Perso", "2026-11-19T09:00:00Z", "2026-11-19T10:00:00Z"),
	);
	const n2 = inCalendar(
		"cal-b",
		timed("N2", "Travail", "2026-11-19T09:00:00Z", "2026-11-19T10:00:00Z"),
	);
	await seedCache(page, {
		events: [],
		calendars: [CAL_A, CAL_B],
		meta: { preferences: { hiddenCalendarIds: ["cal-b"] } },
	});
	await stubSync(page, {
		calendars: [CAL_A, CAL_B],
		events: [n1, n2],
		syncedAt: SYNCED_AT,
	});
	await page.goto("/");

	await expect.poll(() => eventIds(page)).toEqual(["N1", "N2"]);
});

test("starts a sync when the Sync icon is tapped", async ({ page }) => {
	const e1 = timed(
		"E1",
		"Dentiste",
		"2026-11-18T09:00:00Z",
		"2026-11-18T09:45:00Z",
	);
	await seedCache(page, { events: [e1], calendars: [CAL_A] });
	const requests = await stubSync(page, {
		calendars: [CAL_A],
		events: [e1],
		syncedAt: SYNCED_AT,
	});
	await page.goto("/");
	await expect.poll(() => requests.length).toBe(1);
	await expect(page.getByText("Synchronisation…")).toHaveCount(0);

	await page.getByRole("button", { name: "Synchroniser" }).click();

	await expect.poll(() => requests.length).toBe(2);
});

test("fills the list on the first sync with an empty memory", async ({
	page,
}) => {
	await stubSignedIn(page);
	await seedCache(page, { events: [], calendars: [] });
	const events = [
		timed("F1", "Premier", "2026-11-18T09:00:00Z", "2026-11-18T09:30:00Z"),
		timed("F2", "Deuxième", "2026-11-18T10:00:00Z", "2026-11-18T10:30:00Z"),
		timed("F3", "Troisième", "2026-11-19T10:00:00Z", "2026-11-19T10:30:00Z"),
	];
	await stubSync(page, { calendars: [CAL_A], events, syncedAt: SYNCED_AT });
	await page.goto("/");

	await expect(page.getByTestId("event-F1")).toBeVisible();
	await expect(page.getByTestId("event-F2")).toBeVisible();
	await expect(page.getByTestId("event-F3")).toBeVisible();
});
