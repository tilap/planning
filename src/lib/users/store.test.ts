import { beforeEach, describe, expect, it, vi } from "vitest";

const sql = vi.hoisted(() => vi.fn());
vi.mock("@neondatabase/serverless", () => ({ neon: () => sql }));
const config = vi.hoisted(() => ({ url: "postgres://db" as string | null }));
vi.mock("@/env", () => ({
	env: {
		get DATABASE_URL() {
			return config.url;
		},
	},
}));
vi.mock("@/lib/dev/fake-data", () => ({ isFakeData: () => false }));

/** A fresh module each time: the table is created once per module. */
async function load() {
	vi.resetModules();
	return import("./store");
}

const text = (call: unknown[]) => (call[0] as string[]).join("?");

beforeEach(() => {
	config.url = "postgres://db";
	sql.mockReset();
	sql.mockResolvedValue([]);
});

describe("user store", () => {
	it("refuses to connect without a database URL", async () => {
		config.url = null;
		const { hasUser } = await load();
		await expect(hasUser("a@b.co")).rejects.toThrow("DATABASE_URL is not set");
		expect(sql).not.toHaveBeenCalled();
	});

	it("creates its table once, before the first query", async () => {
		const { hasUser } = await load();
		await hasUser("a@b.co");
		await hasUser("c@d.co");

		const creations = sql.mock.calls.filter((call) =>
			text(call).includes("CREATE TABLE IF NOT EXISTS allowed_emails"),
		);
		expect(creations).toHaveLength(1);
		expect(text(sql.mock.calls[0] ?? [])).toContain("CREATE TABLE");
	});

	it("looks addresses up lower-cased", async () => {
		const { hasUser } = await load();
		sql.mockResolvedValue([{ "?column?": 1 }]);
		expect(await hasUser("A@B.co")).toBe(true);
		const lookup = sql.mock.calls.at(-1) ?? [];
		expect(lookup.slice(1)).toEqual(["a@b.co"]);
	});

	it("tells whether an add or a removal changed something", async () => {
		const { addUser, removeUser } = await load();
		sql.mockResolvedValueOnce([]); // table
		sql.mockResolvedValueOnce([{ email: "a@b.co" }]);
		expect(await addUser("A@b.co", "Me@x.co")).toBe(true);
		sql.mockResolvedValueOnce([]);
		expect(await addUser("a@b.co", "me@x.co")).toBe(false);
		sql.mockResolvedValueOnce([{ email: "a@b.co" }]);
		expect(await removeUser("a@b.co")).toBe(true);
		sql.mockResolvedValueOnce([]);
		expect(await removeUser("a@b.co")).toBe(false);
	});

	it("lists the users", async () => {
		const { listUsers } = await load();
		sql.mockResolvedValueOnce([]); // table
		sql.mockResolvedValueOnce([
			{
				email: "a@b.co",
				added_by: "me@x.co",
				added_at: new Date("2026-11-20T10:00:00.000Z"),
			},
		]);
		expect(await listUsers()).toEqual([
			{
				email: "a@b.co",
				addedBy: "me@x.co",
				addedAt: "2026-11-20T10:00:00.000Z",
			},
		]);
	});
});
