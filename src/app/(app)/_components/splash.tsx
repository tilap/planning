"use client";

import { useEffect, useRef, useState } from "react";

type SplashProps = {
	appName: string;
	/** What the app is waiting for, e.g. "Loading…"; read by screen readers only. */
	label: string;
	/** True while the app loads; false lets the splash fade out once its minimum time has passed. */
	visible: boolean;
	/** Tells whether the splash still covers the app, so the app can appear once it is gone. */
	onCoveringChange: (covering: boolean) => void;
};

/** The splash stays at least this long, so a fast load does not flash it. */
const MIN_VISIBLE_MS = 800;

/** Must match the `duration-*` of the logo fade below. */
const LOGO_FADE_MS = 200;

/** The logo fades out over the opaque background, then the splash is removed. */
type Phase = "shown" | "logo-out" | "gone";

/**
 * The launch screen of a native app: logo, name and a spinner over the whole
 * page, on the page background. It stays at least `MIN_VISIBLE_MS`, then, once loading has ended, the
 * logo fades out over the opaque background and the splash is removed. The app
 * then fades in: the logo and the content are never seen together.
 */
export function Splash({
	appName,
	label,
	visible,
	onCoveringChange,
}: SplashProps) {
	const [phase, setPhase] = useState<Phase>("shown");
	const shownAt = useRef(Date.now());

	useEffect(() => {
		if (visible) {
			setPhase((current) => {
				if (current !== "shown") shownAt.current = Date.now();
				return "shown";
			});
			return;
		}
		const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current));
		const timers = [
			setTimeout(() => setPhase("logo-out"), wait),
			setTimeout(() => setPhase("gone"), wait + LOGO_FADE_MS),
		];
		return () => {
			for (const timer of timers) clearTimeout(timer);
		};
	}, [visible]);

	const covering = phase !== "gone";
	useEffect(() => {
		onCoveringChange(covering);
	}, [covering, onCoveringChange]);

	if (!covering) return null;
	const logoVisible = phase === "shown";

	return (
		<div
			role="status"
			aria-label={label}
			aria-busy={phase === "shown"}
			className="fixed inset-0 z-50 flex flex-col items-center justify-center"
		>
			<div
				className={`flex flex-col items-center gap-6 transition-opacity duration-200 ease-out motion-reduce:transition-none ${logoVisible ? "opacity-100" : "opacity-0"}`}
			>
				{/* biome-ignore lint/performance/noImgElement: a static local SVG */}
				<img
					src="/icons/app-icon.svg"
					alt=""
					className="size-24 rounded-card shadow-raised"
				/>
				<p className="font-display text-3xl font-medium tracking-tight">
					{appName}
				</p>
				<svg
					aria-hidden
					viewBox="0 0 24 24"
					className="size-7 text-accent motion-safe:animate-spin"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
				>
					<circle cx="12" cy="12" r="9" className="opacity-20" />
					<path d="M12 3a9 9 0 0 1 9 9" />
				</svg>
			</div>
		</div>
	);
}
