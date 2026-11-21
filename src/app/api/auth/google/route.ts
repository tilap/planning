import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
	baseCookieOptions,
	STATE_COOKIE,
	STATE_MAX_AGE_SECONDS,
} from "@/lib/auth/cookies";
import { buildAuthUrl } from "@/lib/auth/google";

export async function GET(_request: Request) {
	const state = randomBytes(24).toString("base64url");
	const response = NextResponse.redirect(buildAuthUrl(state), 302);
	response.cookies.set(STATE_COOKIE, state, {
		...baseCookieOptions(),
		maxAge: STATE_MAX_AGE_SECONDS,
	});
	return response;
}
