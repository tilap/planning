import type { ReactNode } from "react";
import { pressable } from "@/components/pressable";

type ActionBarProps = {
	todayLabel: string;
	onToday: () => void;
	/** Hidden while today is already at the top of the screen. */
	showToday: boolean;
	/** Aligned to the left of the bar. */
	left: ReactNode;
	/** Aligned to the right of the bar. */
	right: ReactNode;
	/** Narrow screens only: the sides trade places. */
	swapped?: boolean;
	/** True while the search bar replaces the navigation bar. */
	searching?: boolean;
	/** The content of the search bar. */
	search?: ReactNode;
};

/**
 * Narrow screens: a pill floating at the bottom.
 * Wide screens (md): no pill, Settings and Sync sit in the top corners of the
 * screen and Today in the bottom right corner. The Today label joins its icon
 * from lg.
 * While searching, a search bar of the same style slides in from the bottom
 * and the navigation pill slides out; on wide screens the corner controls stay
 * and the search bar drops in at the top centre.
 */
export function ActionBar({
	todayLabel,
	onToday,
	showToday,
	left,
	right,
	swapped = false,
	searching = false,
	search,
}: ActionBarProps) {
	return (
		<nav
			className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center md:bottom-auto md:top-0 md:block"
			style={{
				paddingBottom:
					"max(0.75rem, calc(env(safe-area-inset-bottom) + 0.125rem))",
			}}
		>
			<div className="relative w-full max-w-lg px-3 md:max-w-none md:px-4 md:pt-3">
				<div
					className={`pointer-events-auto grid min-h-14 grid-cols-[1fr_auto_1fr] items-center rounded-pill border border-line bg-surface px-2 shadow-raised md:pointer-events-none md:min-h-0 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:shadow-none transition-[translate,visibility] duration-300 ease-out motion-reduce:transition-none ${searching ? "invisible translate-y-24 md:visible md:translate-none" : ""}`}
				>
					<div
						className={`pointer-events-auto row-start-1 flex items-center md:col-start-1 md:justify-self-start ${swapped ? "col-start-3 justify-self-end" : "col-start-1 justify-self-start"} md:rounded-pill md:bg-surface md:shadow-raised`}
					>
						{left}
					</div>
					<div className="col-start-2 row-start-1 flex justify-center md:fixed md:right-4 md:bottom-4">
						{showToday ? (
							<button
								type="button"
								aria-label={todayLabel}
								aria-keyshortcuts="T"
								title={`${todayLabel} (T)`}
								onClick={onToday}
								className={`${pressable} pointer-events-auto flex min-h-touch items-center gap-2 rounded-pill px-4 font-display text-lg font-medium text-accent active:bg-accent-soft md:bg-surface md:px-3 md:shadow-raised lg:px-4`}
							>
								<svg
									aria-hidden
									viewBox="0 0 24 24"
									className="hidden size-6 md:block"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.75"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<rect x="3" y="4" width="18" height="18" rx="2" />
									<path d="M16 2v4M8 2v4M3 10h18" />
									<circle cx="12" cy="16" r="1.5" fill="currentColor" />
								</svg>
								<span className="md:sr-only lg:not-sr-only">{todayLabel}</span>
							</button>
						) : null}
					</div>
					<div
						className={`pointer-events-auto row-start-1 md:col-start-3 md:justify-self-end ${swapped ? "col-start-1 justify-self-start" : "col-start-3 justify-self-end"} flex items-center md:rounded-pill md:bg-surface md:shadow-raised`}
					>
						{right}
					</div>
				</div>
				<div
					inert={!searching}
					className={`pointer-events-auto absolute inset-x-3 bottom-0 flex min-h-14 items-center rounded-pill border border-line bg-surface px-2 shadow-raised transition-[translate] duration-300 ease-out motion-reduce:transition-none md:inset-x-4 md:top-3 md:bottom-auto md:mx-auto md:max-w-md ${searching ? "translate-y-0" : "translate-y-24 md:-translate-y-24"}`}
				>
					{search}
				</div>
			</div>
		</nav>
	);
}
