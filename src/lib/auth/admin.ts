import { env } from "@/env";

/**
 * Whether an address has the admin profile: the addresses of `ALLOWED_EMAILS`.
 * Always decided on the server, at the time of the request: removing an
 * address from the list withdraws its admin rights at once.
 */
export function isAdmin(email: string): boolean {
	return env.ALLOWED_EMAILS.includes(email.toLowerCase());
}
