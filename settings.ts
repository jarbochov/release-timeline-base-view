import { App, PluginSettingTab, Setting, SettingDefinitionItem } from 'obsidian';
import type ReleaseTimeline from './main';
import {
	AccentAlternationMode,
	InlinePropertyStyle,
	ItemLayout,
	SortDirection,
	TimelineMode,
	TimelineStyle,
	WeekDisplayFormat,
	WidthMode,
} from './timeline-core';

export interface ReleaseTimelineSettings {
	defaultTimelineMode: TimelineMode;
	defaultTimelineStyle: TimelineStyle;
	defaultSortOrder: SortDirection;
	defaultItemLayout: ItemLayout;
	defaultInlinePropertyStyle: InlinePropertyStyle;
	accentAlternationMode: AccentAlternationMode;
	defaultWidthMode: WidthMode;
	defaultWidthPx: number;
	defaultFontSizePercent: number;
	collapseEmptyYears: boolean;
	bulletPoints: boolean;
	collapseLimit: string;
	collapseEmptyWeeksWeeklyTimeline: boolean;
	collapseEmptyMonthsWeeklyTimeline: boolean;
	weekDisplayFormat: WeekDisplayFormat;
	showItemDates: boolean;
	showTodayMarker: boolean;
	showJumpBar: boolean;
	fitHorizontalToWidth: boolean;
	useThemeAccent: boolean;
	accentPrimaryColor: string;
	accentAlternateColor: string;
}

export const DEFAULT_SETTINGS: ReleaseTimelineSettings = {
	defaultTimelineMode: 'year',
	defaultTimelineStyle: 'table',
	defaultSortOrder: 'desc',
	defaultItemLayout: 'stacked',
	defaultInlinePropertyStyle: 'stacked',
	accentAlternationMode: 'both',
	defaultWidthMode: 'auto',
	defaultWidthPx: 900,
	defaultFontSizePercent: 80,
	collapseEmptyYears: false,
	bulletPoints: true,
	collapseLimit: '2',
	collapseEmptyWeeksWeeklyTimeline: true,
	collapseEmptyMonthsWeeklyTimeline: true,
	weekDisplayFormat: 'dateNames',
	showItemDates: false,
	showTodayMarker: false,
	showJumpBar: false,
	fitHorizontalToWidth: false,
	useThemeAccent: false,
	accentPrimaryColor: '#0BDA51',
	accentAlternateColor: '#5E6C7A',
};

export class ReleaseTimelineSettingTab extends PluginSettingTab {
	plugin: ReleaseTimeline;

