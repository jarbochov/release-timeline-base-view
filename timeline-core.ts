export type TimelineMode = 'decade' | 'year' | 'quarter' | 'month' | 'week';
export type SortDirection = 'asc' | 'desc';
export type WeekDisplayFormat = 'weekNames' | 'dateNames' | 'monthDayRange';
export type ItemLayout = 'stacked' | 'inline' | 'cards';
export type TimelineStyle = 'table' | 'spine' | 'horizontal' | 'horizontalStacked';
export type WidthMode = 'auto' | 'fixed';
export type InlinePropertyStyle = 'stacked' | 'pills';
export type AccentAlternationMode = 'none' | 'year' | 'month' | 'both';
export type DatePrecision = 'year' | 'month' | 'day';

export interface TimelineDate {
	year: number;
	month: number;
	day: number;
	precision: DatePrecision;
	timestamp: number;
}

export interface TimelineInlineProperty {
	propertyId: string;
	label: string;
	value: string;
	values?: string[];
}

export interface TimelineRecord {
	filePath: string;
	displayName: string;
	date: TimelineDate;
	inlineProperties: TimelineInlineProperty[];
	coverSrc?: string;
	colorKey?: string;
}

export interface TimelineRow {
	kind: TimelineMode;
	label: string;
	subLabel?: string;
	year: string;
	month?: string;
	week?: string;
	quarter?: string;
	monthLabel?: string;
	items: TimelineRecord[];
	empty: boolean;
	collapsedRows?: TimelineRow[];
	isCurrentPeriod?: boolean;
	isUnspecifiedPeriod?: boolean;
}

export interface TimelineBuildOptions {
	mode: TimelineMode;
	sortDirection: SortDirection;
	itemLayout: ItemLayout;
	timelineStyle: TimelineStyle;
	inlineDelimiter: string;
	widthMode: WidthMode;
	widthPx: number;
	fontSizePercent: number;
	accentAlternationMode: AccentAlternationMode;
	showYearBar: boolean;
	collapseEmptyYears: boolean;
	collapseLimit: number;
	collapseEmptyWeeks: boolean;
	collapseEmptyMonths: boolean;
	weekDisplayFormat: WeekDisplayFormat;
	showItemDates: boolean;
	showTodayMarker: boolean;
	showJumpBar: boolean;
	fitHorizontalToWidth: boolean;
	inlinePropertyStyle: InlinePropertyStyle;
	today?: TimelineDate;
}

const DEFAULT_COLLAPSE_LIMIT = 2;
const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

function makeTimelineDate(year: number, month: number, day: number, precision: DatePrecision): TimelineDate | null {
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
		return null;
	}
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		return null;
	}
	const jsDate = new Date(year, month - 1, day);
	if (jsDate.getFullYear() !== year || jsDate.getMonth() !== month - 1 || jsDate.getDate() !== day) {
		return null;
	}
	return {
		year,
		month,
		day,
		precision,
		timestamp: jsDate.getTime(),
	};
}

export function getTodayTimelineDate(): TimelineDate {
	const now = new Date();
	return {
		year: now.getFullYear(),
		month: now.getMonth() + 1,
		day: now.getDate(),
		precision: 'day',
		timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
	};
}

