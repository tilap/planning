import { useCallback, useEffect, useRef, useState } from "react";
import { sessionCheckTimeoutMs } from "@/config/sync";

/**
 * - `checking`: the server has not answered yet;
 * - `signed-in` / `signed-out`: the server answered;
 * - `unreachable`: the request failed (no network).
 */
export type SessionStatus =
	| "checking"
	| "signed-in"
	| "signed-out"
	| "unreachable";

/**
 * Asks the server about the session, only while `enabled` is true.
 * `manageUsers` tells whether the signed-in user is an admin and the server
 * manages the allowed addresses (for the interface only: the server checks
 * again for anything admin).
 * `recheck` asks again, for example after a sign-out.
 */
export function useSessionStatus(enabled: boolean) {
	const [status, setStatus] = useState<SessionStatus>("checking");
	const [manageUsers, setManageUsers] = useState(false);
	const mounted = useRef(true);

	const recheck = useCallback(() => {
		setStatus("checking");
		fetch("/api/auth/session", {
			cache: "no-store",
			signal: AbortSignal.timeout(sessionCheckTimeoutMs),
		})
			.then((response) => {
				if (!response.ok) throw new Error("session check failed");
				return response.json();
			})
			.then(
				(body: {
					signedIn: boolean;
					admin?: boolean;
					usersEnabled?: boolean;
				}) => {
					if (!mounted.current) return;
					setManageUsers(
						body.signedIn && body.admin === true && body.usersEnabled === true,
					);
					setStatus(body.signedIn ? "signed-in" : "signed-out");
				},
			)
			.catch(() => {
				if (mounted.current) setStatus("unreachable");
			});
	}, []);

	useEffect(() => {
		mounted.current = true;
		if (enabled) recheck();
		return () => {
			mounted.current = false;
		};
	}, [enabled, recheck]);

	return { status, manageUsers, recheck };
}
