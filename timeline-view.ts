import {
	App,
	BasesEntry,
	BasesEntryGroup,
	BasesPropertyId,
	BasesView,
	BasesViewConfig,
	HoverParent,
	HoverPopover,
	NullValue,
	QueryController,
	TFile,
	Value,
} from 'obsidian';
import type ReleaseTimeline from './main';
import {
	AccentAlternationMode,
	buildTimelineRows,
	InlinePropertyStyle,
	ItemLayout,
	parseTimelineDate,
	SortDirection,
	TimelineBuildOptions,
	TimelineInlineProperty,
	TimelineMode,
	TimelineRecord,
	TimelineStyle,
	WeekDisplayFormat,
	WidthMode,
} from './timeline-core';
import { createErrorTable, renderTimelineInto, TimelineGroupInput } from './timeline-renderer';

export const RELEASE_TIMELINE_VIEW_TYPE = 'release-timeline-base-view';

function readBoolean(value: unknown, fallback: boolean): boolean {
	if (typeof value === 'boolean') {
		return value;
	}
	if (typeof value === 'string') {
		const text = value.trim().toLowerCase();
		if (text === 'true') {
			return true;
		}
		if (text === 'false') {
			return false;
		}
	}
	return fallback;
}

function readString(value: unknown, fallback: string): string {
	if (typeof value === 'string') {
		const text = value.trim();
		if (text.length > 0) {
			return text;
		}
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return fallback;
}

function readText(value: unknown, fallback: string): string {
	if (typeof value === 'string' && value.length > 0) {
		return value;
	}
	return fallback;
}

function readNumber(value: unknown, fallback: number): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string') {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return fallback;
}

function normalizeMode(value: string, fallback: TimelineMode): TimelineMode {
	if (value === 'decade' || value === 'year' || value === 'quarter' || value === 'month' || value === 'week') {
		return value;
	}
	return fallback;
}

function normalizeStyle(value: string, fallback: TimelineStyle): TimelineStyle {
	if (value === 'table' || value === 'spine' || value === 'horizontal' || value === 'horizontalStacked') {
		return value;
	}
	return fallback;
}

function normalizeSortDirection(value: string, fallback: SortDirection): SortDirection {
	return value === 'asc' || value === 'desc' ? value : fallback;
}

function normalizeWeekDisplayFormat(value: string, fallback: WeekDisplayFormat): WeekDisplayFormat {
	return value === 'weekNames' || value === 'dateNames' || value === 'monthDayRange' ? value : fallback;
}

function normalizeItemLayout(value: string, fallback: ItemLayout): ItemLayout {
	return value === 'stacked' || value === 'inline' || value === 'cards' ? value : fallback;
}

function normalizeInlinePropertyStyle(value: string, fallback: InlinePropertyStyle): InlinePropertyStyle {
	return value === 'stacked' || value === 'pills' ? value : fallback;
}

function normalizeWidthMode(value: string, fallback: WidthMode): WidthMode {
	return value === 'auto' || value === 'fixed' ? value : fallback;
}

function normalizeAccentAlternationMode(value: string, fallback: AccentAlternationMode): AccentAlternationMode {
	return value === 'none' || value === 'year' || value === 'month' || value === 'both' ? value : fallback;
}

function readAccentAlternationMode(plugin: ReleaseTimeline, viewConfig: BasesViewConfig): AccentAlternationMode {
	const raw = viewConfig.get('accentAlternationMode');
	if (raw !== undefined && raw !== null) {
		return normalizeAccentAlternationMode(readString(raw, plugin.settings.accentAlternationMode), plugin.settings.accentAlternationMode);
	}

	const legacyEnabled = viewConfig.get('alternateAccentColors');
	if (legacyEnabled !== undefined && legacyEnabled !== null) {
		if (!readBoolean(legacyEnabled, true)) {
			return 'none';
		}
		const legacyDir = readString(viewConfig.get('colorAlternationBy'), 'year');
		return legacyDir === 'month' ? 'month' : 'year';
	}

	return plugin.settings.accentAlternationMode;
}

