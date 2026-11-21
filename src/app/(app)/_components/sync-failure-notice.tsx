import { pressable } from "@/components/pressable";
import type { Messages } from "@/lib/i18n/messages";
import type { SyncErrorCode } from "@/lib/sync/run-sync";

type SyncFailureNoticeProps = {
	messages: Messages;
	cause: SyncErrorCode;
};

/** A notice at the top of the list: it takes its own room, so it never covers an event. */
export function SyncFailureNotice({ messages, cause }: SyncFailureNoticeProps) {
	const needsSignIn = cause === "access_revoked" || cause === "not_signed_in";
	return (
		<div role="alert" className="px-4 pt-3">
			<div className="flex w-full motion-safe:animate-notice-shake gap-3 rounded-card border border-line bg-surface p-4 shadow-raised">
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					className="mt-0.5 size-6 shrink-0 text-danger"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<circle cx="12" cy="12" r="9.5" />
					<path d="M12 7.5v5.5M12 16.5h.01" />
				</svg>
				<div className="min-w-0">
					<p className="font-display text-base font-medium leading-snug text-fg">
						{messages.syncFailed}
					</p>
					<p className="mt-1 text-sm leading-relaxed text-fg-muted">
						{messages.failureExplanation[cause]}
					</p>
					{needsSignIn ? (
						<a
							href="/api/auth/google"
							className={`${pressable} mt-2 inline-flex min-h-touch items-center rounded-control bg-accent px-4 text-sm font-medium text-accent-fg`}
						>
							{messages.signInAgain}
						</a>
					) : null}
				</div>
			</div>
		</div>
	);
}
