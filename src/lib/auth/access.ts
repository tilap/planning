import { isUsersEnabled } from "@/lib/users/enabled";
import { hasUser } from "@/lib/users/store";
import { isAdmin } from "./admin";
import { readSession } from "./session";

/**
 * Whether an address may use the app: an admin (`ALLOWED_EMAILS`, no database
 * needed) or, when the users feature is on, an address added by an admin.
 * Throws when the database cannot be reached.
 */
export async function isAllowed(email: string): Promise<boolean> {
	return isAdmin(email) || (isUsersEnabled() && (await hasUser(email)));
}

/** The address of the admin who sent the request, or null. */
export function readAdminEmail(request: Request): string | null {
	const email = readSession(request)?.email;
	return email && isAdmin(email) ? email : null;
}
