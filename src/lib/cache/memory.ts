import { type IDBPDatabase, openDB } from "idb";
import type { StoredCalendar, StoredEvent } from "../events/types";
import {
	CACHE_VERSION,
	CACHE_VERSION_KEY,
	CALENDARS_STORE,
	DB_NAME,
	DB_VERSION,
	EVENTS_STORE,
	LAST_SYNC_KEY,
	META_STORE,
} from "./schema";

export type Memory = {
	events: StoredEvent[];
	calendars: StoredCalendar[];
	/** ISO instant of the last successful sync, or null. */
	lastSync: string | null;
};

export function openMemory(): Promise<IDBPDatabase> {
	return openDB(DB_NAME, DB_VERSION, {
		upgrade(db) {
			db.createObjectStore(EVENTS_STORE, { keyPath: "id" });
			db.createObjectStore(CALENDARS_STORE, { keyPath: "id" });
			db.createObjectStore(META_STORE);
		},
	});
}

/**
 * Reads the local memory. If it was written with another format version,
 * the synced data is emptied first (the memory is only a copy of Google).
 */
export async function loadMemory(): Promise<Memory> {
	const db = await openMemory();
	try {
		const stored = await db.get(META_STORE, CACHE_VERSION_KEY);
		if (stored !== CACHE_VERSION) {
			const tx = db.transaction(
				[EVENTS_STORE, CALENDARS_STORE, META_STORE],
				"readwrite",
			);
			tx.objectStore(EVENTS_STORE).clear();
			tx.objectStore(CALENDARS_STORE).clear();
			tx.objectStore(META_STORE).delete(LAST_SYNC_KEY);
			tx.objectStore(META_STORE).put(CACHE_VERSION, CACHE_VERSION_KEY);
			await tx.done;
			return { events: [], calendars: [], lastSync: null };
		}
		const [events, calendars, lastSync] = await Promise.all([
			db.getAll(EVENTS_STORE),
			db.getAll(CALENDARS_STORE),
			db.get(META_STORE, LAST_SYNC_KEY),
		]);
		return { events, calendars, lastSync: lastSync ?? null };
	} finally {
		db.close();
	}
}

/** Replaces the whole memory with the given one, in a single transaction. */
export async function saveMemory(memory: Memory): Promise<void> {
	const db = await openMemory();
	try {
		const tx = db.transaction(
			[EVENTS_STORE, CALENDARS_STORE, META_STORE],
			"readwrite",
		);
		tx.objectStore(EVENTS_STORE).clear();
		tx.objectStore(CALENDARS_STORE).clear();
		for (const event of memory.events) tx.objectStore(EVENTS_STORE).put(event);
		for (const calendar of memory.calendars) {
			tx.objectStore(CALENDARS_STORE).put(calendar);
		}
		if (memory.lastSync) {
			tx.objectStore(META_STORE).put(memory.lastSync, LAST_SYNC_KEY);
		} else {
			tx.objectStore(META_STORE).delete(LAST_SYNC_KEY);
		}
		await tx.done;
	} finally {
		db.close();
	}
}

/** Empties the synced data (events, calendars, last sync date). Preferences are kept. */
export async function clearSyncedData(): Promise<void> {
	const db = await openMemory();
	try {
		const tx = db.transaction(
			[EVENTS_STORE, CALENDARS_STORE, META_STORE],
			"readwrite",
		);
		tx.objectStore(EVENTS_STORE).clear();
		tx.objectStore(CALENDARS_STORE).clear();
		tx.objectStore(META_STORE).delete(LAST_SYNC_KEY);
		await tx.done;
	} finally {
		db.close();
	}
}
