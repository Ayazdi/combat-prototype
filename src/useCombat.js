import { useState, useEffect, useRef } from 'react';
import { TUNING } from './constants';
import {
  buildShuffledDeck,
  drawFromDeck,
  buildBoardRow,
  computeAllBuckets,
  applyFreezeModifier,
  buildTelegraphText,
} from './gameHelpers';
import { playSound } from './soundEffects';

// ============================================================
// useCombat — Phase 1: Element allocation system
//
// State shape:
//   hand: string[]              — tiles drafted this turn (up to 5)
//   allocationSlots: string[]   — parallel to hand, null | 'attack' | 'shield'
//   enemyPatternIndex: number   — current position in enemy.pattern[]
//   burn/freeze state per side
// ============================================================
export default function useCombat() {
  // --- Core player / enemy state ---
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [playerHp, setPlayerHp] = useState(TUNING.player.maxHp);
  const [playerMana, setPlayerMana] = useState(TUNING.player.startingMana);
  const [playerShield, setPlayerShield] = useState(0);
  const [enemyHp, setEnemyHp] = useState(TUNING.enemies[0].hp);

  // --- Status effects ---
  const [enemyBurnStacks, setEnemyBurnStacks] = useState(0);
  const [enemyBurnDuration, setEnemyBurnDuration] = useState(0);
  const [enemyFreezeStacks, setEnemyFreezeStacks] = useState(0);
  const [playerBurnStacks, setPlayerBurnStacks] = useState(0);
  const [playerBurnDuration, setPlayerBurnDuration] = useState(0);
  const [playerFreezeStacks, setPlayerFreezeStacks] = useState(0);

  // --- Enemy pattern cycling ---
  const [enemyPatternIndex, setEnemyPatternIndex] = useState(0);

  // --- Turn / draft tracking ---
  const [turn, setTurn] = useState(1);
  const [hand, setHand] = useState([]);
  // parallel array: null | 'attack' | 'shield' | 'boost'
  const [allocationSlots, setAllocationSlots] = useState(
    Array(TUNING.hand.handSize).fill(null),
  );
  const [currentRow, setCurrentRow] = useState([]);
  const [boardCardAnimationKeys, setBoardCardAnimationKeys] = useState(
    Array.from({ length: TUNING.hand.rowSize }, () => 0),
  );
  const [rerollsUsedEnemy, setRerollsUsedEnemy] = useState(0);
  const [discardsUsedEnemy, setDiscardsUsedEnemy] = useState(0);
  const [deck, setDeck] = useState([]);
  const [deckShuffleCount, setDeckShuffleCount] = useState(1);
  const [gameResetCount, setGameResetCount] = useState(0);

  // --- UI / phase state ---
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState('drafting');
  const [incomingDamage, setIncomingDamage] = useState(0);
  const [combatBanner, setCombatBanner] = useState(null);
  const [victoryReward, setVictoryReward] = useState(null);
  const [selectedRewardKeys, setSelectedRewardKeys] = useState([]);

  const logEndRef = useRef(null);
  const combatBannerTimeoutRef = useRef(null);

  const enemy = TUNING.enemies[enemyIdx];

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  const addLog = (entry) => setLog((l) => [...l, entry]);

  const showCombatBanner = (banner, duration = 0) => {
    if (combatBannerTimeoutRef.current) {
      clearTimeout(combatBannerTimeoutRef.current);
      combatBannerTimeoutRef.current = null;
    }
    setCombatBanner({ ...banner, id: Date.now() });
    if (duration > 0) {
      combatBannerTimeoutRef.current = setTimeout(() => {
        setCombatBanner(null);
        combatBannerTimeoutRef.current = null;
      }, duration);
    }
  };

  const getBattleDeckComposition = () => ({ S: 12, F: 10, I: 10, E: 8 });

  const buildBattleDeck = () => {
    const composition = getBattleDeckComposition();
    let workingDeck = buildShuffledDeck(composition);
    const initialPool = buildBoardRow(TUNING.weights, TUNING.hand.rowSize);
    // Draw replacements for the initial pool from the deck
    for (let i = 0; i < TUNING.hand.rowSize; i++) {
      const { deck: nextDeck } = drawFromDeck(workingDeck, composition);
      workingDeck = nextDeck;
    }
    return [workingDeck, initialPool];
  };

  const buildRewardOptions = () => [
    {
      key: 'hp',
      kind: 'stat',
      label: '+30 MAX HP',
      sublabel: 'Stat',
      detail: 'Increase max HP by 30',
      amount: 30,
    },
    {
      key: 'shield',
      kind: 'stat',
      label: '+10 MAX SHIELD',
      sublabel: 'Stat',
      detail: 'Increase shield cap by 10',
      amount: 10,
    },
    {
      key: 'mana',
      kind: 'stat',
      label: 'RESTORE MANA',
      sublabel: 'Stat',
      detail: 'Restore mana to full',
      amount: TUNING.player.maxMana,
    },
  ];

  // ----------------------------------------------------------
  // Derived values
  // ----------------------------------------------------------

  const handFull = hand.length >= TUNING.hand.handSize;
  const allTilesAllocated =
    handFull && allocationSlots.slice(0, hand.length).every((s) => s !== null);

  // Build element arrays per bucket from allocationSlots
  const allocation = {
    attack: allocationSlots
      .map((s, i) => (s === 'attack' ? hand[i] : null))
      .filter(Boolean),
    shield: allocationSlots
      .map((s, i) => (s === 'shield' ? hand[i] : null))
      .filter(Boolean),
    boost: [],
  };

  const allocPreview = handFull ? computeAllBuckets(allocation) : null;

  const currentIntentRaw = enemy.pattern[enemyPatternIndex % enemy.pattern.length];
  const nextIntentRaw =
    enemy.pattern[(enemyPatternIndex + 1) % enemy.pattern.length];

  // ----------------------------------------------------------
  // Turn lifecycle
  // ----------------------------------------------------------

  const startTurn = (turnNum) => {
    setHand([]);
    setAllocationSlots(Array(TUNING.hand.handSize).fill(null));
    setDiscardsUsedEnemy(0);

    const intent = TUNING.enemies[enemyIdx].pattern[
      enemyPatternIndex % TUNING.enemies[enemyIdx].pattern.length
    ];
    const incoming = intent.dmg;
    setIncomingDamage(incoming);

    // Mana regen each turn
    setPlayerMana((m) => Math.min(TUNING.player.maxMana, m + TUNING.player.manaRegenPerTurn));

    showCombatBanner(
      { eyebrow: 'Player Turn', title: 'Your move', detail: `Turn ${turnNum}`, tone: 'player' },
      1600,
    );
    playSound('playerTurn');
    setPhase('drafting');
  };

  // ----------------------------------------------------------
  // Effects
  // ----------------------------------------------------------

  useEffect(() => {
    const [newDeck, initialPool] = buildBattleDeck();
    setDeck(newDeck);
    setCurrentRow(initialPool);
    setBoardCardAnimationKeys(Array.from({ length: TUNING.hand.rowSize }, () => 0));
    setDeckShuffleCount(1);
    setEnemyHp(TUNING.enemies[enemyIdx].hp);
    setEnemyPatternIndex(0);
    setEnemyBurnStacks(0);
    setEnemyBurnDuration(0);
    setEnemyFreezeStacks(0);
    setPlayerBurnStacks(0);
    setPlayerBurnDuration(0);
    setPlayerFreezeStacks(0);
    setRerollsUsedEnemy(0);
    setDiscardsUsedEnemy(0);
    setHand([]);
    setAllocationSlots(Array(TUNING.hand.handSize).fill(null));

    // Start first turn (mana regen skipped on battle start — player already at full)
    const intent = TUNING.enemies[enemyIdx].pattern[0];
    setIncomingDamage(intent.dmg);
    setTurn(1);
    setPhase('drafting');
    showCombatBanner(
      { eyebrow: 'Player Turn', title: 'Your move', detail: 'Turn 1', tone: 'player' },
      1600,
    );
    playSound('playerTurn');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyIdx, gameResetCount]);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
  }, [log]);

  // ----------------------------------------------------------
  // Player actions
  // ----------------------------------------------------------

  const pickTile = (idx) => {
    if (phase !== 'drafting') return;
    if (handFull) return;
    const tile = currentRow[idx];
    if (tile === undefined || tile === null) return;

    const newHand = [...hand, tile];
    setHand(newHand);
    setAllocationSlots((slots) => {
      const next = [...slots];
      next[newHand.length - 1] = null;
      return next;
    });
    playSound('cardPick');

    const composition = getBattleDeckComposition();
    const { card: newCard, deck: updatedDeck, reshuffled } = drawFromDeck(deck, composition);
    setDeck(updatedDeck);
    if (reshuffled) setDeckShuffleCount((v) => v + 1);
    playSound('cardDeal');
    setBoardCardAnimationKeys((keys) => {
      const next = [...keys];
      next[idx] = (next[idx] || 0) + 1;
      return next;
    });
    setCurrentRow((row) => {
      const next = [...row];
      next[idx] = newCard;
      return next;
    });
  };

  /** Cycle a hand tile's bucket assignment: null → attack → shield → null */
  const assignTile = (handIdx, bucket) => {
    if (phase !== 'drafting') return;
    if (handIdx < 0 || handIdx >= hand.length) return;
    setAllocationSlots((slots) => {
      const next = [...slots];
      next[handIdx] = bucket; // null to unassign
      return next;
    });
  };

  /** Discard a hand tile and allow picking a replacement */
  const discardHandTile = (handIdx) => {
    if (phase !== 'drafting') return;
    if (handIdx < 0 || handIdx >= hand.length) return;
    if (discardsUsedEnemy >= TUNING.draft.maxDiscardsPerTurn) return;
    if (playerMana < TUNING.draft.discardManaCost) return;

    setDiscardsUsedEnemy((v) => v + 1);
    setPlayerMana((m) => m - TUNING.draft.discardManaCost);
    playSound('discard');

    setHand((h) => h.filter((_, i) => i !== handIdx));
    setAllocationSlots((slots) => {
      const next = slots.filter((_, i) => i !== handIdx);
      while (next.length < TUNING.hand.handSize) next.push(null);
      return next;
    });
    addLog(`T${turn}: discard hand tile (-${TUNING.draft.discardManaCost} MP)`);
  };

  const reroll = () => {
    if (phase !== 'drafting') return;
    if (rerollsUsedEnemy >= TUNING.draft.maxRerollsPerEnemy) return;
    if (playerMana < TUNING.draft.rerollManaCost) return;

    setPlayerMana((m) => m - TUNING.draft.rerollManaCost);
    playSound('reroll');

    const newPool = buildBoardRow(TUNING.weights, TUNING.hand.rowSize);
    setCurrentRow(newPool);
    setBoardCardAnimationKeys((keys) => keys.map((k) => k + 1));
    setRerollsUsedEnemy((v) => v + 1);
    addLog(`T${turn}: reroll board (-${TUNING.draft.rerollManaCost} MP)`);
  };

  const discardBoardTile = (index) => {
    if (phase !== 'drafting') return;
    if (index < 0 || index >= currentRow.length) return;
    if (discardsUsedEnemy >= TUNING.draft.maxDiscardsPerTurn) return;
    if (playerMana < TUNING.draft.discardManaCost) return;

    setDiscardsUsedEnemy((v) => v + 1);
    setPlayerMana((m) => m - TUNING.draft.discardManaCost);
    playSound('discard');

    const composition = getBattleDeckComposition();
    const { card: replacementCard, deck: updatedDeck, reshuffled } = drawFromDeck(deck, composition);
    setDeck(updatedDeck);
    if (reshuffled) setDeckShuffleCount((v) => v + 1);
    playSound('cardDeal');
    setBoardCardAnimationKeys((keys) => {
      const next = [...keys];
      next[index] = (next[index] || 0) + 1;
      return next;
    });
    setCurrentRow((row) => {
      const next = [...row];
      next[index] = replacementCard;
      return next;
    });
    addLog(`T${turn}: discard board tile (-${TUNING.draft.discardManaCost} MP)`);
  };

  // ----------------------------------------------------------
  // Victory helper
  // ----------------------------------------------------------

  const triggerVictory = (currentMana, currentHp) => {
    setTimeout(() => {
      const hpAfterFoe = Math.min(TUNING.player.maxHp, currentHp + TUNING.player.hpRegenPerFoe);
      setPlayerHp(hpAfterFoe);
      setPlayerMana(currentMana);
      setVictoryReward({
        baseManaGain: 0,
        baseHpGain: TUNING.player.hpRegenPerFoe,
        manaAfter: currentMana,
        hpAfter: hpAfterFoe,
        choicesAllowed: 1,
        perks: buildRewardOptions(),
      });
      setSelectedRewardKeys([]);
      setCombatBanner(null);
      playSound('victory');
      addLog(`❆ ${enemy.name} defeated`);
      if (TUNING.player.hpRegenPerFoe > 0) {
        addLog(`+${TUNING.player.hpRegenPerFoe} HP after foe (${hpAfterFoe}/${TUNING.player.maxHp})`);
      }
      setPhase('victory');
    }, 1300);
  };

  // ----------------------------------------------------------
  // Resolution — core Phase 1 logic
  // ----------------------------------------------------------

  const resolveAllocation = () => {
    if (phase !== 'drafting') return;
    if (!allTilesAllocated) return;
    setPhase('resolving');
    playSound('submit');

    const result = computeAllBuckets(allocation);
    const {
      totalDamage,
      totalBlock,
      attackBurnStacks,
      attackFreezeStacks,
      shieldBurnContact,
      shieldFreezeContact,
    } = result;

    setTimeout(() => {
      // --- Apply shield ---
      const shieldCap = TUNING.player.maxShield;
      const shieldAfterGain = Math.min(shieldCap, playerShield + totalBlock);
      if (totalBlock > 0) {
        setPlayerShield(shieldAfterGain);
        addLog(`T${turn}: Shield +${totalBlock} (${shieldAfterGain}/${shieldCap})`);
      }

      // --- Apply attack to enemy ---
      // Freeze modifier applies to Steel damage only.
      // For simplicity in Phase 1, we apply freeze to the total attack
      // proportional to Steel tiles (applyFreezeModifier handles the math).
      // The totalDamage already has Steel separated via computeBucketResult,
      // but for Phase 1 we approximate: if enemy has freeze stacks, boost
      // the steel component. We recompute the steel-only portion here.
      const steelTiles = allocation.attack.filter((t) => t === 'S').length;
      const nonSteelDmg = totalDamage - Math.round(
        TUNING.elements.steel.atkBase *
        steelTiles *
        (TUNING.combos[Math.min(steelTiles, 5)] ?? 1.0),
      );
      const baseSteelDmg = totalDamage - nonSteelDmg;
      const boostedSteelDmg = applyFreezeModifier(baseSteelDmg, enemyFreezeStacks);
      const finalDmg = Math.max(0, boostedSteelDmg + nonSteelDmg);

      // Apply damage to enemy HP (no enemy shield in Phase 1)
      const newEnemyHp = Math.max(0, enemyHp - finalDmg);
      setEnemyHp(newEnemyHp);

      // Apply burn stacks to enemy
      if (attackBurnStacks > 0) {
        setEnemyBurnStacks((s) =>
          Math.min(TUNING.status.burnMaxStacks, s + attackBurnStacks),
        );
        setEnemyBurnDuration(TUNING.status.burnDuration);
        addLog(
          `  Applied ${attackBurnStacks} burn stack(s) to ${enemy.name} (${TUNING.status.burnDuration} turns)`,
        );
      }

      // Apply freeze stacks to enemy
      if (attackFreezeStacks > 0) {
        setEnemyFreezeStacks((s) =>
          Math.min(TUNING.status.freezeMaxStacks, s + attackFreezeStacks),
        );
        addLog(`  Applied ${attackFreezeStacks} freeze stack(s) to ${enemy.name}`);
      }

      if (finalDmg > 0) {
        addLog(`T${turn}: Attack → ${finalDmg} dmg to ${enemy.name}`);
        if (enemyFreezeStacks > 0 && steelTiles > 0) {
          addLog(
            `  Freeze ×${enemyFreezeStacks}: steel dmg ${baseSteelDmg} → ${boostedSteelDmg}`,
          );
        }
        playSound('attack');
      }

      showCombatBanner({
        eyebrow: 'Player Action',
        title: `${finalDmg > 0 ? finalDmg + ' dmg' : ''}${totalBlock > 0 ? ' / +' + totalBlock + ' shield' : ''}`,
        detail: result.bucketBreakdowns.attack.join('  ') || 'No attack',
        tone: 'player',
      });

      if (newEnemyHp <= 0) {
        triggerVictory(playerMana, playerHp);
        return;
      }

      // --- Enemy turn ---
      const intent = currentIntentRaw;

      setTimeout(() => {
        showCombatBanner(
          {
            eyebrow: 'Enemy Turn',
            title: `${enemy.name} prepares`,
            detail: buildTelegraphText(intent),
            tone: 'enemy',
          },
        );
        playSound('enemyTurn');
      }, 1000);

      setTimeout(() => {
        const rawEnemyDmg = intent.dmg;
        const absorbed = Math.min(shieldAfterGain, rawEnemyDmg);
        const taken = rawEnemyDmg - absorbed;
        const newPlayerShield = shieldAfterGain - absorbed;
        const newPlayerHp = Math.max(0, playerHp - taken);

        setPlayerShield(newPlayerShield);
        setPlayerHp(newPlayerHp);

        if (absorbed > 0) {
          addLog(
            `  ${enemy.name} hits ${rawEnemyDmg} — shield absorbs ${absorbed}, you take ${taken}`,
          );
        } else {
          addLog(`  ${enemy.name} hits ${rawEnemyDmg} — you take ${taken}`);
        }

        // Apply enemy status to player based on element
        if (intent.element === 'fire') {
          const newStacks = Math.min(
            TUNING.status.burnMaxStacks,
            playerBurnStacks + 1,
          );
          setPlayerBurnStacks(newStacks);
          setPlayerBurnDuration(TUNING.status.burnDuration);
          addLog(`  ${enemy.name} applies 1 burn stack to you (${TUNING.status.burnDuration} turns)`);
        } else if (intent.element === 'ice') {
          const newStacks = Math.min(
            TUNING.status.freezeMaxStacks,
            playerFreezeStacks + 1,
          );
          setPlayerFreezeStacks(newStacks);
          addLog(`  ${enemy.name} applies 1 freeze stack to you`);
        }

        // Contact effects from player shield (fire/ice tiles in shield bucket)
        if (taken < rawEnemyDmg || absorbed > 0) {
          // Shield was hit
          if (shieldBurnContact > 0) {
            setEnemyBurnStacks((s) =>
              Math.min(TUNING.status.burnMaxStacks, s + shieldBurnContact),
            );
            setEnemyBurnDuration(TUNING.status.burnDuration);
            addLog(
              `  Fire shield contact: ${shieldBurnContact} burn stack(s) to ${enemy.name}`,
            );
          }
          if (shieldFreezeContact > 0) {
            setEnemyFreezeStacks((s) =>
              Math.min(TUNING.status.freezeMaxStacks, s + shieldFreezeContact),
            );
            addLog(
              `  Ice shield contact: ${shieldFreezeContact} freeze stack(s) to ${enemy.name}`,
            );
          }
        }

        showCombatBanner({
          eyebrow: enemy.name,
          title: `Attack ${rawEnemyDmg} damage`,
          detail:
            absorbed > 0
              ? `Shield absorbed ${absorbed}, you took ${taken}`
              : `You took ${taken} damage`,
          tone: 'enemy',
        });
        playSound('enemyAttack');

        if (newPlayerHp <= 0) {
          setPhase('defeat');
          addLog('✗ You were defeated');
          playSound('defeat');
          return;
        }

        // --- End-of-turn ticks ---
        setTimeout(() => {
          let currentEnemyHp = newEnemyHp;
          let loggedTick = false;

          // Enemy burn tick
          if (enemyBurnStacks > 0 && enemyBurnDuration > 0) {
            const burnDmg = enemyBurnStacks * TUNING.status.burnPerStack;
            currentEnemyHp = Math.max(0, currentEnemyHp - burnDmg);
            setEnemyHp(currentEnemyHp);
            const newDuration = enemyBurnDuration - 1;
            setEnemyBurnDuration(newDuration);
            if (newDuration <= 0) setEnemyBurnStacks(0);
            addLog(
              `  🔥 ${enemy.name} burns: ${burnDmg} dmg (${newDuration} turns left)`,
            );
            loggedTick = true;
          }

          // Enemy freeze decay
          if (enemyFreezeStacks > 0) {
            setEnemyFreezeStacks((s) => Math.max(0, s - 1));
            if (!loggedTick) addLog(`  ❄ ${enemy.name} freeze decays`);
          }

          // Player burn tick
          if (playerBurnStacks > 0 && playerBurnDuration > 0) {
            const burnDmg = playerBurnStacks * TUNING.status.burnPerStack;
            const burnedHp = Math.max(0, newPlayerHp - burnDmg);
            setPlayerHp(burnedHp);
            const newDuration = playerBurnDuration - 1;
            setPlayerBurnDuration(newDuration);
            if (newDuration <= 0) setPlayerBurnStacks(0);
            addLog(`  🔥 You burn: ${burnDmg} dmg (${newDuration} turns left)`);
            if (burnedHp <= 0) {
              setPhase('defeat');
              addLog('✗ You were defeated (burn)');
              playSound('defeat');
              return;
            }
          }

          // Player freeze decay
          if (playerFreezeStacks > 0) {
            setPlayerFreezeStacks((s) => Math.max(0, s - 1));
          }

          if (currentEnemyHp <= 0) {
            triggerVictory(playerMana, newPlayerHp);
            return;
          }

          // Advance pattern index and start next turn
          const nextPatternIdx = enemyPatternIndex + 1;
          setEnemyPatternIndex(nextPatternIdx);
          const nextTurn = turn + 1;
          setTurn(nextTurn);
          startTurn(nextTurn);
        }, 1500);
      }, 2000);
    }, 600);
  };

  // ----------------------------------------------------------
  // Gauntlet progression
  // ----------------------------------------------------------

  const applyPerk = (key) => {
    if (selectedRewardKeys.includes(key)) return;
    if (selectedRewardKeys.length >= (victoryReward?.choicesAllowed ?? 1)) return;
    setSelectedRewardKeys((k) => [...k, key]);

    if (key === 'hp') {
      setPlayerHp((h) => Math.min(TUNING.player.maxHp + 30, h + 30));
      addLog('Perk: +30 max HP');
    } else if (key === 'shield') {
      // Max shield increase is stateful — stored in TUNING which is const,
      // so we track a runtime override; for Phase 1 just give current shield cap +10
      addLog('Perk: +10 max shield cap (Phase 2 implementation)');
    } else if (key === 'mana') {
      setPlayerMana(TUNING.player.maxMana);
      addLog('Perk: Mana restored to full');
    }
  };

  const nextEnemy = () => {
    if (enemyIdx < TUNING.enemies.length - 1) {
      setEnemyIdx((i) => i + 1);
      setLog([]);
      setVictoryReward(null);
    } else {
      // Final victory
      setPhase('victory');
    }
  };

  const restart = () => {
    setEnemyIdx(0);
    setPlayerHp(TUNING.player.maxHp);
    setPlayerMana(TUNING.player.startingMana);
    setPlayerShield(0);
    setLog([]);
    setVictoryReward(null);
    setSelectedRewardKeys([]);
    setGameResetCount((c) => c + 1);
  };

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------

  return {
    state: {
      enemyIdx,
      enemy,
      playerHp,
      playerMana,
      playerShield,
      enemyHp,
      enemyBurnStacks,
      enemyBurnDuration,
      enemyFreezeStacks,
      playerBurnStacks,
      playerBurnDuration,
      playerFreezeStacks,
      turn,
      hand,
      allocationSlots,
      handFull,
      allTilesAllocated,
      allocation,
      allocPreview,
      currentRow,
      boardCardAnimationKeys,
      rerollsUsedEnemy,
      discardsUsedEnemy,
      phase,
      log,
      incomingDamage,
      combatBanner,
      victoryReward,
      selectedRewardKeys,
      logEndRef,
      deckShuffleCount,
      currentIntent: currentIntentRaw,
      nextIntent: nextIntentRaw,
    },
    actions: {
      pickTile,
      assignTile,
      discardHandTile,
      discardBoardTile,
      reroll,
      resolveAllocation,
      applyPerk,
      nextEnemy,
      restart,
    },
  };
}
