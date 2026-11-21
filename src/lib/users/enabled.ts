import { env } from "@/env";
import { isFakeData } from "@/lib/dev/fake-data";

/**
 * Whether the addresses managed in the app are on: a database holds them
 * (`DATABASE_URL`), or `DEV_FAKE_DATA=1` keeps them in memory. When off, only
 * the `ALLOWED_EMAILS` admins can sign in and the interface hides their
 * management.
 */
export function isUsersEnabled(): boolean {
	return env.DATABASE_URL !== null || isFakeData();
}
