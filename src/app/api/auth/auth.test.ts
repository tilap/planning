import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionValue } from "@/lib/auth/session";
import { GET as callback } from "./callback/route";
import { GET as start } from "./google/route";
import { GET as session } from "./session/route";

const APP_URL = "https://app.example";

// The addresses added by the admins live in the database; none here.
const stored = vi.hoisted(() => ({ emails: new Set<string>() }));
vi.mock("@/lib/users/store", () => ({
	hasUser: async (email: string) => stored.emails.has(email.toLowerCase()),
}));

const feature = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/users/enabled", () => ({
	isUsersEnabled: () => feature.enabled,
}));

function fakeIdToken(email: string): string {
	const encode = (value: object) =>
		Buffer.from(JSON.stringify(value)).toString("base64url");
	return `${encode({ alg: "RS256" })}.${encode({ email, email_verified: true })}.signature`;
}

/** Simulates the Google token endpoint. */
function stubGoogle(email: string, refreshToken = "refresh-123") {
	const fetchMock = vi.fn(async (input: string | URL | Request) => {
		const url = String(input instanceof Request ? input.url : input);
		if (url.startsWith("https://oauth2.googleapis.com/token")) {
			return Response.json({
				access_token: "access-456",
				refresh_token: refreshToken,
				id_token: fakeIdToken(email),
			});
		}
		throw new Error(`Unexpected request to ${url}`);
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function cookieValue(response: Response, name: string): string | undefined {
	for (const line of response.headers.getSetCookie()) {
		const [pair] = line.split(";");
		const [key, ...rest] = (pair ?? "").split("=");
		if (key === name) return rest.join("=");
	}
	return undefined;
}

function setCookieLine(response: Response, name: string): string | undefined {
	return response.headers
		.getSetCookie()
		.find((line) => line.startsWith(`${name}=`));
}

async function startAndGetState(): Promise<{ state: string; cookie: string }> {
	const response = await start(new Request(`${APP_URL}/api/auth/google`));
	const location = new URL(response.headers.get("location") ?? "");
	return {
		state: location.searchParams.get("state") ?? "",
		cookie: `oauth_state=${cookieValue(response, "oauth_state")}`,
	};
}

function callbackRequest(state: string, cookie: string): Request {
	return new Request(
		`${APP_URL}/api/auth/callback?code=code-789&state=${state}`,
		{
			headers: { cookie },
		},
	);
}

beforeEach(() => {
	vi.unstubAllGlobals();
	stored.emails.clear();
	feature.enabled = true;
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("GET /api/auth/google", () => {
	it("redirects to Google with the read-only calendar scope and a state", async () => {
		const response = await start(new Request(`${APP_URL}/api/auth/google`));

		expect(response.status).toBe(302);
		const location = new URL(response.headers.get("location") ?? "");
		expect(location.origin).toBe("https://accounts.google.com");
		const scope = location.searchParams.get("scope") ?? "";
		expect(scope).toContain(
			"https://www.googleapis.com/auth/calendar.readonly",
		);
		expect(scope.split(" ")).not.toContain(
			"https://www.googleapis.com/auth/calendar",
		);
		expect(location.searchParams.get("access_type")).toBe("offline");
		expect(location.searchParams.get("state")).toBeTruthy();
		expect(cookieValue(response, "oauth_state")).toBe(
			location.searchParams.get("state"),
		);
	});
});

describe("GET /api/auth/callback", () => {
	it("signs in the allowed account with an encrypted session cookie", async () => {
		stubGoogle("me@example.com", "refresh-123");
		const { state, cookie } = await startAndGetState();

		const response = await callback(callbackRequest(state, cookie));

		expect(response.status).toBe(302);
		expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/");
		const line = setCookieLine(response, "session") ?? "";
		expect(line).toMatch(/HttpOnly/i);
		expect(line).toMatch(/Secure/i);
		expect(line).toMatch(/SameSite=lax/i);
		expect(cookieValue(response, "session")).toBeTruthy();
		expect(line).not.toContain("refresh-123");
	});

	it("signs in an address added by an admin, without admin rights", async () => {
		stored.emails.add("friend@example.com");
		stubGoogle("Friend@Example.com", "refresh-friend");
		const { state, cookie } = await startAndGetState();

		const response = await callback(callbackRequest(state, cookie));
		const sessionCookie = `session=${cookieValue(response, "session")}`;
		const status = await session(
			new Request(`${APP_URL}/api/auth/session`, {
				headers: { cookie: sessionCookie },
			}),
		);

		expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/");
		expect(await status.json()).toEqual({
			signedIn: true,
			admin: false,
			usersEnabled: true,
		});
	});

	it("refuses another account without any session cookie", async () => {
		stubGoogle("other@example.com");
		const { state, cookie } = await startAndGetState();

		const response = await callback(callbackRequest(state, cookie));

		expect(response.status).toBe(302);
		const location = new URL(response.headers.get("location") ?? "");
		expect(location.pathname).toBe("/");
		expect(location.searchParams.get("error")).toBe("forbidden");
		expect(cookieValue(response, "session")).toBeUndefined();
	});

	it("refuses a state that differs from the state cookie", async () => {
		stubGoogle("me@example.com");
		const { cookie } = await startAndGetState();

		const response = await callback(callbackRequest("another-state", cookie));

		expect(response.status).toBe(400);
		expect(cookieValue(response, "session")).toBeUndefined();
	});
});

describe("GET /api/auth/session", () => {
	it("reports the users feature off, and refuses an address that only the database knows", async () => {
		feature.enabled = false;
		stored.emails.add("friend@example.com");
		const cookie = (email: string) =>
			`session=${encodeURIComponent(createSessionValue("refresh-x", email))}`;
		const ask = (email: string) =>
			session(
				new Request(`${APP_URL}/api/auth/session`, {
					headers: { cookie: cookie(email) },
				}),
			);

		expect(await (await ask("me@example.com")).json()).toEqual({
			signedIn: true,
			admin: true,
			usersEnabled: false,
		});
		expect(await (await ask("friend@example.com")).json()).toEqual({
			signedIn: false,
			admin: false,
			usersEnabled: false,
		});
	});

	it("closes the session of an address that is no longer allowed", async () => {
		const removed = `session=${encodeURIComponent(createSessionValue("refresh-x", "gone@example.com"))}`;

		const response = await session(
			new Request(`${APP_URL}/api/auth/session`, {
				headers: { cookie: removed },
			}),
		);

		expect(await response.json()).toEqual({
			signedIn: false,
			admin: false,
			usersEnabled: true,
		});
	});

	it("tells whether the session cookie is valid", async () => {
		stubGoogle("me@example.com");
		const { state, cookie } = await startAndGetState();
		const signedIn = await callback(callbackRequest(state, cookie));
		const sessionCookie = `session=${cookieValue(signedIn, "session")}`;
		const url = `${APP_URL}/api/auth/session`;

		const valid = await session(
			new Request(url, { headers: { cookie: sessionCookie } }),
		);
		const missing = await session(new Request(url));
		const forged = await session(
			new Request(url, { headers: { cookie: "session=v1:AAAA:BBBB:CCCC" } }),
		);

		expect(await valid.json()).toEqual({
			signedIn: true,
			admin: true,
			usersEnabled: true,
		});
		expect(await missing.json()).toEqual({
			signedIn: false,
			admin: false,
			usersEnabled: true,
		});
		expect(await forged.json()).toEqual({
			signedIn: false,
			admin: false,
			usersEnabled: true,
		});
	});
});
