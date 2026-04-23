# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [0.1.0] - 2026-04-23

### Added
- Added full game mechanics reference in GAME_MECHANICS.md.
- Added enemy intent queue UI showing NOW and NEXT actions.
- Added enemy defend intent and shield system with level-based shield scaling.
- Added enemy shield bar and shield-aware damage resolution.

### Changed
- Updated discard flow to remove one selected committed tile, return that card to deck, and grant one extra pick.
- Updated hand logic so No Action tiles are treated as real cards in slots.
- Updated committed sequence interactions with drag-and-drop movement into empty slots.
- Renamed player-facing tile label from Empty to No Action.
- Rebalanced and consolidated tunable combat constants in src/constants.js.

### Fixed
- Fixed intent duplication in enemy move display.
- Fixed enemy intent generation to include defend intents with 2:1 attack-to-defend weighted behavior.
- Fixed discard behavior so it affects cards, not slot count.
