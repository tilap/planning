// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SidePanel } from "./side-panel";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Harness({
	side,
	closeSide,
}: {
	side?: "left" | "right";
	closeSide?: "left" | "right";
}) {
	const [open, setOpen] = useState(false);
	return (
		<div>
			<button type="button" id="open" onClick={() => setOpen(true)}>
				open
			</button>
			<SidePanel
				open={open}
				onClose={() => setOpen(false)}
				closeLabel="Close"
				title="Arbitrary"
				side={side}
				closeSide={closeSide}
			>
				<p id="content">arbitrary content</p>
			</SidePanel>
		</div>
	);
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
});

/** jsdom runs no CSS animation: the panel leaves on its safety timer. */
const leave = () =>
	act(() => new Promise<void>((resolve) => setTimeout(resolve, 600)));

const settle = () =>
	act(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));

describe("SidePanel", () => {
	it("opens with any content and closes with the cross", async () => {
		container = document.createElement("div");
		document.body.append(container);
		root = createRoot(container);
		act(() => root?.render(<Harness />));

		const lengthBefore = history.length;
		act(() => document.getElementById("open")?.click());
		expect(document.getElementById("content")?.textContent).toBe(
			"arbitrary content",
		);
		expect(history.length).toBe(lengthBefore + 1);

		const close = document.querySelector<HTMLButtonElement>(
			'button[aria-label="Close"]',
		);
		expect(close).not.toBeNull();
		act(() => close?.click());
		await settle();
		// It stays mounted, leaving, until its exit animation ends.
		expect(document.getElementById("content")).not.toBeNull();
		expect(
			document.querySelector("[role=dialog]")?.getAttribute("aria-hidden"),
		).toBe("true");
		await leave();

		expect(document.getElementById("content")).toBeNull();
		expect(history.length).toBe(lengthBefore + 1);
	});

	it.each([
		["right", 20, 220],
		["left", 220, 20],
	] as const)(
		"closes with a swipe towards the %s edge only",
		async (side, closeFrom, closeTo) => {
			container = document.createElement("div");
			document.body.append(container);
			root = createRoot(container);
			act(() => root?.render(<Harness side={side} />));
			act(() => document.getElementById("open")?.click());
			await settle();

			const dialog = document.querySelector('[role="dialog"]');
			const swipe = (from: number, to: number) => {
				for (const [type, clientX] of [
					["pointerdown", from],
					["pointerup", to],
				] as const) {
					act(() => {
						dialog?.dispatchEvent(
							new MouseEvent(type, { bubbles: true, button: 0, clientX }),
						);
					});
				}
			};
			swipe(closeTo, closeFrom);
			await settle();
			expect(document.getElementById("content")).not.toBeNull();

			swipe(closeFrom, closeTo);
			await settle();
			await leave();
			expect(document.getElementById("content")).toBeNull();
		},
	);

	it.each([
		["right", 100, 160, 1],
		["left", 160, 100, -1],
	] as const)(
		"follows the finger towards the %s edge and comes back when released too early",
		async (side, from, to, sign) => {
			container = document.createElement("div");
			document.body.append(container);
			root = createRoot(container);
			act(() => root?.render(<Harness side={side} />));
			act(() => document.getElementById("open")?.click());
			await settle();

			const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
			const fire = (type: string, clientX: number) =>
				act(() => {
					dialog?.dispatchEvent(
						new MouseEvent(type, { bubbles: true, button: 0, clientX }),
					);
				});
			fire("pointerdown", from);
			fire("pointermove", to);
			expect(dialog?.style.transform).toBe(`translateX(${sign * 60}px)`);

			// Released before the closing distance: the panel comes back and stays.
			fire("pointerup", to);
			expect(dialog?.style.transform).toBe("");
			await settle();
			expect(document.getElementById("content")).not.toBeNull();

			// Close it, so no history step is left to leak into the next test.
			act(() =>
				document
					.querySelector<HTMLButtonElement>('button[aria-label="Close"]')
					?.click(),
			);
			await settle();
			await leave();
		},
	);

	it.each([
		[undefined, undefined, false],
		["left", undefined, true],
		["right", "left", true],
		["left", "right", false],
	] as const)(
		"puts the close button on the left only when asked: side %s, close side %s",
		async (side, closeSide, onLeft) => {
			container = document.createElement("div");
			document.body.append(container);
			root = createRoot(container);
			act(() => root?.render(<Harness side={side} closeSide={closeSide} />));
			act(() => document.getElementById("open")?.click());
			await settle();

			const header = document.querySelector("header");
			expect(header?.className.includes("flex-row-reverse")).toBe(onLeft);

			act(() =>
				document
					.querySelector<HTMLButtonElement>('button[aria-label="Close"]')
					?.click(),
			);
			await settle();
			await leave();
		},
	);

	it("locks the scroll of the page while open and gives it back on close", async () => {
		container = document.createElement("div");
		document.body.append(container);
		root = createRoot(container);
		act(() => root?.render(<Harness />));

		act(() => document.getElementById("open")?.click());
		await settle();
		expect(document.documentElement.style.overflow).toBe("hidden");

		act(() =>
			document
				.querySelector<HTMLButtonElement>('button[aria-label="Close"]')
				?.click(),
		);
		await settle();
		expect(document.documentElement.style.overflow).toBe("");
	});
});
