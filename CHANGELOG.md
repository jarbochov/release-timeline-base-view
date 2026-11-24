# Changelog

## 0.2.0

### New Layouts & Modes
- **Quarter (`Q1`–`Q4`) and Decade (`1990s`–`2020s`) modes** alongside Year, Month, and Week.
- **Vertical spine layout** for milestone-style timelines with circular accent nodes.
- **Horizontal (diagonal) layout** with compact axis ticks, bent diagonal leader lines, angled labels, and clickable `+N` popovers for dense buckets.
- **Horizontal (stacked) layout** combining the compact horizontal axis with clean vertical item stacks.
- **Fit horizontal timeline to width** toggle to smoothly scale wide horizontal timelines to your pane width.
- **Cards item layout & cover image support** (`coverProperty`) for thumbnails from vault images or URLs.

### UX & Features
- **Partial-date awareness**: year-only dates (e.g. `2022`) appear in a dedicated year-level `—` row in Quarter/Month modes instead of being misplaced in January.
- **Per-item date badges** (`showItemDates`), **quick-jump year bar** (`showJumpBar`), optional **current period highlight** (`showTodayMarker`, off by default), and **property-driven color coding** (`colorProperty`).
- **Compact property pills** (`inlinePropertyStyle: pills`) with clickable `[[wikilinks]]` and `#tag` badges.
- **Interactive collapsed gaps**: click collapsed empty year or month ranges to expand them inline.
- **Native Obsidian interactions**: standard click / Cmd+click / middle-click navigation, hover previews, right-click file menu, live settings refresh, theme accent toggle, and native Bases `groupBy` sections.
- **Responsive Auto width mode** with horizontal scroll fallback for narrow panes and mobile.

### Fixes & Improvements
- Fixed table column sizing and `colspan` alignment in Classic table mode, and removed the empty secondary column / duplicate bar in Year mode.
- Fixed collapsed empty year ranges displaying only the start year instead of the full range (e.g. `2022 – 2023`).
- Fixed `collapseEmptyWeeks` + `collapseEmptyMonths` interaction in Week mode.
- Fixed `file.ctime` / `file.mtime` numeric timestamps and timezone-safe ISO date parsing.
- Removed bullets from inline layout and flattened Bases view option groups to prevent scroll jumps.
- Replaced `luxon` with lightweight zero-dependency date helpers (shrinking `main.js` from ~251 KB to ~57 KB) and achieved 0 errors / 0 warnings against `eslint-plugin-obsidianmd`.
