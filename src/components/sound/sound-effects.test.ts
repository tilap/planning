// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { soundFor } from "./sound-effects";

function render(html: string): Element {
	const container = document.createElement("div");
	container.innerHTML = html;
	return container;
}

describe("soundFor", () => {
	it("taps on a button, a link and what is inside them", () => {
		const page = render(
			'<button id="b"><span id="s">x</span></button><a id="a" href="/x">y</a>',
		);
		expect(soundFor("click", page.querySelector("#b") as Element)).toBe("tap");
		expect(soundFor("click", page.querySelector("#s") as Element)).toBe("tap");
		expect(soundFor("click", page.querySelector("#a") as Element)).toBe("tap");
	});

	it("clicks a switch on when it is off and off when it is on", () => {
		const page = render(
			'<button role="switch" id="off" aria-checked="false"></button><button role="switch" id="on" aria-checked="true"></button>',
		);
		expect(soundFor("click", page.querySelector("#off") as Element)).toBe(
			"toggleOn",
		);
		expect(soundFor("click", page.querySelector("#on") as Element)).toBe(
			"toggleOff",
		);
	});

	it("answers a select on change only", () => {
		const page = render('<select id="s"><option>a</option></select>');
		const select = page.querySelector("#s") as Element;
		expect(soundFor("change", select)).toBe("select");
		expect(soundFor("click", select)).toBeNull();
	});

	it("is silent for a disabled control, a plain element and data-sound none", () => {
		const page = render(
			'<button id="d" disabled></button><p id="p">text</p><div data-sound="none"><button id="n"></button></div>',
		);
		expect(soundFor("click", page.querySelector("#d") as Element)).toBeNull();
		expect(soundFor("click", page.querySelector("#p") as Element)).toBeNull();
		expect(soundFor("click", page.querySelector("#n") as Element)).toBeNull();
	});
});