export function parseTimelineDate(input: unknown): TimelineDate | null {
	if (input === null || input === undefined) {
		return null;
	}

	if (typeof input === 'object' && input !== null) {
		if (input instanceof Date) {
			if (Number.isNaN(input.getTime())) {
				return null;
			}
			return makeTimelineDate(input.getFullYear(), input.getMonth() + 1, input.getDate(), 'day');
		}

		const maybeTimeline = input as Partial<TimelineDate>;
		if (
			typeof maybeTimeline.year === 'number' &&
			typeof maybeTimeline.month === 'number' &&
			typeof maybeTimeline.day === 'number' &&
			(maybeTimeline.precision === 'year' || maybeTimeline.precision === 'month' || maybeTimeline.precision === 'day')
		) {
			return makeTimelineDate(maybeTimeline.year, maybeTimeline.month, maybeTimeline.day, maybeTimeline.precision);
		}
	}

	if (typeof input === 'number') {
		if (!Number.isFinite(input)) {
			return null;
		}
		if (Number.isInteger(input) && input >= 1000 && input <= 9999) {
			return makeTimelineDate(input, 1, 1, 'year');
		}
		const fromMs = new Date(input);
		if (Number.isNaN(fromMs.getTime())) {
			return null;
		}
		return makeTimelineDate(fromMs.getFullYear(), fromMs.getMonth() + 1, fromMs.getDate(), 'day');
	}

	if (typeof input !== 'string') {
		return null;
	}

	const text = input.trim();
	if (!text) {
		return null;
	}

	if (/^\d{4}$/.test(text)) {
		return makeTimelineDate(Number(text), 1, 1, 'year');
	}

	const yearMonthMatch = text.match(/^(\d{4})-(\d{2})$/);
	if (yearMonthMatch) {
		return makeTimelineDate(Number(yearMonthMatch[1]), Number(yearMonthMatch[2]), 1, 'month');
	}

	const isoDateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[\sT])/);
	if (isoDateMatch) {
		return makeTimelineDate(Number(isoDateMatch[1]), Number(isoDateMatch[2]), Number(isoDateMatch[3]), 'day');
	}

	if (/^-?\d{10,15}$/.test(text)) {
		const millis = Number(text);
		if (Number.isFinite(millis)) {
			const fromMs = new Date(millis);
			if (!Number.isNaN(fromMs.getTime())) {
				return makeTimelineDate(fromMs.getFullYear(), fromMs.getMonth() + 1, fromMs.getDate(), 'day');
			}
		}
	}

	const parsed = new Date(text);
	if (!Number.isNaN(parsed.getTime())) {
		return makeTimelineDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate(), 'day');
	}

	return null;
}

function monthShortName(month: number): string {
	return MONTH_SHORT_NAMES[month - 1] ?? '';
}

function getQuarter(month: number): number {
	return Math.floor((month - 1) / 3) + 1;
}

function getDecadeStart(year: number): number {
	return Math.floor(year / 10) * 10;
}

function toUtcDate(year: number, month: number, day: number): Date {
	return new Date(Date.UTC(year, month - 1, day));
}

function addDaysUtc(date: Date, days: number): Date {
	const copy = new Date(date.getTime());
	copy.setUTCDate(copy.getUTCDate() + days);
	return copy;
}

function startOfIsoWeekUtc(date: Date): Date {
	const day = date.getUTCDay();
	const diff = day === 0 ? -6 : 1 - day;
	return addDaysUtc(date, diff);
}

function getIsoWeekInfo(date: Date): { weekYear: number; weekNumber: number } {
	const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const dayNum = target.getUTCDay() || 7;
	target.setUTCDate(target.getUTCDate() + 4 - dayNum);
	const weekYear = target.getUTCFullYear();
	const yearStart = new Date(Date.UTC(weekYear, 0, 1));
	const weekNumber = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return { weekYear, weekNumber };
}

function getIsoWeekKey(weekStartUtc: Date): string {
	const { weekYear, weekNumber } = getIsoWeekInfo(weekStartUtc);
	return `${weekYear}-W${pad2(weekNumber)}`;
}

function formatWeekLabel(weekStartUtc: Date, format: WeekDisplayFormat): string {
	const weekEndUtc = addDaysUtc(weekStartUtc, 6);
	const { weekNumber } = getIsoWeekInfo(weekStartUtc);

	if (format === 'weekNames') {
		return `W${pad2(weekNumber)}`;
	}

	if (format === 'dateNames') {
		return `${weekStartUtc.getUTCFullYear()}-${pad2(weekStartUtc.getUTCMonth() + 1)}-${pad2(weekStartUtc.getUTCDate())}`;
	}

	const startMonth = monthShortName(weekStartUtc.getUTCMonth() + 1);
	const endMonth = monthShortName(weekEndUtc.getUTCMonth() + 1);
	const startDay = weekStartUtc.getUTCDate();
	const endDay = weekEndUtc.getUTCDate();

	if (weekStartUtc.getUTCFullYear() === weekEndUtc.getUTCFullYear() && weekStartUtc.getUTCMonth() === weekEndUtc.getUTCMonth()) {
		return `${startMonth} ${startDay}-${endDay}`;
	}

	return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
}

