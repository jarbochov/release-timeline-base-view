import { App, HoverParent, Keymap, Menu, TFile } from 'obsidian';
import {
	AccentAlternationMode,
	formatItemDateBadge,
	InlinePropertyStyle,
	ItemLayout,
	TimelineInlineProperty,
	TimelineMode,
	TimelineRecord,
	TimelineRow,
	TimelineStyle,
	WidthMode,
} from './timeline-core';
import type { ReleaseTimelineSettings } from './settings';

export interface TimelineRenderOptions {
	mode: TimelineMode;
	timelineStyle: TimelineStyle;
	bulletPoints: boolean;
	itemLayout: ItemLayout;
	inlineDelimiter: string;
	inlinePropertyStyle: InlinePropertyStyle;
	accentAlternationMode: AccentAlternationMode;
	showYearBar: boolean;
	showItemDates: boolean;
	showTodayMarker: boolean;
	showJumpBar: boolean;
	fitHorizontalToWidth: boolean;
	widthMode: WidthMode;
	widthPx: number;
	instanceId: string;
	colors: ReleaseTimelineSettings;
	app: App;
	hoverParent: HoverParent;
	registerCleanup?: (fn: () => void) => void;
}

export interface TimelineGroupInput {
	groupLabel?: string;
	rows: TimelineRow[];
}

const PROPERTY_COLOR_PALETTE = [
	'#3b82f6',
	'#10b981',
	'#f59e0b',
	'#ec4899',
	'#8b5cf6',
	'#06b6d4',
	'#ef4444',
	'#84cc16',
	'#f97316',
	'#6366f1',
];

function getColorForKey(key: string): string {
	let hash = 0;
	for (let i = 0; i < key.length; i += 1) {
		hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
	}
	return PROPERTY_COLOR_PALETTE[Math.abs(hash) % PROPERTY_COLOR_PALETTE.length];
}

function isSingleTierMode(mode: TimelineMode): boolean {
	return mode === 'year' || mode === 'decade';
}

export function createErrorTable(message: string, columnCount = 3): HTMLTableElement {
	const table = createEl('table', { cls: ['release-timeline-base-view', 'release-timeline-base-view-error'] });
	const tbody = table.createEl('tbody');
	const row = tbody.createEl('tr');
	row.createEl('td', { attr: { colspan: String(columnCount) }, text: message });
	return table;
}

function openFileWithEvent(app: App, filePath: string, event: MouseEvent, forceNewTab = false): void {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) {
		void app.workspace.openLinkText(filePath, '', forceNewTab || Keymap.isModEvent(event));
		return;
	}
	const newLeaf = forceNewTab || Keymap.isModEvent(event);
	void app.workspace.getLeaf(newLeaf).openFile(file);
}

function attachLinkInteractions(
	link: HTMLAnchorElement,
	filePath: string,
	app: App,
	hoverParent: HoverParent,
): void {
	link.dataset.href = filePath;

	link.addEventListener('click', (event) => {
		event.preventDefault();
		openFileWithEvent(app, filePath, event, false);
	});

	link.addEventListener('auxclick', (event) => {
		if (event.button === 1) {
			event.preventDefault();
			openFileWithEvent(app, filePath, event, true);
		}
	});

	link.addEventListener('mouseover', (event) => {
		app.workspace.trigger('hover-link', {
			event,
			source: 'release-timeline-base-view',
			hoverParent,
			targetEl: link,
			linktext: filePath,
			sourcePath: filePath,
		});
	});

	link.addEventListener('contextmenu', (event) => {
		const file = app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			return;
		}
		event.preventDefault();
		const menu = new Menu();
		app.workspace.trigger('file-menu', menu, file, 'release-timeline-base-view');
		menu.showAtMouseEvent(event);
	});
}

function createTimelineLink(
	parent: HTMLElement,
	record: TimelineRecord,
	app: App,
	hoverParent: HoverParent,
): HTMLAnchorElement {
	const link = parent.createEl('a', {
		cls: 'internal-link',
		text: record.displayName,
		attr: { href: record.filePath },
	});
	attachLinkInteractions(link, record.filePath, app, hoverParent);
	return link;
}

function renderRichPropertyText(
	container: HTMLElement,
	text: string,
	sourcePath: string,
	app: App,
	hoverParent: HoverParent,
): void {
	const tokenRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|(#[A-Za-z0-9_/-]+)/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = tokenRegex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			container.appendChild(activeDocument.createTextNode(text.slice(lastIndex, match.index)));
		}

		if (match[1]) {
			const target = match[1].trim();
			const alias = (match[2] ?? target).trim();
			const resolved = app.metadataCache.getFirstLinkpathDest(target, sourcePath);
			const link = container.createEl('a', {
				cls: 'internal-link',
				text: alias,
				attr: { href: target },
			});
			attachLinkInteractions(link, resolved?.path ?? target, app, hoverParent);
		} else if (match[3]) {
			container.createSpan({ cls: 'release-timeline-base-view-tag-pill', text: match[3] });
		}

		lastIndex = tokenRegex.lastIndex;
	}

	if (lastIndex < text.length) {
		container.appendChild(activeDocument.createTextNode(text.slice(lastIndex)));
	}
}

