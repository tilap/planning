import { describe, expect, it } from "vitest";
import { detectLanguage, getMessages, LANGUAGES } from "./messages";

describe("detectLanguage", () => {
	it("picks the supported language of the device, with or without a region", () => {
		expect(detectLanguage("fr-FR")).toBe("fr");
		expect(detectLanguage("es-MX")).toBe("es");
		expect(detectLanguage("it")).toBe("it");
		expect(detectLanguage("DE-at")).toBe("de");
		expect(detectLanguage("vi-VN")).toBe("vi");
	});

	it("falls back to English for an unsupported language", () => {
		expect(detectLanguage("ja-JP")).toBe("en");
	});
});

describe("getMessages", () => {
	it("has a dictionary with its own offset units for every language", () => {
		for (const { value } of LANGUAGES) {
			const messages = getMessages(value);
			expect(messages.dayUnit).not.toBe("");
			expect(messages.weekUnit).not.toBe("");
			expect(messages.dayOf(2, 3)).toContain("2/3");
		}
	});
});
