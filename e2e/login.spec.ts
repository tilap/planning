import { expect, test } from "@playwright/test";
import { NOW } from "./support/fixtures";
import { seedCache } from "./support/seed-cache";

test.use({ locale: "fr-FR", timezoneId: "Europe/Paris" });

test("shows a loading screen until it knows the sign-in screen is needed", async ({
	page,
}) => {
	await page.clock.setFixedTime(NOW);
	let release = () => {};
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route("**/api/auth/session", async (route) => {
		await gate;
		await route.fulfill({ json: { signedIn: false } });
	});
	await seedCache(page, { events: [], calendars: [] });
	await page.goto("/");

	await expect(page.getByRole("status", { name: "Chargement…" })).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Se connecter avec Google" }),
	).toHaveCount(0);
	await expect(page.getByRole("navigation")).toHaveCount(0);

	release();
	await expect(
		page.getByRole("link", { name: "Se connecter avec Google" }),
	).toBeVisible();
	await expect(page.getByRole("status", { name: "Chargement…" })).toHaveCount(
		0,
	);
});

test("asks for a network when the memory is empty and the app cannot reach the server", async ({
	page,
}) => {
	await page.clock.setFixedTime(NOW);
	await seedCache(page, { events: [], calendars: [] });
	await page.route("**/api/auth/session", (route) => route.abort());
	await page.goto("/");

	await expect(page.getByText("Se connecter avec Google")).toBeVisible();
	await expect(
		page.getByText("Réseau nécessaire pour la première connexion"),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Se connecter avec Google" }),
	).toHaveCount(0);
});

test("offers the Google sign-in when the memory is empty and the server is reachable", async ({
	page,
}) => {
	await page.clock.setFixedTime(NOW);
	await seedCache(page, { events: [], calendars: [] });
	await page.goto("/");

	await expect(
		page.getByRole("link", { name: "Se connecter avec Google" }),
	).toHaveAttribute("href", "/api/auth/google");
});

test("explains that the account is not allowed", async ({ page }) => {
	await page.clock.setFixedTime(NOW);
	await seedCache(page, { events: [], calendars: [] });
	await page.goto("/?error=forbidden");

	await expect(
		page.getByText("Ce compte Google n'est pas autorisé"),
	).toBeVisible();
});