function appendInlineProperties(
	container: HTMLElement,
	record: TimelineRecord,
	style: InlinePropertyStyle,
	app: App,
	hoverParent: HoverParent,
): void {
	if (record.inlineProperties.length === 0) {
		return;
	}

	if (style === 'pills') {
		const pills = container.createDiv({ cls: 'release-timeline-base-view-inline-pills' });
		for (const entry of record.inlineProperties) {
			const pill = pills.createSpan({ cls: 'release-timeline-base-view-inline-pill' });
			pill.createSpan({ cls: 'release-timeline-base-view-inline-pill-label', text: `${entry.label}: ` });
			const valSpan = pill.createSpan({ cls: 'release-timeline-base-view-inline-pill-value' });
			renderPropertyValue(valSpan, entry, record.filePath, app, hoverParent);
		}
		return;
	}

	const props = container.createDiv({ cls: 'release-timeline-base-view-inline-properties' });
	for (const entry of record.inlineProperties) {
		const prop = props.createDiv({ cls: 'release-timeline-base-view-inline-property' });
		prop.createDiv({ cls: 'release-timeline-base-view-inline-property-label', text: entry.label });
		const valEl = prop.createDiv({ cls: 'release-timeline-base-view-inline-property-value' });
		renderPropertyValue(valEl, entry, record.filePath, app, hoverParent);
	}
}

function renderPropertyValue(
	container: HTMLElement,
	entry: TimelineInlineProperty,
	sourcePath: string,
	app: App,
	hoverParent: HoverParent,
): void {
	if (entry.values && entry.values.length > 1) {
		entry.values.forEach((item, index) => {
			if (index > 0) {
				container.appendChild(activeDocument.createTextNode(', '));
			}
			renderRichPropertyText(container, item, sourcePath, app, hoverParent);
		});
		return;
	}
	renderRichPropertyText(container, entry.value, sourcePath, app, hoverParent);
}

function appendNoteContent(
	parent: HTMLElement,
	record: TimelineRecord,
	showBullet: boolean,
	options: TimelineRenderOptions,
): HTMLElement {
	const wrapper = parent.createSpan({ cls: 'release-timeline-base-view-note-content' });
	const titleRow = wrapper.createSpan({ cls: 'release-timeline-base-view-note-title-row' });

	if (showBullet) {
		titleRow.createSpan({ cls: 'release-timeline-base-view-bullet', text: '•' });
	}

	if (record.colorKey) {
		const dot = titleRow.createSpan({
			cls: 'release-timeline-base-view-color-dot',
			attr: { title: record.colorKey },
		});
		dot.style.backgroundColor = getColorForKey(record.colorKey);
	}

	if (options.showItemDates) {
		const badgeText = formatItemDateBadge(record.date, options.mode);
		if (badgeText) {
			titleRow.createSpan({ cls: 'release-timeline-base-view-date-badge', text: badgeText });
		}
	}

	createTimelineLink(titleRow, record, options.app, options.hoverParent);
	appendInlineProperties(wrapper, record, options.inlinePropertyStyle, options.app, options.hoverParent);
	return wrapper;
}

function appendCardItem(
	parent: HTMLElement,
	record: TimelineRecord,
	options: TimelineRenderOptions,
): HTMLElement {
	const card = parent.createDiv({ cls: 'release-timeline-base-view-card' });
	if (record.colorKey) {
		card.style.borderLeftColor = getColorForKey(record.colorKey);
		card.classList.add('has-color-key');
	}

	if (record.coverSrc) {
		const thumbWrap = card.createDiv({ cls: 'release-timeline-base-view-card-cover' });
		thumbWrap.createEl('img', {
			attr: {
				src: record.coverSrc,
				alt: record.displayName,
				loading: 'lazy',
			},
		});
	}

	const body = card.createDiv({ cls: 'release-timeline-base-view-card-body' });
	appendNoteContent(body, record, false, options);
	return card;
}

function populateItemCell(
	cell: HTMLTableCellElement,
	records: TimelineRecord[],
	options: TimelineRenderOptions,
): void {
	if (records.length === 0) {
		cell.classList.add('is-empty');
		cell.textContent = '—';
		return;
	}

	if (options.itemLayout === 'cards') {
		const grid = cell.createDiv({ cls: 'release-timeline-base-view-cards' });
		for (const record of records) {
			appendCardItem(grid, record, options);
		}
		return;
	}

	// Inline layout: never render bullets alongside inline delimiters.
	records.forEach((record, index) => {
		if (index > 0) {
			cell.appendChild(activeDocument.createTextNode(options.inlineDelimiter));
		}
		appendNoteContent(cell, record, false, options);
	});
}

function populateSingleStackedCell(
	cell: HTMLTableCellElement,
	record: TimelineRecord | null,
	options: TimelineRenderOptions,
): void {
	if (!record) {
		cell.classList.add('is-empty');
		cell.textContent = '—';
		return;
	}

	if (record.coverSrc) {
		appendCardItem(cell, record, options);
		return;
	}

	appendNoteContent(cell, record, options.bulletPoints, options);
}

function getAccentClass(index: number, alternationEnabled: boolean): 'primary' | 'alternate' {
	return alternationEnabled && index % 2 === 1 ? 'alternate' : 'primary';
}

function rowCountForPeriod(row: TimelineRow, itemLayout: ItemLayout): number {
	if (itemLayout === 'stacked') {
		return Math.max(row.items.length, 1);
	}
	return 1;
}

function rowCountWithGap(row: TimelineRow, itemLayout: ItemLayout, isLastRow: boolean): number {
	return rowCountForPeriod(row, itemLayout) + (isLastRow ? 0 : 1);
}

