import { env } from "@/env";

export const SESSION_COOKIE = "session";
export const STATE_COOKIE = "oauth_state";

/** About one year; browsers cap cookie lifetimes anyway. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Lifetime of the cookie that carries the OAuth state during the sign-in. */
export const STATE_MAX_AGE_SECONDS = 60 * 10;

function decodeValue(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function parseCookies(header: string | null): Record<string, string> {
	const cookies: Record<string, string> = {};
	for (const part of (header ?? "").split(";")) {
		const index = part.indexOf("=");
		if (index === -1) continue;
		cookies[part.slice(0, index).trim()] = decodeValue(
			part.slice(index + 1).trim(),
		);
	}
	return cookies;
}

export function baseCookieOptions() {
	return {
		httpOnly: true,
		sameSite: "lax" as const,
		secure: env.APP_URL.startsWith("https://"),
		path: "/",
	};
}
