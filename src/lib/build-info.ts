/** Characters kept when showing the deploy identity in Settings. */
export const SHORT_GIT_SHA_LENGTH = 7;

/** Short prefix of a git SHA (GitHub / Vercel style), for display. */
export function shortGitSha(
	sha: string,
	length = SHORT_GIT_SHA_LENGTH,
): string {
	return sha.slice(0, length);
}
