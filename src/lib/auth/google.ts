import { env } from "@/env";

export const CALENDAR_READONLY_SCOPE =
	"https://www.googleapis.com/auth/calendar.readonly";

export function redirectUri(): string {
	return new URL("/api/auth/callback", env.APP_URL).toString();
}

export function buildAuthUrl(state: string): string {
	const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
	url.search = new URLSearchParams({
		client_id: env.GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri(),
		response_type: "code",
		scope: `openid email ${CALENDAR_READONLY_SCOPE}`,
		access_type: "offline",
		prompt: "consent",
		state,
	}).toString();
	return url.toString();
}

export type ExchangedCode = {
	refreshToken: string | undefined;
	email: string | undefined;
};

function emailFromIdToken(idToken: string | undefined): string | undefined {
	const payload = idToken?.split(".")[1];
	if (!payload) return undefined;
	try {
		const claims = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf8"),
		);
		return typeof claims.email === "string" ? claims.email : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Exchanges an authorization code for tokens. The e-mail address is read from
 * the `id_token` received directly from Google, without checking its signature.
 */
export async function exchangeCode(code: string): Promise<ExchangedCode> {
	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			redirect_uri: redirectUri(),
			grant_type: "authorization_code",
		}),
	});
	if (!response.ok)
		throw new Error(`Token exchange failed: ${response.status}`);
	const tokens = (await response.json()) as {
		refresh_token?: string;
		id_token?: string;
	};
	return {
		refreshToken: tokens.refresh_token,
		email: emailFromIdToken(tokens.id_token),
	};
}
