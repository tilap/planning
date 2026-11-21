export type TextPart =
	| { kind: "text"; text: string }
	| { kind: "url" | "email" | "phone"; text: string; href: string };

const LINKABLE =
	/(https?:\/\/[^\s<>"']+)|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|((?:\+\d|\(\d{2,4}\)|\b0\d)[\d ().-]{6,}\d)/g;

function trimUrl(url: string): string {
	let end = url.length;
	while (end > 0) {
		const last = url[end - 1];
		const closesUnopened = last === ")" && !url.slice(0, end - 1).includes("(");
		if (".,;:!?".includes(last) || closesUnopened) end--;
		else break;
	}
	return url.slice(0, end);
}

/** A phone number has 8 to 15 digits. */
function isPhone(text: string): boolean {
	const digits = text.replace(/\D/g, "").length;
	return digits >= 8 && digits <= 15;
}

/**
 * Splits a text into plain parts and the links it holds: web addresses
 * (http and https only), email addresses and phone numbers.
 */
export function linkify(text: string): TextPart[] {
	const parts: TextPart[] = [];
	let cursor = 0;
	const pushText = (end: number) => {
		if (end > cursor) {
			parts.push({ kind: "text", text: text.slice(cursor, end) });
			cursor = end;
		}
	};
	for (const match of text.matchAll(LINKABLE)) {
		const [found, url, email, phone] = match;
		const start = match.index;
		if (url) {
			const trimmed = trimUrl(url);
			pushText(start);
			parts.push({ kind: "url", text: trimmed, href: trimmed });
			cursor = start + trimmed.length;
		} else if (email) {
			pushText(start);
			parts.push({ kind: "email", text: email, href: `mailto:${email}` });
			cursor = start + email.length;
		} else if (phone && isPhone(phone)) {
			const compact = phone.replace(/[^\d+]/g, "");
			pushText(start);
			parts.push({ kind: "phone", text: phone, href: `tel:${compact}` });
			cursor = start + found.length;
		}
	}
	pushText(text.length);
	return parts;
}
