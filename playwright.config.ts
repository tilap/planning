import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	reporter: "list",
	use: {
		...devices["Desktop Chrome"],
		viewport: { width: 390, height: 844 },
		baseURL: `http://localhost:${port}`,
		trace: "retain-on-failure",
	},
	webServer: {
		command: `pnpm exec next start -p ${port}`,
		url: `http://localhost:${port}`,
		reuseExistingServer: true,
		env: {
			GOOGLE_CLIENT_ID: "client-id",
			GOOGLE_CLIENT_SECRET: "client-secret",
			COOKIE_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
			ALLOWED_EMAILS: "me@example.com",
			DATABASE_URL: "postgres://user:password@db.example/planning",
			APP_URL: `http://localhost:${port}`,
		},
	},
});
