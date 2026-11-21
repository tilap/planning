"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SidePanel } from "@/components/side-panel/side-panel";
import { SoundEffects } from "@/components/sound/sound-effects";
import { foregroundResyncMinutes } from "@/config/sync";
import { clearSyncedData, loadMemory, type Memory } from "@/lib/cache/memory";
import type { Preferences } from "@/lib/cache/preferences";
import {
	buildDayGroups,
	type DayEntry,
	daysBetween,
	formatDayHeader,
	formatDayOffset,
	formatSyncTime,
	localDate,
} from "@/lib/events/display";
import { matchesQuery } from "@/lib/events/search";
import { syncRangeOf } from "@/lib/sync/range";
import { scrollToAdjacentDay } from "../_includes/scroll-to-day";
import { scrollToToday } from "../_includes/scroll-to-today";
import { useColorScheme } from "../_includes/use-color-scheme";
import { useDeviceTimeZone } from "../_includes/use-device-time-zone";
import { useDisplaySettings } from "../_includes/use-display-settings";
import { useKeyboardShortcuts } from "../_includes/use-keyboard-shortcuts";
import { useOnline } from "../_includes/use-online";
import { usePreferences } from "../_includes/use-preferences";
import { useSessionStatus } from "../_includes/use-session-status";
import { useSync } from "../_includes/use-sync";
import { useTodayButtonVisible } from "../_includes/use-today-button";
import { ActionBar } from "./action-bar";
import { EventDetails } from "./event-details";
import { EventRow } from "./event-row";
import { LoginScreen } from "./login-screen";
import { SearchBar } from "./search-bar";
import { SearchButton } from "./search-button";
import { SettingsButton } from "./settings-button";
import { SettingsContent } from "./settings-content";
import { Splash } from "./splash";
import { SyncButton } from "./sync-button";
import { SyncErrorScreen } from "./sync-error-screen";
import { SyncFailureNotice } from "./sync-failure-notice";
import { SyncOverlay } from "./sync-overlay";

type EventListScreenProps = {
	buildSha: string;
};