function groupRowsByYear(rows: TimelineRow[]): TimelineRow[][] {
	const groups: TimelineRow[][] = [];
	let currentYear: string | null = null;
	let currentGroup: TimelineRow[] = [];

	for (const row of rows) {
		if (currentYear !== null && row.year !== currentYear) {
			groups.push(currentGroup);
			currentGroup = [];
		}
		currentYear = row.year;
		currentGroup.push(row);
	}

	if (currentGroup.length > 0) {
		groups.push(currentGroup);
	}

	return groups;
}

function expandRowsWithState(rows: TimelineRow[], expandedKeys: Set<string>): TimelineRow[] {
	const result: TimelineRow[] = [];
	rows.forEach((row, index) => {
		const key = `${row.kind}:${row.label}:${index}`;
		if (row.collapsedRows && row.collapsedRows.length > 0 && expandedKeys.has(key)) {
			result.push(...row.collapsedRows);
		} else {
			result.push(row);
		}
	});
	return result;
}

function createJumpBar(
	parent: HTMLElement,
	rows: TimelineRow[],
	scrollRoot: HTMLElement,
): void {
	const uniqueYears: string[] = [];
	const seen = new Set<string>();
	for (const row of rows) {
		if (!seen.has(row.year)) {
			seen.add(row.year);
			uniqueYears.push(row.year);
		}
	}

	if (uniqueYears.length <= 1) {
		return;
	}

	const nav = parent.createDiv({ cls: 'release-timeline-base-view-jump-bar' });
	for (const year of uniqueYears) {
		const btn = nav.createEl('button', {
			cls: 'release-timeline-base-view-jump-pill',
			text: year,
			attr: { type: 'button' },
		});
		btn.addEventListener('click', () => {
			const target = scrollRoot.querySelector(`[data-timeline-year="${CSS.escape(year)}"]`);
			if (target && target.instanceOf(HTMLElement)) {
				target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
			}
		});
	}
}

function appendPeriodLabelContent(
	cell: HTMLElement,
	label: string,
	row: TimelineRow,
	options: TimelineRenderOptions,
	onToggleExpand?: () => void,
	showTodayPill = true,
): void {
	const hasCollapsed = Boolean(row.collapsedRows && row.collapsedRows.length > 0);
	if (hasCollapsed && onToggleExpand) {
		cell.classList.add('is-collapsible');
		cell.setAttribute('title', `Click to expand ${row.collapsedRows?.length ?? 0} empty periods`);
		const btn = cell.createEl('button', {
			cls: 'release-timeline-base-view-expand-btn',
			text: `${label} ▸`,
			attr: { type: 'button' },
		});
		btn.addEventListener('click', (event) => {
			event.stopPropagation();
			onToggleExpand();
		});
	} else {
		cell.createSpan({ text: label });
	}

	if (options.showTodayMarker && row.isCurrentPeriod) {
		cell.setAttribute('title', 'Current period (Today)');
		if (showTodayPill) {
			cell.createSpan({ cls: 'release-timeline-base-view-today-pill', text: 'Today' });
		}
	}
}

function buildColGroup(
	table: HTMLTableElement,
	singleTier: boolean,
	options: TimelineRenderOptions,
	hasRangeLabels: boolean,
): void {
	const colgroup = table.createEl('colgroup');
	const yearCol = colgroup.createEl('col', { cls: 'release-timeline-base-view-col-year' });
	if (hasRangeLabels) {
		yearCol.classList.add('is-wide');
	}

	if (singleTier) {
		if (options.showYearBar) {
			colgroup.createEl('col', { cls: 'release-timeline-base-view-col-bar' });
		}
		colgroup.createEl('col', { cls: 'release-timeline-base-view-col-items' });
		return;
	}

	if (options.showYearBar) {
		colgroup.createEl('col', { cls: 'release-timeline-base-view-col-bar' });
	}
	const secondaryCol = colgroup.createEl('col', {
		cls: [
			'release-timeline-base-view-col-secondary',
			options.mode === 'week' ? 'is-week' : '',
		].filter(Boolean),
	});
	secondaryCol.dataset.mode = options.mode;
	colgroup.createEl('col', { cls: 'release-timeline-base-view-col-bar' });
	colgroup.createEl('col', { cls: 'release-timeline-base-view-col-items' });
}

