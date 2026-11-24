import { BasesAllOptions, BasesViewConfig, Notice, Plugin } from 'obsidian';
import { ReleaseTimelineBasesView, RELEASE_TIMELINE_VIEW_TYPE } from './timeline-view';
import { DEFAULT_SETTINGS, ReleaseTimelineSettingTab, ReleaseTimelineSettings } from './settings';

export default class ReleaseTimeline extends Plugin {
	settings: ReleaseTimelineSettings = { ...DEFAULT_SETTINGS };
	private readonly settingsListeners = new Set<() => void>();

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new ReleaseTimelineSettingTab(this.app, this));
		this.registerReleaseTimelineView();
	}

	onunload() {
		this.settingsListeners.clear();
	}

	onSettingsChanged(listener: () => void): () => void {
		this.settingsListeners.add(listener);
		return () => {
			this.settingsListeners.delete(listener);
		};
	}

	private registerReleaseTimelineView() {
		const registered = this.registerBasesView(RELEASE_TIMELINE_VIEW_TYPE, {
			name: 'Release Timeline View',
			icon: 'lucide-calendar-range',
			factory: (controller, containerEl) => new ReleaseTimelineBasesView(controller, containerEl, this),
			options: (config: BasesViewConfig): BasesAllOptions[] => {
				const readOption = (key: string, fallback: string): string => {
					const val = config.get(key);
					return typeof val === 'string' && val.length > 0 ? val : fallback;
				};
				const getMode = () => readOption('mode', this.settings.defaultTimelineMode);
				const getLayout = () => readOption('itemLayout', this.settings.defaultItemLayout);
				const getStyle = () => readOption('timelineStyle', this.settings.defaultTimelineStyle);
				const getWidthMode = () => readOption('widthMode', this.settings.defaultWidthMode);

				return [
					{
						type: 'dropdown',
						key: 'mode',
						displayName: 'Timeline mode',
						default: this.settings.defaultTimelineMode,
						options: {
							decade: 'Decade',
							year: 'Year',
							quarter: 'Quarter',
							month: 'Month',
							week: 'Week',
						},
					},
					{
						type: 'dropdown',
						key: 'timelineStyle',
						displayName: 'Layout style',
						default: this.settings.defaultTimelineStyle,
						options: {
							table: 'Classic table',
							spine: 'Vertical spine',
							horizontal: 'Horizontal (diagonal)',
							horizontalStacked: 'Horizontal (stacked)',
						},
					},
					{
						type: 'property',
						key: 'dateProperty',
						displayName: 'Date property',
						default: 'note.date',
					},
					{
						type: 'property',
						key: 'labelProperty',
						displayName: 'Label property',
						default: 'file.name',
					},
					{
						type: 'property',
						key: 'coverProperty',
						displayName: 'Cover image property',
					},
					{
						type: 'property',
						key: 'colorProperty',
						displayName: 'Color-by property',
					},
					{
						type: 'dropdown',
						key: 'sortDirection',
						displayName: 'Sort direction',
						default: this.settings.defaultSortOrder,
						options: {
							asc: 'Ascending',
							desc: 'Descending',
						},
					},
					{
						type: 'dropdown',
						key: 'itemLayout',
						displayName: 'Item layout',
						default: this.settings.defaultItemLayout,
						options: {
							stacked: 'Stacked',
							inline: 'Inline with delimiter',
							cards: 'Cards',
						},
					},
					{
						type: 'text',
						key: 'inlineDelimiter',
						displayName: 'Inline delimiter',
						placeholder: ', ',
						default: ', ',
						shouldHide: () => getLayout() !== 'inline',
					},
					{
						type: 'toggle',
						key: 'bulletPoints',
						displayName: 'Bullet points in stacked layout',
						default: this.settings.bulletPoints,
						shouldHide: () => getLayout() !== 'stacked',
					},
					{
						type: 'dropdown',
						key: 'inlinePropertyStyle',
						displayName: 'Property display',
						default: this.settings.defaultInlinePropertyStyle,
						options: {
							stacked: 'Stacked list',
							pills: 'Compact pills',
						},
					},
					{
						type: 'toggle',
						key: 'showItemDates',
						displayName: 'Show item date badges',
						default: this.settings.showItemDates,
					},
					{
						type: 'toggle',
						key: 'showTodayMarker',
						displayName: 'Highlight current period ("Today")',
						default: this.settings.showTodayMarker,
					},
					{
						type: 'toggle',
						key: 'showJumpBar',
						displayName: 'Show year jump bar',
						default: this.settings.showJumpBar,
					},
					{
						type: 'toggle',
						key: 'fitHorizontalToWidth',
						displayName: 'Fit horizontal timeline to width',
						default: this.settings.fitHorizontalToWidth,
						shouldHide: () => getStyle() !== 'horizontal' && getStyle() !== 'horizontalStacked',
					},
					{
						type: 'dropdown',
						key: 'accentAlternationMode',
						displayName: 'Accent alternation',
						default: this.settings.accentAlternationMode,
						options: {
							none: 'None',
							year: 'Year only',
							month: 'Sub-period only',
							both: 'Year and sub-period',
						},
					},
					{
						type: 'toggle',
						key: 'showYearBar',
						displayName: 'Show year bar',
						default: true,
						shouldHide: () => getStyle() !== 'table',
					},
					{
						type: 'dropdown',
						key: 'widthMode',
						displayName: 'Width mode',
						default: this.settings.defaultWidthMode,
						options: {
							auto: 'Auto (fit container)',
							fixed: 'Fixed width (px)',
						},
						shouldHide: () => getStyle() === 'horizontal' || getStyle() === 'horizontalStacked',
					},
					{
						type: 'slider',
						key: 'widthPx',
						displayName: 'Width (px)',
						default: this.settings.defaultWidthPx,
						min: 400,
						max: 1600,
						step: 25,
						shouldHide: () => getStyle() === 'horizontal' || getStyle() === 'horizontalStacked' || getWidthMode() !== 'fixed',
					},
					{
						type: 'slider',
						key: 'fontSizePercent',
						displayName: 'Font size (%)',
						default: this.settings.defaultFontSizePercent,
						min: 60,
						max: 140,
						step: 5,
					},
					{
						type: 'toggle',
						key: 'collapseEmptyYears',
						displayName: 'Collapse empty years / decades',
						default: this.settings.collapseEmptyYears,
						shouldHide: () => {
							const mode = getMode();
							return mode !== 'year' && mode !== 'decade';
						},
					},
					{
						type: 'text',
						key: 'collapseLimit',
						displayName: 'Year collapse threshold',
						placeholder: '2',
						default: this.settings.collapseLimit,
						shouldHide: () => {
							const mode = getMode();
							return mode !== 'year' && mode !== 'decade';
						},
					},
					{
						type: 'toggle',
						key: 'collapseEmptyMonths',
						displayName: 'Collapse empty quarters / months',
						default: this.settings.collapseEmptyMonthsWeeklyTimeline,
						shouldHide: () => {
							const mode = getMode();
							return mode !== 'quarter' && mode !== 'month' && mode !== 'week';
						},
					},
					{
						type: 'toggle',
						key: 'collapseEmptyWeeks',
						displayName: 'Collapse empty weeks',
						default: this.settings.collapseEmptyWeeksWeeklyTimeline,
						shouldHide: () => getMode() !== 'week',
					},
					{
						type: 'dropdown',
						key: 'weekDisplayFormat',
						displayName: 'Week formatting',
						default: this.settings.weekDisplayFormat,
						options: {
							weekNames: 'Week names: W15',
							dateNames: 'Date names: 2025-08-19',
							monthDayRange: 'Date range: Feb 13-20',
						},
						shouldHide: () => getMode() !== 'week',
					},
				];
			},
		});

		if (!registered) {
			new Notice('Release Timeline View requires Bases to be enabled in Obsidian 1.10 or newer.');
		}
	}

	async loadSettings() {
		const loaded = (await this.loadData()) as Partial<ReleaseTimelineSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
	}

	async saveSettings() {
		await this.saveData(this.settings);
		for (const listener of this.settingsListeners) {
			listener();
		}
	}
}
