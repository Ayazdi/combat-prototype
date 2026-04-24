# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

### Added
- Added a full-hand finisher bonus for 5-tile accepted combos with no No Action cards.
- Added late-turn enemy enrage that increases enemy attack intents from turn 4 onward.
- Added visible player damage and defence perk status chips.
- Added dangerous intent highlighting for enraged enemy attacks.

### Changed
- Rebalanced the battle deck to 13 Attack, 11 Defence, and 16 No Action cards.
- Updated mechanics documentation for current defence values, Witch HP, shield carryover, and combo tuning.

## [0.1.5] - 2026-04-24

### Added
- Added card entry animations for board refills and committed hand slots.
- Added epic combat banners for turn starts, player outcomes, and enemy outcomes.
- Added generated sound effects for cards, rerolls, discards, combat actions, perks, victory, and defeat.

### Changed
- Player turn banners now appear at the start of each draft turn instead of after submitting an action.
- Enemy action banners now avoid repeating "Enemy" alongside the enemy name.
- Updated No Action cards with a heavier cement-block visual treatment.

## [0.1.4] - 2026-04-24

### Added
- Added post-kill perk selection with configurable damage, defence, mana, and HP reward options.

### Changed
- Victory now shows base HP and mana rewards in the result message before advancing.
- Reroll is explicitly limited to drafting and does not end the turn or spend a pick.
- HP and Mana rewards restore current values only, capped by the existing maximums.

## [0.1.3] - 2026-04-24

### Changed
- Player shield now persists between turns and carries into the next enemy fight after a kill.

## [0.1.2] - 2026-04-24

### Added
- Added board-card discard controls that spend MP to permanently remove a visible board tile and draw a replacement.

### Changed
- Changed discard so discarded cards do not return to the deck.
- Removed the per-turn discard limit; discard use is now limited only by available MP.

## [0.1.1] - 2026-04-24

### Changed
- Rebalanced hero core stats to 220 HP, 100 Mana, and 80 Shield cap.
- Updated kill rewards to grant +25 MP and +20 HP (capped to max values).
- Rebalanced deck composition per fight to 12 Attack, 10 Defence, and 18 No Action.
- Rebalanced action base values and combo multipliers.
- Changed reroll rule to 1 use per enemy (still 25 MP).
- Changed discard rule to 1 use per turn (25 MP baseline, tile returns to deck).
- Replaced formula defend scaling with explicit per-enemy defend values.
- Updated enemy roster stats and passives: Armored, Adaptive, and revised Charged Strike/Empty Plus/Double Discard behavior.

### Added
- Added per-turn discard limit tracking in combat flow.
- Added per-enemy reroll limit tracking in combat flow.

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
