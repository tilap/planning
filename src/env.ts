import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		GOOGLE_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),
		COOKIE_ENCRYPTION_KEY: z.string().min(32),
		/** Comma-separated Google addresses allowed to sign in; stored lower-cased. */
		ALLOWED_EMAILS: z
			.string()
			.transform((value) =>
				value
					.split(",")
					.map((email) => email.trim().toLowerCase())
					.filter(Boolean),
			)
			.pipe(z.array(z.email()).min(1)),
		/**
		 * Neon connection string: the addresses added by the admins are kept
		 * there. Optional: empty or missing gives `null`, and only the
		 * `ALLOWED_EMAILS` admins can then sign in.
		 */
		DATABASE_URL: z
			.url()
			.nullish()
			.transform((value) => value ?? null),
		APP_URL: z.url(),
		/** Full git SHA of this build; set by Vercel as VERCEL_GIT_COMMIT_SHA. */
		GIT_COMMIT_SHA: z.string().min(1).default("dev"),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		/** Development only: "1" serves a fake signed-in session and fake events, with no Google call. */
		DEV_FAKE_DATA: z.string().optional(),
	},
	clientPrefix: "NEXT_PUBLIC_",
	client: {},
	runtimeEnv: {
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		COOKIE_ENCRYPTION_KEY: process.env.COOKIE_ENCRYPTION_KEY,
		ALLOWED_EMAILS: process.env.ALLOWED_EMAILS,
		DATABASE_URL: process.env.DATABASE_URL,
		APP_URL: process.env.APP_URL,
		GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
		NODE_ENV: process.env.NODE_ENV,
		DEV_FAKE_DATA: process.env.DEV_FAKE_DATA,
	},
	emptyStringAsUndefined: true,
	onValidationError: (issues) => {
		throw new Error(
			`Invalid environment variables:\n${issues
				.map((issue) => `- ${issue.path?.join(".")}: ${issue.message}`)
				.join("\n")}`,
		);
	},
});
