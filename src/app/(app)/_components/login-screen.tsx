import { pressable } from "@/components/pressable";
import type { Messages } from "@/lib/i18n/messages";

type LoginScreenProps = {
	messages: Messages;
	/** Whether the server can be reached to start the sign-in. */
	reachable: boolean;
	/** Whether the last sign-in was refused because the account is not allowed. */
	forbidden: boolean;
};

export function LoginScreen({
	messages,
	reachable,
	forbidden,
}: LoginScreenProps) {
	return (
		<section className="flex min-h-dvh flex-col justify-center px-6 py-12">
			<p className="font-display text-sm font-medium tracking-wide text-accent">
				{messages.appName}
			</p>
			<h1 className="mt-3 max-w-xs font-display text-4xl font-medium leading-tight tracking-tight">
				{messages.signInWithGoogle}
			</h1>
			<p className="mt-3 max-w-xs text-lg leading-relaxed text-fg-muted">
				{messages.homeLead}
			</p>
			{forbidden ? (
				<p className="mt-6 max-w-xs rounded-control border border-danger px-4 py-3 text-danger">
					{messages.accountNotAllowed}
				</p>
			) : null}
			{reachable ? (
				<a
					href="/api/auth/google"
					className={`${pressable} mt-8 flex min-h-touch max-w-xs items-center justify-center rounded-pill bg-accent px-5 font-medium text-accent-fg active:opacity-80`}
				>
					{messages.signInWithGoogle}
				</a>
			) : (
				<p className="mt-8 max-w-xs rounded-card bg-surface px-4 py-4 text-fg-muted shadow-raised">
					{messages.networkNeededFirstSignIn}
				</p>
			)}
		</section>
	);
}
