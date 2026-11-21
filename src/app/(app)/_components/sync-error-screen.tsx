import { pressable } from "@/components/pressable";
import type { Messages } from "@/lib/i18n/messages";
import type { SyncErrorCode } from "@/lib/sync/run-sync";

type SyncErrorScreenProps = {
	messages: Messages;
	cause: SyncErrorCode;
	onRetry: () => void;
	onSignOut: () => void;
};

const primaryClass = `${pressable} flex min-h-touch w-full items-center justify-center rounded-pill bg-accent px-5 font-medium text-accent-fg active:opacity-80`;
const secondaryClass = `${pressable} min-h-touch w-full rounded-control border border-line font-medium text-fg active:bg-accent-soft`;

/** Shown when the first sync fails and there is nothing to display yet. */
export function SyncErrorScreen({
	messages,
	cause,
	onRetry,
	onSignOut,
}: SyncErrorScreenProps) {
	const needsSignIn =
		cause === "not_signed_in" ||
		cause === "access_revoked" ||
		cause === "calendar_permission_missing";
	return (
		<section className="flex min-h-dvh flex-col justify-center px-6 py-12">
			<h1 className="max-w-xs font-display text-4xl font-medium leading-tight tracking-tight">
				{messages.firstSyncFailedTitle}
			</h1>
			<p className="mt-3 max-w-xs text-lg leading-relaxed text-fg-muted">
				{messages.failureExplanation[cause]}
			</p>
			<div className="mt-8 max-w-xs space-y-3">
				{needsSignIn ? (
					<a href="/api/auth/google" className={primaryClass}>
						{messages.signInAgain}
					</a>
				) : (
					<button type="button" onClick={onRetry} className={primaryClass}>
						{messages.retry}
					</button>
				)}
				<button type="button" onClick={onSignOut} className={secondaryClass}>
					{messages.signOut}
				</button>
			</div>
		</section>
	);
}
