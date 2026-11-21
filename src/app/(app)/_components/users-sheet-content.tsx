"use client";

import { type FormEvent, useState } from "react";
import { pressable } from "@/components/pressable";
import type { Messages } from "@/lib/i18n/messages";
import { type UsersError, useAdminUsers } from "../_includes/use-admin-users";

type UsersSheetContentProps = { messages: Messages };

/** The addresses allowed to sign in: the admins, and the users an admin added. */
export function UsersSheetContent({ messages }: UsersSheetContentProps) {
	const { snapshot, loadFailed, add, remove } = useAdminUsers();
	const [draft, setDraft] = useState("");
	const [error, setError] = useState<UsersError | null>(null);
	const [busy, setBusy] = useState(false);

	const errorText = {
		invalid_email: messages.usersInvalidEmail,
		already_admin: messages.usersAlreadyAdmin,
		failed: messages.usersError,
	};

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		const email = draft.trim();
		if (!email || busy) return;
		setBusy(true);
		const outcome = await add(email);
		setBusy(false);
		setError(outcome);
		if (outcome === null) setDraft("");
	};

	const withdraw = async (email: string) => {
		setBusy(true);
		setError(await remove(email));
		setBusy(false);
	};

	if (loadFailed) {
		return <p className="p-5 text-fg-muted">{messages.usersError}</p>;
	}
	if (!snapshot) {
		return <p className="p-5 text-fg-muted">{messages.loading}</p>;
	}

	return (
		<div className="space-y-5 p-5">
			<form onSubmit={submit} className="flex gap-2">
				<input
					type="email"
					inputMode="email"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					aria-label={messages.usersAddPlaceholder}
					placeholder={messages.usersAddPlaceholder}
					autoComplete="off"
					autoCapitalize="off"
					autoCorrect="off"
					spellCheck={false}
					className="min-h-touch min-w-0 flex-1 rounded-control border border-line bg-canvas px-3 text-field text-fg placeholder:text-fg-muted"
				/>
				<button
					type="submit"
					disabled={busy || draft.trim() === ""}
					className={`${pressable} min-h-touch shrink-0 rounded-control bg-accent px-4 font-medium text-accent-fg active:opacity-80 disabled:opacity-40`}
				>
					{messages.usersAdd}
				</button>
			</form>
			{error ? (
				<p role="alert" className="text-sm text-danger">
					{errorText[error]}
				</p>
			) : null}
			<ul className="overflow-hidden rounded-card border border-line bg-canvas">
				{snapshot.admins.map((email) => (
					<li
						key={email}
						className="flex min-h-touch items-center gap-3 border-b border-line px-3 last:border-b-0"
					>
						<span className="min-w-0 flex-1 break-all">{email}</span>
						<span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-sm font-medium text-accent">
							{messages.usersAdminTag}
						</span>
					</li>
				))}
				{snapshot.users.map((user) => (
					<li
						key={user.email}
						className="flex min-h-touch items-center gap-1 border-b border-line pl-3 last:border-b-0"
					>
						<span className="min-w-0 flex-1 break-all">{user.email}</span>
						<button
							type="button"
							aria-label={messages.usersRemove(user.email)}
							disabled={busy}
							onClick={() => withdraw(user.email)}
							className={`${pressable} grid size-touch shrink-0 place-items-center rounded-pill text-fg active:bg-accent-soft disabled:opacity-40`}
						>
							<svg
								aria-hidden
								viewBox="0 0 24 24"
								className="size-5"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.75"
								strokeLinecap="round"
							>
								<path d="M6 6l12 12M18 6 6 18" />
							</svg>
						</button>
					</li>
				))}
			</ul>
			{snapshot.users.length === 0 ? (
				<p className="text-sm text-fg-muted">{messages.usersEmpty}</p>
			) : null}
		</div>
	);
}
