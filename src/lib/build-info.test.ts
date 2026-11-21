import { describe, expect, it } from "vitest";
import { shortGitSha } from "./build-info";

describe("shortGitSha", () => {
	it("keeps the first seven characters", () => {
		expect(shortGitSha("abcdef0123456789")).toBe("abcdef0");
	});

	it("leaves a short local marker unchanged", () => {
		expect(shortGitSha("dev")).toBe("dev");
	});
});
