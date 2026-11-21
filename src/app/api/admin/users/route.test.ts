import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
	listUsers: vi.fn(),
	addUser: vi.fn(),
	removeUser: vi.fn(),
	hasUser: vi.fn(),
}));
vi.mock("@/lib/users/store", () => store);
const feature = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/users/enabled", () => ({
	isUsersEnabled: () => feature.enabled,
}));

import { createSessionValue } from "@/lib/auth/session";
import { DELETE, GET, POST } from "./route";

const URL_ = "https://app.example/api/admin/users";

function request(
	method: string,
	email: string | undefined,
	body?: unknown,
	contentType = "application/json",
) {
	return new Request(URL_, {
		method,
		headers: {
			...(email
				? {
						cookie: `session=${encodeURIComponent(createSessionValue("t", email))}`,
					}
				: {}),
			...(body === undefined ? {} : { "content-type": contentType }),
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

const friend = {
	email: "friend@example.com",
	addedBy: "me@example.com",
	addedAt: "2026-11-20T10:00:00.000Z",
};

beforeEach(() => {
	feature.enabled = true;
	for (const fn of Object.values(store)) fn.mockReset();
	store.listUsers.mockResolvedValue([friend]);
	store.hasUser.mockResolvedValue(false);
});

describe("/api/admin/users", () => {
	it("is for admins only", async () => {
		for (const email of [undefined, "friend@example.com"]) {
			expect((await GET(request("GET", email))).status).toBe(403);
			expect(
				(await POST(request("POST", email, { email: "a@b.co" }))).status,
			).toBe(403);
			expect(
				(await DELETE(request("DELETE", email, { email: "a@b.co" }))).status,
			).toBe(403);
		}
		expect(store.addUser).not.toHaveBeenCalled();
		expect(store.removeUser).not.toHaveBeenCalled();
	});

	it("answers an admin that the feature is disabled, and still refuses the others", async () => {
		feature.enabled = false;
		const admin = "me@example.com";
		const body = { email: "a@b.co" };

		for (const response of [
			await GET(request("GET", admin)),
			await POST(request("POST", admin, body)),
			await DELETE(request("DELETE", admin, body)),
		]) {
			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({ code: "users_disabled" });
		}
		expect((await GET(request("GET", undefined))).status).toBe(403);
		expect((await GET(request("GET", "friend@example.com"))).status).toBe(403);
		for (const fn of Object.values(store)) expect(fn).not.toHaveBeenCalled();
	});

	it("lists the admins and the users", async () => {
		const response = await GET(request("GET", "me@example.com"));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			admins: ["me@example.com"],
			users: [friend],
		});
	});

	it("adds an address, lower-cased, in the name of the admin", async () => {
		store.addUser.mockResolvedValue(true);

		const response = await POST(
			request("POST", "me@example.com", { email: "New@Example.com" }),
		);

		expect(response.status).toBe(201);
		expect(store.addUser).toHaveBeenCalledWith(
			"new@example.com",
			"me@example.com",
		);
	});

	it("refuses an invalid address, a body that is not JSON, and an admin address", async () => {
		expect(
			(await POST(request("POST", "me@example.com", { email: "nope" }))).status,
		).toBe(400);
		expect(
			(
				await POST(
					request("POST", "me@example.com", { email: "a@b.co" }, "text/plain"),
				)
			).status,
		).toBe(415);
		const admin = await POST(
			request("POST", "me@example.com", { email: "ME@example.com" }),
		);
		expect(admin.status).toBe(409);
		expect(store.addUser).not.toHaveBeenCalled();
	});

	it("removes an address, and tells when it is not there", async () => {
		store.removeUser.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

		const done = await DELETE(
			request("DELETE", "me@example.com", { email: "friend@example.com" }),
		);
		const missing = await DELETE(
			request("DELETE", "me@example.com", { email: "friend@example.com" }),
		);

		expect(done.status).toBe(200);
		expect(missing.status).toBe(404);
	});

	it("answers 502 when the database fails", async () => {
		store.listUsers.mockRejectedValue(new Error("down"));
		expect((await GET(request("GET", "me@example.com"))).status).toBe(502);
	});
});
