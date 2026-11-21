import { useState } from "react";
import { pressable } from "@/components/pressable";
import { Sheet } from "@/components/sheet/sheet";
import {
	AHEAD_WINDOWS,
	isAheadWindow,
	isPastWindow,
	PAST_WINDOWS,
} from "@/config/sync";
import type {
	ColorScheme,
	DateFormat,
	Palette,
	Preferences,
} from "@/lib/cache/preferences";
import type { StoredCalendar } from "@/lib/events/types";
import { LANGUAGES, type Language, type Messages } from "@/lib/i18n/messages";
import { syncRangeOf } from "@/lib/sync/range";
import type { MapApp } from "@/utils/maps-url";
import { UsersSheetContent } from "./users-sheet-content";

type SettingsContentProps = {
	messages: Messages;
	calendars: StoredCalendar[];
	preferences: Preferences;
	language: Language;
	hour12: boolean;
	dateFormat: DateFormat;
	mapApp: MapApp;
	buildSha: string;
	/** An admin, with the allowed addresses managed in the app: the administrator section shows. */
	manageUsers: boolean;
	onChange: (patch: Partial<Preferences>) => void;
	onSignOut: () => void;
};

type SelectOption = { value: string; label: string };

/** A native select drawn as a settings row: label, current value, chevron. */
function SettingSelect({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: SelectOption[];
	onChange: (value: string) => void;
}) {
	const current = options.find((option) => option.value === value)?.label ?? "";
	return (
		<li className="border-b border-line last:border-b-0 focus-within:bg-accent-soft">
			<label className="relative flex min-h-touch items-center gap-3 px-3">
				<span className="min-w-0 flex-1">{label}</span>
				<span aria-hidden className="shrink-0 text-fg-muted">
					{current}
				</span>
				<svg
					aria-hidden
					viewBox="0 0 24 24"
					className="size-4 shrink-0 text-fg-muted"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.75"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
				<select
					className={`${pressable} absolute inset-0 opacity-0 text-field`}
					value={value}
					onChange={(event) => onChange(event.target.value)}
				>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</label>
		</li>
	);
}

/** A settings row that opens something else: its label and a chevron to the right. */
function SettingLink({ label, onOpen }: { label: string; onOpen: () => void }) {
	return (
		<li className="border-b border-line last:border-b-0">
			<button
				type="button"
				onClick={onOpen}
				className={`${pressable} flex min-h-touch w-full items-center gap-3 px-3 text-left active:bg-accent-soft`}
			>
				<span className="min-w-0 flex-1">{label}</span>
				<svg
					aria-hidden
					viewBox="0 0 24 24"
					className="size-4 shrink-0 text-fg-muted"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.75"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="m9 6 6 6-6 6" />
				</svg>
			</button>
		</li>
	);
}

/** A settings row with an on/off switch. */
function SettingSwitch({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<li className="border-b border-line last:border-b-0">
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={() => onChange(!checked)}
				className={`${pressable} flex min-h-touch w-full items-center gap-3 px-3 text-left active:bg-accent-soft`}
			>
				<span className="flex-1">{label}</span>
				<span
					aria-hidden
					className={`flex h-6 w-10 shrink-0 items-center rounded-pill px-0.5 ${checked ? "justify-end bg-accent" : "justify-start bg-track"}`}
				>
					<span className="size-5 rounded-pill bg-surface shadow-raised" />
				</span>
			</button>
		</li>
	);
}

