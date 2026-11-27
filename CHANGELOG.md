# Changelog

All notable changes to Wecom are recorded here. Releases before 0.5.0 are documented in git tags and commit messages.

## 0.5.1 — 2026-11-27

### Changed

- Popup header: more space between the wordmark and description, with balanced wrapping so no word is orphaned.
- Popup count block: the figure now anchors one compact row, with the page count and the all-pages total grouped beside it.
- Popup footer: roomier row rhythm and a baseline-aligned shortcut keycap; the all-pages total no longer sits in the footer.

## 0.5.0 — 2026-11-27

### Added

- Six-position island placement: top or bottom, left, centre or right. Change it from the island itself with the **Move island** picker; the choice persists in browser storage. Default stays top-centre.
- `DESIGN.md` as the design-system contract, and this changelog.

### Changed

- Redesign to "dark instrument": near-black surfaces, one amber mark, and IBM Plex Mono bundled locally and inlined into the stylesheets. No remote font requests; the extension still works offline.
- Consistent padding across cards, the island and the 320 px popup, using the existing 4 px scale.
- All content strings, ARIA labels and the JSON export schema are unchanged.

### Fixed

- Position picker labels no longer overlap, stay inside the viewport at all six edges, and open above the comment list instead of behind it.
- Comment-list header now has spacing between the title and its count.
