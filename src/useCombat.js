import { useState, useEffect, useRef } from 'react';
import { TUNING } from './constants';
import { rollRow, computeResolution, abilityDescription, isValidSequence } from './gameHelpers';

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
  const [currentRow, setCurrentRow] = useState([]);
  const [rerolledThisRound, setRerolledThisRound] = useState(false);

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

  /** Adjust draft row weights based on enemy passive ability */
  const getRowWeights = (roundNum) => {
    const w = { ...TUNING.weights };
    if (enemy.ability === 'empty_plus') {
      w.E += 15; w.A -= 8; w.D -= 7;
    }
    if (enemy.ability === 'no_first_defence' && roundNum === 1) {
      w.D = 0;
      w.A += 18; w.E += 17;
    }
    return w;
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
    setRound(1);
    setRerolledThisRound(false);
    setCurrentRow(rollRow(getRowWeights(1), TUNING.draft.rowSize));
    setPhase('drafting');
  };

  // ----------------------------------------------------------
  // Effects
  // ----------------------------------------------------------

  /** When the enemy changes, announce and start the first turn */
  useEffect(() => {
    addLog(`Battle begins: ${enemy.name} (${enemy.hp} HP, ${enemy.attack} ATK)`);
    if (enemy.ability) addLog(`Passive: ${abilityDescription(enemy.ability)}`);
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

  /** Pick a tile from the current draft row (up to maxSequence tiles) */
  const pickTile = (idx) => {
    if (phase !== 'drafting') return;
    if (committed.length >= TUNING.draft.maxSequence) return; // already at cap
    const tile = currentRow[idx];
    const newCommitted = [...committed, tile];
    setCommitted(newCommitted);
    // New picks become the currently selected committed tile.
    setSelectedCommittedIndex(newCommitted.length - 1);

    // Always roll a new row for the next pick (unless at cap)
    if (newCommitted.length < TUNING.draft.maxSequence) {
      setRound((r) => r + 1);
      setRerolledThisRound(false);
      setCurrentRow(rollRow(getRowWeights(round + 1), TUNING.draft.rowSize));
    }
  };

  /**
   * Submit the committed sequence.
   * Must be one of the accepted sequences (e.g. AA, DDD, AAAAA).
   * If invalid the turn fails — player takes enemy damage with 0 offence.
   */
  const submitSequence = () => {
    if (phase !== 'drafting') return;
    if (committed.length === 0) return;

    if (isValidSequence(committed)) {
      // Valid combo — resolve normally
      resolveTurn(committed);
    } else {
      // Invalid sequence — log the failure and punish the player
      addLog(`T${turn}: INVALID sequence [${committed.join('')}] — no damage, no block`);
      resolveTurn([]); // resolve with empty = 0 dmg / 0 block, enemy still hits
    }
  };

  /** Spend mana to reroll the current draft row (once per round) */
  const reroll = () => {
    if (rerollLocked || rerolledThisRound) return;
    if (playerMana < TUNING.draft.rerollCost) return;
    setPlayerMana((m) => m - TUNING.draft.rerollCost);
    setCurrentRow(rollRow(getRowWeights(round), TUNING.draft.rowSize));
    setRerolledThisRound(true);
  };

  /** Select a committed tile index to discard. Clicking again clears selection. */
  const selectCommittedTile = (index) => {
    if (phase !== 'drafting') return;
    if (index < 0 || index >= committed.length) return;
    setSelectedCommittedIndex((prev) => (prev === index ? null : index));
  };

  /** Spend mana to discard the selected committed tile. This does not modify the draft row. */
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

    // Keep round in sync with pick count, but never below 1.
    setRound((r) => Math.max(1, r - 1));
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
    setSelectedCommittedIndex(null);
    startTurn(1);
  };

  // ----------------------------------------------------------
  // Derived / computed values the UI needs
  // ----------------------------------------------------------
  const preview = computeResolution(committed);
  const discardCost = getDiscardCost();
  const sequenceValid = isValidSequence(committed);
  const sequenceFull = committed.length >= TUNING.draft.maxSequence;

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
      currentRow,
      rerolledThisRound,
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