	constructor(app: App, plugin: ReleaseTimeline) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: 'Defaults',
				items: [
					{
						name: 'Default timeline mode',
						desc: 'Used when creating a new Release Timeline View.',
						control: {
							type: 'dropdown',
							key: 'defaultTimelineMode',
							options: {
								decade: 'Decade',
								year: 'Year',
								quarter: 'Quarter',
								month: 'Month',
								week: 'Week',
							},
						},
					},
					{
						name: 'Default timeline layout',
						desc: 'Choose between the classic table, vertical spine, or horizontal layouts.',
						control: {
							type: 'dropdown',
							key: 'defaultTimelineStyle',
							options: {
								table: 'Classic table',
								spine: 'Vertical spine',
								horizontal: 'Horizontal (diagonal)',
								horizontalStacked: 'Horizontal (stacked)',
							},
						},
					},
					{
						name: 'Default sort order',
						desc: 'Used when a view does not specify a sort direction.',
						control: {
							type: 'dropdown',
							key: 'defaultSortOrder',
							options: { asc: 'Ascending', desc: 'Descending' },
						},
					},
					{
						name: 'Default item layout',
						desc: 'Controls whether multiple items in a period stack vertically, appear inline, or render as cards.',
						control: {
							type: 'dropdown',
							key: 'defaultItemLayout',
							options: {
								stacked: 'Stacked',
								inline: 'Inline with delimiter',
								cards: 'Cards',
							},
						},
					},
					{
						name: 'Default property display',
						desc: 'Controls how selected Base properties appear under each item.',
						control: {
							type: 'dropdown',
							key: 'defaultInlinePropertyStyle',
							options: { stacked: 'Stacked list', pills: 'Compact pills' },
						},
					},
					{
						name: 'Accent alternation',
						desc: 'Controls whether accent bars alternate by year, sub-period, both, or not at all.',
						control: {
							type: 'dropdown',
							key: 'accentAlternationMode',
							options: {
								none: 'None',
								year: 'Year only',
								month: 'Quarter/month/week only',
								both: 'Year and sub-period',
							},
						},
					},
					{
						name: 'Default width mode',
						desc: 'Fit the available container width automatically or use a fixed pixel width.',
						control: {
							type: 'dropdown',
							key: 'defaultWidthMode',
							options: { auto: 'Auto (fit container)', fixed: 'Fixed width (px)' },
						},
					},
					{
						name: 'Default fixed width',
						desc: 'Sets the timeline width in pixels.',
						control: { type: 'slider', key: 'defaultWidthPx', min: 400, max: 1600, step: 25 },
					},
					{
						name: 'Default font size',
						desc: 'Sets the timeline text size as a percentage of the Obsidian interface font.',
						control: { type: 'slider', key: 'defaultFontSizePercent', min: 60, max: 140, step: 5 },
					},
					{
						name: 'Bullet points',
						desc: 'Shows bullet markers in stacked layout to make multi-item periods easier to scan.',
						control: { type: 'toggle', key: 'bulletPoints' },
					},
					{
						name: 'Show item date badges',
						desc: 'Displays each note’s specific month/day next to its title.',
						control: { type: 'toggle', key: 'showItemDates' },
					},
					{
						name: 'Highlight current period ("Today")',
						desc: 'Adds a subtle Today indicator to the period matching the current date.',
						control: { type: 'toggle', key: 'showTodayMarker' },
					},
					{
						name: 'Show year jump bar',
						desc: 'Displays quick-jump year pills above multi-year timelines.',
						control: { type: 'toggle', key: 'showJumpBar' },
					},
					{
						name: 'Fit horizontal timeline to width',
						desc: 'Scales wide horizontal timelines down so the entire timeline fits within the available pane width.',
						control: { type: 'toggle', key: 'fitHorizontalToWidth' },
					},
				],
			},
			{
				type: 'group',
				heading: 'Collapse defaults',
				items: [
					{
						name: 'Collapse empty years / decades',
						desc: 'Long runs of empty years can be compressed into a single expandable range row.',
						control: { type: 'toggle', key: 'collapseEmptyYears' },
					},
					{
						name: 'Minimum consecutive empty years to collapse',
						desc: 'Positive integer threshold required before a run of empty years collapses.',
						control: { type: 'text', key: 'collapseLimit' },
					},
					{
						name: 'Collapse empty quarters / months',
						desc: 'Hides empty periods in quarter/month mode and collapses empty months into one expandable row in week mode.',
						control: { type: 'toggle', key: 'collapseEmptyMonthsWeeklyTimeline' },
					},
					{
						name: 'Collapse empty weeks',
						desc: 'Hides empty weeks within active months in week mode.',
						control: { type: 'toggle', key: 'collapseEmptyWeeksWeeklyTimeline' },
					},
					{
						name: 'Week formatting',
						control: {
							type: 'dropdown',
							key: 'weekDisplayFormat',
							options: {
								weekNames: 'Week names: W15',
								dateNames: 'Date names: 2025-08-19',
								monthDayRange: 'Date range: Feb 13-20',
							},
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Timeline colors',
				items: [
					{
						name: 'Use Obsidian theme accent',
						desc: 'Use your active theme’s accent color for the primary timeline bar instead of a custom hex color.',
						control: { type: 'toggle', key: 'useThemeAccent' },
					},
					{
						name: 'Primary accent',
						desc: 'Main color used for accent bars.',
						control: { type: 'color', key: 'accentPrimaryColor' },
					},
					{
						name: 'Alternate accent',
						desc: 'Secondary color used when alternating accents.',
						control: { type: 'color', key: 'accentAlternateColor' },
					},
				],
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as keyof ReleaseTimelineSettings];
	}

	setControlValue(key: string, value: unknown): void {
		(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		void this.plugin.saveSettings();
	}

	display(): void {
		this.renderSettings();
	}

	private renderSettings(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Defaults').setHeading();

		new Setting(containerEl)
			.setName('Default timeline mode')
			.setDesc('Used when creating a new Release Timeline View.')
			.addDropdown((dropdown) => {
				dropdown.addOption('decade', 'Decade');
				dropdown.addOption('year', 'Year');
				dropdown.addOption('quarter', 'Quarter');
				dropdown.addOption('month', 'Month');
				dropdown.addOption('week', 'Week');
				dropdown.setValue(this.plugin.settings.defaultTimelineMode);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultTimelineMode = value as TimelineMode;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Default timeline layout')
			.setDesc('Choose between the classic table, vertical spine, or horizontal strip.')
			.addDropdown((dropdown) => {
				dropdown.addOption('table', 'Classic table');
				dropdown.addOption('spine', 'Vertical spine');
				dropdown.addOption('horizontal', 'Horizontal (diagonal)');
				dropdown.addOption('horizontalStacked', 'Horizontal (stacked)');
				dropdown.setValue(this.plugin.settings.defaultTimelineStyle);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultTimelineStyle = value as TimelineStyle;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Default sort order')
			.setDesc('Used when a view does not specify a sort direction.')
			.addDropdown((dropdown) => {
				dropdown.addOption('asc', 'Ascending');
				dropdown.addOption('desc', 'Descending');
				dropdown.setValue(this.plugin.settings.defaultSortOrder);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultSortOrder = value as SortDirection;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Default item layout')
			.setDesc('Controls whether multiple items in a period stack vertically, appear inline, or render as cards.')
			.addDropdown((dropdown) => {
				dropdown.addOption('stacked', 'Stacked');
				dropdown.addOption('inline', 'Inline with delimiter');
				dropdown.addOption('cards', 'Cards');
				dropdown.setValue(this.plugin.settings.defaultItemLayout);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultItemLayout = value as ItemLayout;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Default property display')
			.setDesc('Controls how selected Base properties appear under each item.')
			.addDropdown((dropdown) => {
				dropdown.addOption('stacked', 'Stacked list');
				dropdown.addOption('pills', 'Compact pills');
				dropdown.setValue(this.plugin.settings.defaultInlinePropertyStyle);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultInlinePropertyStyle = value as InlinePropertyStyle;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Accent alternation')
			.setDesc('Controls whether accent bars alternate by year, sub-period, both, or not at all.')
			.addDropdown((dropdown) => {
				dropdown.addOption('none', 'None');
				dropdown.addOption('year', 'Year only');
				dropdown.addOption('month', 'Quarter/month/week only');
				dropdown.addOption('both', 'Year and sub-period');
				dropdown.setValue(this.plugin.settings.accentAlternationMode);
				dropdown.onChange(async (value) => {
					this.plugin.settings.accentAlternationMode = value as AccentAlternationMode;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Default width mode')
			.setDesc('Fit the available container width automatically or use a fixed pixel width.')
			.addDropdown((dropdown) => {
				dropdown.addOption('auto', 'Auto (fit container)');
				dropdown.addOption('fixed', 'Fixed width (px)');
				dropdown.setValue(this.plugin.settings.defaultWidthMode);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultWidthMode = value as WidthMode;
					await this.plugin.saveSettings();
					this.renderSettings();
				});
			});

		if (this.plugin.settings.defaultWidthMode === 'fixed') {
			new Setting(containerEl)
				.setName('Default fixed width')
				.setDesc('Sets the timeline width in pixels.')
				.addSlider((slider) => {
					slider.setLimits(400, 1600, 25);
					slider.setValue(this.plugin.settings.defaultWidthPx);
					slider.onChange(async (value) => {
						this.plugin.settings.defaultWidthPx = value;
						await this.plugin.saveSettings();
					});
				});
		}

		new Setting(containerEl)
			.setName('Default font size')
			.setDesc('Sets the timeline text size as a percentage of the Obsidian interface font.')
			.addSlider((slider) => {
				slider.setLimits(60, 140, 5);
				slider.setValue(this.plugin.settings.defaultFontSizePercent);
				slider.onChange(async (value) => {
					this.plugin.settings.defaultFontSizePercent = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Bullet points')
			.setDesc('Shows bullet markers in stacked layout to make multi-item periods easier to scan.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.bulletPoints);
				toggle.onChange(async (value) => {
					this.plugin.settings.bulletPoints = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Show item date badges')
			.setDesc('Displays each note’s specific month/day next to its title.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showItemDates);
				toggle.onChange(async (value) => {
					this.plugin.settings.showItemDates = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Highlight current period ("Today")')
			.setDesc('Adds a subtle Today indicator to the period matching the current date.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showTodayMarker);
				toggle.onChange(async (value) => {
					this.plugin.settings.showTodayMarker = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Show year jump bar')
			.setDesc('Displays quick-jump year pills above multi-year timelines.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showJumpBar);
				toggle.onChange(async (value) => {
					this.plugin.settings.showJumpBar = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Fit horizontal timeline to width')
			.setDesc('Scales wide horizontal diagonal timelines down so the entire timeline fits within the available pane width.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.fitHorizontalToWidth);
				toggle.onChange(async (value) => {
					this.plugin.settings.fitHorizontalToWidth = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl).setName('Collapse defaults').setHeading();

		new Setting(containerEl)
			.setName('Collapse empty years / decades')
			.setDesc('Long runs of empty years can be compressed into a single expandable range row.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.collapseEmptyYears);
				toggle.onChange(async (value) => {
					this.plugin.settings.collapseEmptyYears = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Minimum consecutive empty years to collapse')
			.setDesc('Positive integer threshold required before a run of empty years collapses.')
			.addText((text) =>
				text
					.setPlaceholder('2')
					.setValue(this.plugin.settings.collapseLimit)
					.onChange(async (value) => {
						const parsed = Number.parseInt(value.trim(), 10);
						this.plugin.settings.collapseLimit = Number.isFinite(parsed) && parsed >= 1 ? String(parsed) : '2';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Collapse empty quarters / months')
			.setDesc('Hides empty periods in quarter/month mode and collapses empty months into one expandable row in week mode.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.collapseEmptyMonthsWeeklyTimeline);
				toggle.onChange(async (value) => {
					this.plugin.settings.collapseEmptyMonthsWeeklyTimeline = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Collapse empty weeks')
			.setDesc('Hides empty weeks within active months in week mode.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.collapseEmptyWeeksWeeklyTimeline);
				toggle.onChange(async (value) => {
					this.plugin.settings.collapseEmptyWeeksWeeklyTimeline = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Week formatting')
			.addDropdown((dropdown) => {
				dropdown.addOption('weekNames', 'Week names: W15');
				dropdown.addOption('dateNames', 'Date names: 2025-08-19');
				dropdown.addOption('monthDayRange', 'Date range: Feb 13-20');
				dropdown.setValue(this.plugin.settings.weekDisplayFormat);
				dropdown.onChange(async (value) => {
					this.plugin.settings.weekDisplayFormat = value as WeekDisplayFormat;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl).setName('Timeline colors').setHeading();

		new Setting(containerEl)
			.setName('Use Obsidian theme accent')
			.setDesc('Use your active theme’s accent color for the primary timeline bar instead of a custom hex color.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.useThemeAccent);
				toggle.onChange(async (value) => {
					this.plugin.settings.useThemeAccent = value;
					await this.plugin.saveSettings();
					this.renderSettings();
				});
			});

		if (!this.plugin.settings.useThemeAccent) {
			new Setting(containerEl)
				.setName('Primary accent')
				.setDesc('Main color used for accent bars.')
				.addColorPicker((picker) => {
					picker.setValue(this.plugin.settings.accentPrimaryColor);
					picker.onChange(async (value) => {
						this.plugin.settings.accentPrimaryColor = value;
						await this.plugin.saveSettings();
					});
				});
		}

		new Setting(containerEl)
			.setName('Alternate accent')
			.setDesc('Secondary color used when alternating accents.')
			.addColorPicker((picker) => {
				picker.setValue(this.plugin.settings.accentAlternateColor);
				picker.onChange(async (value) => {
					this.plugin.settings.accentAlternateColor = value;
					await this.plugin.saveSettings();
				});
			});
	}
}