function renderTableLayout(
	rawRows: TimelineRow[],
	options: TimelineRenderOptions,
	expandedKeys: Set<string>,
	onRerender: () => void,
): HTMLTableElement {
	const rows = expandRowsWithState(rawRows, expandedKeys);
	const singleTier = isSingleTierMode(options.mode);
	const columnCount = singleTier
		? (options.showYearBar ? 3 : 2)
		: (options.showYearBar ? 5 : 4);

	if (rows.length === 0) {
		return createErrorTable('No matching notes were found for this timeline.', columnCount);
	}

	const table = createEl('table', { cls: ['release-timeline-base-view', 'release-timeline-base-view-bases'] });
	table.dataset.releaseTimelineViewInstance = options.instanceId;
	table.dataset.mode = options.mode;
	table.dataset.itemLayout = options.itemLayout;
	table.dataset.accentAlternationMode = options.accentAlternationMode;
	table.dataset.showYearBar = String(options.showYearBar);
	table.dataset.widthMode = options.widthMode;

	if (options.widthMode === 'fixed') {
		table.setCssProps({
			width: `${options.widthPx}px`,
			'max-width': `${options.widthPx}px`,
		});
	}

	const hasRangeLabels = rows.some((row) => row.year.length > 5);
	buildColGroup(table, singleTier, options, hasRangeLabels);

	const tbody = table.createEl('tbody');

	// Map original indices for expand toggle keys
	const expandKeyByRow = new Map<TimelineRow, string>();
	rawRows.forEach((row, index) => {
		expandKeyByRow.set(row, `${row.kind}:${row.label}:${index}`);
	});

	if (singleTier) {
		rows.forEach((row, rowIndex) => {
			const itemRows: Array<TimelineRecord | null> = options.itemLayout === 'stacked'
				? (row.items.length > 0 ? row.items : [null])
				: [row.items[0] ?? null];
			const periodRowSpan = itemRows.length;
			const accentClass = getAccentClass(
				rowIndex,
				options.accentAlternationMode === 'year' || options.accentAlternationMode === 'both',
			);
			const expandKey = expandKeyByRow.get(row);

			itemRows.forEach((itemRecord, itemIndex) => {
				const tr = tbody.createEl('tr', {
					cls: ['release-timeline-base-view-row', `release-timeline-base-view-row--${row.kind}`],
				});
				if (row.empty) {
					tr.classList.add('is-empty');
				}
				if (options.showTodayMarker && row.isCurrentPeriod) {
					tr.classList.add('is-current-period');
				}

				if (itemIndex === 0) {
					tr.dataset.timelineYear = row.year;
					const yearCell = tr.createEl('th', {
						cls: 'release-timeline-base-view-period release-timeline-base-view-period--year',
					});
					yearCell.scope = 'row';
					yearCell.rowSpan = periodRowSpan;
					yearCell.dataset.releaseKind = row.kind;
					yearCell.dataset.state = row.empty ? 'empty' : 'existing';
					appendPeriodLabelContent(
						yearCell,
						row.label,
						row,
						options,
						expandKey ? () => {
							expandedKeys.add(expandKey);
							onRerender();
						} : undefined,
						false,
					);

					if (options.showYearBar) {
						const barCell = tr.createEl('td', {
							cls: ['release-timeline-base-view-year-bar', `release-timeline-base-view-year-bar--${accentClass}`],
						});
						barCell.rowSpan = periodRowSpan;
						if (itemRecord?.colorKey && periodRowSpan === 1) {
							barCell.style.backgroundColor = getColorForKey(itemRecord.colorKey);
						}
					}
				}

				const itemCell = tr.createEl('td', {
					cls: ['release-timeline-base-view-items', 'release-timeline-base-view-items--base'],
				});
				if (options.itemLayout === 'stacked') {
					populateSingleStackedCell(itemCell, itemRecord, options);
				} else {
					populateItemCell(itemCell, row.items, options);
				}
			});

			if (rowIndex < rows.length - 1) {
				const gapRow = tbody.createEl('tr', {
					cls: ['release-timeline-base-view-row', 'release-timeline-base-view-row--gap', 'release-timeline-base-view-row--year-gap'],
				});
				gapRow.createEl('td', {
					cls: 'release-timeline-base-view-gap',
					attr: { colspan: String(columnCount) },
				});
			}
		});

		return table;
	}

	// Two-tier layout: Quarter, Month, Week
	const yearGroups = groupRowsByYear(rows);
	const yearSpanColumns = options.showYearBar ? 2 : 1;
	const monthGapColSpan = columnCount - yearSpanColumns;
	let periodIndex = 0;

	yearGroups.forEach((yearGroup, yearGroupIndex) => {
		const yearRowSpan = yearGroup.reduce(
			(sum, row, index) => sum + rowCountWithGap(row, options.itemLayout, index === yearGroup.length - 1),
			0,
		);
		const yearAccentClass = getAccentClass(
			yearGroupIndex,
			options.accentAlternationMode === 'year' || options.accentAlternationMode === 'both',
		);
		let yearCellDrawn = false;
		let lastWeekMonthLabel: string | undefined;

		yearGroup.forEach((row, rowIndex) => {
			const periodRows = rowCountForPeriod(row, options.itemLayout);
			const monthAccentClass = getAccentClass(
				periodIndex,
				options.accentAlternationMode === 'month' || options.accentAlternationMode === 'both',
			);
			periodIndex += 1;

			let secondaryLabel = row.subLabel ?? row.monthLabel ?? row.label;
			if (options.mode === 'week' && row.kind === 'week' && row.monthLabel) {
				if (row.monthLabel !== lastWeekMonthLabel) {
					secondaryLabel = `${row.monthLabel} · ${secondaryLabel}`;
					lastWeekMonthLabel = row.monthLabel;
				}
			} else {
				lastWeekMonthLabel = row.monthLabel;
			}

			const itemRows: Array<TimelineRecord | null> = options.itemLayout === 'stacked'
				? (row.items.length > 0 ? row.items : [null])
				: [row.items[0] ?? null];
			const expandKey = expandKeyByRow.get(row);

			itemRows.forEach((itemRecord, itemIndex) => {
				const tr = tbody.createEl('tr', {
					cls: ['release-timeline-base-view-row', `release-timeline-base-view-row--${row.kind}`],
				});
				if (row.empty) {
					tr.classList.add('is-empty');
				}
				if (options.showTodayMarker && row.isCurrentPeriod) {
					tr.classList.add('is-current-period');
				}

				if (!yearCellDrawn) {
					tr.dataset.timelineYear = row.year;
					const yearCell = tr.createEl('th', {
						cls: 'release-timeline-base-view-period release-timeline-base-view-period--year',
						text: row.year,
					});
					yearCell.scope = 'row';
					yearCell.rowSpan = yearRowSpan;
					yearCell.dataset.releaseKind = row.kind;
					yearCell.dataset.state = row.empty ? 'empty' : 'existing';

					if (options.showYearBar) {
						const yearBarCell = tr.createEl('td', {
							cls: ['release-timeline-base-view-year-bar', `release-timeline-base-view-year-bar--${yearAccentClass}`],
						});
						yearBarCell.rowSpan = yearRowSpan;
					}

					yearCellDrawn = true;
				}

				if (itemIndex === 0) {
					const monthCell = tr.createEl('th', {
						cls: 'release-timeline-base-view-period release-timeline-base-view-period--secondary',
					});
					monthCell.scope = 'row';
					monthCell.rowSpan = periodRows;
					monthCell.dataset.releaseKind = row.kind;
					monthCell.dataset.state = row.empty ? 'empty' : 'existing';
					appendPeriodLabelContent(
						monthCell,
						secondaryLabel,
						row,
						options,
						expandKey ? () => {
							expandedKeys.add(expandKey);
							onRerender();
						} : undefined,
						false,
					);
				}

				const accentCell = tr.createEl('td', {
					cls: ['release-timeline-base-view-accent-cell', `release-timeline-base-view-accent-cell--${monthAccentClass}`],
				});
				if (itemRecord?.colorKey && options.itemLayout === 'stacked') {
					accentCell.style.backgroundColor = getColorForKey(itemRecord.colorKey);
				}

				const itemCell = tr.createEl('td', {
					cls: ['release-timeline-base-view-items', 'release-timeline-base-view-items--base'],
				});
				if (options.itemLayout === 'stacked') {
					populateSingleStackedCell(itemCell, itemRecord, options);
				} else {
					populateItemCell(itemCell, row.items, options);
				}
			});

			if (rowIndex < yearGroup.length - 1) {
				const gapRow = tbody.createEl('tr', {
					cls: ['release-timeline-base-view-row', 'release-timeline-base-view-row--gap', 'release-timeline-base-view-row--month-gap'],
				});
				gapRow.createEl('td', {
					cls: 'release-timeline-base-view-gap',
					attr: { colspan: String(monthGapColSpan) },
				});
			}
		});

		if (yearGroupIndex < yearGroups.length - 1) {
			const gapRow = tbody.createEl('tr', {
				cls: ['release-timeline-base-view-row', 'release-timeline-base-view-row--gap', 'release-timeline-base-view-row--year-gap'],
			});
			gapRow.createEl('td', {
				cls: 'release-timeline-base-view-gap',
				attr: { colspan: String(columnCount) },
			});
		}
	});

	return table;
}

