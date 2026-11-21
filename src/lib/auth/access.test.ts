import { beforeEach, describe, expect, it, vi } from "vitest";

const hasUser = vi.hoisted(() => vi.fn<(email: string) => Promise<boolean>>());
vi.mock("@/lib/users/store", () => ({ hasUser }));
const feature = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/users/enabled", () => ({
	isUsersEnabled: () => feature.enabled,
}));

import { isAllowed, readAdminEmail } from "./access";
import { createSessionValue } from "./session";

beforeEach(() => {
	hasUser.mockReset();
	feature.enabled = true;
});

describe("isAllowed", () => {
	it("lets an admin in without asking the database", async () => {
		expect(await isAllowed("Me@Example.com")).toBe(true);
		expect(hasUser).not.toHaveBeenCalled();
	});

	it("lets in an address added by an admin", async () => {
		hasUser.mockResolvedValue(true);
		expect(await isAllowed("friend@example.com")).toBe(true);
		expect(hasUser).toHaveBeenCalledWith("friend@example.com");
	});

	it("refuses any other address", async () => {
		hasUser.mockResolvedValue(false);
		expect(await isAllowed("other@example.com")).toBe(false);
	});

	it("lets in only the admins, without any database call, when the users feature is off", async () => {
		feature.enabled = false;
		hasUser.mockResolvedValue(true);

		expect(await isAllowed("me@example.com")).toBe(true);
		expect(await isAllowed("friend@example.com")).toBe(false);
		expect(hasUser).not.toHaveBeenCalled();
	});

	it("lets the database failure through, so nobody is let in by mistake", async () => {
		hasUser.mockImplementation(async () => {
			throw new Error("down");
		});
		await expect(isAllowed("other@example.com")).rejects.toThrow("down");
	});
});

describe("readAdminEmail", () => {
	const request = (email: string) =>
		new Request("https://app.example/", {
			headers: {
				cookie: `session=${encodeURIComponent(createSessionValue("t", email))}`,
			},
		});

	it("is the address of an admin session", () => {
		expect(readAdminEmail(request("me@example.com"))).toBe("me@example.com");
	});

	it("is null for a user who is not an admin, or without a session", () => {
		expect(readAdminEmail(request("friend@example.com"))).toBeNull();
		expect(readAdminEmail(new Request("https://app.example/"))).toBeNull();
	});
});
