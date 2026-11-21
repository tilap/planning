import { NextResponse } from "next/server";
import { isAllowed } from "@/lib/auth/access";
import { isAdmin } from "@/lib/auth/admin";
import { readSession } from "@/lib/auth/session";
import { isFakeData } from "@/lib/dev/fake-data";
import { isUsersEnabled } from "@/lib/users/enabled";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const usersEnabled = isUsersEnabled();
	if (isFakeData()) {
		return NextResponse.json({ signedIn: true, admin: true, usersEnabled });
	}
	const session = readSession(request);
	try {
		// A session whose address is no longer allowed is closed.
		const signedIn = session !== null && (await isAllowed(session.email));
		return NextResponse.json({
			signedIn,
			admin: signedIn && isAdmin(session.email),
			usersEnabled,
		});
	} catch (error) {
		console.error("session: the access check failed", error);
		return NextResponse.json({ code: "upstream" }, { status: 502 });
	}
}