function renderSpineLayout(
	rawRows: TimelineRow[],
	options: TimelineRenderOptions,
	expandedKeys: Set<string>,
	onRerender: () => void,
): HTMLElement {
	const rows = expandRowsWithState(rawRows, expandedKeys);
	const wrapper = createDiv({ cls: 'release-timeline-base-view-spine' });
	if (options.widthMode === 'fixed') {
		wrapper.setCssProps({ 'max-width': `${options.widthPx}px` });
	}

	const expandKeyByRow = new Map<TimelineRow, string>();
	rawRows.forEach((row, index) => {
		expandKeyByRow.set(row, `${row.kind}:${row.label}:${index}`);
	});

	const yearGroups = groupRowsByYear(rows);
	let periodIndex = 0;

	yearGroups.forEach((yearGroup, yearGroupIndex) => {
		const yearSection = wrapper.createDiv({ cls: 'release-timeline-base-view-spine-year' });
		const yearLabel = yearGroup[0].year;
		yearSection.dataset.timelineYear = yearLabel;

		if (!isSingleTierMode(options.mode)) {
			yearSection.createDiv({ cls: 'release-timeline-base-view-spine-year-heading', text: yearLabel });
		}

		const list = yearSection.createDiv({ cls: 'release-timeline-base-view-spine-list' });

		yearGroup.forEach((row) => {
			const accentClass = getAccentClass(
				periodIndex,
				options.accentAlternationMode === 'month' ||
				options.accentAlternationMode === 'both' ||
				(isSingleTierMode(options.mode) && options.accentAlternationMode === 'year'),
			);
			const yearAccentClass = getAccentClass(
				yearGroupIndex,
				options.accentAlternationMode === 'year' || options.accentAlternationMode === 'both',
			);
			const chosenAccent = isSingleTierMode(options.mode) ? yearAccentClass : accentClass;
			periodIndex += 1;

			const entryEl = list.createDiv({ cls: 'release-timeline-base-view-spine-entry' });
			if (row.empty) {
				entryEl.classList.add('is-empty');
			}
			if (options.showTodayMarker && row.isCurrentPeriod) {
				entryEl.classList.add('is-current-period');
			}

			const periodEl = entryEl.createDiv({ cls: 'release-timeline-base-view-spine-period' });
			const label = isSingleTierMode(options.mode) ? row.label : (row.subLabel ?? row.monthLabel ?? row.label);
			const expandKey = expandKeyByRow.get(row);
			appendPeriodLabelContent(
				periodEl,
				label,
				row,
				options,
				expandKey ? () => {
					expandedKeys.add(expandKey);
					onRerender();
				} : undefined,
			);

			const markerEl = entryEl.createDiv({ cls: 'release-timeline-base-view-spine-marker' });
			markerEl.createSpan({ cls: ['release-timeline-base-view-spine-dot', `is-${chosenAccent}`] });

			const contentEl = entryEl.createDiv({ cls: 'release-timeline-base-view-spine-content' });
			if (row.items.length === 0) {
				contentEl.createSpan({ cls: 'is-empty', text: '—' });
			} else if (options.itemLayout === 'cards') {
				const grid = contentEl.createDiv({ cls: 'release-timeline-base-view-cards' });
				for (const record of row.items) {
					appendCardItem(grid, record, options);
				}
			} else if (options.itemLayout === 'inline') {
				row.items.forEach((record, index) => {
					if (index > 0) {
						contentEl.appendChild(activeDocument.createTextNode(options.inlineDelimiter));
					}
					appendNoteContent(contentEl, record, false, options);
				});
			} else {
				const stack = contentEl.createDiv({ cls: 'release-timeline-base-view-spine-stack' });
				for (const record of row.items) {
					if (record.coverSrc) {
						appendCardItem(stack, record, options);
					} else {
						appendNoteContent(stack, record, options.bulletPoints, options);
					}
				}
			}
		});
	});

	return wrapper;
}

