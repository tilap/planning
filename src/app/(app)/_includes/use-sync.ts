import { useCallback, useRef, useState } from "react";
import type { SyncRange } from "@/config/sync";
import type { Memory } from "@/lib/cache/memory";
import { runSync, type SyncErrorCode } from "@/lib/sync/run-sync";

/**
 * Runs syncs one at a time, over the range the preferences ask for. After a
 * success it hands the new memory to `onMemory`; after a failure it keeps the
 * cause until the next success. A sync asked with a new range while another
 * runs waits for it, so the new range is never lost.
 */
export function useSync(onMemory: (memory: Memory) => void, range: SyncRange) {
	const [syncing, setSyncing] = useState(false);
	const [failure, setFailure] = useState<SyncErrorCode | null>(null);
	const running = useRef(false);
	const queued = useRef<SyncRange | null>(null);
	const rangeRef = useRef(range);
	rangeRef.current = range;

	const run = useCallback(
		async (over: SyncRange, fromChange: boolean): Promise<void> => {
			if (running.current) {
				if (fromChange) queued.current = over;
				return;
			}
			running.current = true;
			setSyncing(true);
			try {
				const outcome = await runSync(over);
				if (outcome.ok) {
					setFailure(null);
					onMemory(outcome.memory);
				} else {
					setFailure(outcome.code);
				}
			} finally {
				running.current = false;
				setSyncing(false);
			}
			const next = queued.current;
			queued.current = null;
			if (next) await run(next, true);
		},
		[onMemory],
	);

	/** A sync over the range of the preferences. */
	const sync = useCallback(() => run(rangeRef.current, false), [run]);
	/** A sync over a range that has just changed: it is never dropped. */
	const syncRange = useCallback((over: SyncRange) => run(over, true), [run]);

	const clearFailure = useCallback(() => setFailure(null), []);

	return { syncing, failure, sync, syncRange, clearFailure };
}
