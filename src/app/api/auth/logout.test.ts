import { afterEach, describe, expect, it, vi } from "vitest";
import { createSessionValue } from "@/lib/auth/session";
import { POST as logout } from "./logout/route";

const APP_URL = "https://app.example";

function stubGoogle(handler: (url: URL, init?: RequestInit) => Response) {
	const calls: { url: URL; body: string }[] = [];
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			const url = new URL(String(input instanceof Request ? input.url : input));
			calls.push({ url, body: String(init?.body ?? "") });
			return handler(url, init);
		}),
	);
	return calls;
}

function logoutRequest(withSession: boolean): Request {
	const cookie = `session=${encodeURIComponent(createSessionValue("refresh-123", "me@example.com"))}`;
	return new Request(`${APP_URL}/api/auth/logout`, {
		method: "POST",
		...(withSession ? { headers: { cookie } } : {}),
	});
}

function sessionCookieLine(response: Response): string {
	return (
		response.headers
			.getSetCookie()
			.find((line) => line.startsWith("session=")) ?? ""
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("POST /api/auth/logout", () => {
	it("revokes the access at Google and deletes the session cookie", async () => {
		const calls = stubGoogle(() => new Response(null, { status: 200 }));

		const response = await logout(logoutRequest(true));

		const revoke = calls.find((call) => call.url.pathname === "/revoke");
		expect(revoke?.url.origin).toBe("https://oauth2.googleapis.com");
		expect(new URLSearchParams(revoke?.body).get("token")).toBe("refresh-123");
		expect(sessionCookieLine(response)).toMatch(/Max-Age=0/i);
		expect(await response.json()).toEqual({ revoked: true });
	});

	it("deletes the cookie anyway when the revocation fails", async () => {
		stubGoogle(() => new Response("boom", { status: 500 }));

		const response = await logout(logoutRequest(true));

		expect(sessionCookieLine(response)).toMatch(/Max-Age=0/i);
		expect(await response.json()).toEqual({ revoked: false });
	});
});
