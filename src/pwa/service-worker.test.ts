import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker", () => {
	it("never skips waiting nor takes control of open pages, so a new version activates at the next launch", () => {
		const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
		expect(source).not.toContain("skipWaiting");
		expect(source).not.toContain("clients.claim");
	});
});