function humanizePropertyLabel(propertyId: string): string {
	const base = propertyId.split('.').pop() ?? propertyId;
	if (base === 'ctime') {
		return 'Created';
	}
	if (base === 'mtime') {
		return 'Modified';
	}
	return base
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function readPropertyDisplayName(viewConfig: BasesViewConfig, propertyId: BasesPropertyId): string {
	try {
		const displayName = viewConfig.getDisplayName(propertyId);
		if (displayName && displayName.trim().length > 0) {
			return displayName.trim();
		}
	} catch {
		// Fall back to humanized label.
	}
	return humanizePropertyLabel(propertyId);
}

function formatEpochTimestamp(millis: number): string {
	const date = new Date(millis);
	if (Number.isNaN(date.getTime())) {
		return '';
	}
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function formatInlinePropertyValue(propertyId: string, value: unknown): { value: string; values?: string[] } | null {
	if (value === null || value === undefined || value instanceof NullValue) {
		return null;
	}

	if (propertyId === 'file.ctime' || propertyId === 'file.mtime') {
		const millis = typeof value === 'number' ? value : Number(value);
		if (Number.isFinite(millis)) {
			return { value: formatEpochTimestamp(millis) };
		}
	}

	if (Array.isArray(value)) {
		const items = value
			.map((item) => (item === null || item === undefined ? '' : String(item).trim()))
			.filter((item) => item.length > 0 && item !== 'null' && item !== 'undefined');
		if (items.length === 0) {
			return null;
		}
		return { value: items.join(', '), values: items };
	}

	if (value instanceof Value) {
		const text = value.toString().trim();
		if (!text || text === 'null' || text === 'undefined') {
			return null;
		}
		return { value: text };
	}

	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		const text = String(value).trim();
		if (!text || text === 'null' || text === 'undefined' || text === '[object Object]') {
			return null;
		}
		return { value: text };
	}

	return null;
}

function readPropertyId(config: BasesViewConfig, key: string, fallback: BasesPropertyId | null): BasesPropertyId | null {
	const propertyId = config.getAsPropertyId(key);
	if (propertyId) {
		return propertyId;
	}
	const raw = config.get(key);
	if (typeof raw === 'string' && raw.trim().length > 0) {
		return raw.trim() as BasesPropertyId;
	}
	return fallback;
}

function readFrontmatterValue(app: App, entry: BasesEntry, propertyId: string): unknown {
	const [prefix, ...rest] = propertyId.split('.');
	const rawProperty = prefix === 'note' ? rest.join('.') : propertyId;
	const cache = app.metadataCache.getFileCache(entry.file);
	if (cache?.frontmatter && Object.prototype.hasOwnProperty.call(cache.frontmatter, rawProperty)) {
		return cache.frontmatter[rawProperty];
	}
	return null;
}

function readFileValue(entry: BasesEntry, propertyId: string): unknown {
	switch (propertyId) {
		case 'file.name':
		case 'file.basename':
		case 'file.fullname':
			return entry.file.basename;
		case 'file.path':
			return entry.file.path;
		case 'file.folder':
			return entry.file.parent?.path ?? '';
		case 'file.ext':
			return entry.file.extension;
		case 'file.size':
			return entry.file.stat.size;
		case 'file.ctime':
			return entry.file.stat.ctime;
		case 'file.mtime':
			return entry.file.stat.mtime;
		default:
			return null;
	}
}

function readEntryValue(app: App, entry: BasesEntry, propertyId: BasesPropertyId): unknown {
	const [prefix] = propertyId.split('.');

	if (prefix === 'note' || !propertyId.includes('.')) {
		const fmValue = readFrontmatterValue(app, entry, propertyId);
		if (fmValue !== null && fmValue !== undefined) {
			return fmValue;
		}
	}

	if (prefix === 'file') {
		const fileValue = readFileValue(entry, propertyId);
		if (fileValue !== null && fileValue !== undefined) {
			return fileValue;
		}
	}

	try {
		const value = entry.getValue(propertyId);
		if (value !== null && value !== undefined && !(value instanceof NullValue)) {
			return value;
		}
	} catch {
		// Ignore unsupported property IDs.
	}

	return null;
}

function stringifyScalar(value: unknown): string {
	if (value instanceof Value) {
		return value.toString().trim();
	}
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return String(value).trim();
	}
	return '';
}

