import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");

/** @type {Array<[string, number, string]>} */
const targets = [
	["app-icon.svg", 180, "apple-touch-icon.png"],
	["app-icon.svg", 32, "favicon-32.png"],
	["app-icon.svg", 192, "icon-192.png"],
	["app-icon.svg", 512, "icon-512.png"],
	["app-icon.svg", 512, "icon-512-maskable.png"],
];

for (const [svgName, size, outName] of targets) {
	const svg = readFileSync(join(iconsDir, svgName));
	await sharp(svg).resize(size, size).png().toFile(join(iconsDir, outName));
	console.log(`wrote public/icons/${outName} (${size}×${size})`);
}
