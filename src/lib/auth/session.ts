import { parseCookies, SESSION_COOKIE } from "./cookies";
import { decrypt, encrypt } from "./crypto";

/** What the `session` cookie holds: the Google refresh token and who signed in. */
export type Session = {
	refreshToken: string;
	/** Lower-cased. */
	email: string;
};

/** The value of the `session` cookie. */
export function createSessionValue(
	refreshToken: string,
	email: string,
): string {
	return encrypt(JSON.stringify({ refreshToken, email }));
}

/** The session held by the request's cookie, or null. */
export function readSession(request: Request): Session | null {
	const value = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
	if (!value) return null;
	const plain = decrypt(value);
	if (plain === null) return null;
	try {
		const parsed: unknown = JSON.parse(plain);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"refreshToken" in parsed &&
			typeof parsed.refreshToken === "string" &&
			"email" in parsed &&
			typeof parsed.email === "string"
		) {
			return { refreshToken: parsed.refreshToken, email: parsed.email };
		}
	} catch {
		// Not a session: the cookie is ignored.
	}
	return null;
}

/** The Google refresh token held by the request's session cookie, or null. */
export function readRefreshToken(request: Request): string | null {
	return readSession(request)?.refreshToken ?? null;
}
