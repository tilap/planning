import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { env } from "@/env";
import "./globals.css";

const display = Fraunces({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-display-family",
});

const body = Source_Sans_3({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-body-family",
});

export const metadata: Metadata = {
	title: "Planning",
	description: "A read-only list of my Google calendars, readable offline.",
	icons: {
		icon: [
			{ url: "/icons/app-icon.svg", type: "image/svg+xml" },
			{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
		],
		apple: "/icons/apple-touch-icon.png",
	},
	appleWebApp: { capable: true, title: "Planning" },
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={`${display.variable} ${body.variable}`}>
			<body className="min-h-dvh scroll-pb-32 font-sans text-fg antialiased">
				{children}
				<ServiceWorkerRegistration enabled={env.NODE_ENV === "production"} />
			</body>
		</html>
	);
}
