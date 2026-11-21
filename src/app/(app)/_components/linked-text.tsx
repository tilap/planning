import { pressable } from "@/components/pressable";
import { linkify } from "@/utils/linkify";

const LINK = `${pressable} text-accent underline underline-offset-2`;

/** A text whose web addresses, email addresses and phone numbers are links. */
export function LinkedText({ text }: { text: string }) {
	let offset = 0;
	return linkify(text).map((part) => {
		const key = offset;
		offset += part.text.length;
		if (part.kind === "text") return part.text;
		return (
			<a
				key={key}
				href={part.href}
				{...(part.kind === "url"
					? { target: "_blank", rel: "noopener noreferrer" }
					: {})}
				className={`${LINK} ${part.kind === "phone" ? "whitespace-nowrap" : "break-all"}`}
			>
				{part.text}
			</a>
		);
	});
}
