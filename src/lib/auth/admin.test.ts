import { describe, expect, it } from "vitest";
import { isAdmin } from "./admin";

describe("isAdmin", () => {
	it("is true for an address of the list, whatever its case", () => {
		expect(isAdmin("me@example.com")).toBe(true);
		expect(isAdmin("ME@Example.com")).toBe(true);
	});

	it("is false for another address", () => {
		expect(isAdmin("other@example.com")).toBe(false);
	});
});
