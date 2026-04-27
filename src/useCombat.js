import { useState, useEffect, useRef } from 'react';
import { TUNING } from './constants';
import {
  buildShuffledDeck,
  drawFromDeck,
  buildBoardRow,
  computeAllBuckets,
  applyFreezeModifier,
  applyEnemyShield,
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
  const [playerShieldBreakdown, setPlayerShieldBreakdown] = useState({ steel: 0, ice: 0, fire: 0 });
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

  // nextPatternIdx passed explicitly to avoid stale closure from setState above
  const startTurn = (turnNum, nextPatternIdx = enemyPatternIndex) => {
    setHand([]);
    setAllocationSlots(Array(TUNING.hand.handSize).fill(null));
    setDiscardsUsedEnemy(0);

    const pattern = TUNING.enemies[enemyIdx].pattern;
    const intent = pattern[nextPatternIdx % pattern.length];
    setIncomingDamage(intent.attack.dmg);

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
    setIncomingDamage(intent.attack.dmg);
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
    const { totalDamage, attackBurnStacks, attackFreezeStacks, shieldResult } = result;

    // Set player shield for this turn (consumed after enemy attack)
    setPlayerShieldBreakdown(shieldResult);

    setTimeout(() => {
      // --- Log shield allocation ---
      if (shieldResult.steelBlock > 0) {
        addLog(`T${turn}: Steel shield ${shieldResult.steelBlock} HP block`);
      }
      if (shieldResult.iceBurnCancel > 0) {
        addLog(`T${turn}: Ice shield — will cancel ${shieldResult.iceBurnCancel} burn stack(s)`);
      }
      if (shieldResult.fireFreezeCancel > 0) {
        addLog(`T${turn}: Fire shield — will cancel ${shieldResult.fireFreezeCancel} freeze stack(s)`);
      }

      // --- Apply freeze modifier to steel portion of attack ---
      const steelTiles = allocation.attack.filter((t) => t === 'S').length;
      const baseSteelDmg = steelTiles > 0
        ? Math.round(TUNING.elements.steel.atkBase * steelTiles * (TUNING.combos[Math.min(steelTiles, 5)] ?? 1.0))
        : 0;
      const nonSteelDmg = totalDamage - baseSteelDmg;
      const boostedSteelDmg = applyFreezeModifier(baseSteelDmg, enemyFreezeStacks);
      let finalDmg = Math.max(0, boostedSteelDmg + nonSteelDmg);
      let finalBurnStacks = attackBurnStacks;
      let finalFreezeStacks = attackFreezeStacks;

      // --- Apply enemy's elemental shield to player's attack ---
      const enemyShieldObj = currentIntentRaw.shield;
      if (enemyShieldObj && enemyShieldObj.stacks > 0) {
        if (enemyShieldObj.element === 'steel') {
          const blocked = Math.min(finalDmg, enemyShieldObj.stacks * TUNING.elements.steel.shieldBase);
          finalDmg = Math.max(0, finalDmg - blocked);
          if (blocked > 0) addLog(`  Enemy steel shield blocks ${blocked} damage`);
        } else if (enemyShieldObj.element === 'ice') {
          const cancelled = Math.min(finalBurnStacks, enemyShieldObj.stacks);
          finalBurnStacks = Math.max(0, finalBurnStacks - cancelled);
          if (cancelled > 0) addLog(`  Enemy ice shield cancels ${cancelled} burn stack(s)`);
        } else if (enemyShieldObj.element === 'fire') {
          const cancelled = Math.min(finalFreezeStacks, enemyShieldObj.stacks);
          finalFreezeStacks = Math.max(0, finalFreezeStacks - cancelled);
          if (cancelled > 0) addLog(`  Enemy fire shield cancels ${cancelled} freeze stack(s)`);
        }
      }

      // --- Cross-status cancellation: player burns vs enemy freeze, ice vs enemy burn ---
      let curEnemyFreezeStacks = enemyFreezeStacks;
      let curEnemyBurnStacks = enemyBurnStacks;
      let curEnemyBurnDuration = enemyBurnDuration;

      if (finalBurnStacks > 0 && curEnemyFreezeStacks > 0) {
        const cancelled = Math.min(finalBurnStacks, curEnemyFreezeStacks);
        finalBurnStacks -= cancelled;
        curEnemyFreezeStacks = Math.max(0, curEnemyFreezeStacks - cancelled);
        setEnemyFreezeStacks(curEnemyFreezeStacks);
        addLog(`  Fire melts ${cancelled} enemy freeze stack(s) → ${curEnemyFreezeStacks} remain`);
      }

      if (finalFreezeStacks > 0 && curEnemyBurnStacks > 0) {
        const cancelled = Math.min(finalFreezeStacks, curEnemyBurnStacks);
        finalFreezeStacks -= cancelled;
        curEnemyBurnStacks = Math.max(0, curEnemyBurnStacks - cancelled);
        if (curEnemyBurnStacks === 0) curEnemyBurnDuration = 0;
        setEnemyBurnStacks(curEnemyBurnStacks);
        setEnemyBurnDuration(curEnemyBurnDuration);
        addLog(`  Ice cools ${cancelled} enemy burn stack(s) → ${curEnemyBurnStacks} remain`);
      }

      // --- Apply damage and status to enemy ---
      const newEnemyHp = Math.max(0, enemyHp - finalDmg);
      setEnemyHp(newEnemyHp);

      if (finalBurnStacks > 0) {
        setEnemyBurnStacks((s) => Math.min(TUNING.status.burnMaxStacks, s + finalBurnStacks));
        setEnemyBurnDuration(TUNING.status.burnDuration);
        addLog(`  Applied ${finalBurnStacks} burn stack(s) to ${enemy.name} (${TUNING.status.burnDuration} turns)`);
      }
      if (finalFreezeStacks > 0) {
        setEnemyFreezeStacks((s) => Math.min(TUNING.status.freezeMaxStacks, s + finalFreezeStacks));
        addLog(`  Applied ${finalFreezeStacks} freeze stack(s) to ${enemy.name}`);
      }

      if (finalDmg > 0) {
        addLog(`T${turn}: Attack → ${finalDmg} dmg to ${enemy.name}`);
        if (enemyFreezeStacks > 0 && steelTiles > 0) {
          addLog(`  Freeze ×${enemyFreezeStacks}: steel dmg ${baseSteelDmg} → ${boostedSteelDmg}`);
        }
        playSound('attack');
      }

      showCombatBanner({
        eyebrow: 'Player Action',
        title: `${finalDmg > 0 ? finalDmg + ' dmg' : ''}${shieldResult.steelBlock > 0 ? ' / ' + shieldResult.steelBlock + ' SHL' : ''}`,
        detail: result.bucketBreakdowns.attack.join('  ') || 'No attack',
        tone: 'player',
      });

      if (newEnemyHp <= 0) {
        triggerVictory(playerMana, playerHp);
        return;
      }

      // --- Enemy turn: AI counter-element check ---
      const intent = currentIntentRaw;
      let effectiveAttack = { ...intent.attack };
      if (effectiveAttack.element === 'ice' && playerBurnStacks > 0) {
        effectiveAttack = { dmg: effectiveAttack.dmg, element: 'steel', stacks: 0 };
        addLog(`  ${enemy.name} senses your burns — strikes with raw steel!`);
      } else if (effectiveAttack.element === 'fire' && playerFreezeStacks > 0) {
        effectiveAttack = { dmg: effectiveAttack.dmg, element: 'steel', stacks: 0 };
        addLog(`  ${enemy.name} senses your frost — strikes with raw steel!`);
      }

      setTimeout(() => {
        showCombatBanner({
          eyebrow: 'Enemy Turn',
          title: `${enemy.name} prepares`,
          detail: buildTelegraphText(intent),
          tone: 'enemy',
        });
        playSound('enemyTurn');
      }, 1000);

      setTimeout(() => {
        const rawEnemyDmg = effectiveAttack.dmg;
        const rawEnemyStacks = effectiveAttack.stacks;
        const rawEnemyElement = effectiveAttack.element;

        // Apply player elemental shield
        let finalEnemyDmg = rawEnemyDmg;
        let incomingStacks = rawEnemyStacks;

        if (rawEnemyElement === 'steel') {
          const absorbed = Math.min(shieldResult.steelBlock, finalEnemyDmg);
          finalEnemyDmg = Math.max(0, finalEnemyDmg - absorbed);
          if (absorbed > 0) addLog(`  Steel shield absorbs ${absorbed} damage`);
        } else if (rawEnemyElement === 'fire') {
          const burnsCancelled = Math.min(shieldResult.iceBurnCancel, incomingStacks);
          incomingStacks = Math.max(0, incomingStacks - burnsCancelled);
          if (burnsCancelled > 0) addLog(`  Ice shield cancels ${burnsCancelled} incoming burn(s)!`);
          const absorbed = Math.min(shieldResult.steelBlock, finalEnemyDmg);
          finalEnemyDmg = Math.max(0, finalEnemyDmg - absorbed);
          if (absorbed > 0) addLog(`  Steel shield absorbs ${absorbed} fire damage`);
        } else if (rawEnemyElement === 'ice') {
          const freezesCancelled = Math.min(shieldResult.fireFreezeCancel, incomingStacks);
          incomingStacks = Math.max(0, incomingStacks - freezesCancelled);
          if (freezesCancelled > 0) addLog(`  Fire shield cancels ${freezesCancelled} incoming freeze(s)!`);
          const absorbed = Math.min(shieldResult.steelBlock, finalEnemyDmg);
          finalEnemyDmg = Math.max(0, finalEnemyDmg - absorbed);
          if (absorbed > 0) addLog(`  Steel shield absorbs ${absorbed} ice damage`);
        }

        // Cross-status cancellation on player
        let incomingBurns = rawEnemyElement === 'fire' ? incomingStacks : 0;
        let incomingFreezes = rawEnemyElement === 'ice' ? incomingStacks : 0;
        let newPlayerBurnStacks = playerBurnStacks;
        let newPlayerFreezeStacks = playerFreezeStacks;

        if (incomingFreezes > 0 && newPlayerBurnStacks > 0) {
          const cancelled = Math.min(incomingFreezes, newPlayerBurnStacks);
          incomingFreezes -= cancelled;
          newPlayerBurnStacks -= cancelled;
          addLog(`  Cold neutralizes ${cancelled} of your burn stack(s)!`);
        }
        if (incomingBurns > 0 && newPlayerFreezeStacks > 0) {
          const cancelled = Math.min(incomingBurns, newPlayerFreezeStacks);
          incomingBurns -= cancelled;
          newPlayerFreezeStacks -= cancelled;
          addLog(`  Fire melts ${cancelled} of your freeze stack(s)!`);
        }

        // Apply remaining incoming status
        if (incomingBurns > 0) {
          newPlayerBurnStacks = Math.min(TUNING.status.burnMaxStacks, newPlayerBurnStacks + incomingBurns);
          setPlayerBurnDuration(TUNING.status.burnDuration);
          addLog(`  ${enemy.name} applies ${incomingBurns} burn stack(s) to you`);
        }
        if (incomingFreezes > 0) {
          newPlayerFreezeStacks = Math.min(TUNING.status.freezeMaxStacks, newPlayerFreezeStacks + incomingFreezes);
          addLog(`  ${enemy.name} applies ${incomingFreezes} freeze stack(s) to you`);
        }
        if (newPlayerBurnStacks === 0) setPlayerBurnDuration(0);
        setPlayerBurnStacks(newPlayerBurnStacks);
        setPlayerFreezeStacks(newPlayerFreezeStacks);

        const newPlayerHp = Math.max(0, playerHp - finalEnemyDmg);
        setPlayerHp(newPlayerHp);
        if (finalEnemyDmg > 0) {
          addLog(`  ${enemy.name} hits — you take ${finalEnemyDmg}`);
        }

        // Consume shield (one-turn-only)
        setPlayerShieldBreakdown({ steel: 0, ice: 0, fire: 0 });

        showCombatBanner({
          eyebrow: enemy.name,
          title: `Attack ${rawEnemyDmg} damage`,
          detail: finalEnemyDmg < rawEnemyDmg
            ? `Shield reduced to ${finalEnemyDmg}, you took ${finalEnemyDmg}`
            : `You took ${finalEnemyDmg} damage`,
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
            addLog(`  🔥 ${enemy.name} burns: ${burnDmg} dmg (${newDuration} turns left)`);
            loggedTick = true;
          }

          // Enemy freeze decay
          if (enemyFreezeStacks > 0) {
            setEnemyFreezeStacks((s) => Math.max(0, s - 1));
            if (!loggedTick) addLog(`  ❄ ${enemy.name} freeze decays`);
          }

          // Player burn tick
          if (newPlayerBurnStacks > 0 && playerBurnDuration > 0) {
            const burnDmg = newPlayerBurnStacks * TUNING.status.burnPerStack;
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
          if (newPlayerFreezeStacks > 0) {
            setPlayerFreezeStacks((s) => Math.max(0, s - 1));
          }

          if (currentEnemyHp <= 0) {
            triggerVictory(playerMana, newPlayerHp);
            return;
          }

          // Advance pattern and start next turn
          const nextPatternIdx = enemyPatternIndex + 1;
          setEnemyPatternIndex(nextPatternIdx);
          const nextTurn = turn + 1;
          setTurn(nextTurn);
          startTurn(nextTurn, nextPatternIdx);
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
    setPlayerShieldBreakdown({ steel: 0, ice: 0, fire: 0 });
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
      playerShieldBreakdown,
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
      deck,
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