export function SettingsContent({
	messages,
	calendars,
	preferences,
	language,
	hour12,
	dateFormat,
	mapApp,
	buildSha,
	manageUsers,
	onChange,
	onSignOut,
}: SettingsContentProps) {
	const [sheet, setSheet] = useState<"users" | null>(null);
	const hidden = new Set(preferences.hiddenCalendarIds);
	const syncRange = syncRangeOf(preferences);

	const toggle = (id: string) => {
		const next = new Set(hidden);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		onChange({ hiddenCalendarIds: [...next] });
	};

	return (
		<div className="flex min-h-full flex-col gap-8 p-5">
			<section>
				<h3 className="mb-2 font-display text-lg font-medium">
					{messages.calendarsHeading}
				</h3>
				<ul className="overflow-hidden rounded-card border border-line bg-canvas">
					{calendars.map((calendar) => {
						const visible = !hidden.has(calendar.id);
						return (
							<li
								key={calendar.id}
								className="border-b border-line last:border-b-0"
							>
								<button
									type="button"
									role="switch"
									aria-checked={visible}
									onClick={() => toggle(calendar.id)}
									className={`${pressable} flex min-h-touch w-full items-center gap-3 px-3 text-left active:bg-accent-soft`}
								>
									<span
										aria-hidden
										className="size-3 shrink-0 rounded-pill bg-fg-muted"
										style={{ backgroundColor: calendar.color }}
									/>
									<span className="flex-1 truncate">{calendar.name}</span>
									<span
										aria-hidden
										className={`flex h-6 w-10 shrink-0 items-center rounded-pill px-0.5 ${visible ? "justify-end bg-accent" : "justify-start bg-track"}`}
									>
										<span className="size-5 rounded-pill bg-surface shadow-raised" />
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</section>
			<section>
				<h3 className="mb-2 font-display text-lg font-medium">
					{messages.preferencesHeading}
				</h3>
				<div className="space-y-4">
					<ul className="overflow-hidden rounded-card border border-line bg-canvas">
						<SettingSelect
							label={messages.languageLabel}
							value={language}
							options={LANGUAGES}
							onChange={(value) => onChange({ language: value as Language })}
						/>
						<SettingSelect
							label={messages.hourFormatLabel}
							value={hour12 ? "12" : "24"}
							options={[
								{ value: "12", label: "12 h" },
								{ value: "24", label: "24 h" },
							]}
							onChange={(value) =>
								onChange({ hourFormat: value === "12" ? "12" : "24" })
							}
						/>
						<SettingSelect
							label={messages.dateFormatLabel}
							value={dateFormat}
							options={[
								{ value: "numeric", label: messages.dateFormatNumeric },
								{ value: "short", label: messages.dateFormatShort },
								{ value: "long", label: messages.dateFormatLong },
							]}
							onChange={(value) =>
								onChange({ dateFormat: value as DateFormat })
							}
						/>
					</ul>
					<ul className="overflow-hidden rounded-card border border-line bg-canvas">
						<SettingSelect
							label={messages.paletteLabel}
							value={preferences.palette ?? "paper"}
							options={[
								{ value: "paper", label: messages.palettePaper },
								{ value: "violet", label: "Violet" },
								{ value: "rose", label: "Rose" },
								{ value: "gold", label: messages.paletteGold },
							]}
							onChange={(value) => onChange({ palette: value as Palette })}
						/>
						{/* The other themes are always dark: the appearance only applies to paper. */}
						{(preferences.palette ?? "paper") === "paper" ? (
							<SettingSelect
								label={messages.colorSchemeLabel}
								value={preferences.colorScheme ?? "system"}
								options={[
									{ value: "system", label: messages.colorSchemeSystem },
									{ value: "light", label: messages.colorSchemeLight },
									{ value: "dark", label: messages.colorSchemeDark },
								]}
								onChange={(value) =>
									onChange({ colorScheme: value as ColorScheme })
								}
							/>
						) : null}
					</ul>
					<ul className="overflow-hidden rounded-card border border-line bg-canvas">
						<SettingSelect
							label={messages.mapAppLabel}
							value={mapApp}
							options={[
								{ value: "auto", label: messages.mapAppAuto },
								{ value: "apple", label: "Plans" },
								{ value: "google", label: "Google Maps" },
							]}
							onChange={(value) => onChange({ mapApp: value as MapApp })}
						/>
					</ul>
					<div>
						<h4 className="mb-1 px-1 text-sm text-fg-muted">
							{messages.calendarDataHeading}
						</h4>
						<ul className="overflow-hidden rounded-card border border-line bg-canvas">
							<SettingSelect
								label={messages.syncPastLabel}
								value={syncRange.past}
								options={PAST_WINDOWS.map((value) => ({
									value,
									label: messages.syncPastOptions[value],
								}))}
								onChange={(value) => {
									if (isPastWindow(value)) onChange({ syncPast: value });
								}}
							/>
							<SettingSelect
								label={messages.syncAheadLabel}
								value={syncRange.ahead}
								options={AHEAD_WINDOWS.map((value) => ({
									value,
									label: messages.syncAheadOptions[value],
								}))}
								onChange={(value) => {
									if (isAheadWindow(value)) onChange({ syncAhead: value });
								}}
							/>
						</ul>
					</div>
					<ul className="overflow-hidden rounded-card border border-line bg-canvas">
						<SettingSwitch
							label={messages.leftHandedLabel}
							checked={preferences.leftHanded ?? false}
							onChange={(checked) => onChange({ leftHanded: checked })}
						/>
						<SettingSwitch
							label={messages.soundLabel}
							checked={preferences.sound ?? false}
							onChange={(checked) => onChange({ sound: checked })}
						/>
					</ul>
				</div>
			</section>
			{manageUsers ? (
				<section>
					<h3 className="mb-2 font-display text-lg font-medium">
						{messages.adminHeading}
					</h3>
					<ul className="overflow-hidden rounded-card border border-line bg-canvas">
						<SettingLink
							label={messages.usersLabel}
							onOpen={() => setSheet("users")}
						/>
					</ul>
				</section>
			) : null}
			<Sheet
				open={sheet === "users"}
				onClose={() => setSheet(null)}
				closeLabel={messages.close}
				title={messages.usersLabel}
				closeSide={preferences.leftHanded ? "left" : "right"}
			>
				<UsersSheetContent messages={messages} />
			</Sheet>
			<div className="mt-auto space-y-4">
				<button
					type="button"
					onClick={onSignOut}
					className={`${pressable} min-h-touch w-full rounded-control border border-danger font-medium text-danger active:bg-danger active:text-danger-fg`}
				>
					{messages.signOut}
				</button>
				<p className="text-center text-sm text-fg-muted">
					{messages.buildVersion(buildSha)}
				</p>
			</div>
		</div>
	);
}
