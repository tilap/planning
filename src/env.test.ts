import { afterEach, describe, expect, it, vi } from "vitest";

async function loadEnv(
	allowed: string,
	overrides: Record<string, string> = {},
) {
	vi.resetModules();
	vi.stubEnv("ALLOWED_EMAILS", allowed);
	for (const [name, value] of Object.entries(overrides)) {
		vi.stubEnv(name, value);
	}
	return (await import("./env")).env;
}

describe("ALLOWED_EMAILS", () => {
	afterEach(() => vi.unstubAllEnvs());

	it("keeps a single address", async () => {
		expect((await loadEnv("me@example.com")).ALLOWED_EMAILS).toEqual([
			"me@example.com",
		]);
	});

	it("splits any number of addresses, trimmed and lower-cased", async () => {
		const env = await loadEnv(
			" Me@Example.com, you@example.com ,,third@example.org",
		);
		expect(env.ALLOWED_EMAILS).toEqual([
			"me@example.com",
			"you@example.com",
			"third@example.org",
		]);
	});

	it("rejects an invalid address", async () => {
		await expect(loadEnv("me@example.com, nope")).rejects.toThrow(
			"Invalid environment variables",
		);
	});
});

describe("DATABASE_URL", () => {
	afterEach(() => vi.unstubAllEnvs());

	const url = "postgres://user:password@db.example/planning";

	it("keeps a valid URL", async () => {
		const env = await loadEnv("me@example.com", { DATABASE_URL: url });
		expect(env.DATABASE_URL).toBe(url);
	});

	it("is null when empty or missing, with or without DEV_FAKE_DATA", async () => {
		for (const fake of ["", "1"]) {
			const empty = await loadEnv("me@example.com", {
				DATABASE_URL: "",
				DEV_FAKE_DATA: fake,
			});
			expect(empty.DATABASE_URL).toBeNull();
		}
		vi.resetModules();
		vi.stubEnv("ALLOWED_EMAILS", "me@example.com");
		vi.stubEnv("DATABASE_URL", undefined);
		expect((await import("./env")).env.DATABASE_URL).toBeNull();
	});

	it("rejects a value that is not a URL", async () => {
		await expect(
			loadEnv("me@example.com", { DATABASE_URL: "nope" }),
		).rejects.toThrow("DATABASE_URL");
	});
});
