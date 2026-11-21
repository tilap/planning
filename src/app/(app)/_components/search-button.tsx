import { pressable } from "@/components/pressable";

type SearchButtonProps = {
	label: string;
	onOpen: () => void;
};

/** The keyboard shortcut, shown in the tooltip. */
const SHORTCUT = "S";

export function SearchButton({ label, onOpen }: SearchButtonProps) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-keyshortcuts={SHORTCUT}
			title={`${label} (${SHORTCUT})`}
			onClick={onOpen}
			className={`${pressable} grid size-touch place-items-center rounded-pill text-fg active:bg-accent-soft`}
		>
			<MagnifierIcon />
		</button>
	);
}

function MagnifierIcon() {
	return (
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
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.5-3.5" />
		</svg>
	);
}
