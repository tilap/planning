import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { readAdminEmail } from "@/lib/auth/access";
import { isFakeData } from "@/lib/dev/fake-data";
import { isUsersEnabled } from "@/lib/users/enabled";
import { addUser, listUsers, removeUser } from "@/lib/users/store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ email: z.email() });

/** The admin who sent the request; in development with fake data, a fake one. */
function adminOf(request: Request): string | null {
	return isFakeData() ? "admin@example.com" : readAdminEmail(request);
}

async function snapshot() {
	return { admins: env.ALLOWED_EMAILS, users: await listUsers() };
}

async function readEmail(request: Request): Promise<string | NextResponse> {
	if (!request.headers.get("content-type")?.includes("application/json")) {
		return NextResponse.json({ code: "bad_request" }, { status: 415 });
	}
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json({ code: "invalid_email" }, { status: 400 });
	}
	return parsed.data.email.toLowerCase();
}

function failure(error: unknown): NextResponse {
	console.error("admin users: the database call failed", error);
	return NextResponse.json({ code: "upstream" }, { status: 502 });
}

/** Answers for the admins when the addresses are not managed in the app. */
function disabled(): NextResponse | null {
	return isUsersEnabled()
		? null
		: NextResponse.json({ code: "users_disabled" }, { status: 404 });
}

/** The admins (from the environment) and the users added by the admins. */
export async function GET(request: Request) {
	if (!adminOf(request)) {
		return NextResponse.json({ code: "forbidden" }, { status: 403 });
	}
	const off = disabled();
	if (off) return off;
	try {
		return NextResponse.json(await snapshot());
	} catch (error) {
		return failure(error);
	}
}

/** Allows an address to sign in. */
export async function POST(request: Request) {
	const admin = adminOf(request);
	if (!admin) {
		return NextResponse.json({ code: "forbidden" }, { status: 403 });
	}
	const off = disabled();
	if (off) return off;
	const email = await readEmail(request);
	if (email instanceof NextResponse) return email;
	if (env.ALLOWED_EMAILS.includes(email)) {
		return NextResponse.json({ code: "already_admin" }, { status: 409 });
	}
	try {
		await addUser(email, admin);
		return NextResponse.json(await snapshot(), { status: 201 });
	} catch (error) {
		return failure(error);
	}
}

/** Withdraws the access of an address added earlier. */
export async function DELETE(request: Request) {
	if (!adminOf(request)) {
		return NextResponse.json({ code: "forbidden" }, { status: 403 });
	}
	const off = disabled();
	if (off) return off;
	const email = await readEmail(request);
	if (email instanceof NextResponse) return email;
	try {
		if (!(await removeUser(email))) {
			return NextResponse.json({ code: "not_found" }, { status: 404 });
		}
		return NextResponse.json(await snapshot());
	} catch (error) {
		return failure(error);
	}
}
