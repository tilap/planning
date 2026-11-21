// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SidePanel } from "../side-panel/side-panel";
import { Sheet } from "./sheet";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** A sheet opened from a panel, as the administrator entries do. */
function Harness({ closeSide }: { closeSide?: "left" | "right" }) {
	const [panel, setPanel] = useState(false);
	const [sheet, setSheet] = useState(false);
	return (
		<div>
			<button type="button" id="open-panel" onClick={() => setPanel(true)}>
				panel
			</button>
			<SidePanel
				open={panel}
				onClose={() => setPanel(false)}
				closeLabel="Close panel"
				title="Panel"
			>
				<button type="button" id="open-sheet" onClick={() => setSheet(true)}>
					sheet
				</button>
				<Sheet
					open={sheet}
					onClose={() => setSheet(false)}
					closeLabel="Close sheet"
					title="Sheet"
					closeSide={closeSide}
				>
					<p id="sheet-content">arbitrary</p>
				</Sheet>
			</SidePanel>
		</div>
	);
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	// Each test starts from a page with no layer pushed in its history.
	history.replaceState(null, "");
});

const settle = () =>
	act(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));

async function openBoth() {
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
	act(() => root?.render(<Harness />));
	act(() => document.getElementById("open-panel")?.click());
	await settle();
	act(() => document.getElementById("open-sheet")?.click());
	await settle();
}

const has = (id: string) => document.getElementById(id) !== null;

describe("Sheet", () => {
	it("opens over a panel and closes with its cross, the panel staying", async () => {
		await openBoth();
		expect(has("sheet-content")).toBe(true);

		act(() =>
			document
				.querySelector<HTMLButtonElement>('button[aria-label="Close sheet"]')
				?.click(),
		);
		await settle();

		expect(has("sheet-content")).toBe(false);
		expect(has("open-sheet")).toBe(true);
	});

	it("closes with the back gesture without closing the panel", async () => {
		await openBoth();

		act(() => history.back());
		await settle();

		expect(has("sheet-content")).toBe(false);
		expect(has("open-sheet")).toBe(true);
	});

	it("closes with Escape before the panel, then the panel with the next one", async () => {
		await openBoth();

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		});
		await settle();
		expect(has("sheet-content")).toBe(false);
		expect(has("open-sheet")).toBe(true);

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		});
		await settle();
		// The panel leaves on its exit animation; jsdom runs none, so its safety timer ends it.
		await act(() => new Promise<void>((resolve) => setTimeout(resolve, 600)));
		expect(has("open-sheet")).toBe(false);
	});

	it.each([
		[undefined, false],
		["right", false],
		["left", true],
	] as const)(
		"puts the close button on the left only when asked: close side %s",
		async (closeSide, onLeft) => {
			container = document.createElement("div");
			document.body.append(container);
			root = createRoot(container);
			act(() => root?.render(<Harness closeSide={closeSide} />));
			act(() => document.getElementById("open-panel")?.click());
			await settle();
			act(() => document.getElementById("open-sheet")?.click());
			await settle();

			const row = document
				.querySelector<HTMLButtonElement>('button[aria-label="Close sheet"]')
				?.closest("div");
			expect(row?.className.includes("flex-row-reverse")).toBe(onLeft);
		},
	);

	it("closes with a tap on the dimmed page", async () => {
		await openBoth();

		act(() => {
			document.querySelector<HTMLElement>("[data-sheet][aria-hidden]")?.click();
		});
		await settle();

		expect(has("sheet-content")).toBe(false);
		expect(has("open-sheet")).toBe(true);
	});
});
