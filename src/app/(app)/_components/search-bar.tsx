"use client";

import { useEffect, useRef } from "react";
import { pressable } from "@/components/pressable";

type SearchBarProps = {
	open: boolean;
	label: string;
	closeLabel: string;
	query: string;
	/** Called on every change of the field: the list is filtered as the user types. */
	onQueryChange: (query: string) => void;
	onClose: () => void;
};

/** The content of the search bar: a text field, focused when the bar opens, and a cross that puts the bar away. */
export function SearchBar({
	open,
	label,
	closeLabel,
	query,
	onQueryChange,
	onClose,
}: SearchBarProps) {
	const input = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open) input.current?.focus();
	}, [open]);

	return (
		<div className="flex min-w-0 flex-1 items-center">
			<input
				ref={input}
				// A plain text field, not a form nor a "search" one: iOS adds its own
				// search and form helpers around those.
				type="text"
				inputMode="search"
				value={query}
				onChange={(event) => onQueryChange(event.target.value)}
				onKeyDown={(event) => {
					// Enter only closes the keyboard: the list is already filtered.
					if (event.key === "Enter") event.currentTarget.blur();
					if (event.key === "Escape") onClose();
				}}
				aria-label={label}
				placeholder={label}
				enterKeyHint="search"
				autoComplete="off"
				autoCorrect="off"
				autoCapitalize="off"
				spellCheck={false}
				className="min-h-touch min-w-0 flex-1 bg-transparent px-3 text-field text-fg outline-none placeholder:text-fg-muted"
			/>
			<button
				type="button"
				aria-label={closeLabel}
				onClick={onClose}
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
	);
}
