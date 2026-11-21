import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as authCallback } from "../auth/callback/route";
import { GET as authStart } from "../auth/google/route";
import { GET as sync } from "./route";

const APP_URL = "https://app.example";
// 18 November 2026, 09:00 in Paris: a week back is 11 November, three months ahead 18 February.
const NOW = new Date("2026-11-18T09:00:00+01:00");
const TIME_MIN = "2026-11-10T23:00:00.000Z";
const TIME_MAX = "2027-02-17T23:00:00.000Z";
const DEFAULT_QUERY = "past=1w&ahead=3m&tz=Europe%2FParis";

type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>;

/** Replaces `fetch`, answering Google requests with the given handler. */
function stubGoogle(handler: Handler) {
	const calls: string[] = [];
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			const url = new URL(String(input instanceof Request ? input.url : input));
			calls.push(url.toString());
			return handler(url, init);
		}),
	);
	return calls;
}

function fakeIdToken(email: string): string {
	const encode = (value: object) =>
		Buffer.from(JSON.stringify(value)).toString("base64url");
	return `${encode({ alg: "RS256" })}.${encode({ email })}.signature`;
}

function setCookies(response: Response): Record<string, string> {
	const cookies: Record<string, string> = {};
	for (const line of response.headers.getSetCookie()) {
		const [pair] = line.split(";");
		const [key, ...rest] = (pair ?? "").split("=");
		if (key) cookies[key] = rest.join("=");
	}
	return cookies;
}

/** Signs in through the real auth routes and returns the session cookie header. */
async function signIn(refreshToken: string): Promise<string> {
	stubGoogle(() =>
		Response.json({
			access_token: "at-xyz",
			refresh_token: refreshToken,
			id_token: fakeIdToken("me@example.com"),
		}),
	);
	const started = await authStart(new Request(`${APP_URL}/api/auth/google`));
	const state = new URL(started.headers.get("location") ?? "").searchParams.get(
		"state",
	);
	const stateCookie = setCookies(started).oauth_state;
	const done = await authCallback(
		new Request(`${APP_URL}/api/auth/callback?code=c&state=${state}`, {
			headers: { cookie: `oauth_state=${stateCookie}` },
		}),
	);
	return `session=${setCookies(done).session}`;
}

function syncRequest(cookie?: string, query = DEFAULT_QUERY): Request {
	const url = `${APP_URL}/api/sync?${query}`;
	return new Request(url, cookie ? { headers: { cookie } } : undefined);
}

const calendarList = {
	items: [
		// biome-ignore lint/plugin: calendar colors come from Google as hexadecimal values
		{ id: "cal-a", summary: "Perso", backgroundColor: "#1a73e8" },
		// biome-ignore lint/plugin: calendar colors come from Google as hexadecimal values
		{ id: "cal-b", summary: "Travail", backgroundColor: "#d93025" },
	],
};

function timedItem(id: string, title: string, start: string, end: string) {
	return {
		id,
		summary: title,
		start: { dateTime: start },
		end: { dateTime: end },
	};
}

const eventsByCalendar: Record<string, unknown[]> = {
	"cal-a": [
		timedItem(
			"e1",
			"Dentiste",
			"2026-11-18T10:00:00+01:00",
			"2026-11-18T10:45:00+01:00",
		),
		{
			id: "e2",
			summary: "Anniversaire",
			start: { date: "2026-11-20" },
			end: { date: "2026-11-21" },
		},
	],
	"cal-b": [
		timedItem(
			"e3",
			"Atelier",
			"2026-11-19T14:00:00+01:00",
			"2026-11-19T16:00:00+01:00",
		),
	],
};

/** A Google that serves the token exchange, the calendar list and the events. */
function healthyGoogle(): Handler {
	return (url) => {
		if (url.pathname === "/token")
			return Response.json({ access_token: "at-xyz" });
		if (url.pathname.endsWith("/calendarList"))
			return Response.json(calendarList);
		const match = url.pathname.match(/\/calendars\/([^/]+)\/events$/);
		if (match)
			return Response.json({ items: eventsByCalendar[match[1] ?? ""] ?? [] });
		return new Response("not found", { status: 404 });
	};
}

