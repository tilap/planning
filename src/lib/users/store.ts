import { neon } from "@neondatabase/serverless";
import { env } from "@/env";
import { isFakeData } from "@/lib/dev/fake-data";

/** An address added by an admin: its owner may sign in with Google. */
export type StoredUser = {
	/** Lower-cased. */
	email: string;
	/** The admin who added it. */
	addedBy: string;
	addedAt: string;
};

/** The tagged-template query function, as used here: it answers with rows. */
type Sql = (
	strings: TemplateStringsArray,
	...values: unknown[]
) => Promise<Record<string, unknown>[]>;

let database: Promise<Sql> | null = null;

/** The connection to the Neon database; the table is created on first use. */
function connect(): Promise<Sql> {
	database ??= (async () => {
		if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
		const sql = neon(env.DATABASE_URL) as unknown as Sql;
		await sql`CREATE TABLE IF NOT EXISTS allowed_emails (
			email text PRIMARY KEY,
			added_by text NOT NULL,
			added_at timestamptz NOT NULL DEFAULT now()
		)`;
		return sql;
	})().catch((error) => {
		// A failure is not remembered: the next call tries again.
		database = null;
		throw error;
	});
	return database;
}

/** Development with DEV_FAKE_DATA: the users live in memory, no database. */
const fakeUsers: StoredUser[] = [];

export async function listUsers(): Promise<StoredUser[]> {
	if (isFakeData()) return [...fakeUsers];
	const sql = await connect();
	const rows =
		await sql`SELECT email, added_by, added_at FROM allowed_emails ORDER BY added_at, email`;
	return rows.map((row) => ({
		email: String(row.email),
		addedBy: String(row.added_by),
		addedAt: (row.added_at instanceof Date
			? row.added_at
			: new Date(String(row.added_at))
		).toISOString(),
	}));
}

/** Adds an address; false when it was already there. */
export async function addUser(
	email: string,
	addedBy: string,
): Promise<boolean> {
	const address = email.toLowerCase();
	if (isFakeData()) {
		if (fakeUsers.some((user) => user.email === address)) return false;
		fakeUsers.push({
			email: address,
			addedBy,
			addedAt: new Date().toISOString(),
		});
		return true;
	}
	const sql = await connect();
	const rows =
		await sql`INSERT INTO allowed_emails (email, added_by) VALUES (${address}, ${addedBy.toLowerCase()}) ON CONFLICT (email) DO NOTHING RETURNING email`;
	return rows.length > 0;
}

/** Removes an address; false when it was not there. */
export async function removeUser(email: string): Promise<boolean> {
	const address = email.toLowerCase();
	if (isFakeData()) {
		const index = fakeUsers.findIndex((user) => user.email === address);
		if (index < 0) return false;
		fakeUsers.splice(index, 1);
		return true;
	}
	const sql = await connect();
	const rows =
		await sql`DELETE FROM allowed_emails WHERE email = ${address} RETURNING email`;
	return rows.length > 0;
}

export async function hasUser(email: string): Promise<boolean> {
	const address = email.toLowerCase();
	if (isFakeData()) return fakeUsers.some((user) => user.email === address);
	const sql = await connect();
	const rows = await sql`SELECT 1 FROM allowed_emails WHERE email = ${address}`;
	return rows.length > 0;
}
