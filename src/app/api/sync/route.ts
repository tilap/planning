import { NextResponse } from "next/server";
import { isAheadWindow, isPastWindow } from "@/config/sync";
import { isAllowed } from "@/lib/auth/access";
import { readSession } from "@/lib/auth/session";
import { fakeSync, isFakeData } from "@/lib/dev/fake-data";
import {
	listCalendars,
	listEvents,
	refreshAccessToken,
	SyncFailure,
} from "@/lib/sync/google-calendar";
import { computeSyncWindow } from "@/lib/sync/window";

export const dynamic = "force-dynamic";

const STATUS = {
	access_revoked: 401,
	quota: 429,
	upstream: 502,
	calendar_api_disabled: 502,
	calendar_permission_missing: 403,
} as const;

const MAX_TIME_ZONE_LENGTH = 64;

/** An IANA time zone the runtime knows; anything else is refused. */
function isTimeZone(value: string | null): value is string {
	if (value === null || value.length === 0) return false;
	if (value.length > MAX_TIME_ZONE_LENGTH) return false;
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: value });
		return true;
	} catch {
		return false;
	}
}

export async function GET(request: Request) {
	if (isFakeData()) {
		const now = new Date();
		return NextResponse.json({ ...fakeSync(now), syncedAt: now.toISOString() });
	}
	const session = readSession(request);
	if (!session) {
		return NextResponse.json({ code: "not_signed_in" }, { status: 401 });
	}
	// The address is checked again: removing it withdraws the access at once.
	try {
		if (!(await isAllowed(session.email))) {
			return NextResponse.json({ code: "not_signed_in" }, { status: 401 });
		}
	} catch {
		return NextResponse.json({ code: "upstream" }, { status: 502 });
	}
	const { refreshToken } = session;

	// The range is one of a closed set of values, never a free date or length:
	// the server computes the window itself.
	const params = new URL(request.url).searchParams;
	const past = params.get("past");
	const ahead = params.get("ahead");
	const timeZone = params.get("tz");
	if (!isPastWindow(past) || !isAheadWindow(ahead) || !isTimeZone(timeZone)) {
		return NextResponse.json({ code: "bad_request" }, { status: 400 });
	}
	const { timeMin, timeMax } = computeSyncWindow(new Date(), timeZone, {
		past,
		ahead,
	});

	try {
		const accessToken = await refreshAccessToken(refreshToken);
		const calendars = await listCalendars(accessToken);
		const perCalendar = await Promise.all(
			calendars.map((calendar) =>
				listEvents(accessToken, calendar.id, timeMin, timeMax),
			),
		);
		return NextResponse.json({
			calendars,
			events: perCalendar.flat(),
			syncedAt: new Date().toISOString(),
		});
	} catch (error) {
		const code = error instanceof SyncFailure ? error.code : "upstream";
		return NextResponse.json({ code }, { status: STATUS[code] });
	}
}
