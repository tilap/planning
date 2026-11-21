"use client";

import {
	type DragEvent,
	type PointerEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { pressable } from "@/components/pressable";
import { play } from "@/lib/sound/sound";

type SidePanelProps = {
	open: boolean;
	onClose: () => void;
	/** Accessible label of the close button. */
	closeLabel: string;
	title: string;
	/** The edge the panel enters from. */
	side?: "left" | "right";
	/** The side of the close button; the edge the panel enters from by default. */
	closeSide?: "left" | "right";
	children: ReactNode;
};

/** Longest time the exit animation (180ms in `globals.css`) is waited for. */
const EXIT_FALLBACK_MS = 500;

/** Minimum horizontal distance of a swipe towards its edge that closes the panel. */
const SWIPE_CLOSE_DISTANCE = 80;

/** Distance towards its edge from which the panel starts to follow the finger. */
const DRAG_START_DISTANCE = 12;

/** Time the panel takes to come back when a swipe is released too early. */
const SNAP_BACK = "150ms ease-out";

/**
 * A panel entering from the right, or from the left. Opening adds a history
 * entry, so the back gesture closes it. It also closes with the cross, Escape,
 * a tap on the dimmed page, or a swipe towards the edge it came from. It
 * leaves the way it came: the exit animation runs the entry one backwards,
 * on the last title and content, then the panel unmounts.
 */
export function SidePanel({
	open,
	onClose,
	closeLabel,
	title,
	side = "right",
	closeSide = side,
	children,
}: SidePanelProps) {
	const pushed = useRef(false);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;
	// The pointer gesture on the panel: where it began, and whether the panel follows it.
	const swipe = useRef<{ x: number; y: number; following: boolean } | null>(
		null,
	);
	const dialog = useRef<HTMLDivElement>(null);
	const backdrop = useRef<HTMLDivElement>(null);
	// Stays true during the exit animation, after `open` turned false.
	const [mounted, setMounted] = useState(open);
	// The content the panel last showed while open, kept for its exit.
	const last = useRef({ title, children });
	if (open) last.current = { title, children };

	useEffect(() => {
		if (open) {
			setMounted(true);
			return;
		}
		// Without animation there is no end event to wait for.
		if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
			setMounted(false);
			return;
		}
		// Safety net: the panel never stays if the end event does not come.
		const timer = setTimeout(() => setMounted(false), EXIT_FALLBACK_MS);
		return () => clearTimeout(timer);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		// A panel reopened while it was leaving starts from its place again.
		for (const element of [dialog.current, backdrop.current]) {
			element?.style.removeProperty("transform");
			element?.style.removeProperty("opacity");
			element?.style.removeProperty("--drag");
			element?.style.removeProperty("--drag-opacity");
		}
		history.pushState({ sidePanel: true }, "");
		pushed.current = true;
		play("open");
		// Focus the dialog itself, not the cross: a focused cross shows its ring.
		dialog.current?.focus();
		const close = () => {
			if (pushed.current) history.back();
			else onCloseRef.current();
		};
		const onPop = () => {
			// A layer above the panel (a sheet) closed: the panel stays.
			if (history.state?.sidePanel === true) return;
			pushed.current = false;
			onCloseRef.current();
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") close();
		};
		// The page behind does not scroll while the panel is open.
		const root = document.documentElement;
		const overflow = root.style.overflow;
		root.style.overflow = "hidden";
		window.addEventListener("popstate", onPop);
		window.addEventListener("keydown", onKey);
		return () => {
			play("close");
			root.style.overflow = overflow;
			window.removeEventListener("popstate", onPop);
			window.removeEventListener("keydown", onKey);
			if (pushed.current) {
				pushed.current = false;
				history.back();
			}
		};
	}, [open]);

	if (!open && !mounted) return null;
	const closing = !open;
	const shown = open ? { title, children } : last.current;

	const requestClose = () => {
		if (pushed.current) history.back();
		else onClose();
	};

	// Towards the edge the panel came from: the right for a right panel, the left for a left one.
	const sign = side === "left" ? -1 : 1;
	const towardsEdge = (event: PointerEvent, start: { x: number }) =>
		(event.clientX - start.x) * sign;
	/** How much of the dim layer is left once the panel has moved `px` out. */
	const opacityAt = (px: number) =>
		1 - Math.min(px / (dialog.current?.offsetWidth || 1), 1);

	const follow = (px: number) => {
		if (dialog.current) {
			dialog.current.style.transition = "none";
			dialog.current.style.transform = `translateX(${sign * px}px)`;
		}
		if (backdrop.current) {
			backdrop.current.style.transition = "none";
			backdrop.current.style.opacity = String(opacityAt(px));
		}
	};
	const snapBack = () => {
		if (dialog.current) {
			dialog.current.style.transition = `transform ${SNAP_BACK}`;
			dialog.current.style.transform = "";
		}
		if (backdrop.current) {
			backdrop.current.style.transition = `opacity ${SNAP_BACK}`;
			backdrop.current.style.opacity = "";
		}
	};

	const onPointerDown = (event: PointerEvent) => {
		if (event.button !== 0) return;
		swipe.current = { x: event.clientX, y: event.clientY, following: false };
	};
	const onPointerMove = (event: PointerEvent) => {
		const gesture = swipe.current;
		if (!gesture) return;
		const dx = towardsEdge(event, gesture);
		const dy = event.clientY - gesture.y;
		if (!gesture.following) {
			if (dx < DRAG_START_DISTANCE || dx <= Math.abs(dy) * 2) return;
			gesture.following = true;
			dialog.current?.setPointerCapture?.(event.pointerId);
		}
		follow(Math.max(dx, 0));
	};
	const onPointerUp = (event: PointerEvent) => {
		const gesture = swipe.current;
		swipe.current = null;
		if (!gesture) return;
		const dx = towardsEdge(event, gesture);
		const dy = event.clientY - gesture.y;
		if (dx >= SWIPE_CLOSE_DISTANCE && dx > Math.abs(dy) * 2) {
			// A swipe that began on a link must not activate it.
			event.preventDefault();
			// The exit animation continues from where the finger left the panel.
			const width = dialog.current?.offsetWidth || dx;
			dialog.current?.style.setProperty(
				"--drag",
				`${sign * Math.min(dx, width)}px`,
			);
			backdrop.current?.style.setProperty(
				"--drag-opacity",
				String(opacityAt(dx)),
			);
			requestClose();
		} else if (gesture.following) {
			snapBack();
		}
	};
	const onPointerCancel = () => {
		if (swipe.current?.following) snapBack();
		swipe.current = null;
	};
	// A link starts a native drag, which cancels the pointer gesture.
	const onDragStart = (event: DragEvent) => {
		event.preventDefault();
	};

	return (
		<>
			<div
				ref={backdrop}
				aria-hidden
				className={`fixed inset-0 z-20 bg-scrim motion-reduce:animate-none ${closing ? "pointer-events-none animate-fade-out" : "animate-fade-in"}`}
				onClick={requestClose}
			/>
			<div
				ref={dialog}
				tabIndex={-1}
				role="dialog"
				aria-modal="true"
				aria-label={shown.title}
				aria-hidden={closing || undefined}
				className={`fixed inset-y-0 z-30 flex outline-none w-full max-w-md touch-pan-y flex-col border-line bg-surface ${side === "left" ? `left-0 border-r ${closing ? "animate-slide-out-left" : "animate-slide-in-left"}` : `right-0 border-l ${closing ? "animate-slide-out" : "animate-slide-in"}`} ${closing ? "pointer-events-none" : ""} shadow-raised motion-reduce:animate-none`}
				style={{
					paddingTop: "env(safe-area-inset-top)",
					paddingBottom: "env(safe-area-inset-bottom)",
				}}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onDragStart={onDragStart}
				onPointerCancel={onPointerCancel}
				onAnimationEnd={(event) => {
					if (closing && event.target === event.currentTarget)
						setMounted(false);
				}}
			>
				<header
					className={`flex items-start gap-3 border-b border-line py-2 ${closeSide === "left" ? "flex-row-reverse pr-5 pl-2" : "pr-2 pl-5"}`}
				>
					<h2 className="min-w-0 flex-1 break-words py-2 font-display text-xl font-medium leading-snug">
						{shown.title}
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
				</header>
				<div className="flex-1 touch-pan-y overflow-y-auto overscroll-contain">
					{shown.children}
				</div>
			</div>
		</>
	);
}
