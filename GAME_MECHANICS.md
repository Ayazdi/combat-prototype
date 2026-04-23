# Combat Prototype — Game Mechanics Reference

## Overview

A turn-based card-draft combat game. Each turn, the player draws a hand of tiles from a deck, commits a sequence of up to 5 tiles, and submits it against the current enemy. Enemies telegraph their next two moves in advance. The goal is to defeat all 6 enemies in order without dying.

---

## Hero Stats

| Stat | Value |
|---|---|
| Max HP | 250 |
| Max Mana | 100 |
| Max Shield | 50 |
| Starting Mana | 100 |
| Mana gained per enemy defeated | +20 |

---

## Tile Types

| Tile | Glyph | Description |
|---|---|---|
| ATTACK (A) | ⚔ | Deals damage to the enemy |
| DEFENCE (D) | ⛨ | Generates shield for the player |
| NO ACTION (E) | · | Occupies a hand slot; can be discarded but does nothing if submitted |

---

## Deck Composition (per battle)

A fresh deck of **40 cards** is shuffled at the start of each fight.

| Tile | Count | Share |
|---|---|---|
| ATTACK | 10 | 25% |
| DEFENCE | 8 | 20% |
| NO ACTION | 22 | 55% |

The deck reshuffles automatically when it runs out mid-battle.

---

## Draft Rules

| Setting | Value |
|---|---|
| Cards shown per row (draft pool) | 8 |
| Max tiles you may commit per turn | 5 |
| Base picks per turn | 5 |

### Reroll

- Costs **25 Mana** per use.
- Discards the current draft row and draws 8 fresh tiles.
- Limited to **2 rerolls per full run** (shared across all enemies).

### Discard

- Costs **25 Mana**.
- Lets the player select one committed tile and remove it.
- The discarded card returns to the deck (it is not lost).
- Grants **+1 pick** for that turn (an extra selection, not an extra slot).
- Works on both action tiles (A/D) and No Action (E) tiles already placed in the sequence.

---

## Hand & Sequence

- The committed sequence has **5 fixed slots**.
- Tiles fill from left to right; empty slots show as blank.
- Tiles can be **dragged and dropped** within the committed sequence — but only onto empty (null) slots, not onto other tiles.
- Selecting a tile highlights it for discard; selecting another tile moves the highlight.

---

## Base Damage & Shield Values

| Action | Base Value |
|---|---|
| Single ATTACK | 25 damage |
| Single DEFENCE | 20 shield |

---

## Combo Multipliers

Consecutive tiles of the same type in the committed sequence trigger a multiplier.

### Attack Combos (consecutive A tiles)

| Count | Multiplier | Total Damage |
|---|---|---|
| 2× A | ×1.25 | 62.5 |
| 3× A | ×1.5 | 112.5 |
| 4× A | ×1.75 | 175 |
| 5× A | ×3.0 | 375 |

### Defence Combos (consecutive D tiles)

| Count | Multiplier | Total Shield |
|---|---|---|
| 2× D | ×1.25 | 50 |
| 3× D | ×2.0 | 120 |
| 4× D | ×3.0 | 240 |
| 5× D | ×4.0 | 400 (capped at 50) |

> Shield gained is capped at the player's **Max Shield (50)**.

---

## Accepted Sequences

Only the following tile patterns are resolved when submitted. The game finds the best valid sub-sequence within the committed slots:

| Pattern | Type |
|---|---|
| AA | Double Attack |
| AAA | Triple Attack |
| AAAA | Quad Attack |
| AAAAA | Full Attack |
| DD | Double Defence |
| DDD | Triple Defence |
| DDDD | Quad Defence |
| DDDDD | Full Defence |
| AADD | Mixed (Atk + Def) |
| AAADD | Mixed (Triple Atk + Def) |
| DDDAA | Mixed (Triple Def + Atk) |
| DDAA | Mixed (Def + Double Atk) |

No Action (E) tiles in committed slots are ignored during resolution.

---

## Damage Resolution Order

1. **Player attacks**: Damage is applied to **enemy shield first**, then enemy HP.
2. **Enemy attacks**: Damage is applied to **player shield first**, then player HP.
3. **Enemy defends**: Adds to enemy shield (does not consume a player action).

---

## Enemy Intent System

- Each enemy pre-commits to **2 future moves** shown to the player at all times:
  - **NOW** — the move the enemy will execute at end of this turn.
  - **NEXT** — the move queued for the following turn.
- Intents are drawn from a **weighted bag**: **2 ATTACK : 1 DEFEND** (on average 1 defend every 3 turns).
- The bag refills and reshuffles once emptied, maintaining long-run distribution.

### Enemy Shield (from Defend intent)

Shield gained when an enemy defends scales with enemy level:

| Enemy Level | Shield Gained |
|---|---|
| 1 | 10 |
| 2 | 15 |
| 3 | 20 |
| 4 | 25 |
| 5 | 30 |
| 6 | 35 |

Formula: `Base (10) + (Level − 1) × 5`

---

## Enemies

Six enemies are faced in order. Each has unique HP, attack power, and a passive ability.

| # | Name | Level | HP | Attack | Passive Ability |
|---|---|---|---|---|---|
| 1 | Slime | 1 | 140 | 25 | — |
| 2 | Goblin | 2 | 260 | 30 | Charged Strike |
| 3 | Mage | 3 | 220 | 28 | Empty Plus |
| 4 | Knight | 4 | 340 | 38 | No First Defence |
| 5 | Warden | 5 | 300 | 42 | Reroll Lock |
| 6 | Witch | 6 | 260 | 35 | Double Discard |

### Passive Ability Descriptions

| Ability | Effect |
|---|---|
| **Charged Strike** | Every third attack deals bonus damage |
| **Empty Plus** | Adds extra No Action tiles to the player's draft |
| **No First Defence** | The player's first Defence combo each fight has no effect |
| **Reroll Lock** | Player cannot use Reroll while this enemy is active |
| **Double Discard** | Each time the player discards, it costs 2 charges instead of 1 |

---

## Progression & Run Structure

- Defeating an enemy awards **+20 Mana** (up to the 100 cap).
- Player HP carries over between fights; shields reset.
- Enemy shield resets at the start of each new fight.
- Reroll uses are tracked across the entire run (max 2 total).
- A run ends in **victory** when all 6 enemies are defeated, or in **defeat** when the player reaches 0 HP.

---

## Tile Draw Weights (within draft row)

When drawing tiles for the 8-card draft row, tiles are drawn from the shuffled deck. The deck composition itself (A:10, D:8, E:22) determines natural frequency; draw weights are uniform from the remaining deck.

---

*Last updated: April 2026*
