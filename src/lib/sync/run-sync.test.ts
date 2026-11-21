import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SYNC_RANGE, syncRequestTimeoutMs } from "@/config/sync";
import { runSync } from "./run-sync";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("runSync", () => {
	it("gives the request a time limit, so a dead network cannot hold the sync", async () => {
		const timeout = vi.spyOn(AbortSignal, "timeout");
		const fetchMock = vi.fn().mockRejectedValue(new Error("never answers"));
		vi.stubGlobal("fetch", fetchMock);

		await runSync(DEFAULT_SYNC_RANGE);

		expect(timeout).toHaveBeenCalledWith(syncRequestTimeoutMs);
		expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
	});

	it("counts a request that timed out as offline", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")),
		);

		expect(await runSync(DEFAULT_SYNC_RANGE)).toEqual({
			ok: false,
			code: "offline",
		});
	});
});