function createBentLeaderSvg(accentClass: 'primary' | 'alternate', customColor?: string): SVGSVGElement {
	const svgNS = 'http://www.w3.org/2000/svg';
	const svg = activeDocument.createElementNS(svgNS, 'svg');
	svg.setAttribute('class', `release-timeline-base-view-hleader is-${accentClass}`);
	svg.setAttribute('viewBox', '0 0 36 40');
	svg.setAttribute('width', '36');
	svg.setAttribute('height', '40');
	svg.setAttribute('aria-hidden', 'true');

	const path = activeDocument.createElementNS(svgNS, 'path');
	// Line comes straight down from axis dot (x=8, y=0 -> y=16), then bends at a 45deg diagonal (x=8 -> x=30, y=16 -> y=38)
	path.setAttribute('d', 'M 8 0 L 8 16 L 30 38');
	path.setAttribute('fill', 'none');
	path.setAttribute('stroke-width', '2');
	path.setAttribute('stroke-linecap', 'round');
	path.setAttribute('stroke-linejoin', 'round');
	if (customColor) {
		path.style.stroke = customColor;
	}
	svg.appendChild(path);
	return svg;
}

const HORIZONTAL_MAX_VISIBLE_ITEMS = 3;

function renderHorizontalLayout(
	rawRows: TimelineRow[],
	options: TimelineRenderOptions,
	expandedKeys: Set<string>,
	onRerender: () => void,
): HTMLElement {
	const rows = expandRowsWithState(rawRows, expandedKeys);
	const singleTier = isSingleTierMode(options.mode);
	const strip = createDiv({ cls: 'release-timeline-base-view-horizontal' });

	const track = strip.createDiv({ cls: 'release-timeline-base-view-htrack' });

	const expandKeyByRow = new Map<TimelineRow, string>();
	rawRows.forEach((row, index) => {
		expandKeyByRow.set(row, `${row.kind}:${row.label}:${index}`);
	});

	let activePopover: HTMLElement | null = null;
	const closePopover = () => {
		if (activePopover) {
			activePopover.remove();
			activePopover = null;
		}
	};

	strip.addEventListener('click', (event) => {
		if (activePopover && !activePopover.contains(event.target as Node)) {
			closePopover();
		}
	});

	let lastYear: string | null = null;

	rows.forEach((row, index) => {
		const isEmpty = row.items.length === 0;
		const hasCollapsed = Boolean(row.collapsedRows && row.collapsedRows.length > 0);
		const accentClass = getAccentClass(index, options.accentAlternationMode !== 'none');
		const firstColorKey = row.items.find((item) => item.colorKey)?.colorKey;
		const customColor = firstColorKey ? getColorForKey(firstColorKey) : undefined;
		const visibleItems = row.items.slice(0, HORIZONTAL_MAX_VISIBLE_ITEMS);
		const hiddenCount = Math.max(0, row.items.length - visibleItems.length);

		const node = track.createDiv({
			cls: [
				'release-timeline-base-view-hnode',
				isEmpty ? 'is-empty' : 'has-items',
				visibleItems.length > 1 ? 'is-multi' : '',
				hasCollapsed ? 'is-collapsible' : '',
			].filter(Boolean),
		});
		node.dataset.timelineYear = row.year;
		if (options.showTodayMarker && row.isCurrentPeriod) {
			node.classList.add('is-current-period');
		}

		// Top area above the horizontal axis: year marker (on change) + compact period label
		const top = node.createDiv({ cls: 'release-timeline-base-view-hnode-top' });
		if (!singleTier && row.year !== lastYear) {
			top.createSpan({ cls: 'release-timeline-base-view-hnode-year', text: row.year });
		}
		lastYear = row.year;

		const periodLabelText = singleTier
			? row.label
			: (row.subLabel ?? row.monthLabel ?? row.label);
		const labelWrap = top.createDiv({ cls: 'release-timeline-base-view-hnode-period' });
		const expandKey = expandKeyByRow.get(row);
		appendPeriodLabelContent(
			labelWrap,
			periodLabelText,
			row,
			options,
			expandKey ? () => {
				expandedKeys.add(expandKey);
				onRerender();
			} : undefined,
		);

		if (hiddenCount > 0) {
			const moreBtn = labelWrap.createEl('button', {
				cls: 'release-timeline-base-view-hnode-more',
				text: `+${hiddenCount}`,
				attr: {
					type: 'button',
					title: `Show all ${row.items.length} items in ${row.label}`,
				},
			});
			moreBtn.addEventListener('click', (event) => {
				event.stopPropagation();
				const wasSameNode = activePopover?.dataset.nodeIndex === String(index);
				closePopover();
				if (wasSameNode) {
					return;
				}

				const popover = node.createDiv({ cls: 'release-timeline-base-view-hnode-popover' });
				popover.dataset.nodeIndex = String(index);
				popover.addEventListener('click', (e) => e.stopPropagation());

				const header = popover.createDiv({ cls: 'release-timeline-base-view-hnode-popover-header' });
				header.createSpan({ text: `${row.label} (${row.items.length})` });
				const closeBtn = header.createEl('button', {
					cls: 'release-timeline-base-view-hnode-popover-close',
					text: '×',
					attr: { type: 'button', 'aria-label': 'Close' },
				});
				closeBtn.addEventListener('click', () => closePopover());

				const listEl = popover.createDiv({ cls: 'release-timeline-base-view-hnode-popover-list' });
				for (const record of row.items) {
					if (options.itemLayout === 'cards' || record.coverSrc) {
						appendCardItem(listEl, record, options);
					} else {
						const itemEl = listEl.createDiv({ cls: 'release-timeline-base-view-hnode-popover-item' });
						appendNoteContent(itemEl, record, options.bulletPoints, options);
					}
				}

				activePopover = popover;
			});
		}

		// Axis dot sitting on the continuous horizontal rail
		const axis = node.createDiv({ cls: 'release-timeline-base-view-hnode-axis' });
		const dot = axis.createSpan({
			cls: ['release-timeline-base-view-hnode-dot', `is-${accentClass}`],
		});
		if (customColor) {
			dot.style.backgroundColor = customColor;
		}

		// Below axis: vertical drop + diagonal leader line + angled condensed content
		if (!isEmpty) {
			const callout = node.createDiv({ cls: 'release-timeline-base-view-hnode-callout' });
			callout.appendChild(createBentLeaderSvg(accentClass, customColor));

			const angled = callout.createDiv({ cls: 'release-timeline-base-view-hnode-angled' });
			const itemsStack = angled.createDiv({ cls: 'release-timeline-base-view-hnode-items' });
			for (const record of visibleItems) {
				if (options.itemLayout === 'cards' || record.coverSrc) {
					appendCardItem(itemsStack, record, options);
				} else {
					const itemEl = itemsStack.createDiv({ cls: 'release-timeline-base-view-hnode-item' });
					appendNoteContent(itemEl, record, false, options);
				}
			}
		}
	});

	if (options.fitHorizontalToWidth) {
		strip.classList.add('is-fit-width');

		const applyFitScale = () => {
			if (!strip.isConnected) {
				return;
			}
			track.style.transform = '';
			const availableWidth = strip.clientWidth - 24;
			// Account for angled label overhang on the rightmost node
			const naturalWidth = track.scrollWidth + 110;
			if (availableWidth <= 0 || naturalWidth <= availableWidth) {
				strip.classList.remove('is-scaled');
				return;
			}
			const ratio = Math.max(0.35, Math.min(1, availableWidth / naturalWidth));
			track.style.transform = `scale(${ratio.toFixed(4)})`;
			strip.classList.toggle('is-scaled', ratio < 1);
		};

		const rafId = window.requestAnimationFrame(applyFitScale);
		const observer = new ResizeObserver(() => applyFitScale());
		observer.observe(strip);

		options.registerCleanup?.(() => {
			window.cancelAnimationFrame(rafId);
			observer.disconnect();
		});
	}

	return strip;
}