export function EventListScreen({ buildSha }: EventListScreenProps) {
	const [memory, setMemory] = useState<Memory | null>(null);
	const timeZone = useDeviceTimeZone();
	const { preferences, update: updatePreferences } = usePreferences();
	const { language, hour12, dateFormat, mapApp, leftHanded, sound, messages } =
		useDisplaySettings(preferences);
	const [splashCovering, setSplashCovering] = useState(true);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [searching, setSearching] = useState(false);
	const [query, setQuery] = useState("");
	const [forbidden, setForbidden] = useState(false);
	const [selected, setSelected] = useState<DayEntry | null>(null);
	const scrolled = useRef(false);
	const launchSynced = useRef(false);
	const syncRange = useMemo(() => syncRangeOf(preferences), [preferences]);
	const {
		syncing,
		failure,
		sync,
		syncRange: syncOver,
		clearFailure,
	} = useSync(setMemory, syncRange);
	const online = useOnline();
	const onlineRef = useRef(online);
	onlineRef.current = online;
	const lastSyncRef = useRef<string | null>(null);
	lastSyncRef.current = memory?.lastSync ?? null;
	const syncRef = useRef(sync);
	syncRef.current = sync;

	// A new range is applied at once when online; offline the next sync applies it.
	const changePreferences = (patch: Partial<Preferences>) => {
		updatePreferences(patch);
		if (!("syncPast" in patch || "syncAhead" in patch)) return;
		if (onlineRef.current) {
			void syncOver(syncRangeOf({ ...preferences, ...patch }));
		}
	};

	useEffect(() => {
		loadMemory().then(setMemory);
		setForbidden(
			new URLSearchParams(window.location.search).get("error") === "forbidden",
		);
	}, []);

	// The launch sync waits for the preferences: they hold the range to sync.
	useEffect(() => {
		if (!memory || !preferences || launchSynced.current) return;
		launchSynced.current = true;
		if (onlineRef.current) sync();
	}, [memory, preferences, sync]);

	// Back to the foreground: sync again if the last sync is old enough.
	useEffect(() => {
		const onVisible = () => {
			if (document.visibilityState !== "visible" || !onlineRef.current) return;
			const last = lastSyncRef.current;
			const stale =
				last === null ||
				Date.now() - new Date(last).getTime() >
					foregroundResyncMinutes * 60_000;
			if (stale) syncRef.current();
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, []);

	const neverSynced =
		memory !== null && memory.lastSync === null && memory.events.length === 0;
	const {
		status: sessionStatus,
		manageUsers,
		recheck: recheckSession,
	} = useSessionStatus(neverSynced || settingsOpen);

	const signOut = useCallback(async () => {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
		} catch {
			// The local sign-out goes on even when the server cannot be reached.
		}
		await clearSyncedData();
		setMemory({ events: [], calendars: [], lastSync: null });
		clearFailure();
		recheckSession();
		setSettingsOpen(false);
	}, [clearFailure, recheckSession]);

	const groups = useMemo(() => {
		if (!memory || !preferences) return [];
		const hidden = new Set(preferences.hiddenCalendarIds);
		const names = new Map(memory.calendars.map((c) => [c.id, c.name]));
		const visible = memory.events.filter(
			(event) =>
				!hidden.has(event.calendarId) &&
				matchesQuery(event, names.get(event.calendarId), query),
		);
		return buildDayGroups(visible, { timeZone });
	}, [memory, preferences, timeZone, query]);
	const calendars = useMemo(
		() => new Map(memory?.calendars.map((calendar) => [calendar.id, calendar])),
		[memory],
	);

	useEffect(() => {
		if (!memory || scrolled.current || groups.length === 0) return;
		scrolled.current = true;
		scrollToToday(groups, localDate(new Date(), timeZone));
	}, [memory, groups, timeZone]);

	const today = localDate(new Date(), timeZone);
	const showLogin =
		neverSynced &&
		(sessionStatus === "signed-out" || sessionStatus === "unreachable");
	const waitingForSession = neverSynced && sessionStatus === "checking";
	// The first sync failed and there is nothing to show: explain it and offer a way out.
	const showSyncError =
		neverSynced && !showLogin && !syncing && failure !== null;
	const loadingFirstSync = neverSynced && !showLogin && syncing;
	const booting = memory === null || waitingForSession;
	useColorScheme(preferences?.colorScheme, preferences?.palette);
	const showToday = useTodayButtonVisible(
		today,
		!booting && !showLogin && !showSyncError && !loadingFirstSync,
	);
	const shortcutsEnabled = !booting && !showLogin && !showSyncError;
	// A panel is modal: only its own toggle works while one is open.
	const togglePanel = () => setSettingsOpen((open) => !open);
	useKeyboardShortcuts(
		settingsOpen
			? { p: togglePanel }
			: selected !== null
				? {}
				: {
						p: togglePanel,
						s: () => setSearching(true),
						r: () => {
							if (online) sync();
						},
						n: () => scrollToAdjacentDay(groups, 1),
						b: () => scrollToAdjacentDay(groups, -1),
						t: () => scrollToToday(groups, today),
					},
		shortcutsEnabled,
	);
	const lastSyncLabel = memory?.lastSync
		? messages.lastSync(
				formatSyncTime(memory.lastSync, new Date(), {
					timeZone,
					hour12,
					locale: language,
				}),
			)
		: null;

	const loading = booting || loadingFirstSync;
	const screen = (() => {
		if (loading) {
			return (
				<main
					className="mx-auto min-h-dvh w-full max-w-lg md:max-w-2xl"
					{...(memory ? { "data-memory-ready": "" } : {})}
				/>
			);
		}

		if (showSyncError && failure) {
			return (
				<main
					className="mx-auto min-h-dvh w-full max-w-lg md:max-w-2xl"
					data-memory-ready=""
				>
					<SyncErrorScreen
						messages={messages}
						cause={failure}
						onRetry={sync}
						onSignOut={signOut}
					/>
				</main>
			);
		}

		return (
			<main
				className="mx-auto min-h-dvh w-full max-w-lg md:max-w-2xl"
				{...(memory ? { "data-memory-ready": "" } : {})}
			>
				{showLogin ? (
					<LoginScreen
						messages={messages}
						reachable={sessionStatus !== "unreachable"}
						forbidden={forbidden}
					/>
				) : null}
				{memory && groups.length === 0 && !showLogin ? (
					<div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center px-6 text-center">
						{query ? (
							<Image
								src="/illustrations/ghost-search.svg"
								alt=""
								width={240}
								height={215}
								className="mb-6 h-auto w-48 animate-float motion-reduce:animate-none"
							/>
						) : null}
						<p className="font-display text-3xl font-medium leading-tight tracking-tight">
							{query ? messages.noResults : messages.emptyMemory}
						</p>
					</div>
				) : null}
				{!syncing && failure && !showLogin && !showSyncError ? (
					<SyncFailureNotice messages={messages} cause={failure} />
				) : null}
				<div className="space-y-2 pt-2">
					{lastSyncLabel && !showLogin ? (
						<p className="px-4 pt-3 text-center text-sm text-fg-muted">
							{lastSyncLabel}
						</p>
					) : null}
					{groups.map((group) => {
						const isToday = group.date === today;
						const isPast = group.date < today;
						const offset = formatDayOffset(daysBetween(today, group.date), {
							day: messages.dayUnit,
							week: messages.weekUnit,
						});
						return (
							<section key={group.date} id={`day-${group.date}`}>
								<div className="sticky top-0 z-10 flex items-baseline justify-between gap-3 mb-1 rounded-tag bg-canvas px-4 py-3">
									<h2
										className={`font-display text-lg font-medium tracking-tight ${isToday ? "text-accent" : "text-fg"}`}
									>
										{formatDayHeader(group.date, language, dateFormat)}
									</h2>
									{isToday ? (
										<span className="rounded-pill bg-accent-soft px-2.5 py-1 text-sm font-medium text-accent">
											{messages.today}
										</span>
									) : offset ? (
										<span className="text-sm text-fg-muted/70">{offset}</span>
									) : null}
								</div>
								<ul
									className={`mx-3 overflow-hidden rounded-card border border-line bg-surface shadow-raised ${isPast ? "border-dashed" : ""}`}
								>
									{group.entries.map((entry) => (
										<EventRow
											key={`${entry.event.id}-${group.date}`}
											past={isPast}
											selected={
												selected?.event.id === entry.event.id &&
												selected.dayIndex === entry.dayIndex
											}
											entry={entry}
											calendar={calendars.get(entry.event.calendarId)}
											timeZone={timeZone}
											hour12={hour12}
											locale={language}
											messages={messages}
											onSelect={setSelected}
										/>
									))}
								</ul>
							</section>
						);
					})}
				</div>
				<div aria-hidden className="h-28 md:h-20" />
				{showLogin ? null : (
					<ActionBar
						todayLabel={messages.today}
						showToday={showToday}
						swapped={leftHanded}
						onToday={() => scrollToToday(groups, today)}
						left={
							<SettingsButton
								label={messages.settings}
								onOpen={() => setSettingsOpen(true)}
							/>
						}
						right={
							<>
								<SearchButton
									label={messages.search}
									onOpen={() => setSearching(true)}
								/>
								<SyncButton
									label={messages.sync}
									syncing={syncing}
									disabled={!online}
									onSync={sync}
								/>
							</>
						}
						searching={searching}
						search={
							<SearchBar
								open={searching}
								label={messages.search}
								closeLabel={messages.closeSearch}
								query={query}
								onQueryChange={(text) => {
									setQuery(text);
									window.scrollTo({ top: 0 });
								}}
								onClose={() => {
									setSearching(false);
									setQuery("");
								}}
							/>
						}
					/>
				)}
				<SidePanel
					open={settingsOpen}
					onClose={() => setSettingsOpen(false)}
					closeLabel={messages.close}
					title={messages.settings}
					// The settings open from the side of their button: left, or right when the buttons swap.
					side={leftHanded ? "right" : "left"}
					closeSide={leftHanded ? "left" : "right"}
				>
					{preferences ? (
						<SettingsContent
							messages={messages}
							calendars={memory?.calendars ?? []}
							preferences={preferences}
							language={language}
							hour12={hour12}
							dateFormat={dateFormat}
							mapApp={mapApp}
							buildSha={buildSha}
							manageUsers={manageUsers}
							onChange={changePreferences}
							onSignOut={signOut}
						/>
					) : null}
				</SidePanel>
				{syncing ? <SyncOverlay label={messages.syncing} /> : null}
				<SidePanel
					open={selected !== null}
					onClose={() => setSelected(null)}
					closeLabel={messages.close}
					title={selected?.event.title ?? ""}
					side="right"
					closeSide={leftHanded ? "left" : "right"}
				>
					{selected ? (
						<EventDetails
							entry={selected}
							calendar={calendars.get(selected.event.calendarId)}
							timeZone={timeZone}
							hour12={hour12}
							locale={language}
							mapApp={mapApp}
							messages={messages}
						/>
					) : null}
				</SidePanel>
			</main>
		);
	})();

	return (
		<>
			<SoundEffects enabled={sound} />
			{/* Hidden under the splash, then a quick fade-in once it is gone. */}
			<div className={splashCovering ? "opacity-0" : "animate-fade-in"}>
				{screen}
			</div>
			<Splash
				appName={messages.appName}
				label={loadingFirstSync ? messages.loadingCalendars : messages.loading}
				visible={loading}
				onCoveringChange={setSplashCovering}
			/>
		</>
	);
}
