import { NextResponse } from "next/server";
import { baseCookieOptions, SESSION_COOKIE } from "@/lib/auth/cookies";
import { readRefreshToken } from "@/lib/auth/session";

/** Revokes the token at Google. A failure never prevents the local sign-out. */
async function revokeAtGoogle(refreshToken: string): Promise<boolean> {
	try {
		const response = await fetch("https://oauth2.googleapis.com/revoke", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ token: refreshToken }),
		});
		return response.ok;
	} catch {
		return false;
	}
}

export async function POST(request: Request) {
	const refreshToken = readRefreshToken(request);
	const revoked = refreshToken ? await revokeAtGoogle(refreshToken) : false;
	const response = NextResponse.json({ revoked });
	response.cookies.set(SESSION_COOKIE, "", {
		...baseCookieOptions(),
		maxAge: 0,
	});
	return response;
}