export function formatItemDateBadge(date: TimelineDate, mode: TimelineMode): string {
	if (mode === 'decade') {
		if (date.precision === 'year') {
			return String(date.year);
		}
		if (date.precision === 'month') {
			return `${monthShortName(date.month)} ${date.year}`;
		}
		return `${monthShortName(date.month)} ${date.day}, ${date.year}`;
	}

	if (mode === 'year' || mode === 'quarter') {
		if (date.precision === 'year') {
			return '';
		}
		if (date.precision === 'month') {
			return monthShortName(date.month);
		}
		return `${monthShortName(date.month)} ${date.day}`;
	}

	if (mode === 'month') {
		if (date.precision === 'day') {
			return String(date.day);
		}
		return '';
	}

	if (date.precision === 'day') {
		return `${monthShortName(date.month)} ${date.day}`;
	}
	return '';
}

function sortRecords(records: TimelineRecord[], direction: SortDirection): TimelineRecord[] {
	return [...records].sort((left, right) => {
		const dateDiff = left.date.timestamp - right.date.timestamp;
		if (dateDiff !== 0) {
			return direction === 'asc' ? dateDiff : -dateDiff;
		}
		return direction === 'asc'
			? left.displayName.localeCompare(right.displayName)
			: right.displayName.localeCompare(left.displayName);
	});
}

function reverseIfNeeded(rows: TimelineRow[], direction: SortDirection): TimelineRow[] {
	return direction === 'desc' ? [...rows].reverse() : rows;
}

function collapseEmptyYearRun(
	rows: TimelineRow[],
	collapseLimit: number,
	kind: 'year' | 'decade',
	direction: SortDirection,
): TimelineRow[] {
	const collapsed: TimelineRow[] = [];
	let emptyRunStart: number | null = null;

	const flushRun = (runEnd: number) => {
		if (emptyRunStart === null) {
			return;
		}

		const runSlice = rows.slice(emptyRunStart, runEnd);
		if (runSlice.length >= collapseLimit) {
			const startLabel = runSlice[0].label;
			const endLabel = runSlice[runSlice.length - 1].label;
			const rangeLabel = startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
			const hasCurrent = runSlice.some((row) => row.isCurrentPeriod);
			collapsed.push({
				kind,
				label: rangeLabel,
				year: rangeLabel,
				items: [],
				empty: true,
				collapsedRows: reverseIfNeeded(runSlice, direction),
				isCurrentPeriod: hasCurrent,
			});
		} else {
			collapsed.push(...runSlice);
		}

		emptyRunStart = null;
	};

	rows.forEach((row, index) => {
		if (row.empty) {
			if (emptyRunStart === null) {
				emptyRunStart = index;
			}
			return;
		}

		flushRun(index);
		collapsed.push(row);
	});

	flushRun(rows.length);
	return collapsed;
}

function buildDecadeRows(records: TimelineRecord[], options: TimelineBuildOptions, today: TimelineDate): TimelineRow[] {
	const sorted = sortRecords(records, options.sortDirection);
	const decades = sorted.map((record) => getDecadeStart(record.date.year));
	const firstDecade = Math.min(...decades);
	const lastDecade = Math.max(...decades);
	const todayDecade = getDecadeStart(today.year);
	const recordsByDecade = new Map<number, TimelineRecord[]>();

	for (const record of sorted) {
		const decade = getDecadeStart(record.date.year);
		const list = recordsByDecade.get(decade) ?? [];
		list.push(record);
		recordsByDecade.set(decade, list);
	}

	const rows: TimelineRow[] = [];
	for (let decade = firstDecade; decade <= lastDecade; decade += 10) {
		const items = sortRecords(recordsByDecade.get(decade) ?? [], options.sortDirection);
		const label = `${decade}s`;
		rows.push({
			kind: 'decade',
			label,
			subLabel: '',
			year: label,
			items,
			empty: items.length === 0,
			isCurrentPeriod: decade === todayDecade,
		});
	}

	if (!options.collapseEmptyYears) {
		return reverseIfNeeded(rows, options.sortDirection);
	}

	const collapsed = collapseEmptyYearRun(rows, options.collapseLimit, 'decade', options.sortDirection);
	return reverseIfNeeded(collapsed, options.sortDirection);
}

