const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

function decodeEntities(text: string): string {
	return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, name: string) => {
		if (name[0] === "#") {
			const code =
				name[1] === "x" || name[1] === "X"
					? Number.parseInt(name.slice(2), 16)
					: Number.parseInt(name.slice(1), 10);
			return Number.isFinite(code) && code > 0 && code <= 0x10ffff
				? String.fromCodePoint(code)
				: match;
		}
		return ENTITIES[name.toLowerCase()] ?? match;
	});
}

/** A link: its text is kept, and its address too when the text is not the address. */
const ANCHOR =
	/<a\s[^>]*?href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a\s*>/gi;

/** The block Google adds to an invitation (between two `-::~` lines): the Meet link, already offered as a button. */
const GOOGLE_INVITE_BLOCK = /-::~[:~]*::-[\s\S]*?-::~[:~]*::-/g;

/**
 * The text of an event description. Google descriptions may hold HTML
 * (`<br>`, `<b>`, `<a href>`…): lines breaks are kept, tags are dropped and
 * entities decoded. Nothing of it is ever rendered as HTML.
 */
export function descriptionText(description: string): string {
	return decodeEntities(
		description
			.replace(ANCHOR, (_match, href: string, inner: string) => {
				const label = inner.replace(/<[^>]*>/g, "").trim();
				return /^https?:\/\//i.test(href) && label !== href
					? `${label} (${href})`.trim()
					: label;
			})
			.replace(/<\s*br\s*\/?>/gi, "\n")
			.replace(/<\s*li[^>]*>/gi, "- ")
			.replace(/<\s*\/\s*(p|div|li|ul|ol|h[1-6]|tr)\s*>/gi, "\n")
			.replace(/<[^>]*>/g, ""),
	)
		.replace(GOOGLE_INVITE_BLOCK, "")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
