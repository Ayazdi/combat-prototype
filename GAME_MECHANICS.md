# Combat Prototype — Game Mechanics Reference

## Overview

A turn-based card-draft combat game. Each turn, the player picks tiles into a 5-slot committed sequence, then submits it to resolve damage and shield. Enemies telegraph two moves ahead and are fought in a 6-enemy gauntlet.

---

## Hero

| Stat | Value |
|---|---|
| Max HP | 220 |
| Max Mana | 100 |
| Shield Cap | 80 |
| Starting Mana | 100 |
| Kill Reward | +25 Mana, +20 HP |

Kill rewards are clamped to max HP and max Mana.

Player shield persists between turns and across enemy kills until it is absorbed by damage or the run is restarted.

---

## Victory Perks

After each enemy kill, the player receives the normal kill reward and must choose one perk before advancing:

| Perk | First Kill Value |
|---|---:|
| Damage increase | +10% |
| Defence increase | +10% |
| Extra Mana | +15 Mana, capped to max Mana |
| Extra HP | +20 HP, capped to max HP |

Perk values scale by kill number using `TUNING.rewardPerks.perEnemyGrowthRate`. With the default `0.2` growth, the second kill offers +12% damage or defence.

---

## Deck (Per Fight)

Each battle starts with a fresh shuffled 40-card deck:

| Tile | Count | Description |
|---|---|---|
| Attack (A) | 12 | Deal damage |
| Defence (D) | 10 | Gain shield |
| Mana (M) | 8 | Restore mana |
| No Action (E) | 10 | Blocker — contributes nothing |

Board shows 8 tiles. When you pick one, that slot is immediately refilled from the same battle deck.
No Action cards are blocker cards and use a cement-like visual treatment.
Mana tiles use a violet/purple-blue visual treatment.

---

## Base Values and Combos

| Action | Formula |
|---|---|
| Attack | 30 damage × combo multiplier |
| Defence | 20 shield × combo multiplier (shield cap 80) |
| Mana | 5 mana × combo multiplier (capped to max mana 100) |

Any submission is valid if it contains at least one contiguous run of 3+ identical tiles (A, D, or M).
Each contiguous run of identical tiles contributes its own multiplier independently.

Combo multipliers (same table for A, D, and M):

| Run Length | Multiplier |
|---|---|
| 1x | 1.0 |
| 2x | 1.4 |
| 3x | 1.8 |
| 4x | 2.3 |
| 5x | 3.0 |

---

## Actions

### Reroll

- Cost: FREE
- Limit: 1 per enemy
- Effect: redraws all 8 board tiles
- Does not end the turn and does not spend a pick

### Discard

- Cost: FREE
- Limit: 3 per enemy (Witch halves this to 1 per enemy)
- Effect from committed sequence: permanently remove selected committed tile and gain +1 extra pick for the same turn
- Effect from board: permanently remove selected board tile and immediately draw a replacement into that board slot

---

## Enemy Intents and Defend

- Enemies always show NOW and NEXT intents.
- Intent weighting remains 2 Attack : 1 Defend over time.
- Enemy defend is explicit per enemy (not formula-based).

---

## Enemies

| Name | Lv | HP | Atk | Defend | Passive |
|---|---:|---:|---:|---:|---|
| Slime | 1 | 140 | 22 | 10 | — |
| Goblin | 2 | 220 | 28 | 15 | ChargedStrike (3rd attack -> 50) |
| Mage | 3 | 230 | 30 | 20 | EmptyPlus (+4 E in battle deck) |
| Knight | 4 | 320 | 35 | 25 | Armored (-10 per incoming hit) |
| Warden | 5 | 280 | 38 | 30 | Adaptive (reroll/discard -> +25 shield) |
| Witch | 6 | 300 | 42 | 35 | DoubleDiscard (discard limit halved to 1 per enemy) |

---

## Resolution Order

1. Player action resolves (damage/shield).
2. Enemy shield absorbs incoming damage before enemy HP.
3. Enemy executes NOW intent (attack or defend).
4. If player HP reaches 0, defeat; if enemy HP reaches 0, victory for that fight.

---

## Run Structure

- Player HP and Mana carry between fights.
- Player and enemy shields reset between fights.
- Defeat all 6 enemies to win the run.

---

*Last updated: April 2026*
