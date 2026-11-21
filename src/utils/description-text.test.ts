import { describe, expect, it } from "vitest";
import { descriptionText } from "./description-text";

describe("descriptionText", () => {
	it("keeps plain text untouched", () => {
		expect(descriptionText("Bring an ID.\nAsk for the parcel.")).toBe(
			"Bring an ID.\nAsk for the parcel.",
		);
	});

	it("turns HTML line breaks into new lines and drops the tags", () => {
		expect(
			descriptionText(
				'Hi,<br><br><b>Agenda</b><br>- One<br>See <a href="https://example.com/x">the slides</a>',
			),
		).toBe("Hi,\n\nAgenda\n- One\nSee the slides (https://example.com/x)");
	});

	it("does not repeat an address that is its own text", () => {
		expect(
			descriptionText(
				'<a href="https://example.com/x">https://example.com/x</a>',
			),
		).toBe("https://example.com/x");
	});

	it("turns list items into dashes", () => {
		expect(descriptionText("<ul><li>One</li><li>Two</li></ul>")).toBe(
			"- One\n- Two",
		);
	});

	it("decodes entities", () => {
		expect(descriptionText("Tom &amp; Jerry &lt;3 &#x41;&nbsp;!")).toBe(
			"Tom & Jerry <3 A !",
		);
	});

	it("drops the Google invitation block", () => {
		const block =
			"-::~:~::~:~:~:~:~:~:~:~:~::~:~::-<br>Join with Google Meet: https://meet.google.com/a-b-c<br>Please do not edit this section.<br>-::~:~::~:~:~:~:~:~:~:~:~::~:~::-";
		expect(descriptionText(`Roadmap.<br><br>${block}`)).toBe("Roadmap.");
	});
});