let cookie: string;

beforeEach(async () => {
	cookie = await signIn("refresh-123");
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("GET /api/sync", () => {
	it("returns the calendars and events in the stored format", async () => {
		stubGoogle(healthyGoogle());

		const response = await sync(syncRequest(cookie));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.calendars).toHaveLength(2);
		expect(body.calendars[0]).toMatchObject({ id: "cal-a", name: "Perso" });
		expect(body.events).toHaveLength(3);
		const dentist = body.events.find(
			(event: { title: string }) => event.title === "Dentiste",
		);
		expect(dentist).toMatchObject({
			calendarId: "cal-a",
			allDay: false,
			start: "2026-11-18T09:00:00.000Z",
			end: "2026-11-18T09:45:00.000Z",
		});
		const birthday = body.events.find(
			(event: { title: string }) => event.title === "Anniversaire",
		);
		expect(birthday).toMatchObject({
			allDay: true,
			start: "2026-11-20",
			end: "2026-11-21",
		});
		expect(typeof body.syncedAt).toBe("string");
	});

	it("computes the window itself and asks Google for expanded occurrences", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(NOW);
		const calls = stubGoogle(healthyGoogle());

		await sync(syncRequest(cookie));
		vi.useRealTimers();

		const eventCall = calls
			.map((call) => new URL(call))
			.find((url) => url.pathname.endsWith("/events"));
		expect(eventCall?.searchParams.get("timeMin")).toBe(TIME_MIN);
		expect(eventCall?.searchParams.get("timeMax")).toBe(TIME_MAX);
		expect(eventCall?.searchParams.get("singleEvents")).toBe("true");
	});

	it("answers 401 without calling Google when there is no session", async () => {
		const calls = stubGoogle(healthyGoogle());

		const response = await sync(syncRequest());

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: "not_signed_in" });
		expect(calls).toEqual([]);
	});

	it("answers 401 access_revoked when Google refuses the refresh token", async () => {
		stubGoogle((url) =>
			url.pathname === "/token"
				? Response.json({ error: "invalid_grant" }, { status: 400 })
				: new Response("unexpected", { status: 500 }),
		);

		const response = await sync(syncRequest(cookie));

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: "access_revoked" });
	});

	it("answers 429 on a Google quota error and 502 on any other failure", async () => {
		stubGoogle((url) => {
			if (url.pathname === "/token")
				return Response.json({ access_token: "at-xyz" });
			return Response.json({ error: { code: 429 } }, { status: 429 });
		});
		const quota = await sync(syncRequest(cookie));
		expect(quota.status).toBe(429);
		expect(await quota.json()).toEqual({ code: "quota" });

		stubGoogle((url) => {
			if (url.pathname === "/token")
				return Response.json({ access_token: "at-xyz" });
			return new Response("boom", { status: 500 });
		});
		const upstream = await sync(syncRequest(cookie));
		expect(upstream.status).toBe(502);
		expect(await upstream.json()).toEqual({ code: "upstream" });
	});

	it("tells apart a disabled Calendar API and a missing calendar permission, and logs the reason without any token", async () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		const refuse = (reason: string) =>
			stubGoogle((url) =>
				url.pathname === "/token"
					? Response.json({ access_token: "at-xyz" })
					: Response.json(
							{ error: { code: 403, errors: [{ reason }] } },
							{ status: 403 },
						),
			);

		refuse("accessNotConfigured");
		const disabled = await sync(syncRequest(cookie));
		expect(disabled.status).toBe(502);
		expect(await disabled.json()).toEqual({ code: "calendar_api_disabled" });

		refuse("insufficientPermissions");
		const missing = await sync(syncRequest(cookie));
		expect(missing.status).toBe(403);
		expect(await missing.json()).toEqual({
			code: "calendar_permission_missing",
		});

		const lines = logged.mock.calls.map((call) => call.join(" ")).join("\n");
		expect(lines).toContain("accessNotConfigured");
		expect(lines).toContain("insufficientPermissions");
		expect(lines).not.toContain("at-xyz");
		expect(lines).not.toContain("refresh-123");
		logged.mockRestore();
	});

	it("never returns a token", async () => {
		stubGoogle(healthyGoogle());

		const response = await sync(syncRequest(cookie));
		const text = await response.text();

		expect(text).not.toContain("at-xyz");
		expect(text).not.toContain("refresh-123");
	});
});