function readRecordLabel(app: App, entry: BasesEntry, propertyId: BasesPropertyId): string {
	const value = readEntryValue(app, entry, propertyId);
	if (value !== null && value !== undefined && !(value instanceof NullValue)) {
		const text = stringifyScalar(value);
		if (text.length > 0 && text !== 'null' && text !== 'undefined' && text !== '[object Object]') {
			return text;
		}
	}
	return entry.file.basename;
}

function resolveCoverSrc(app: App, entry: BasesEntry, coverPropertyId: BasesPropertyId | null): string | undefined {
	if (!coverPropertyId) {
		return undefined;
	}
	const raw = readEntryValue(app, entry, coverPropertyId);
	if (raw === null || raw === undefined || raw instanceof NullValue) {
		return undefined;
	}

	let text = stringifyScalar(raw);
	if (!text) {
		return undefined;
	}

	// Unwrap wikilinks like ![[image.png]] or [[image.png|alias]]
	const wikiMatch = text.match(/^!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
	if (wikiMatch) {
		text = wikiMatch[1].trim();
	}

	if (/^https?:\/\//i.test(text)) {
		return text;
	}

	const resolved = app.metadataCache.getFirstLinkpathDest(text, entry.file.path);
	if (resolved instanceof TFile) {
		return app.vault.getResourcePath(resolved);
	}

	const direct = app.vault.getAbstractFileByPath(text);
	if (direct instanceof TFile) {
		return app.vault.getResourcePath(direct);
	}

	return undefined;
}

function resolveColorKey(app: App, entry: BasesEntry, colorPropertyId: BasesPropertyId | null): string | undefined {
	if (!colorPropertyId) {
		return undefined;
	}
	const raw = readEntryValue(app, entry, colorPropertyId);
	if (raw === null || raw === undefined || raw instanceof NullValue) {
		return undefined;
	}
	if (Array.isArray(raw)) {
		for (const item of raw as unknown[]) {
			const itemText = stringifyScalar(item);
			if (itemText.length > 0) {
				return itemText;
			}
		}
		return undefined;
	}
	const text = stringifyScalar(raw);
	return text.length > 0 && text !== 'null' && text !== 'undefined' ? text : undefined;
}

function extractTimelineRecords(
	app: App,
	viewConfig: BasesViewConfig,
	entries: BasesEntry[],
	datePropertyId: BasesPropertyId,
	labelPropertyId: BasesPropertyId,
	inlinePropertyIds: BasesPropertyId[],
	coverPropertyId: BasesPropertyId | null,
	colorPropertyId: BasesPropertyId | null,
): TimelineRecord[] {
	const records: TimelineRecord[] = [];
	const excluded = new Set<string>([datePropertyId, labelPropertyId]);
	if (coverPropertyId) {
		excluded.add(coverPropertyId);
	}

	for (const entry of entries) {
		const rawDate = readEntryValue(app, entry, datePropertyId);
		const dateInput = rawDate instanceof Value ? rawDate.toString() : rawDate;
		const date = parseTimelineDate(dateInput);
		if (!date) {
			continue;
		}

		const inlineProperties: TimelineInlineProperty[] = [];
		for (const propertyId of inlinePropertyIds) {
			if (excluded.has(propertyId)) {
				continue;
			}
			const rawValue = readEntryValue(app, entry, propertyId);
			const formatted = formatInlinePropertyValue(propertyId, rawValue);
			if (formatted) {
				inlineProperties.push({
					propertyId,
					label: readPropertyDisplayName(viewConfig, propertyId),
					value: formatted.value,
					values: formatted.values,
				});
			}
		}

		records.push({
			filePath: entry.file.path,
			displayName: readRecordLabel(app, entry, labelPropertyId),
			date,
			inlineProperties,
			coverSrc: resolveCoverSrc(app, entry, coverPropertyId),
			colorKey: resolveColorKey(app, entry, colorPropertyId),
		});
	}

	return records;
}

function resolveTimelineOptions(plugin: ReleaseTimeline, viewConfig: BasesViewConfig): TimelineBuildOptions {
	const mode = normalizeMode(readString(viewConfig.get('mode'), plugin.settings.defaultTimelineMode), plugin.settings.defaultTimelineMode);
	const timelineStyle = normalizeStyle(readString(viewConfig.get('timelineStyle'), plugin.settings.defaultTimelineStyle), plugin.settings.defaultTimelineStyle);
	const sortDirection = normalizeSortDirection(readString(viewConfig.get('sortDirection'), plugin.settings.defaultSortOrder), plugin.settings.defaultSortOrder);
	const itemLayout = normalizeItemLayout(readString(viewConfig.get('itemLayout'), plugin.settings.defaultItemLayout), plugin.settings.defaultItemLayout);
	const inlinePropertyStyle = normalizeInlinePropertyStyle(
		readString(viewConfig.get('inlinePropertyStyle'), plugin.settings.defaultInlinePropertyStyle),
		plugin.settings.defaultInlinePropertyStyle,
	);
	const inlineDelimiter = readText(viewConfig.get('inlineDelimiter'), ', ');
	const accentAlternationMode = readAccentAlternationMode(plugin, viewConfig);
	const collapseEmptyYears = readBoolean(viewConfig.get('collapseEmptyYears'), plugin.settings.collapseEmptyYears);
	const collapseLimit = Math.max(1, readNumber(viewConfig.get('collapseLimit'), Number.parseInt(plugin.settings.collapseLimit, 10) || 2));
	const collapseEmptyWeeks = readBoolean(viewConfig.get('collapseEmptyWeeks'), plugin.settings.collapseEmptyWeeksWeeklyTimeline);
	const collapseEmptyMonths = readBoolean(viewConfig.get('collapseEmptyMonths'), plugin.settings.collapseEmptyMonthsWeeklyTimeline);
	const weekDisplayFormat = normalizeWeekDisplayFormat(readString(viewConfig.get('weekDisplayFormat'), plugin.settings.weekDisplayFormat), plugin.settings.weekDisplayFormat);
	const widthMode = normalizeWidthMode(readString(viewConfig.get('widthMode'), plugin.settings.defaultWidthMode), plugin.settings.defaultWidthMode);
	const widthPx = Math.max(400, readNumber(viewConfig.get('widthPx'), plugin.settings.defaultWidthPx));
	const fontSizePercent = Math.min(140, Math.max(60, readNumber(viewConfig.get('fontSizePercent'), plugin.settings.defaultFontSizePercent)));

	return {
		mode,
		timelineStyle,
		sortDirection,
		itemLayout,
		inlinePropertyStyle,
		inlineDelimiter,
		accentAlternationMode,
		showYearBar: readBoolean(viewConfig.get('showYearBar'), true),
		collapseEmptyYears,
		collapseLimit,
		collapseEmptyWeeks,
		collapseEmptyMonths,
		weekDisplayFormat,
		widthMode,
		widthPx,
		fontSizePercent,
		showItemDates: readBoolean(viewConfig.get('showItemDates'), plugin.settings.showItemDates),
		showTodayMarker: readBoolean(viewConfig.get('showTodayMarker'), plugin.settings.showTodayMarker),
		showJumpBar: readBoolean(viewConfig.get('showJumpBar'), plugin.settings.showJumpBar),
		fitHorizontalToWidth: readBoolean(viewConfig.get('fitHorizontalToWidth'), plugin.settings.fitHorizontalToWidth),
	};
}

function getGroupLabel(group: BasesEntryGroup): string | undefined {
	if (!group.hasKey() || !group.key || group.key instanceof NullValue) {
		return undefined;
	}
	const text = group.key.toString().trim();
	return text.length > 0 ? text : undefined;
}

export class ReleaseTimelineBasesView extends BasesView implements HoverParent {
	readonly type = RELEASE_TIMELINE_VIEW_TYPE;
	hoverPopover: HoverPopover | null = null;

	private readonly plugin: ReleaseTimeline;
	private readonly rootEl: HTMLElement;
	private unsubscribeSettings: (() => void) | null = null;
	private renderCleanups: Array<() => void> = [];

	constructor(controller: QueryController, parentEl: HTMLElement, plugin: ReleaseTimeline) {
		super(controller);
		this.plugin = plugin;
		this.rootEl = parentEl.createDiv('release-timeline-base-view-bases-view');
		this.unsubscribeSettings = this.plugin.onSettingsChanged(() => {
			if (this.data) {
				this.onDataUpdated();
			}
		});
	}

	public onunload(): void {
		this.runRenderCleanups();
		if (this.unsubscribeSettings) {
			this.unsubscribeSettings();
			this.unsubscribeSettings = null;
		}
	}

	private runRenderCleanups(): void {
		for (const cleanup of this.renderCleanups) {
			cleanup();
		}
		this.renderCleanups = [];
	}

	public onDataUpdated(): void {
		try {
			this.renderTimeline();
		} catch (error: unknown) {
			console.error('Release Timeline View: failed to render', error);
			this.runRenderCleanups();
			this.rootEl.empty();
			this.rootEl.appendChild(createErrorTable('Failed to render the timeline. See the developer console for details.'));
		}
	}

	private renderTimeline(): void {
		this.runRenderCleanups();
		this.rootEl.empty();

		const options = resolveTimelineOptions(this.plugin, this.config);
		const instanceId = `release-timeline-base-view-${Date.now().toString(36)}`;
		this.rootEl.dataset.releaseTimelineViewInstance = instanceId;
		this.rootEl.setCssProps({
			'--release-timeline-base-view-width': options.widthMode === 'fixed' ? `${options.widthPx}px` : '100%',
			'--release-timeline-base-view-font-size': `${options.fontSizePercent}%`,
			'--release-timeline-base-view-color-primary': this.plugin.settings.useThemeAccent
				? 'var(--interactive-accent)'
				: this.plugin.settings.accentPrimaryColor,
			'--release-timeline-base-view-color-alternate': this.plugin.settings.accentAlternateColor,
		});

		const datePropertyId = readPropertyId(this.config, 'dateProperty', 'note.date') ?? 'note.date';
		const labelPropertyId = readPropertyId(this.config, 'labelProperty', 'file.name') ?? 'file.name';
		const coverPropertyId = readPropertyId(this.config, 'coverProperty', null);
		const colorPropertyId = readPropertyId(this.config, 'colorProperty', null);
		const inlineProperties = this.config.getOrder();

		const groupedData = this.data.groupedData;
		const timelineGroups: TimelineGroupInput[] = [];
		let totalRecords = 0;

		if (groupedData && groupedData.length > 0) {
			for (const group of groupedData) {
				const records = extractTimelineRecords(
					this.plugin.app,
					this.config,
					group.entries,
					datePropertyId,
					labelPropertyId,
					inlineProperties,
					coverPropertyId,
					colorPropertyId,
				);
				totalRecords += records.length;
				if (records.length > 0) {
					timelineGroups.push({
						groupLabel: getGroupLabel(group),
						rows: buildTimelineRows(records, options),
					});
				}
			}
		} else {
			const records = extractTimelineRecords(
				this.plugin.app,
				this.config,
				this.data.data,
				datePropertyId,
				labelPropertyId,
				inlineProperties,
				coverPropertyId,
				colorPropertyId,
			);
			totalRecords = records.length;
			if (records.length > 0) {
				timelineGroups.push({
					rows: buildTimelineRows(records, options),
				});
			}
		}

		if (totalRecords === 0) {
			this.rootEl.appendChild(createErrorTable('No notes in this base contain a usable timeline date.'));
			return;
		}

		renderTimelineInto(this.rootEl, timelineGroups, {
			bulletPoints: readBoolean(this.config.get('bulletPoints'), this.plugin.settings.bulletPoints),
			itemLayout: options.itemLayout,
			timelineStyle: options.timelineStyle,
			inlineDelimiter: options.inlineDelimiter,
			inlinePropertyStyle: options.inlinePropertyStyle,
			accentAlternationMode: options.accentAlternationMode,
			showYearBar: options.showYearBar,
			showItemDates: options.showItemDates,
			showTodayMarker: options.showTodayMarker,
			showJumpBar: options.showJumpBar,
			fitHorizontalToWidth: options.fitHorizontalToWidth,
			mode: options.mode,
			widthMode: options.widthMode,
			widthPx: options.widthPx,
			instanceId,
			colors: this.plugin.settings,
			app: this.plugin.app,
			hoverParent: this,
			registerCleanup: (fn) => this.renderCleanups.push(fn),
		});
	}
}
