"use client";

import {
	type DragEvent,
	type PointerEvent,
	type ReactNode,
	useEffect,
	useRef,
} from "react";
import { pressable } from "@/components/pressable";
import { play } from "@/lib/sound/sound";

type SheetProps = {
	open: boolean;
	onClose: () => void;
	/** Accessible label of the close button. */
	closeLabel: string;
	title: string;
	/** The side of the close button. */
	closeSide?: "left" | "right";
	children: ReactNode;
};

/** Minimum vertical distance of a swipe down, from the header, that closes the sheet. */
const SWIPE_CLOSE_DISTANCE = 80;

/**
 * A sheet rising from the bottom of the screen over everything, with rounded
 * top corners and a shadow, stopping a little below the top. Opening adds a
 * history entry, so the back gesture closes it. It also closes with the cross,
 * Escape (before anything under it), a tap on the dimmed page, or a swipe down
 * from its header.
 */
export function Sheet({
	open,
	onClose,
	closeLabel,
	title,
	closeSide = "right",
	children,
}: SheetProps) {
	const pushed = useRef(false);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;
	const swipeStart = useRef<{ x: number; y: number } | null>(null);
	const dialog = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		history.pushState({ sheet: true }, "");
		pushed.current = true;
		play("open");
		dialog.current?.focus();
		const close = () => {
			if (pushed.current) history.back();
			else onCloseRef.current();
		};
		// Going back from a layer under the sheet is not for it to handle.
		const onPop = () => {
			if (history.state?.sheet === true) return;
			pushed.current = false;
			onCloseRef.current();
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			// Only the sheet closes, not the panel under it.
			event.stopImmediatePropagation();
			close();
		};
		const root = document.documentElement;
		const overflow = root.style.overflow;
		root.style.overflow = "hidden";
		window.addEventListener("popstate", onPop);
		window.addEventListener("keydown", onKey, true);
		return () => {
			play("close");
			root.style.overflow = overflow;
			window.removeEventListener("popstate", onPop);
			window.removeEventListener("keydown", onKey, true);
			if (pushed.current) {
				pushed.current = false;
				history.back();
			}
		};
	}, [open]);

	if (!open) return null;

	const requestClose = () => {
		if (pushed.current) history.back();
		else onClose();
	};

	const onPointerDown = (event: PointerEvent) => {
		if (event.button !== 0) return;
		swipeStart.current = { x: event.clientX, y: event.clientY };
	};
	const onPointerUp = (event: PointerEvent) => {
		const start = swipeStart.current;
		swipeStart.current = null;
		if (!start) return;
		const dx = event.clientX - start.x;
		const dy = event.clientY - start.y;
		if (dy >= SWIPE_CLOSE_DISTANCE && dy > Math.abs(dx) * 2) requestClose();
	};
	const onDragStart = (event: DragEvent) => {
		event.preventDefault();
	};

	return (
		<>
			<div
				aria-hidden
				data-sheet
				className="fixed inset-0 z-40 animate-fade-in bg-scrim motion-reduce:animate-none"
				onClick={requestClose}
			/>
			<div
				ref={dialog}
				tabIndex={-1}
				role="dialog"
				aria-modal="true"
				aria-label={title}
				data-sheet
				className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-2xl animate-slide-up flex-col rounded-t-card border border-b-0 border-line bg-surface shadow-sheet outline-none motion-reduce:animate-none"
				style={{
					// 20px below the top of the screen, or the notch if it is lower.
					top: "max(1.25rem, env(safe-area-inset-top))",
					paddingBottom: "env(safe-area-inset-bottom)",
				}}
			>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: the swipe down is a pointer shortcut; the cross is the accessible way to close */}
				<header
					className="touch-none border-b border-line"
					onPointerDown={onPointerDown}
					onPointerUp={onPointerUp}
					onPointerCancel={() => {
						swipeStart.current = null;
					}}
					onDragStart={onDragStart}
				>
					<div
						aria-hidden
						className="mx-auto mt-2 h-1 w-10 rounded-pill bg-line"
					/>
					<div
						className={`flex items-start gap-3 py-1 ${closeSide === "left" ? "flex-row-reverse pr-5 pl-2" : "pr-2 pl-5"}`}
					>
						<h2 className="min-w-0 flex-1 break-words py-2 font-display text-xl font-medium leading-snug">
							{title}
						</h2>
						<button
							type="button"
							aria-label={closeLabel}
							data-sound="none"
							onClick={requestClose}
							className={`${pressable} grid size-touch shrink-0 place-items-center rounded-pill text-fg active:bg-accent-soft`}
						>
							<svg
								aria-hidden
								viewBox="0 0 24 24"
								className="size-6"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.75"
								strokeLinecap="round"
							>
								<path d="M6 6l12 12M18 6 6 18" />
							</svg>
						</button>
					</div>
				</header>
				<div className="flex-1 overflow-y-auto overscroll-contain">
					{children}
				</div>
			</div>
		</>
	);
}