function renderHorizontalStackedLayout(
	rawRows: TimelineRow[],
	options: TimelineRenderOptions,
	expandedKeys: Set<string>,
	onRerender: () => void,
): HTMLElement {
	const rows = expandRowsWithState(rawRows, expandedKeys);
	const singleTier = isSingleTierMode(options.mode);
	const strip = createDiv({ cls: ['release-timeline-base-view-horizontal', 'is-stacked'] });

	const track = strip.createDiv({ cls: 'release-timeline-base-view-htrack' });

	const expandKeyByRow = new Map<TimelineRow, string>();
	rawRows.forEach((row, index) => {
		expandKeyByRow.set(row, `${row.kind}:${row.label}:${index}`);
	});

	let lastYear: string | null = null;

	rows.forEach((row, index) => {
		const isEmpty = row.items.length === 0;
		const hasCollapsed = Boolean(row.collapsedRows && row.collapsedRows.length > 0);
		const accentClass = getAccentClass(index, options.accentAlternationMode !== 'none');
		const firstColorKey = row.items.find((item) => item.colorKey)?.colorKey;
		const customColor = firstColorKey ? getColorForKey(firstColorKey) : undefined;

		const node = track.createDiv({
			cls: [
				'release-timeline-base-view-hnode',
				'is-stacked-node',
				isEmpty ? 'is-empty' : 'has-items',
				hasCollapsed ? 'is-collapsible' : '',
			].filter(Boolean),
		});
		node.dataset.timelineYear = row.year;
		if (options.showTodayMarker && row.isCurrentPeriod) {
			node.classList.add('is-current-period');
		}

		const top = node.createDiv({ cls: 'release-timeline-base-view-hnode-top' });
		if (!singleTier && row.year !== lastYear) {
			top.createSpan({ cls: 'release-timeline-base-view-hnode-year', text: row.year });
		}
		lastYear = row.year;

		const periodLabelText = singleTier
			? row.label
			: (row.subLabel ?? row.monthLabel ?? row.label);
		const labelWrap = top.createDiv({ cls: 'release-timeline-base-view-hnode-period' });
		const expandKey = expandKeyByRow.get(row);
		appendPeriodLabelContent(
			labelWrap,
			periodLabelText,
			row,
			options,
			expandKey ? () => {
				expandedKeys.add(expandKey);
				onRerender();
			} : undefined,
		);

		const axis = node.createDiv({ cls: 'release-timeline-base-view-hnode-axis' });
		const dot = axis.createSpan({
			cls: ['release-timeline-base-view-hnode-dot', `is-${accentClass}`],
		});
		if (customColor) {
			dot.style.backgroundColor = customColor;
		}

		if (!isEmpty) {
			const stemWrap = node.createDiv({ cls: 'release-timeline-base-view-hnode-vbody' });
			const stem = stemWrap.createDiv({
				cls: ['release-timeline-base-view-hnode-vstem', `is-${accentClass}`],
			});
			if (customColor) {
				stem.style.backgroundColor = customColor;
			}

			const list = stemWrap.createDiv({
				cls: ['release-timeline-base-view-hnode-vlist', `is-${accentClass}`],
			});
			if (customColor) {
				list.style.borderLeftColor = customColor;
			}

			for (const record of row.items) {
				if (options.itemLayout === 'cards' || record.coverSrc) {
					appendCardItem(list, record, options);
				} else {
					const itemEl = list.createDiv({ cls: 'release-timeline-base-view-hnode-vitem' });
					appendNoteContent(itemEl, record, options.bulletPoints && options.itemLayout === 'stacked', options);
				}
			}
		}
	});

	if (options.fitHorizontalToWidth) {
		strip.classList.add('is-fit-width');

		const applyFitScale = () => {
			if (!strip.isConnected) {
				return;
			}
			track.style.transform = '';
			const availableWidth = strip.clientWidth - 16;
			const naturalWidth = track.scrollWidth;
			if (availableWidth <= 0 || naturalWidth <= availableWidth) {
				strip.classList.remove('is-scaled');
				return;
			}
			const ratio = Math.max(0.35, Math.min(1, availableWidth / naturalWidth));
			track.style.transform = `scale(${ratio.toFixed(4)})`;
			strip.classList.toggle('is-scaled', ratio < 1);
		};

		const rafId = window.requestAnimationFrame(applyFitScale);
		const observer = new ResizeObserver(() => applyFitScale());
		observer.observe(strip);

		options.registerCleanup?.(() => {
			window.cancelAnimationFrame(rafId);
			observer.disconnect();
		});
	}

	return strip;
}

