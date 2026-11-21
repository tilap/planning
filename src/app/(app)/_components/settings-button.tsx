import { pressable } from "@/components/pressable";

type SettingsButtonProps = { label: string; onOpen: () => void };

/** The keyboard shortcut, shown in the tooltip. */
const SHORTCUT = "P";

export function SettingsButton({ label, onOpen }: SettingsButtonProps) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-keyshortcuts={SHORTCUT}
			title={`${label} (${SHORTCUT})`}
			onClick={onOpen}
			className={`${pressable} grid size-touch place-items-center rounded-pill text-fg active:bg-accent-soft`}
		>
			<svg
				aria-hidden
				viewBox="0 0 24 24"
				className="size-6"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
				<circle cx="12" cy="12" r="3" />
			</svg>
		</button>
	);
}
