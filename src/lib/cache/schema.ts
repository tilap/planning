/** Name and layout of the IndexedDB database that holds the local memory. */
export const DB_NAME = "planning";
export const DB_VERSION = 1;

export const EVENTS_STORE = "events";
export const CALENDARS_STORE = "calendars";
export const META_STORE = "meta";

/** Version of the stored data format. A different stored version empties the memory. */
export const CACHE_VERSION = 2;

export const CACHE_VERSION_KEY = "cacheVersion";
export const LAST_SYNC_KEY = "lastSync";
export const PREFERENCES_KEY = "preferences";
