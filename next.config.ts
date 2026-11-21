import type { NextConfig } from "next";
// Validates the environment as soon as Next.js loads its config: a Vercel build
// or a server start with a missing or invalid variable fails right away.
import "./src/env";

const nextConfig: NextConfig = {
	allowedDevOrigins: ["192.168.1.199"],
};

export default nextConfig;
