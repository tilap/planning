import { pressable } from "@/components/pressable";

type SyncButtonProps = {
	label: string;
	syncing: boolean;
	/** Offline: the button stays visible but does nothing. */
	disabled: boolean;
	onSync: () => void;
};

/** The keyboard shortcut, shown in the tooltip. */
const SHORTCUT = "R";

export function SyncButton({
	label,
	syncing,
	disabled,
	onSync,
}: SyncButtonProps) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-keyshortcuts={SHORTCUT}
			title={`${label} (${SHORTCUT})`}
			aria-disabled={disabled}
			onClick={disabled ? undefined : onSync}
			className={`grid size-touch place-items-center rounded-pill ${
				disabled
					? "text-fg-muted opacity-40"
					: `${pressable} text-fg active:bg-accent-soft`
			}`}
		>
			<svg
				aria-hidden
				viewBox="0 0 24 24"
				className={`size-6 ${syncing ? "animate-spin motion-reduce:animate-none" : ""}`}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M21 12a9 9 0 1 1-3-6.7" />
				<path d="M21 4v5h-5" />
			</svg>
		</button>
	);
}
