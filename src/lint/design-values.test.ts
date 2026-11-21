import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Lints a source in a temporary folder inside the repository, so the Biome configuration applies. */
function lintSource(source: string): { status: number | null; output: string } {
	const dir = mkdtempSync(join(process.cwd(), "src/lint/tmp-"));
	try {
		const file = join(dir, "sample.tsx");
		writeFileSync(file, source);
		const result = spawnSync("node_modules/.bin/biome", ["lint", file], {
			encoding: "utf8",
		});
		return {
			status: result.status,
			output: `${result.stdout}${result.stderr}`,
		};
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

describe("design values lint", () => {
	it("rejects a hexadecimal color in a string", () => {
		const result = lintSource('export const c = "bg-[#abc]";\n');
		expect(result.status).not.toBe(0);
		expect(result.output).toContain("Hard-coded design value");
	});

	it("rejects an arbitrary-value class in a string", () => {
		const result = lintSource('export const c = "text-[13px]";\n');
		expect(result.status).not.toBe(0);
		expect(result.output).toContain("Hard-coded design value");
	});

	it("accepts a token class", () => {
		expect(lintSource('export const c = "bg-canvas";\n').status).toBe(0);
	});
});
