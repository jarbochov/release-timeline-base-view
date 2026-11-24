import { buildSync } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const tempDir = mkdtempSync(path.join(os.tmpdir(), 'release-timeline-smoke-'));
const bundlePath = path.join(tempDir, 'timeline-core-test.cjs');

function makeOptions(overrides = {}) {
	return {
		mode: 'year',
		sortDirection: 'asc',
		itemLayout: 'stacked',
		timelineStyle: 'table',
		inlineDelimiter: ', ',
		widthMode: 'auto',
		widthPx: 900,
		fontSizePercent: 80,
		accentAlternationMode: 'both',
		showYearBar: true,
		collapseEmptyYears: true,
		collapseLimit: 2,
		collapseEmptyWeeks: true,
		collapseEmptyMonths: true,
		weekDisplayFormat: 'dateNames',
		showItemDates: false,
		showTodayMarker: true,
		showJumpBar: false,
		inlinePropertyStyle: 'stacked',
		today: { year: 2023, month: 5, day: 10, precision: 'day', timestamp: new Date(2023, 4, 10).getTime() },
		...overrides,
	};
}

try {
	buildSync({
		entryPoints: [path.join(repoRoot, 'timeline-core.ts')],
		bundle: true,
		format: 'cjs',
		platform: 'node',
		target: 'node18',
		outfile: bundlePath,
	});

	const core = await import(pathToFileURL(bundlePath).href);

	// 1. Date parsing across precisions and formats
	const yearOnly = core.parseTimelineDate('2022');
	assert.equal(yearOnly?.year, 2022);
	assert.equal(yearOnly?.precision, 'year');

	const yearNum = core.parseTimelineDate(2024);
	assert.equal(yearNum?.year, 2024);
	assert.equal(yearNum?.precision, 'year');

	const monthOnly = core.parseTimelineDate('2022-12');
	assert.equal(monthOnly?.month, 12);
	assert.equal(monthOnly?.precision, 'month');

	const fullIso = core.parseTimelineDate('2023-03-15');
	assert.equal(fullIso?.year, 2023);
	assert.equal(fullIso?.month, 3);
	assert.equal(fullIso?.day, 15);
	assert.equal(fullIso?.precision, 'day');

	const epochMs = new Date(2025, 6, 4).getTime();
	const fromEpoch = core.parseTimelineDate(epochMs);
	assert.equal(fromEpoch?.year, 2025);
	assert.equal(fromEpoch?.month, 7);
	assert.equal(fromEpoch?.day, 4);

	const fromEpochStr = core.parseTimelineDate(String(epochMs));
	assert.equal(fromEpochStr?.year, 2025);
	assert.equal(fromEpochStr?.month, 7);

	assert.equal(core.parseTimelineDate('not-a-date'), null);
	assert.equal(core.parseTimelineDate(null), null);

	// 2. Date badge formatting
	assert.equal(core.formatItemDateBadge(fullIso, 'year'), 'Mar 15');
	assert.equal(core.formatItemDateBadge(monthOnly, 'year'), 'Dec');
	assert.equal(core.formatItemDateBadge(yearOnly, 'year'), '');
	assert.equal(core.formatItemDateBadge(fullIso, 'month'), '15');
	assert.equal(core.formatItemDateBadge(fullIso, 'decade'), 'Mar 15, 2023');

	const records = [
		{ filePath: 'alpha.md', displayName: 'Alpha', date: core.parseTimelineDate('2020-01-01'), inlineProperties: [] },
		{ filePath: 'beta.md', displayName: 'Beta', date: core.parseTimelineDate('2023-03-15'), inlineProperties: [] },
		{ filePath: 'gamma.md', displayName: 'Gamma', date: core.parseTimelineDate('2023-05-03'), inlineProperties: [] },
	].filter((record) => record.date);

	// 3. Year mode + collapsed range label + expandable collapsedRows + Today marker
	const yearRows = core.buildTimelineRows(records, makeOptions({ mode: 'year', collapseEmptyYears: true, collapseLimit: 2 }));
	assert.equal(yearRows.length, 3);
	assert.equal(yearRows[0].label, '2020');
	assert.equal(yearRows[1].label, '2021 – 2022');
	assert.equal(yearRows[1].year, '2021 – 2022');
	assert.equal(yearRows[1].collapsedRows?.length, 2);
	assert.equal(yearRows[2].label, '2023');
	assert.equal(yearRows[2].isCurrentPeriod, true);

	// 4. Decade mode
	const decadeRecords = [
		{ filePath: 'a.md', displayName: 'Old', date: core.parseTimelineDate('1998'), inlineProperties: [] },
		{ filePath: 'b.md', displayName: 'New', date: core.parseTimelineDate('2023-05-03'), inlineProperties: [] },
	];
	const decadeRows = core.buildTimelineRows(decadeRecords, makeOptions({ mode: 'decade', collapseEmptyYears: true, collapseLimit: 2 }));
	assert.equal(decadeRows.length, 3);
	assert.equal(decadeRows[0].label, '1990s');
	assert.equal(decadeRows[1].label, '2000s – 2010s');
	assert.equal(decadeRows[2].label, '2020s');
	assert.equal(decadeRows[2].isCurrentPeriod, true);

	// 5. Quarter mode + partial-date year-only record
	const quarterRecords = [
		...records,
		{ filePath: 'year-only.md', displayName: 'Year Only', date: core.parseTimelineDate('2023'), inlineProperties: [] },
	];
	const quarterRows = core.buildTimelineRows(quarterRecords, makeOptions({ mode: 'quarter', collapseEmptyMonths: true }));
	assert.equal(quarterRows.some((row) => row.isUnspecifiedPeriod && row.year === '2023'), true);
	assert.equal(quarterRows.some((row) => row.label === '2023 / Q1'), true);
	assert.equal(quarterRows.some((row) => row.label === '2023 / Q2' && row.isCurrentPeriod), true);

	// 6. Month mode + partial-date awareness
	const monthRows = core.buildTimelineRows(quarterRecords, makeOptions({ mode: 'month', collapseEmptyMonths: true }));
	assert.equal(monthRows.some((row) => row.label === '2023 / Mar'), true);
	assert.equal(monthRows.some((row) => row.label === '2023 / May' && row.isCurrentPeriod), true);
	assert.equal(monthRows.some((row) => row.isUnspecifiedPeriod && row.year === '2023'), true);

	// 7. Week mode: collapseEmptyWeeks + collapseEmptyMonths should keep empty months as single collapsed rows
	const weekRecords = [
		{ filePath: 'feb.md', displayName: 'Feb', date: core.parseTimelineDate('2023-02-10'), inlineProperties: [] },
		{ filePath: 'may.md', displayName: 'May', date: core.parseTimelineDate('2023-05-10'), inlineProperties: [] },
	];
	const weekRows = core.buildTimelineRows(
		weekRecords,
		makeOptions({ mode: 'week', collapseEmptyWeeks: true, collapseEmptyMonths: true, weekDisplayFormat: 'weekNames' }),
	);
	assert.equal(weekRows.some((row) => row.kind === 'month' && row.empty && row.monthLabel === 'Mar'), true);
	assert.equal(weekRows.some((row) => row.kind === 'month' && row.empty && row.monthLabel === 'Apr'), true);
	assert.equal(weekRows.some((row) => row.kind === 'week' && !row.empty && row.isCurrentPeriod), true);

	// 8. Descending order
	const descYears = core.buildTimelineRows(records, makeOptions({ mode: 'year', sortDirection: 'desc', collapseEmptyYears: true, collapseLimit: 2 }));
	assert.equal(descYears[0].label, '2023');
	assert.equal(descYears[2].label, '2020');

	console.log('All timeline core tests passed.');
} finally {
	rmSync(tempDir, { recursive: true, force: true });
}
