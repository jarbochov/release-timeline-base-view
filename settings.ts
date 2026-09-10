/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- Obsidian's settings UI helpers are loosely typed. */
import { App, PluginSettingTab, Setting, SettingDefinitions } from 'obsidian';
import type ReleaseTimeline from './main';
import { AccentAlternationMode, ItemLayout, SortDirection, TimelineMode, WeekDisplayFormat } from './timeline-core';

export interface ReleaseTimelineSettings {
	defaultTimelineMode: TimelineMode;
	defaultSortOrder: SortDirection;
	defaultItemLayout: ItemLayout;
	accentAlternationMode: AccentAlternationMode;
	defaultWidthPx: number;
	defaultFontSizePercent: number;
	collapseEmptyYears: boolean;
	bulletPoints: boolean;
	collapseLimit: string;
	collapseEmptyWeeksWeeklyTimeline: boolean;
	collapseEmptyMonthsWeeklyTimeline: boolean;
	weekDisplayFormat: WeekDisplayFormat;
	accentPrimaryColor: string;
	accentAlternateColor: string;
}

export const DEFAULT_SETTINGS: ReleaseTimelineSettings = {
	defaultTimelineMode: 'year',
	defaultSortOrder: 'desc',
	defaultItemLayout: 'stacked',
	accentAlternationMode: 'both',
	defaultWidthPx: 900,
	defaultFontSizePercent: 80,
	collapseEmptyYears: false,
	bulletPoints: true,
	collapseLimit: '2',
	collapseEmptyWeeksWeeklyTimeline: true,
	collapseEmptyMonthsWeeklyTimeline: true,
	weekDisplayFormat: 'dateNames',
	accentPrimaryColor: '#0BDA51',
	accentAlternateColor: '#5E6C7A',
};

export class ReleaseTimelineSettingTab extends PluginSettingTab {
	plugin: ReleaseTimeline;

