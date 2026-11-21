import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { isAllowed } from "@/lib/auth/access";
import {
	baseCookieOptions,
	parseCookies,
	SESSION_COOKIE,
	SESSION_MAX_AGE_SECONDS,
	STATE_COOKIE,
} from "@/lib/auth/cookies";
import { exchangeCode } from "@/lib/auth/google";
import { createSessionValue } from "@/lib/auth/session";

function sameText(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
}

function home(search = ""): URL {
	return new URL(`/${search}`, env.APP_URL);
}

export async function GET(request: Request) {
	const url = new URL(request.url);
	const state = url.searchParams.get("state");
	const code = url.searchParams.get("code");
	const expected = parseCookies(request.headers.get("cookie"))[STATE_COOKIE];

	if (!state || !code || !expected || !sameText(state, expected)) {
		return NextResponse.json({ code: "invalid_state" }, { status: 400 });
	}

	let exchanged: Awaited<ReturnType<typeof exchangeCode>>;
	try {
		exchanged = await exchangeCode(code);
	} catch {
		return NextResponse.json({ code: "upstream" }, { status: 502 });
	}

	// Only the admins and the addresses they added can sign in.
	const email = exchanged.email?.toLowerCase();
	let allowed = false;
	try {
		allowed = email !== undefined && (await isAllowed(email));
	} catch {
		return NextResponse.json({ code: "upstream" }, { status: 502 });
	}
	if (email === undefined || !allowed) {
		const response = NextResponse.redirect(home("?error=forbidden"), 302);
		response.cookies.delete(STATE_COOKIE);
		return response;
	}
	if (!exchanged.refreshToken) {
		return NextResponse.json({ code: "no_refresh_token" }, { status: 502 });
	}

	const response = NextResponse.redirect(home(), 302);
	response.cookies.delete(STATE_COOKIE);
	response.cookies.set(
		SESSION_COOKIE,
		createSessionValue(exchanged.refreshToken, email),
		{
			...baseCookieOptions(),
			maxAge: SESSION_MAX_AGE_SECONDS,
		},
	);
	return response;
}