describe("GET /api/sync range parameters", () => {
	const pasts = ["1w", "2w", "1m"];
	const aheads = ["1m", "2m", "3m"];

	it.each(pasts.flatMap((past) => aheads.map((ahead) => [past, ahead])))(
		"accepts past=%s and ahead=%s",
		async (past, ahead) => {
			stubGoogle(healthyGoogle());

			const response = await sync(
				syncRequest(cookie, `past=${past}&ahead=${ahead}&tz=Europe%2FParis`),
			);

			expect(response.status).toBe(200);
		},
	);

	it("hands Google the window of the requested range", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(NOW);
		const calls = stubGoogle(healthyGoogle());

		await sync(syncRequest(cookie, "past=1m&ahead=1m&tz=Europe%2FParis"));
		vi.useRealTimers();

		const eventCall = calls
			.map((call) => new URL(call))
			.find((url) => url.pathname.endsWith("/events"));
		expect(eventCall?.searchParams.get("timeMin")).toBe(
			"2026-10-17T22:00:00.000Z",
		);
		expect(eventCall?.searchParams.get("timeMax")).toBe(
			"2026-12-17T23:00:00.000Z",
		);
	});

	it.each([
		["a missing past", "ahead=3m&tz=Europe%2FParis"],
		["a missing ahead", "past=1w&tz=Europe%2FParis"],
		["a missing time zone", "past=1w&ahead=3m"],
		["an unknown past", "past=3w&ahead=3m&tz=Europe%2FParis"],
		["a past of zero", "past=0&ahead=3m&tz=Europe%2FParis"],
		["a huge past", "past=999&ahead=3m&tz=Europe%2FParis"],
		["a number of days as the past", "past=7d&ahead=3m&tz=Europe%2FParis"],
		[
			"an instant as the past",
			"past=2026-01-01T00%3A00%3A00Z&ahead=3m&tz=Europe%2FParis",
		],
		["an unknown ahead", "past=1w&ahead=12m&tz=Europe%2FParis"],
		["a number as the ahead", "past=1w&ahead=90&tz=Europe%2FParis"],
		["an invalid time zone", "past=1w&ahead=3m&tz=Not%2FAZone"],
		["an empty time zone", "past=1w&ahead=3m&tz="],
		["a too long time zone", `past=1w&ahead=3m&tz=${"a".repeat(65)}`],
		[
			"a free range alone",
			"timeMin=2026-11-01T00%3A00%3A00Z&timeMax=2026-12-01T00%3A00%3A00Z",
		],
	])(
		"answers 400 bad_request for %s, without calling Google",
		async (_name, query) => {
			const calls = stubGoogle(healthyGoogle());

			const response = await sync(syncRequest(cookie, query));

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual({ code: "bad_request" });
			expect(calls).toHaveLength(0);
		},
	);

	it("ignores a free range sent next to valid values: the window stays the computed one", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(NOW);
		const calls = stubGoogle(healthyGoogle());

		await sync(
			syncRequest(
				cookie,
				`${DEFAULT_QUERY}&timeMin=2000-01-01T00%3A00%3A00Z&timeMax=2100-01-01T00%3A00%3A00Z`,
			),
		);
		vi.useRealTimers();

		const eventCall = calls
			.map((call) => new URL(call))
			.find((url) => url.pathname.endsWith("/events"));
		expect(eventCall?.searchParams.get("timeMin")).toBe(TIME_MIN);
		expect(eventCall?.searchParams.get("timeMax")).toBe(TIME_MAX);
	});
});