	constructor(app: App, plugin: ReleaseTimeline) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitions {
		return [
			{
				id: 'defaults-heading',
				name: 'Defaults',
				type: 'heading',
				section: 'defaults',
			},
			{
				id: 'defaultTimelineMode',
				name: 'Default timeline mode',
				desc: 'Used when creating a new Release Timeline View.',
				type: 'dropdown',
				section: 'defaults',
				options: [
					{ label: 'Year', value: 'year' },
					{ label: 'Month', value: 'month' },
					{ label: 'Week', value: 'week' },
				],
				default: 'year',
				onChange: async (value) => {
					this.plugin.settings.defaultTimelineMode = value as TimelineMode;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'defaultSortOrder',
				name: 'Default sort order',
				desc: 'Used when a view does not specify a sort direction.',
				type: 'dropdown',
				section: 'defaults',
				options: [
					{ label: 'Ascending', value: 'asc' },
					{ label: 'Descending', value: 'desc' },
				],
				default: 'desc',
				onChange: async (value) => {
					this.plugin.settings.defaultSortOrder = value as SortDirection;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'defaultItemLayout',
				name: 'Default item layout',
				desc: 'Controls whether multiple items in a period stack vertically or appear inline.',
				type: 'dropdown',
				section: 'defaults',
				options: [
					{ label: 'Stacked', value: 'stacked' },
					{ label: 'Inline with delimiter', value: 'inline' },
				],
				default: 'stacked',
				onChange: async (value) => {
					this.plugin.settings.defaultItemLayout = value as ItemLayout;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'accentAlternationMode',
				name: 'Accent alternation',
				desc: 'Controls whether the accent colors alternate by year, month/week, both, or not at all.',
				type: 'dropdown',
				section: 'defaults',
				options: [
					{ label: 'None', value: 'none' },
					{ label: 'Year only', value: 'year' },
					{ label: 'Month/week only', value: 'month' },
					{ label: 'Year and month/week', value: 'both' },
				],
				default: 'both',
				onChange: async (value) => {
					this.plugin.settings.accentAlternationMode = value as AccentAlternationMode;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'defaultWidthPx',
				name: 'Default width',
				desc: 'Sets the timeline width in pixels.',
				type: 'slider',
				section: 'defaults',
				default: 900,
				onChange: async (value) => {
					this.plugin.settings.defaultWidthPx = value;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'defaultFontSizePercent',
				name: 'Default font size',
				desc: 'Sets the timeline text size as a percentage of the Obsidian interface font.',
				type: 'slider',
				section: 'defaults',
				default: 80,
				onChange: async (value) => {
					this.plugin.settings.defaultFontSizePercent = value;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'bulletPoints',
				name: 'Bullet points',
				desc: 'Makes multi-item periods easier to scan.',
				type: 'toggle',
				section: 'defaults',
				default: true,
				onChange: async (value) => {
					this.plugin.settings.bulletPoints = value;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'year-heading',
				name: 'Year defaults',
				type: 'heading',
				section: 'year',
			},
			{
				id: 'collapseEmptyYears',
				name: 'Collapse empty years',
				desc: 'Long runs of empty years can be compressed into a single range row.',
				type: 'toggle',
				section: 'year',
				default: false,
				onChange: async (value) => {
					this.plugin.settings.collapseEmptyYears = value;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'collapseLimit',
				name: 'Minimum number of empty years to collapse',
				desc: 'The minimum consecutive empty year count required before collapse happens.',
				type: 'text',
				section: 'year',
				default: '2',
				onChange: async (value) => {
					this.plugin.settings.collapseLimit = value;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'week-heading',
				name: 'Week defaults',
				type: 'heading',
				section: 'week',
			},
			{
				id: 'collapseEmptyWeeksWeeklyTimeline',
				name: 'Collapse empty weeks',
				desc: 'Weeks without entries are reduced to a single row in week mode.',
				type: 'toggle',
				section: 'week',
				default: true,
				onChange: async (value) => {
					this.plugin.settings.collapseEmptyWeeksWeeklyTimeline = value;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'collapseEmptyMonthsWeeklyTimeline',
				name: 'Collapse empty months',
				desc: 'Months without entries are reduced to a single row in week mode.',
				type: 'toggle',
				section: 'week',
				default: true,
				onChange: async (value) => {
					this.plugin.settings.collapseEmptyMonthsWeeklyTimeline = value;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'weekDisplayFormat',
				name: 'Week formatting',
				type: 'dropdown',
				section: 'week',
				options: [
					{ label: 'Week names: W15', value: 'weekNames' },
					{ label: 'Date names: 2025-08-19', value: 'dateNames' },
					{ label: 'Date range: Feb 13-20', value: 'monthDayRange' },
				],
				default: 'dateNames',
				onChange: async (value) => {
					this.plugin.settings.weekDisplayFormat = value as WeekDisplayFormat;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'colors-heading',
				name: 'Timeline colors',
				type: 'heading',
				section: 'colors',
			},
			{
				id: 'accentPrimaryColor',
				name: 'Primary accent',
				desc: 'Main color used for accent bars.',
				type: 'colorpicker',
				section: 'colors',
				default: '#0BDA51',
				onChange: async (value) => {
					this.plugin.settings.accentPrimaryColor = value;
					await this.plugin.saveSettings();
				},
			},
			{
				id: 'accentAlternateColor',
				name: 'Alternate accent',
				desc: 'Secondary color used when alternating accents.',
				type: 'colorpicker',
				section: 'colors',
				default: '#5E6C7A',
				onChange: async (value) => {
					this.plugin.settings.accentAlternateColor = value;
					await this.plugin.saveSettings();
				},
			},
		];
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Defaults').setHeading();

		new Setting(containerEl)
			.setName('Default timeline mode')
			.setDesc('Used when creating a new Release Timeline View.')
			.addDropdown((dropdown) => {
				dropdown.addOption('year', 'Year');
				dropdown.addOption('month', 'Month');
				dropdown.addOption('week', 'Week');
				dropdown.setValue(this.plugin.settings.defaultTimelineMode);
				dropdown.onChange(async (value: TimelineMode) => {
					this.plugin.settings.defaultTimelineMode = value;
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
				dropdown.onChange(async (value: SortDirection) => {
					this.plugin.settings.defaultSortOrder = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Default item layout')
			.setDesc('Controls whether multiple items in a period stack vertically or appear inline.')
			.addDropdown((dropdown) => {
				dropdown.addOption('stacked', 'Stacked');
				dropdown.addOption('inline', 'Inline with delimiter');
				dropdown.setValue(this.plugin.settings.defaultItemLayout);
				dropdown.onChange(async (value: ItemLayout) => {
					this.plugin.settings.defaultItemLayout = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Accent alternation')
			.setDesc('Controls whether the accent colors alternate by year, month/week, both, or not at all.')
			.addDropdown((dropdown) => {
				dropdown.addOption('none', 'None');
				dropdown.addOption('year', 'Year only');
				dropdown.addOption('month', 'Month/week only');
				dropdown.addOption('both', 'Year and month/week');
				dropdown.setValue(this.plugin.settings.accentAlternationMode);
				dropdown.onChange(async (value: AccentAlternationMode) => {
					this.plugin.settings.accentAlternationMode = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Default width')
			.setDesc('Sets the timeline width in pixels.')
			.addSlider((slider) => {
				slider.setLimits(400, 1600, 25);
				slider.setValue(this.plugin.settings.defaultWidthPx);
				slider.onChange(async (value) => {
					this.plugin.settings.defaultWidthPx = value;
					await this.plugin.saveSettings();
				});
			});

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
			.setDesc('Makes multi-item periods easier to scan.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.bulletPoints);
				toggle.onChange(async (value) => {
					this.plugin.settings.bulletPoints = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl).setName('Year defaults').setHeading();

		new Setting(containerEl)
			.setName('Collapse empty years')
			.setDesc('Long runs of empty years can be compressed into a single range row.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.collapseEmptyYears);
				toggle.onChange(async (value) => {
					this.plugin.settings.collapseEmptyYears = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Minimum number of empty years to collapse')
			.setDesc('The minimum consecutive empty year count required before collapse happens.')
			.addText((text) =>
				text
					.setPlaceholder('2')
					.setValue(this.plugin.settings.collapseLimit)
					.onChange(async (value) => {
						this.plugin.settings.collapseLimit = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl).setName('Week defaults').setHeading();

		new Setting(containerEl)
			.setName('Collapse empty weeks')
			.setDesc('Weeks without entries are reduced to a single row in week mode.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.collapseEmptyWeeksWeeklyTimeline);
				toggle.onChange(async (value) => {
					this.plugin.settings.collapseEmptyWeeksWeeklyTimeline = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Collapse empty months')
			.setDesc('Months without entries are reduced to a single row in week mode.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.collapseEmptyMonthsWeeklyTimeline);
				toggle.onChange(async (value) => {
					this.plugin.settings.collapseEmptyMonthsWeeklyTimeline = value;
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
				dropdown.onChange(async (value: WeekDisplayFormat) => {
					this.plugin.settings.weekDisplayFormat = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl).setName('Timeline colors').setHeading();

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
/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- Re-enable after the settings tab class scope. */
