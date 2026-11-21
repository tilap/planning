import type { Page } from "@playwright/test";
import {
	CACHE_VERSION,
	CACHE_VERSION_KEY,
	CALENDARS_STORE,
	DB_NAME,
	EVENTS_STORE,
	META_STORE,
} from "../../src/lib/cache/schema";

export type SeedData = {
	version?: number;
	events?: unknown[];
	calendars?: unknown[];
	meta?: Record<string, unknown>;
};

/**
 * Fills the app's local memory (IndexedDB) before a test opens the app.
 * It loads the app once so the database exists, then writes the given data.
 */
export async function seedCache(page: Page, data: SeedData): Promise<void> {
	await page.goto("/");
	await page.locator("[data-memory-ready]").waitFor({ state: "attached" });
	await page.evaluate(
		async ({ names, version, events, calendars, meta }) => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const request = indexedDB.open(names.db);
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
			const tx = db.transaction(
				[names.events, names.calendars, names.meta],
				"readwrite",
			);
			for (const name of [names.events, names.calendars, names.meta]) {
				tx.objectStore(name).clear();
			}
			for (const event of events) tx.objectStore(names.events).put(event);
			for (const calendar of calendars) {
				tx.objectStore(names.calendars).put(calendar);
			}
			tx.objectStore(names.meta).put(version, names.versionKey);
			for (const [key, value] of Object.entries(meta)) {
				tx.objectStore(names.meta).put(value, key);
			}
			await new Promise<void>((resolve, reject) => {
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});
			db.close();
		},
		{
			names: {
				db: DB_NAME,
				events: EVENTS_STORE,
				calendars: CALENDARS_STORE,
				meta: META_STORE,
				versionKey: CACHE_VERSION_KEY,
			},
			version: data.version ?? CACHE_VERSION,
			events: data.events ?? [],
			calendars: data.calendars ?? [],
			meta: data.meta ?? {},
		},
	);
}

/** Reads every record of a store of the local memory. */
export async function readStore(
	page: Page,
	store: "events" | "calendars" | "meta",
): Promise<unknown[]> {
	return page.evaluate(
		async ({ dbName, storeName }) => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const request = indexedDB.open(dbName);
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
			const records = await new Promise<unknown[]>((resolve, reject) => {
				const request = db
					.transaction(storeName, "readonly")
					.objectStore(storeName)
					.getAll();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
			db.close();
			return records;
		},
		{ dbName: DB_NAME, storeName: store },
	);
}
