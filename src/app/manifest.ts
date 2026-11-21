import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Planning",
		short_name: "Planning",
		description: "A read-only list of my Google calendars, readable offline.",
		start_url: "/",
		display: "standalone",
		// biome-ignore lint/plugin: the manifest requires literal colors; they mirror the canvas and accent tokens
		background_color: "#f4efe6",
		// biome-ignore lint/plugin: the manifest requires literal colors; they mirror the canvas and accent tokens
		theme_color: "#f4efe6",
		icons: [
			{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
			{
				src: "/icons/icon-512-maskable.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