function buildYearRows(records: TimelineRecord[], options: TimelineBuildOptions, today: TimelineDate): TimelineRow[] {
	const sorted = sortRecords(records, options.sortDirection);
	const years = sorted.map((record) => record.date.year);
	const firstYear = Math.min(...years);
	const lastYear = Math.max(...years);
	const recordsByYear = new Map<number, TimelineRecord[]>();

	for (const record of sorted) {
		const list = recordsByYear.get(record.date.year) ?? [];
		list.push(record);
		recordsByYear.set(record.date.year, list);
	}

	const rows: TimelineRow[] = [];
	for (let year = firstYear; year <= lastYear; year += 1) {
		const items = sortRecords(recordsByYear.get(year) ?? [], options.sortDirection);
		rows.push({
			kind: 'year',
			label: String(year),
			subLabel: '',
			year: String(year),
			items,
			empty: items.length === 0,
			isCurrentPeriod: year === today.year,
		});
	}

	if (!options.collapseEmptyYears) {
		return reverseIfNeeded(rows, options.sortDirection);
	}

	const collapsed = collapseEmptyYearRun(rows, options.collapseLimit, 'year', options.sortDirection);
	return reverseIfNeeded(collapsed, options.sortDirection);
}

function buildQuarterRows(records: TimelineRecord[], options: TimelineBuildOptions, today: TimelineDate): TimelineRow[] {
	const sorted = sortRecords(records, options.sortDirection);
	const preciseRecords = sorted.filter((record) => record.date.precision !== 'year');
	const yearOnlyByYear = new Map<number, TimelineRecord[]>();

	for (const record of sorted) {
		if (record.date.precision === 'year') {
			const list = yearOnlyByYear.get(record.date.year) ?? [];
			list.push(record);
			yearOnlyByYear.set(record.date.year, list);
		}
	}

	const allYears = sorted.map((record) => record.date.year);
	const minYear = Math.min(...allYears);
	const maxYear = Math.max(...allYears);
	const firstQuarterIndex = preciseRecords.length > 0
		? Math.min(...preciseRecords.map((r) => r.date.year * 4 + (getQuarter(r.date.month) - 1)), minYear * 4)
		: minYear * 4;
	const lastQuarterIndex = preciseRecords.length > 0
		? Math.max(...preciseRecords.map((r) => r.date.year * 4 + (getQuarter(r.date.month) - 1)), maxYear * 4 + 3)
		: maxYear * 4;

	const recordsByQuarter = new Map<string, TimelineRecord[]>();
	for (const record of preciseRecords) {
		const q = getQuarter(record.date.month);
		const key = `${record.date.year}-Q${q}`;
		const list = recordsByQuarter.get(key) ?? [];
		list.push(record);
		recordsByQuarter.set(key, list);
	}

	const todayQuarterKey = `${today.year}-Q${getQuarter(today.month)}`;
	const rows: TimelineRow[] = [];
	const emittedUnspecifiedYears = new Set<number>();

	for (let qIndex = firstQuarterIndex; qIndex <= lastQuarterIndex; qIndex += 1) {
		const year = Math.floor(qIndex / 4);
		const quarterNum = (qIndex % 4) + 1;
		const key = `${year}-Q${quarterNum}`;

		if (!emittedUnspecifiedYears.has(year) && yearOnlyByYear.has(year)) {
			emittedUnspecifiedYears.add(year);
			const unspecifiedItems = sortRecords(yearOnlyByYear.get(year) ?? [], options.sortDirection);
			rows.push({
				kind: 'quarter',
				label: `${year} / —`,
				subLabel: '—',
				year: String(year),
				quarter: `${year}-Q0`,
				items: unspecifiedItems,
				empty: false,
				isUnspecifiedPeriod: true,
			});
		}

		const items = sortRecords(recordsByQuarter.get(key) ?? [], options.sortDirection);
		const qLabel = `Q${quarterNum}`;
		rows.push({
			kind: 'quarter',
			label: `${year} / ${qLabel}`,
			subLabel: qLabel,
			year: String(year),
			quarter: key,
			items,
			empty: items.length === 0,
			isCurrentPeriod: key === todayQuarterKey,
		});
	}

	const visibleRows = options.collapseEmptyMonths ? rows.filter((row) => !row.empty) : rows;
	return reverseIfNeeded(visibleRows, options.sortDirection);
}

