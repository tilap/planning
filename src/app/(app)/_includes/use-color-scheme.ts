import { useEffect } from "react";
import type { ColorScheme, Palette } from "@/lib/cache/preferences";

/** Copies the page color into the theme-color meta, which tints the phone's status bar and browser bars. */
function syncThemeColor(): void {
	const color = getComputedStyle(document.documentElement)
		.getPropertyValue("--color-page")
		.trim();
	if (!color) return;
	let meta = document.querySelector<HTMLMetaElement>(
		'meta[name="theme-color"]',
	);
	if (!meta) {
		meta = document.createElement("meta");
		meta.name = "theme-color";
		document.head.append(meta);
	}
	meta.content = color;
}

/**
 * Applies the stored appearance and palette. Missing or "system" appearance
 * follows the device; missing or "paper" palette keeps the warm paper tokens.
 */
export function useColorScheme(
	colorScheme: ColorScheme | undefined,
	palette: Palette | undefined,
): void {
	useEffect(() => {
		const root = document.documentElement;
		if (colorScheme === "light" || colorScheme === "dark") {
			root.dataset.theme = colorScheme;
		} else {
			delete root.dataset.theme;
		}
		if (palette && palette !== "paper") {
			root.dataset.palette = palette;
		} else {
			delete root.dataset.palette;
		}
		syncThemeColor();
		// With the system appearance, the colors change with the device.
		const query = window.matchMedia("(prefers-color-scheme: dark)");
		query.addEventListener("change", syncThemeColor);
		return () => query.removeEventListener("change", syncThemeColor);
	}, [colorScheme, palette]);
}
