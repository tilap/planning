import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
	},
	test: {
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		env: {
			GOOGLE_CLIENT_ID: "client-id",
			GOOGLE_CLIENT_SECRET: "client-secret",
			COOKIE_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
			ALLOWED_EMAILS: "me@example.com",
			DATABASE_URL: "postgres://user:password@db.example/planning",
			APP_URL: "https://app.example",
		},
	},
});
