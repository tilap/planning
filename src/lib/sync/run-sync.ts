import { type SyncRange, syncRequestTimeoutMs } from "@/config/sync";
import { loadMemory, type Memory, saveMemory } from "../cache/memory";
import { mergeSyncResult, type SyncResponse } from "./merge";
import { computePurgeCutoff, computeSyncWindow } from "./window";

/** The codes the sync route answers with (a failed request without answer is "offline"). */
const ROUTE_ERROR_CODES = [
	"not_signed_in",
	"access_revoked",
	"quota",
	"upstream",
	"calendar_api_disabled",
	"calendar_permission_missing",
] as const;

export type SyncErrorCode = "offline" | (typeof ROUTE_ERROR_CODES)[number];

export type SyncOutcome =
	| { ok: true; memory: Memory }
	| { ok: false; code: SyncErrorCode };

function deviceTimeZone(): string {
	return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Syncs the local memory with Google through the sync route, over a range. */
export async function runSync(
	range: SyncRange,
	now: Date = new Date(),
): Promise<SyncOutcome> {
	const timeZone = deviceTimeZone();
	const window = computeSyncWindow(now, timeZone, range);
	const cutoff = computePurgeCutoff(now, timeZone, range);
	const query = new URLSearchParams({
		past: range.past,
		ahead: range.ahead,
		tz: timeZone,
	});

	let response: Response;
	try {
		response = await fetch(`/api/sync?${query.toString()}`, {
			cache: "no-store",
			// A network that says it is up but never answers must not hold the sync forever.
			signal: AbortSignal.timeout(syncRequestTimeoutMs),
		});
	} catch {
		return { ok: false, code: "offline" };
	}

	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as { code?: string };
		const code = ROUTE_ERROR_CODES.find((known) => known === body.code);
		return { ok: false, code: code ?? "upstream" };
	}

	const result = (await response.json()) as SyncResponse;
	const memory = mergeSyncResult(await loadMemory(), result, {
		timeMin: window.timeMin,
		cutoff,
		timeZone,
	});
	await saveMemory(memory);
	return { ok: true, memory };
}
