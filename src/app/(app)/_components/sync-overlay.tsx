type SyncOverlayProps = { label: string };

/** A discreet message shown while a sync runs. It never blocks taps or scrolling. */
export function SyncOverlay({ label }: SyncOverlayProps) {
	return (
		<div
			role="status"
			className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center"
			style={{ paddingTop: "env(safe-area-inset-top)" }}
		>
			<span className="mt-3 rounded-pill border border-line bg-surface px-4 py-2 text-sm font-medium text-fg shadow-raised">
				{label}
			</span>
		</div>
	);
}
