import { useCallback, useEffect, useState } from "react";

export type AdminUser = { email: string; addedBy: string; addedAt: string };

type Snapshot = { admins: string[]; users: AdminUser[] };

/** What went wrong, for the interface to word. */
export type UsersError = "invalid_email" | "already_admin" | "failed";

/**
 * The admins (from the environment) and the users added by the admins, with
 * `add` and `remove`. Each answers with the error, or null when it worked.
 */
export function useAdminUsers() {
	const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);

	useEffect(() => {
		let active = true;
		fetch("/api/admin/users", { cache: "no-store" })
			.then((response) => {
				if (!response.ok) throw new Error("users failed");
				return response.json() as Promise<Snapshot>;
			})
			.then((body) => {
				if (active) setSnapshot(body);
			})
			.catch(() => {
				if (active) setLoadFailed(true);
			});
		return () => {
			active = false;
		};
	}, []);

	const change = useCallback(
		async (method: "POST" | "DELETE", email: string) => {
			try {
				const response = await fetch("/api/admin/users", {
					method,
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ email }),
				});
				if (response.ok) {
					setSnapshot((await response.json()) as Snapshot);
					return null;
				}
				const { code } = (await response.json().catch(() => ({}))) as {
					code?: string;
				};
				return code === "invalid_email" || code === "already_admin"
					? code
					: "failed";
			} catch {
				return "failed";
			}
		},
		[],
	);

	return {
		snapshot,
		loadFailed,
		add: (email: string): Promise<UsersError | null> => change("POST", email),
		remove: (email: string): Promise<UsersError | null> =>
			change("DELETE", email),
	};
}