export function renderTimelineTable(rows: TimelineRow[], options: TimelineRenderOptions): HTMLTableElement {
	return renderTableLayout(rows, options, new Set<string>(), () => {});
}

export function renderTimelineInto(
	container: HTMLElement,
	groups: TimelineGroupInput[],
	options: TimelineRenderOptions,
): void {
	const expandedKeys = new Set<string>();

	const renderAll = () => {
		container.empty();

		const allRows = groups.flatMap((group) => group.rows);
		if (allRows.length === 0) {
			container.appendChild(createErrorTable('No matching notes were found for this timeline.'));
			return;
		}

		const scrollWrap = container.createDiv({ cls: 'release-timeline-base-view-scroll' });
		if (options.showJumpBar) {
			createJumpBar(container, allRows, scrollWrap);
			// Keep jump bar above scroll container
			container.insertBefore(container.lastElementChild as Node, scrollWrap);
		}

		const hasGroupHeadings = groups.length > 1 || Boolean(groups[0]?.groupLabel);

		for (const group of groups) {
			const groupContainer = hasGroupHeadings
				? scrollWrap.createDiv({ cls: 'release-timeline-base-view-group' })
				: scrollWrap;

			if (hasGroupHeadings && group.groupLabel) {
				groupContainer.createDiv({
					cls: 'release-timeline-base-view-group-heading',
					text: group.groupLabel,
				});
			}

			if (options.timelineStyle === 'spine') {
				groupContainer.appendChild(renderSpineLayout(group.rows, options, expandedKeys, renderAll));
			} else if (options.timelineStyle === 'horizontal') {
				groupContainer.appendChild(renderHorizontalLayout(group.rows, options, expandedKeys, renderAll));
			} else if (options.timelineStyle === 'horizontalStacked') {
				groupContainer.appendChild(renderHorizontalStackedLayout(group.rows, options, expandedKeys, renderAll));
			} else {
				groupContainer.appendChild(renderTableLayout(group.rows, options, expandedKeys, renderAll));
			}
		}
	};

	renderAll();
}