function buildMonthRows(records: TimelineRecord[], options: TimelineBuildOptions, today: TimelineDate): TimelineRow[] {
	const sorted = sortRecords(records, options.sortDirection);
	const preciseRecords = sorted.filter((record) => record.date.precision !== 'year');
	const yearOnlyByYear = new Map<number, TimelineRecord[]>();

	for (const record of sorted) {
		if (record.date.precision === 'year') {
			const list = yearOnlyByYear.get(record.date.year) ?? [];
			list.push(record);
			yearOnlyByYear.set(record.date.year, list);
		}
	}

	const allYears = sorted.map((record) => record.date.year);
	const minYear = Math.min(...allYears);
	const maxYear = Math.max(...allYears);

	const firstMonthIndex = preciseRecords.length > 0
		? Math.min(...preciseRecords.map((r) => r.date.year * 12 + (r.date.month - 1)), ...[...yearOnlyByYear.keys()].map((y) => y * 12))
		: minYear * 12;
	const lastMonthIndex = preciseRecords.length > 0
		? Math.max(...preciseRecords.map((r) => r.date.year * 12 + (r.date.month - 1)), ...[...yearOnlyByYear.keys()].map((y) => y * 12))
		: maxYear * 12;

	const recordsByMonth = new Map<string, TimelineRecord[]>();
	for (const record of preciseRecords) {
		const key = `${record.date.year}-${pad2(record.date.month)}`;
		const list = recordsByMonth.get(key) ?? [];
		list.push(record);
		recordsByMonth.set(key, list);
	}

	const todayMonthKey = `${today.year}-${pad2(today.month)}`;
	const rows: TimelineRow[] = [];
	const emittedUnspecifiedYears = new Set<number>();

	for (let mIndex = firstMonthIndex; mIndex <= lastMonthIndex; mIndex += 1) {
		const year = Math.floor(mIndex / 12);
		const month = (mIndex % 12) + 1;
		const key = `${year}-${pad2(month)}`;

		if (!emittedUnspecifiedYears.has(year) && yearOnlyByYear.has(year)) {
			emittedUnspecifiedYears.add(year);
			const unspecifiedItems = sortRecords(yearOnlyByYear.get(year) ?? [], options.sortDirection);
			rows.push({
				kind: 'month',
				label: `${year} / —`,
				subLabel: '—',
				year: String(year),
				month: `${year}-00`,
				monthLabel: '—',
				items: unspecifiedItems,
				empty: false,
				isUnspecifiedPeriod: true,
			});
		}

		const items = sortRecords(recordsByMonth.get(key) ?? [], options.sortDirection);
		const mLabel = monthShortName(month);

		rows.push({
			kind: 'month',
			label: `${year} / ${mLabel}`,
			subLabel: mLabel,
			year: String(year),
			month: key,
			monthLabel: mLabel,
			items,
			empty: items.length === 0,
			isCurrentPeriod: key === todayMonthKey,
		});
	}

	const visibleRows = options.collapseEmptyMonths ? rows.filter((row) => !row.empty) : rows;
	return reverseIfNeeded(visibleRows, options.sortDirection);
}

