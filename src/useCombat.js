import { useState, useEffect, useRef } from 'react';
import { TUNING } from './constants';
import { buildShuffledDeck, drawFromDeck, computeResolution, abilityDescription, isValidSequence, findBestAcceptedSequence } from './gameHelpers';

// ============================================================
// useCombat — encapsulates every piece of combat state and
// exposes a flat API that UI components can call.
//
// Return value:
//   state   – all reactive values the UI reads
//   actions – { pickTile, selectCommittedTile, reroll, discardSelected, nextEnemy, restart }
// ============================================================
export default function useCombat() {
  // --- Core player / enemy state ---
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [playerHp, setPlayerHp] = useState(TUNING.player.maxHp);
  const [playerMana, setPlayerMana] = useState(TUNING.player.startingMana);
  const [playerShield, setPlayerShield] = useState(0);
  const [enemyHp, setEnemyHp] = useState(TUNING.enemies[0].hp);

  // --- Turn / draft tracking ---
  const [turn, setTurn] = useState(1);
  const [round, setRound] = useState(1);
  const [committed, setCommitted] = useState([]);
  const [selectedCommittedIndex, setSelectedCommittedIndex] = useState(null);
  const [picksUsed, setPicksUsed] = useState(0);
  const [pickLimit, setPickLimit] = useState(TUNING.draft.maxSequence);
  const [currentRow, setCurrentRow] = useState([]);
  const [rerollsUsedRun, setRerollsUsedRun] = useState(0);
  // Persistent battle deck — rebuilt fresh at the start of each enemy fight.
  const [deck, setDeck] = useState([]);
  const [deckShuffleCount, setDeckShuffleCount] = useState(1);

  // --- UI / phase state ---
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState('drafting'); // drafting | resolving | victory | defeat
  const [incomingDamage, setIncomingDamage] = useState(0);
  const [enemyTelegraph, setEnemyTelegraph] = useState('');
  const [rerollLocked, setRerollLocked] = useState(false);

  // Ref used to auto-scroll the battle log
  const logEndRef = useRef(null);

  const enemy = TUNING.enemies[enemyIdx];

  // ----------------------------------------------------------
  // Helpers — small functions used only inside this hook
  // ----------------------------------------------------------

  /** Append a line to the battle log */
  const addLog = (entry) => setLog((l) => [...l, entry]);

  /** Return the deck composition for this battle, adjusted for the enemy passive. */
  const getBattleDeckComposition = () => {
    const base = { ...TUNING.deckComposition };
    if (enemy.ability === 'empty_plus') {
      // Mage: heavier empty tile presence in the battle deck
      base.E += 8; base.A = Math.max(1, base.A - 4); base.D = Math.max(1, base.D - 4);
    }
    return base;
  };

  /**
   * Shuffle a fresh deck for this battle and draw the initial card pool.
   * Returns [remainingDeck, initialPool].
   * Knight's no_first_defence swaps any D cards out of the initial pool.
   */
  const buildBattleDeck = () => {
    const composition = getBattleDeckComposition();
    let workingDeck = buildShuffledDeck(composition);
    const initialPool = [];
    for (let i = 0; i < TUNING.draft.rowSize; i++) {
      const { card, deck: nextDeck } = drawFromDeck(workingDeck, composition);
      workingDeck = nextDeck;
      initialPool.push(card);
    }
    if (enemy.ability === 'no_first_defence') {
      // Remove D tiles from initial pool for Knight
      for (let i = 0; i < initialPool.length; i++) {
        let attempts = 0;
        while (initialPool[i] === 'D' && workingDeck.length > 0 && attempts < 30) {
          const { card, deck: nextDeck } = drawFromDeck(workingDeck, composition);
          workingDeck = nextDeck;
          if (card !== 'D') { initialPool[i] = card; break; }
          attempts++;
        }
      }
    }
    return [workingDeck, initialPool];
  };

  /** Return the mana cost to discard (doubled by Witch passive) */
  const getDiscardCost = () => {
    return enemy.ability === 'double_discard'
      ? TUNING.draft.discardCost * 2
      : TUNING.draft.discardCost;
  };

  // ----------------------------------------------------------
  // Turn lifecycle
  // ----------------------------------------------------------

  /** Reset draft state and roll the first row for a new turn */
  const startTurn = (turnNum) => {
    let dmg = enemy.attack;
    let msg = `${enemy.name} will strike for ${dmg}`;

    // Goblin charged-strike every 3rd turn
    if (enemy.ability === 'charged_strike' && turnNum % 3 === 0) {
      dmg = 60;
      msg = `⚡ ${enemy.name} is charging — ${dmg} damage!`;
    }

    // Warden reroll-lock on turns 3 & 6
    if (enemy.ability === 'reroll_lock' && (turnNum === 3 || turnNum === 6)) {
      setRerollLocked(true);
      msg += ' • Reroll locked';
    } else {
      setRerollLocked(false);
    }

    setIncomingDamage(dmg);
    setEnemyTelegraph(msg);
    setCommitted([]);
    setSelectedCommittedIndex(null);
    setPicksUsed(0);
    setPickLimit(TUNING.draft.maxSequence);
    setRound(1);
    setPhase('drafting');
  };

  // ----------------------------------------------------------
  // Effects
  // ----------------------------------------------------------

  /** When the enemy changes, announce and start the first turn */
  useEffect(() => {
    addLog(`Battle begins: ${enemy.name} (${enemy.hp} HP, ${enemy.attack} ATK)`);
    if (enemy.ability) addLog(`Passive: ${abilityDescription(enemy.ability)}`);
    // Build a fresh deck and initial card pool for this battle.
    const [newDeck, initialPool] = buildBattleDeck();
    setDeck(newDeck);
    setCurrentRow(initialPool);
    setDeckShuffleCount(1);
    startTurn(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyIdx]);

  /** Keep the battle log scrolled to the bottom */
  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
  }, [log]);

  // ----------------------------------------------------------
  // Player actions
  // ----------------------------------------------------------

  /**
   * Pick one tile from the 4-card draft pool.
   * The picked slot is immediately replaced using weighted roll.
   */
  const pickTile = (idx) => {
    if (phase !== 'drafting') return;
    if (picksUsed >= pickLimit) return;
    const tile = currentRow[idx];
    const newCommitted = [...committed, tile];
    setCommitted(newCommitted);
    // New picks become the currently selected committed tile.
    setSelectedCommittedIndex(newCommitted.length - 1);
    setPicksUsed((v) => v + 1);

    const nextRound = round + 1;
    setRound((r) => r + 1);

    // Draw the replacement card from the persistent battle deck.
    const composition = getBattleDeckComposition();
    const { card: newCard, deck: updatedDeck, reshuffled } = drawFromDeck(deck, composition);
    setDeck(updatedDeck);
    if (reshuffled) setDeckShuffleCount((v) => v + 1);
    setCurrentRow((row) => {
      const next = [...row];
      next[idx] = newCard;
      return next;
    });
  };

  /**
   * Submit the committed sequence.
   * Must be one of the accepted sequences (e.g. AA, DDD, AAAAA).
   * If invalid the turn fails — player takes enemy damage with 0 offence.
   */
  const submitSequence = () => {
    if (phase !== 'drafting') return;
    if (committed.length === 0) return;

    const bestCombo = findBestAcceptedSequence(committed);

    if (bestCombo) {
      if (bestCombo.sequence !== committed.join('')) {
        addLog(`T${turn}: best combo found in hand -> ${bestCombo.sequence}`);
      }
      // Resolve using the strongest accepted combo found in the submitted hand.
      resolveTurn(bestCombo.tiles);
    } else {
      // Invalid sequence — log the failure and punish the player
      addLog(`T${turn}: INVALID sequence [${committed.join('')}] — no damage, no block`);
      resolveTurn([]); // resolve with empty = 0 dmg / 0 block, enemy still hits
    }
  };

  /** Spend mana to reroll all 4 cards (max 2 per run) */
  const reroll = () => {
    if (rerollLocked) return;
    if (rerollsUsedRun >= TUNING.draft.maxRerollsPerRun) return;
    if (playerMana < TUNING.draft.rerollCost) return;
    setPlayerMana((m) => m - TUNING.draft.rerollCost);
    // Draw rowSize fresh cards from the persistent battle deck (replaces whole pool).
    const composition = getBattleDeckComposition();
    let workingDeck = deck;
    let reshuffleHits = 0;
    const newPool = [];
    for (let i = 0; i < TUNING.draft.rowSize; i++) {
      const { card, deck: nextDeck, reshuffled } = drawFromDeck(workingDeck, composition);
      workingDeck = nextDeck;
      if (reshuffled) reshuffleHits += 1;
      newPool.push(card);
    }
    setDeck(workingDeck);
    if (reshuffleHits > 0) setDeckShuffleCount((v) => v + reshuffleHits);
    setCurrentRow(newPool);
    setRerollsUsedRun((v) => v + 1);
  };

  /** Select a committed tile index to discard. Clicking again clears selection. */
  const selectCommittedTile = (index) => {
    if (phase !== 'drafting') return;
    if (index < 0 || index >= committed.length) return;
    setSelectedCommittedIndex((prev) => (prev === index ? null : index));
  };

  /**
   * Spend mana to discard one selected committed tile.
   * Discard grants +1 extra selection budget this turn.
   */
  const discardSelected = () => {
    if (committed.length === 0) return;
    const discardIndex =
      selectedCommittedIndex !== null && selectedCommittedIndex >= 0 && selectedCommittedIndex < committed.length
        ? selectedCommittedIndex
        : committed.length - 1;

    const cost = getDiscardCost();
    if (playerMana < cost) return;

    setPlayerMana((m) => m - cost);

    // Remove one committed tile and let the rest shift left naturally.
    setCommitted((c) => {
      const next = [...c];
      next.splice(discardIndex, 1);
      return next;
    });

    // Discard allows one additional pick this turn.
    setPickLimit((limit) => limit + 1);
    setSelectedCommittedIndex(null);
  };

  // ----------------------------------------------------------
  // Resolution — apply damage, shields, check win/loss
  // ----------------------------------------------------------
  const resolveTurn = (finalSequence) => {
    setPhase('resolving');
    const { damage, block, segments } = computeResolution(finalSequence);

    // Readable log string for the committed sequence
    const seqStr = segments
      .map((s) => {
        if (s.type === 'E') return '·';
        if (s.type === 'A') return `${'A'.repeat(s.count)}(${s.damage})`;
        if (s.type === 'D') return `${'D'.repeat(s.count)}(${s.block})`;
        return '';
      })
      .join(' ');

    // --- Shield gain (capped at max) ---
    const shieldBefore = playerShield;
    const shieldRaw = shieldBefore + block;
    const shieldAfterGain = Math.min(TUNING.player.maxShield, shieldRaw);
    const shieldWasted = shieldRaw - shieldAfterGain;

    const logParts = [`T${turn}: ${seqStr} → ${damage} dmg`];
    if (block > 0) {
      if (shieldWasted > 0) {
        logParts.push(`+${block - shieldWasted} shield (${shieldWasted} wasted, cap ${TUNING.player.maxShield})`);
      } else {
        logParts.push(`+${block} shield`);
      }
    }
    addLog(logParts.join(' / '));

    // --- Apply player damage to enemy ---
    const newEnemyHp = Math.max(0, enemyHp - damage);
    setEnemyHp(newEnemyHp);

    if (newEnemyHp <= 0) {
      const manaAfterFoe = Math.min(TUNING.player.maxMana, playerMana + TUNING.player.manaRegenPerFoe);
      setPlayerShield(shieldAfterGain);
      setPlayerMana(manaAfterFoe);
      addLog(`✦ ${enemy.name} defeated`);
      addLog(`+${TUNING.player.manaRegenPerFoe} MP after foe (${manaAfterFoe}/${TUNING.player.maxMana})`);
      setPhase('victory');
      return;
    }

    // --- Enemy attacks the player (shield absorbs first) ---
    const rawDmg = incomingDamage;
    const absorbed = Math.min(shieldAfterGain, rawDmg);
    const shieldAfterHit = shieldAfterGain - absorbed;
    const taken = rawDmg - absorbed;
    const newPlayerHp = Math.max(0, playerHp - taken);

    if (absorbed > 0) {
      addLog(`  ${enemy.name} hits ${rawDmg} — shield absorbs ${absorbed}, you take ${taken}`);
    } else {
      addLog(`  ${enemy.name} hits ${rawDmg} — no shield, you take ${taken}`);
    }

    setPlayerShield(shieldAfterHit);
    setPlayerHp(newPlayerHp);

    if (newPlayerHp <= 0) {
      addLog('✖ You fell in battle');
      setPhase('defeat');
      return;
    }

    // Advance to the next turn after a brief pause
    setTimeout(() => {
      const nextTurn = turn + 1;
      setTurn(nextTurn);
      startTurn(nextTurn);
    }, 1200);
  };

  // ----------------------------------------------------------
  // Flow controls — next enemy / restart
  // ----------------------------------------------------------

  /** Advance to the next enemy in the gauntlet */
  const nextEnemy = () => {
    if (enemyIdx < TUNING.enemies.length - 1) {
      const next = enemyIdx + 1;
      setEnemyIdx(next);
      setEnemyHp(TUNING.enemies[next].hp);
      // Carry current HP/MP to the next fight; no recovery between foes.
      setPlayerShield(0);
      setTurn(1);
      setLog([]);
    }
  };

  /** Restart the fight against the current enemy */
  const restart = () => {
    setEnemyHp(TUNING.enemies[enemyIdx].hp);
    setPlayerHp(TUNING.player.maxHp);
    setPlayerMana(TUNING.player.startingMana);
    setPlayerShield(0);
    setTurn(1);
    setLog([]);
    // Restart starts a fresh run budget.
    setRerollsUsedRun(0);
    setSelectedCommittedIndex(null);
    // Rebuild the deck and pool for this fight.
    const [newDeck, initialPool] = buildBattleDeck();
    setDeck(newDeck);
    setCurrentRow(initialPool);
    setDeckShuffleCount(1);
    startTurn(1);
  };

  // ----------------------------------------------------------
  // Derived / computed values the UI needs
  // ----------------------------------------------------------
  const bestCombo = findBestAcceptedSequence(committed);
  const preview = computeResolution(bestCombo ? bestCombo.tiles : []);
  const discardCost = getDiscardCost();
  const sequenceValid = isValidSequence(committed);
  const sequenceFull = picksUsed >= pickLimit;
  const rerollsLeftRun = Math.max(0, TUNING.draft.maxRerollsPerRun - rerollsUsedRun);
  const deckCounts = deck.reduce((acc, card) => {
    acc[card] = (acc[card] || 0) + 1;
    return acc;
  }, { A: 0, D: 0, E: 0 });

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  return {
    state: {
      enemy,
      enemyIdx,
      enemyHp,
      playerHp,
      playerMana,
      playerShield,
      turn,
      round,
      committed,
      selectedCommittedIndex,
      picksUsed,
      pickLimit,
      currentRow,
      rerollsUsedRun,
      deckSize: deck.length,
      deckCounts,
      deckShuffleCount,
      deckIsShuffled: true,
      rerollsLeftRun,
      rerollLocked,
      log,
      phase,
      incomingDamage,
      enemyTelegraph,
      preview,
      discardCost,
      sequenceValid,
      sequenceFull,
      logEndRef,
    },
    actions: {
      pickTile,
      selectCommittedTile,
      reroll,
      discardSelected,
      submitSequence,
      nextEnemy,
      restart,
    },
  };
}
