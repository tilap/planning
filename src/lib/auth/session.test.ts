import { describe, expect, it } from "vitest";
import { encrypt } from "./crypto";
import { createSessionValue, readRefreshToken, readSession } from "./session";

const request = (value: string) =>
	new Request("https://app.example/", {
		headers: { cookie: `session=${encodeURIComponent(value)}` },
	});

describe("session cookie", () => {
	it("round-trips the refresh token and the address", () => {
		const req = request(createSessionValue("refresh-1", "me@example.com"));
		expect(readSession(req)).toEqual({
			refreshToken: "refresh-1",
			email: "me@example.com",
		});
		expect(readRefreshToken(req)).toBe("refresh-1");
	});

	it("is null for a valid cookie that holds no session", () => {
		expect(readSession(request(encrypt("a-bare-token")))).toBeNull();
		expect(
			readSession(request(encrypt(JSON.stringify({ refreshToken: "r" })))),
		).toBeNull();
	});

	it("is null without a cookie or with a forged one", () => {
		expect(readSession(new Request("https://app.example/"))).toBeNull();
		expect(readSession(request("v1:AAAA:BBBB:CCCC"))).toBeNull();
	});
});
