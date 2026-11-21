/** The feedback sounds of the interface. */
export type SoundName =
	| "tap"
	| "toggleOn"
	| "toggleOff"
	| "select"
	| "open"
	| "close";

/** One synthesized note: a sweep from one pitch to another, fading out. */
type Tone = {
	from: number;
	to: number;
	seconds: number;
	/** Seconds after the start of the sound. */
	delay?: number;
};

// Every sound is generated with the Web Audio API: no file to download or to cache offline.
const SOUNDS: Record<SoundName, Tone[]> = {
	tap: [{ from: 880, to: 660, seconds: 0.04 }],
	toggleOn: [
		{ from: 520, to: 520, seconds: 0.05 },
		{ from: 780, to: 780, seconds: 0.07, delay: 0.05 },
	],
	toggleOff: [
		{ from: 780, to: 780, seconds: 0.05 },
		{ from: 520, to: 520, seconds: 0.07, delay: 0.05 },
	],
	select: [{ from: 660, to: 660, seconds: 0.05 }],
	open: [{ from: 300, to: 600, seconds: 0.14 }],
	close: [{ from: 600, to: 300, seconds: 0.12 }],
};

/** Peak gain of a note: the sounds stay discreet. */
const VOLUME = 0.12;
/** Time to reach the peak, so a note starts without a click. */
const ATTACK_SECONDS = 0.005;
const SILENCE = 0.0001;
/** The same sound is not replayed within this delay (a double event, a held key). */
const MIN_GAP_MS = 30;

let enabled = false;
let context: AudioContext | null = null;
const lastPlayed = new Map<SoundName, number>();

/** Turns every sound on or off. Off, nothing plays and no audio context is created. */
export function setSoundEnabled(value: boolean) {
	enabled = value;
}

/**
 * Plays a sound. It has to run from a user gesture the first time: the browser
 * only lets the audio context start then.
 */
export function play(name: SoundName) {
	if (!enabled || typeof AudioContext === "undefined") return;
	const now = performance.now();
	if (now - (lastPlayed.get(name) ?? Number.NEGATIVE_INFINITY) < MIN_GAP_MS) {
		return;
	}
	lastPlayed.set(name, now);

	context ??= new AudioContext();
	if (context.state === "suspended") void context.resume();
	for (const tone of SOUNDS[name]) {
		const start = context.currentTime + (tone.delay ?? 0);
		const end = start + tone.seconds;
		const oscillator = context.createOscillator();
		oscillator.frequency.setValueAtTime(tone.from, start);
		oscillator.frequency.exponentialRampToValueAtTime(tone.to, end);
		const gain = context.createGain();
		gain.gain.setValueAtTime(SILENCE, start);
		gain.gain.linearRampToValueAtTime(VOLUME, start + ATTACK_SECONDS);
		gain.gain.exponentialRampToValueAtTime(SILENCE, end);
		oscillator.connect(gain).connect(context.destination);
		oscillator.start(start);
		oscillator.stop(end);
	}
}
