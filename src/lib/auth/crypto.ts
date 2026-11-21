import {
	createCipheriv,
	createDecipheriv,
	hkdfSync,
	randomBytes,
} from "node:crypto";
import { env } from "@/env";

const VERSION = "v1";

function key(): Buffer {
	return Buffer.from(
		hkdfSync(
			"sha256",
			env.COOKIE_ENCRYPTION_KEY,
			"planning",
			"session-cookie",
			32,
		),
	);
}

/** Encrypts a text with AES-256-GCM. Format: `v1:iv:tag:data`, all base64url. */
export function encrypt(plain: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key(), iv);
	const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return [VERSION, iv, tag, data]
		.map((part) =>
			typeof part === "string" ? part : part.toString("base64url"),
		)
		.join(":");
}

/** Decrypts a value made by `encrypt`. Returns null when it is unreadable or altered. */
export function decrypt(value: string): string | null {
	try {
		const [version, iv, tag, data] = value.split(":");
		if (version !== VERSION || !iv || !tag || !data) return null;
		const decipher = createDecipheriv(
			"aes-256-gcm",
			key(),
			Buffer.from(iv, "base64url"),
		);
		decipher.setAuthTag(Buffer.from(tag, "base64url"));
		return Buffer.concat([
			decipher.update(Buffer.from(data, "base64url")),
			decipher.final(),
		]).toString("utf8");
	} catch {
		return null;
	}
}
