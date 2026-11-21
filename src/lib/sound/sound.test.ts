import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Counts the notes started, in place of a real audio context. */
let started = 0;
let created = 0;

class FakeParam {
	setValueAtTime() {}
	linearRampToValueAtTime() {}
	exponentialRampToValueAtTime() {}
}
class FakeNode {
	frequency = new FakeParam();
	gain = new FakeParam();
	connect(node: unknown) {
		return node;
	}
	start() {
		started += 1;
	}
	stop() {}
}
class FakeAudioContext {
	state = "running";
	currentTime = 0;
	destination = new FakeNode();
	constructor() {
		created += 1;
	}
	resume() {
		return Promise.resolve();
	}
	createOscillator() {
		return new FakeNode();
	}
	createGain() {
		return new FakeNode();
	}
}

async function loadSound() {
	vi.resetModules();
	return import("./sound");
}

beforeEach(() => {
	started = 0;
	created = 0;
	vi.useFakeTimers();
	vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("play", () => {
	it("plays nothing, and creates no audio context, while the sounds are off", async () => {
		const { play } = await loadSound();
		play("tap");
		expect(created).toBe(0);
		expect(started).toBe(0);
	});

	it("plays every note of a sound once the sounds are on", async () => {
		const { play, setSoundEnabled } = await loadSound();
		setSoundEnabled(true);
		play("toggleOn");
		expect(created).toBe(1);
		expect(started).toBe(2);
	});

	it("does not replay the same sound within the minimum gap", async () => {
		const { play, setSoundEnabled } = await loadSound();
		setSoundEnabled(true);
		play("tap");
		play("tap");
		expect(started).toBe(1);
		vi.advanceTimersByTime(40);
		play("tap");
		expect(started).toBe(2);
		expect(created).toBe(1);
	});

	it("is a no-op where the audio API does not exist", async () => {
		vi.unstubAllGlobals();
		const { play, setSoundEnabled } = await loadSound();
		setSoundEnabled(true);
		expect(() => play("tap")).not.toThrow();
	});
});
