import { describe, expect, it } from "vitest";
import { linkify } from "./linkify";

const links = (text: string) =>
	linkify(text).flatMap((part) =>
		part.kind === "text" ? [] : [`${part.kind}:${part.href}`],
	);

describe("linkify", () => {
	it("returns plain text as one part", () => {
		expect(linkify("Bring an ID")).toEqual([
			{ kind: "text", text: "Bring an ID" },
		]);
	});

	it("finds web addresses and leaves the closing punctuation out", () => {
		expect(
			links("See https://example.com/a?b=1, then (https://x.fr/y)."),
		).toEqual(["url:https://example.com/a?b=1", "url:https://x.fr/y"]);
		expect(links("https://en.wikipedia.org/wiki/A_(b)")).toEqual([
			"url:https://en.wikipedia.org/wiki/A_(b)",
		]);
	});

	it("does not link other schemes", () => {
		expect(links("javascript:alert(1) ftp://x.org")).toEqual([]);
	});

	it("finds email addresses", () => {
		expect(links("Write to jules.moreau@example.com today")).toEqual([
			"email:mailto:jules.moreau@example.com",
		]);
	});

	it("finds phone numbers in several formats", () => {
		expect(
			links("Call +33 1 87 66 12 34 or 06 12 34 56 78 or (555) 123-4567"),
		).toEqual([
			"phone:tel:+33187661234",
			"phone:tel:0612345678",
			"phone:tel:5551234567",
		]);
	});

	it("ignores dates, times and short numbers", () => {
		expect(
			links("On 2026-11-18 (2026-11-18) at 10:00, room 0123, 2 items"),
		).toEqual([]);
	});

	it("keeps the text between links", () => {
		const parts = linkify("a https://x.fr b");
		expect(parts.map((part) => part.text).join("")).toBe("a https://x.fr b");
	});
});