function buildWeekRows(records: TimelineRecord[], options: TimelineBuildOptions, today: TimelineDate): TimelineRow[] {
	const sorted = sortRecords(records, options.sortDirection);
	const weekStarts = sorted.map((record) => startOfIsoWeekUtc(toUtcDate(record.date.year, record.date.month, record.date.day)));
	const firstWeek = weekStarts.reduce((min, w) => (w.getTime() < min.getTime() ? w : min), weekStarts[0]);
	const lastWeek = weekStarts.reduce((max, w) => (w.getTime() > max.getTime() ? w : max), weekStarts[0]);

	const recordsByWeek = new Map<string, TimelineRecord[]>();
	for (const record of sorted) {
		const weekStart = startOfIsoWeekUtc(toUtcDate(record.date.year, record.date.month, record.date.day));
		const key = getIsoWeekKey(weekStart);
		const list = recordsByWeek.get(key) ?? [];
		list.push(record);
		recordsByWeek.set(key, list);
	}

	const todayWeekKey = getIsoWeekKey(startOfIsoWeekUtc(toUtcDate(today.year, today.month, today.day)));
	const allWeeks: TimelineRow[] = [];

	for (let week = firstWeek; week.getTime() <= lastWeek.getTime(); week = addDaysUtc(week, 7)) {
		const weekKey = getIsoWeekKey(week);
		const anchor = addDaysUtc(week, 3);
		const anchorYear = anchor.getUTCFullYear();
		const anchorMonth = anchor.getUTCMonth() + 1;
		const mLabel = monthShortName(anchorMonth);
		const weekText = formatWeekLabel(week, options.weekDisplayFormat);
		const items = sortRecords(recordsByWeek.get(weekKey) ?? [], options.sortDirection);

		allWeeks.push({
			kind: 'week',
			label: `${anchorYear} / ${mLabel} / ${weekText}`,
			subLabel: weekText,
			year: String(anchorYear),
			month: `${anchorYear}-${pad2(anchorMonth)}`,
			monthLabel: mLabel,
			week: weekKey,
			items,
			empty: items.length === 0,
			isCurrentPeriod: weekKey === todayWeekKey,
		});
	}

	if (!options.collapseEmptyWeeks && !options.collapseEmptyMonths) {
		return reverseIfNeeded(allWeeks, options.sortDirection);
	}

	// Group weeks by month BEFORE filtering empty weeks so empty months can collapse cleanly into a single row.
	const result: TimelineRow[] = [];
	let currentMonth = allWeeks[0]?.month;
	let monthGroup: TimelineRow[] = [];

	const flushMonthGroup = () => {
		if (monthGroup.length === 0) {
			return;
		}

		const totalItems = monthGroup.reduce((sum, row) => sum + row.items.length, 0);
		if (totalItems === 0 && options.collapseEmptyMonths) {
			const first = monthGroup[0];
			const hasCurrent = monthGroup.some((row) => row.isCurrentPeriod);
			result.push({
				kind: 'month',
				label: `${first.year} / ${first.monthLabel ?? ''}`.trim(),
				subLabel: first.monthLabel ?? '',
				year: first.year,
				month: first.month,
				monthLabel: first.monthLabel,
				items: [],
				empty: true,
				collapsedRows: reverseIfNeeded(monthGroup, options.sortDirection),
				isCurrentPeriod: hasCurrent,
			});
		} else if (options.collapseEmptyWeeks) {
			const nonEmptyWeeks = monthGroup.filter((row) => !row.empty);
			result.push(...nonEmptyWeeks);
		} else {
			result.push(...monthGroup);
		}

		monthGroup = [];
	};

	for (const row of allWeeks) {
		if (row.month !== currentMonth) {
			flushMonthGroup();
			currentMonth = row.month;
		}
		monthGroup.push(row);
	}
	flushMonthGroup();

	return reverseIfNeeded(result, options.sortDirection);
}

export function buildTimelineRows(records: TimelineRecord[], options: TimelineBuildOptions): TimelineRow[] {
	if (records.length === 0) {
		return [];
	}

	const today = options.today ?? getTodayTimelineDate();
	const normalizedLimit = Number.isFinite(options.collapseLimit) && options.collapseLimit >= 1
		? Math.floor(options.collapseLimit)
		: DEFAULT_COLLAPSE_LIMIT;

	switch (options.mode) {
		case 'decade':
			return buildDecadeRows(records, { ...options, collapseLimit: normalizedLimit }, today);
		case 'year':
			return buildYearRows(records, { ...options, collapseLimit: normalizedLimit }, today);
		case 'quarter':
			return buildQuarterRows(records, options, today);
		case 'month':
			return buildMonthRows(records, options, today);
		case 'week':
			return buildWeekRows(records, options, today);
	}
}
