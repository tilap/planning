import { beforeEach, describe, expect, it, vi } from "vitest";

const hasUser = vi.hoisted(() => vi.fn<(email: string) => Promise<boolean>>());
vi.mock("@/lib/users/store", () => ({ hasUser }));
const feature = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/users/enabled", () => ({
	isUsersEnabled: () => feature.enabled,
}));

import { createSessionValue } from "@/lib/auth/session";
import { GET } from "./route";

const url = "https://app.example/api/sync?past=1w&ahead=3m&tz=Europe%2FParis";

const call = (cookie?: string) =>
	GET(new Request(url, cookie ? { headers: { cookie } } : {}));
const session = (value: string) => `session=${encodeURIComponent(value)}`;

beforeEach(() => {
	feature.enabled = true;
	hasUser.mockReset();
	hasUser.mockResolvedValue(false);
});

describe("GET /api/sync access", () => {
	it("refuses a request without a session", async () => {
		expect((await call()).status).toBe(401);
	});

	it("refuses a session whose address was removed", async () => {
		const response = await call(
			session(createSessionValue("t", "gone@example.com")),
		);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: "not_signed_in" });
	});

	it("refuses a non-admin address without a database call when the users feature is off", async () => {
		feature.enabled = false;
		hasUser.mockResolvedValue(true);
		const response = await call(
			session(createSessionValue("t", "friend@example.com")),
		);

		expect(response.status).toBe(401);
		expect(hasUser).not.toHaveBeenCalled();
	});

	it("answers 502 when the database cannot tell", async () => {
		hasUser.mockRejectedValue(new Error("down"));
		const response = await call(
			session(createSessionValue("t", "friend@example.com")),
		);
		expect(response.status).toBe(502);
	});
});
