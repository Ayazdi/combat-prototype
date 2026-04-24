import { useState, useEffect, useRef } from 'react';
import { TUNING } from './constants';
import { buildShuffledDeck, drawFromDeck, computeResolution, isValidSequence, findBestAcceptedSequence } from './gameHelpers';
import { playSound } from './soundEffects';

// ============================================================
// useCombat — encapsulates every piece of combat state and
// exposes a flat API that UI components can call.
//
// Return value:
//   state   – all reactive values the UI reads
//   actions – { pickTile, selectCommittedTile, reroll, discardSelected, discardBoardTile, applyPerk, nextEnemy, restart }
// ============================================================
export default function useCombat() {
  // --- Core player / enemy state ---
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [playerHp, setPlayerHp] = useState(TUNING.player.maxHp);
  const [playerMana, setPlayerMana] = useState(TUNING.player.startingMana);
  const [playerShield, setPlayerShield] = useState(0);
  const [playerDamageBonusPct, setPlayerDamageBonusPct] = useState(0);
  const [playerDefenceBonusPct, setPlayerDefenceBonusPct] = useState(0);
  const [enemyHp, setEnemyHp] = useState(TUNING.enemies[0].hp);
  const [enemyShield, setEnemyShield] = useState(0);

  // --- Turn / draft tracking ---
  const [turn, setTurn] = useState(1);
  const [round, setRound] = useState(1);
  const [committed, setCommitted] = useState([]);
  const [selectedCommittedIndex, setSelectedCommittedIndex] = useState(null);
  const [picksUsed, setPicksUsed] = useState(0);
  const [pickLimit, setPickLimit] = useState(TUNING.draft.maxSequence);
  const [currentRow, setCurrentRow] = useState([]);
  const [boardCardAnimationKeys, setBoardCardAnimationKeys] = useState(
    Array.from({ length: TUNING.draft.rowSize }, () => 0),
  );
  const [committedCardAnimationKeys, setCommittedCardAnimationKeys] = useState(
    Array.from({ length: TUNING.draft.maxSequence }, () => 0),
  );
  const [rerollsUsedEnemy, setRerollsUsedEnemy] = useState(0);
  // Persistent battle deck — rebuilt fresh at the start of each enemy fight.
  const [deck, setDeck] = useState([]);
  const [deckShuffleCount, setDeckShuffleCount] = useState(1);
  const handSlotCount = TUNING.draft.maxSequence;

  // --- UI / phase state ---
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState('drafting'); // drafting | resolving | victory | defeat
  const [incomingDamage, setIncomingDamage] = useState(0);
  const [enemyTelegraph, setEnemyTelegraph] = useState('');
  const [enemyIntentQueue, setEnemyIntentQueue] = useState([]);
  const [combatBanner, setCombatBanner] = useState(null);
  const [victoryReward, setVictoryReward] = useState(null);
  const [selectedPerkKey, setSelectedPerkKey] = useState(null);

  // Ref used to auto-scroll the battle log
  const logEndRef = useRef(null);
  const combatBannerTimeoutRef = useRef(null);
  // Intent bag ensures 2:1 attack:defend ratio with random order.
  const enemyIntentBagRef = useRef([]);

  const enemy = TUNING.enemies[enemyIdx];

  // ----------------------------------------------------------
  // Helpers — small functions used only inside this hook
  // ----------------------------------------------------------

  /** Append a line to the battle log */
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

  const formatPlayerAction = (damage, block) => {
    if (damage > 0 && block > 0) return `Player attacked ${damage} and shielded ${block}`;
    if (damage > 0) return `Player attacked ${damage}`;
    if (block > 0) return `Player shielded ${block}`;
    return 'Player took no action';
  };

  /** Return the deck composition for this battle, adjusted for the enemy passive. */
  const getBattleDeckComposition = () => {
    const base = { ...TUNING.deckComposition };
    if (enemy.ability === 'empty_plus') {
      // Mage: shift 4 cards into No Action while keeping the deck at 40 cards.
      base.E += 4;
      base.A = Math.max(1, base.A - 2);
      base.D = Math.max(1, base.D - 2);
    }
    return base;
  };

  /**
   * Shuffle a fresh deck for this battle and draw the initial card pool.
   * Returns [remainingDeck, initialPool].
   * Builds initial 8-tile board from the shuffled deck.
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
    return [workingDeck, initialPool];
  };

  /** Return the mana cost to discard (doubled by Witch passive) */
  const getDiscardCost = () => {
    return enemy.ability === 'double_discard'
      ? TUNING.draft.discardCost * 2
      : TUNING.draft.discardCost;
  };

  const getPerkScale = (defeatedEnemyIndex) => {
    return 1 + defeatedEnemyIndex * TUNING.rewardPerks.perEnemyGrowthRate;
  };

  const formatPercent = (value) => {
    return `${Math.round(value * 100)}%`;
  };

  const buildPerkOptions = (defeatedEnemyIndex) => {
    const scale = getPerkScale(defeatedEnemyIndex);
    const damageIncrease = TUNING.rewardPerks.damageIncreaseBase * scale;
    const defenceIncrease = TUNING.rewardPerks.defenceIncreaseBase * scale;
    const manaBonus = Math.round(TUNING.rewardPerks.manaBonusBase * scale);
    const hpBonus = Math.round(TUNING.rewardPerks.hpBonusBase * scale);

    return [
      {
        key: 'damage',
        label: `+${formatPercent(damageIncrease)} Damage`,
        detail: 'Future attacks hit harder',
        amount: damageIncrease,
      },
      {
        key: 'defence',
        label: `+${formatPercent(defenceIncrease)} Defence`,
        detail: 'Future shield gains improve',
        amount: defenceIncrease,
      },
      {
        key: 'mana',
        label: `+${manaBonus} Mana`,
        detail: 'Restore mana up to max',
        amount: manaBonus,
      },
      {
        key: 'hp',
        label: `+${hpBonus} HP`,
        detail: 'Restore HP up to max',
        amount: hpBonus,
      },
    ];
  };

  /** Enemy defend amount is explicit per enemy definition. */
  const getEnemyDefendShield = () => {
    return enemy.defend || 0;
  };

  const getEnemyEnrageBonus = (turnNum) => {
    const startTurn = TUNING.enemyAI.enrageStartTurn || 0;
    if (!startTurn || turnNum < startTurn) return 0;
    return (turnNum - startTurn + 1) * (TUNING.enemyAI.enrageAttackBonusPerTurn || 0);
  };

  const refillEnemyIntentBag = () => {
    const bag = [];
    const attackWeight = TUNING.enemyAI.intentWeights.attack || 0;
    const defendWeight = TUNING.enemyAI.intentWeights.defend || 0;
    for (let i = 0; i < attackWeight; i++) bag.push('attack');
    for (let i = 0; i < defendWeight; i++) bag.push('defend');
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    enemyIntentBagRef.current = bag;
  };

  const drawEnemyIntentType = () => {
    if (enemyIntentBagRef.current.length === 0) refillEnemyIntentBag();
    return enemyIntentBagRef.current.pop() || 'attack';
  };

  /** Build a weighted random enemy intent for a specific turn number. */
  const rollEnemyIntent = (turnNum) => {
    let type = drawEnemyIntentType();
    const enrageBonus = getEnemyEnrageBonus(turnNum);

    // Goblin charged-strike keeps priority on every 3rd turn.
    if (enemy.ability === 'charged_strike' && turnNum % 3 === 0) {
      type = 'attack';
      const amount = 50 + enrageBonus;
      const enrageText = enrageBonus > 0 ? `, ENRAGED +${enrageBonus}` : '';
      return { type, amount, enragedBonus: enrageBonus, text: `ATTACK ${amount} (CHARGED${enrageText})` };
    }

    if (type === 'attack') {
      const amount = enemy.attack + enrageBonus;
      const enrageText = enrageBonus > 0 ? ` (ENRAGED +${enrageBonus})` : '';
      return { type, amount, enragedBonus: enrageBonus, text: `ATTACK ${amount}${enrageText}` };
    }

    const defendAmount = getEnemyDefendShield();
    return { type, amount: defendAmount, text: `SHIELD +${defendAmount}` };
  };

  /** Ensure we always have exactly two upcoming intents in the queue. */
  const buildIntentQueue = (turnNum, existing = []) => {
    const q = [...existing];
    while (q.length < 2) {
      const futureTurn = turnNum + q.length;
      q.push(rollEnemyIntent(futureTurn));
    }
    return q.slice(0, 2);
  };

  // ----------------------------------------------------------
  // Turn lifecycle
  // ----------------------------------------------------------

  /** Reset draft state and initialize telegraphed enemy intents for a new turn */
  const startTurn = (turnNum, queueOverride = null) => {
    const queue = buildIntentQueue(turnNum, queueOverride || enemyIntentQueue);
    setEnemyIntentQueue(queue);

    const currentIntent = queue[0] || { type: 'attack', amount: enemy.attack, text: `ATTACK ${enemy.attack}` };
    const incoming = currentIntent.type === 'attack' ? currentIntent.amount : 0;

    setIncomingDamage(incoming);
    setEnemyTelegraph('');
    showCombatBanner({
      eyebrow: 'Player Turn',
      title: 'Your move',
      detail: `Turn ${turnNum}`,
      tone: 'player',
    }, 1600);
    playSound('playerTurn');
    setCommitted([]);
    setCommittedCardAnimationKeys(Array.from({ length: handSlotCount }, () => 0));
    setSelectedCommittedIndex(null);
    setPicksUsed(0);
    setPickLimit(TUNING.draft.maxSequence);
    if (turnNum === 1) setRerollsUsedEnemy(0);
    setRound(1);
    setPhase('drafting');
  };

  // ----------------------------------------------------------
  // Effects
  // ----------------------------------------------------------

  /** When the enemy changes, announce and start the first turn */
  useEffect(() => {
    // Build a fresh deck and initial card pool for this battle.
    const [newDeck, initialPool] = buildBattleDeck();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeck(newDeck);
    setCurrentRow(initialPool);
    setBoardCardAnimationKeys(Array.from({ length: TUNING.draft.rowSize }, () => 0));
    setDeckShuffleCount(1);
    enemyIntentBagRef.current = [];
    setEnemyShield(0);
    const initialQueue = buildIntentQueue(1);
    setEnemyIntentQueue(initialQueue);
    startTurn(1, initialQueue);
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
    // Fill only truly empty slots (undefined/null). E is a real card in hand.
    const emptyIndex = committed.findIndex((t) => t === undefined || t === null);
    const newCommitted = [...committed];
    let placedIndex;
    if (emptyIndex >= 0) {
      newCommitted[emptyIndex] = tile;
      placedIndex = emptyIndex;
    } else if (newCommitted.length < handSlotCount) {
      newCommitted.push(tile);
      placedIndex = newCommitted.length - 1;
    } else {
      return;
    }
    setCommitted(newCommitted);
    playSound('cardPick');
    setCommittedCardAnimationKeys((keys) => {
      const next = [...keys];
      next[placedIndex] = (next[placedIndex] || 0) + 1;
      return next;
    });
    // New picks become the currently selected committed tile.
    setSelectedCommittedIndex(placedIndex);
    setPicksUsed((v) => v + 1);

    setRound((r) => r + 1);

    // Draw the replacement card from the persistent battle deck.
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

  /**
   * Submit the committed sequence.
   * Must be one of the accepted sequences (e.g. AA, DDD, AAAAA).
   * If invalid the turn fails — player takes enemy damage with 0 offence.
   */
  const submitSequence = () => {
    if (phase !== 'drafting') return;
    if (committed.length === 0) return;
    playSound('submit');

    const bestCombo = findBestAcceptedSequence(committed, {
      damageMultiplier: 1 + playerDamageBonusPct,
      defenceMultiplier: 1 + playerDefenceBonusPct,
    });

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

  /** Spend mana to reroll the board without ending the turn or spending a pick. */
  const reroll = () => {
    if (phase !== 'drafting') return;
    if (rerollsUsedEnemy >= TUNING.draft.maxRerollsPerEnemy) return;
    if (playerMana < TUNING.draft.rerollCost) return;
    setPlayerMana((m) => m - TUNING.draft.rerollCost);
    playSound('reroll');
    // Draw rowSize fresh cards from the persistent battle deck (replaces whole pool).
    // Reroll intentionally does not change turn, round, picks used, or pick limit.
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
    setBoardCardAnimationKeys((keys) => keys.map((key) => key + 1));
    setRerollsUsedEnemy((v) => v + 1);
    if (enemy.ability === 'adaptive') {
      setEnemyShield((s) => s + 25);
      addLog(`  ${enemy.name} adapts: +25 shield (reroll)`);
    }
  };

  /** Select a committed tile index to discard. Clicking again clears selection. */
  const selectCommittedTile = (index) => {
    if (phase !== 'drafting') return;
    if (index < 0 || index >= committed.length) return;
    if (committed[index] === undefined || committed[index] === null) return;
    playSound('cardPick');
    setSelectedCommittedIndex((prev) => (prev === index ? null : index));
  };

  /**
   * Spend mana to permanently discard one selected committed tile.
   * Discard grants +1 extra selection budget this turn.
   */
  const discardSelected = () => {
    if (committed.length === 0) return;
    const discardIndex =
      selectedCommittedIndex !== null && selectedCommittedIndex >= 0 && selectedCommittedIndex < committed.length
        ? selectedCommittedIndex
        : committed.length - 1;
    const discardedCard = committed[discardIndex];
    if (discardedCard === undefined || discardedCard === null) return;

    const cost = getDiscardCost();
    if (playerMana < cost) return;

    setPlayerMana((m) => m - cost);
    playSound('discard');

    setCommitted((c) => {
      const next = [...c];
      // Discarded card leaves an empty slot, not a new slot.
      next[discardIndex] = null;
      return next;
    });

    // Discard allows one additional pick this turn.
    setPickLimit((limit) => limit + 1);
    setSelectedCommittedIndex(null);
    if (enemy.ability === 'adaptive') {
      setEnemyShield((s) => s + 25);
      addLog(`  ${enemy.name} adapts: +25 shield (discard)`);
    }
  };

  /** Spend mana to permanently discard one visible board card. */
  const discardBoardTile = (index) => {
    if (phase !== 'drafting') return;
    if (index < 0 || index >= currentRow.length) return;
    if (currentRow[index] === undefined || currentRow[index] === null) return;

    const cost = getDiscardCost();
    if (playerMana < cost) return;

    setPlayerMana((m) => m - cost);
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

    if (enemy.ability === 'adaptive') {
      setEnemyShield((s) => s + 25);
      addLog(`  ${enemy.name} adapts: +25 shield (discard)`);
    }
  };

  /** Move one action card to an empty hand slot (null/undefined only). */
  const moveCommittedTile = (fromIndex, toIndex) => {
    if (phase !== 'drafting') return;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= handSlotCount) return;

    setCommitted((c) => {
      const source = c[fromIndex];
      if (!source || source === 'E') return c;

      const hasEmptyCell = c.includes(null) || c.length < handSlotCount;
      if (!hasEmptyCell) return c;

      const target = c[toIndex];
      const targetIsEmpty = target === undefined || target === null;
      if (!targetIsEmpty) return c;

      const next = [...c];
      while (next.length <= toIndex) next.push(null);
      next[toIndex] = source;
      next[fromIndex] = null;
      return next;
    });

    setSelectedCommittedIndex(null);
    playSound('cardDeal');
  };

  // ----------------------------------------------------------
  // Resolution — apply damage, shields, check win/loss
  // ----------------------------------------------------------
  const resolveTurn = (finalSequence) => {
    setPhase('resolving');
    const { damage, block, segments, finisherBonusPct } = computeResolution(finalSequence, {
      damageMultiplier: 1 + playerDamageBonusPct,
      defenceMultiplier: 1 + playerDefenceBonusPct,
    });

    // Readable log string for the committed sequence
    const seqStr = segments
      .map((s) => {
        if (s.type === 'E') return '·';
        if (s.type === 'A') return `${'A'.repeat(s.count)}(${s.damage})`;
        if (s.type === 'D') return `${'D'.repeat(s.count)}(${s.block})`;
        return '';
      })
      .join(' ');

    setTimeout(() => {
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
      if (finisherBonusPct > 0) {
        logParts.push(`finisher +${formatPercent(finisherBonusPct)}`);
      }
      addLog(logParts.join(' / '));
      showCombatBanner({
        eyebrow: 'Player Action',
        title: formatPlayerAction(damage, block),
        detail: finisherBonusPct > 0
          ? `${seqStr || 'No combo resolved'} / Finisher +${formatPercent(finisherBonusPct)}`
          : seqStr || 'No combo resolved',
        tone: 'player',
      });
      if (finalSequence.length >= 2) playSound('combo');
      if (damage > 0) playSound('attack');
      if (block > 0) playSound('defence');

      // --- Apply player damage to enemy (enemy shield absorbs first) ---
      const armoredReduction = enemy.ability === 'armored' && damage > 0 ? 10 : 0;
      const effectiveDamage = Math.max(0, damage - armoredReduction);
      if (armoredReduction > 0) {
        addLog(`  ${enemy.name} armor reduces hit by ${armoredReduction}`);
      }
      const enemyAbsorbed = Math.min(enemyShield, effectiveDamage);
      const enemyShieldAfterHit = enemyShield - enemyAbsorbed;
      const dealtToHp = effectiveDamage - enemyAbsorbed;
      const newEnemyHp = Math.max(0, enemyHp - dealtToHp);
      if (enemyAbsorbed > 0) {
        addLog(`  ${enemy.name} shield absorbs ${enemyAbsorbed}`);
      }
      setPlayerShield(shieldAfterGain);
      setEnemyShield(enemyShieldAfterHit);
      setEnemyHp(newEnemyHp);

      if (newEnemyHp <= 0) {
        setTimeout(() => {
          const manaAfterFoe = Math.min(TUNING.player.maxMana, playerMana + TUNING.player.manaRegenPerFoe);
          const hpAfterFoe = Math.min(TUNING.player.maxHp, playerHp + TUNING.player.hpRegenPerFoe);
          setPlayerMana(manaAfterFoe);
          setPlayerHp(hpAfterFoe);
          setVictoryReward({
            baseManaGain: TUNING.player.manaRegenPerFoe,
            baseHpGain: TUNING.player.hpRegenPerFoe,
            manaAfter: manaAfterFoe,
            hpAfter: hpAfterFoe,
            perks: buildPerkOptions(enemyIdx),
          });
          setSelectedPerkKey(null);
          setCombatBanner(null);
          playSound('victory');
          addLog(`✦ ${enemy.name} defeated`);
          addLog(`+${TUNING.player.manaRegenPerFoe} MP after foe (${manaAfterFoe}/${TUNING.player.maxMana})`);
          addLog(`+${TUNING.player.hpRegenPerFoe} HP after foe (${hpAfterFoe}/${TUNING.player.maxHp})`);
          setPhase('victory');
        }, 1300);
        return;
      }

      // --- Enemy executes current intent (attack or defend) ---
      const currentIntent = enemyIntentQueue[0] || { type: 'attack', amount: incomingDamage };

      setTimeout(() => {
        showCombatBanner({
          eyebrow: 'Enemy Turn',
          title: `${enemy.name} prepares`,
          detail: currentIntent.text,
          tone: 'enemy',
        });
        playSound('enemyTurn');
      }, 1000);

      setTimeout(() => {
        let shieldAfterEnemyAction = enemyShieldAfterHit;
        let newPlayerHp = playerHp;

        if (currentIntent.type === 'defend') {
          shieldAfterEnemyAction += currentIntent.amount;
          setEnemyShield(shieldAfterEnemyAction);
          setPlayerShield(shieldAfterGain);
          addLog(`  ${enemy.name} fortifies +${currentIntent.amount} shield`);
          showCombatBanner({
            eyebrow: enemy.name,
            title: `Shield +${currentIntent.amount}`,
            detail: `Shield total ${shieldAfterEnemyAction}`,
            tone: 'enemy',
          });
          playSound('enemyDefend');
        } else {
          const rawDmg = currentIntent.amount;
          const absorbed = Math.min(shieldAfterGain, rawDmg);
          const shieldAfterHit = shieldAfterGain - absorbed;
          const taken = rawDmg - absorbed;
          newPlayerHp = Math.max(0, playerHp - taken);

          if (absorbed > 0) {
            addLog(`  ${enemy.name} hits ${rawDmg} — shield absorbs ${absorbed}, you take ${taken}`);
          } else {
            addLog(`  ${enemy.name} hits ${rawDmg} — no shield, you take ${taken}`);
          }
          setPlayerShield(shieldAfterHit);
          showCombatBanner({
            eyebrow: enemy.name,
            title: `Attack ${rawDmg} damage`,
            detail: absorbed > 0 ? `Shield absorbed ${absorbed}, you took ${taken}` : `You took ${taken} damage`,
            tone: 'enemy',
          });
          playSound('enemyAttack');
        }

        setPlayerHp(newPlayerHp);

        if (newPlayerHp <= 0) {
          setTimeout(() => {
            setCombatBanner(null);
            playSound('defeat');
            addLog('✖ You fell in battle');
            setPhase('defeat');
          }, 1200);
          return;
        }

        // Advance to the next turn after the outcome banner has had time to land.
        setTimeout(() => {
          const nextTurn = turn + 1;
          const nextQueue = buildIntentQueue(nextTurn, enemyIntentQueue.slice(1));
          setEnemyIntentQueue(nextQueue);
          setTurn(nextTurn);
          startTurn(nextTurn, nextQueue);
        }, 1400);
      }, 2200);
    }, 250);
  };

  // ----------------------------------------------------------
  // Flow controls — next enemy / restart
  // ----------------------------------------------------------

  const applyPerk = (key) => {
    if (phase !== 'victory' || selectedPerkKey || !victoryReward) return;
    const perk = victoryReward.perks.find((option) => option.key === key);
    if (!perk) return;

    if (perk.key === 'damage') {
      setPlayerDamageBonusPct((value) => value + perk.amount);
      addLog(`Perk chosen: ${perk.label}`);
    } else if (perk.key === 'defence') {
      setPlayerDefenceBonusPct((value) => value + perk.amount);
      addLog(`Perk chosen: ${perk.label}`);
    } else if (perk.key === 'mana') {
      setPlayerMana((value) => Math.min(TUNING.player.maxMana, value + perk.amount));
      addLog(`Perk chosen: ${perk.label}`);
    } else if (perk.key === 'hp') {
      setPlayerHp((value) => Math.min(TUNING.player.maxHp, value + perk.amount));
      addLog(`Perk chosen: ${perk.label}`);
    }

    playSound('perk');
    setSelectedPerkKey(key);
  };

  /** Advance to the next enemy in the gauntlet */
  const nextEnemy = () => {
    if (!selectedPerkKey) return;
    if (enemyIdx < TUNING.enemies.length - 1) {
      playSound('submit');
      const next = enemyIdx + 1;
      setEnemyIdx(next);
      setEnemyHp(TUNING.enemies[next].hp);
      setEnemyShield(0);
      // Carry current HP/MP/shield to the next fight; no recovery between foes.
      setVictoryReward(null);
      setSelectedPerkKey(null);
      setTurn(1);
      setLog([]);
    }
  };

  /** Restart the fight against the current enemy */
  const restart = () => {
    playSound('submit');
    setEnemyHp(TUNING.enemies[enemyIdx].hp);
    setPlayerHp(TUNING.player.maxHp);
    setPlayerMana(TUNING.player.startingMana);
    setPlayerShield(0);
    setPlayerDamageBonusPct(0);
    setPlayerDefenceBonusPct(0);
    setEnemyShield(0);
    setTurn(1);
    setLog([]);
    setRerollsUsedEnemy(0);
    setSelectedCommittedIndex(null);
    setVictoryReward(null);
    setSelectedPerkKey(null);
    // Rebuild the deck and pool for this fight.
    const [newDeck, initialPool] = buildBattleDeck();
    setDeck(newDeck);
    setCurrentRow(initialPool);
    setBoardCardAnimationKeys(Array.from({ length: TUNING.draft.rowSize }, () => 0));
    setCommittedCardAnimationKeys(Array.from({ length: handSlotCount }, () => 0));
    setDeckShuffleCount(1);
    startTurn(1);
  };

  // ----------------------------------------------------------
  // Derived / computed values the UI needs
  // ----------------------------------------------------------
  const resolutionModifiers = {
    damageMultiplier: 1 + playerDamageBonusPct,
    defenceMultiplier: 1 + playerDefenceBonusPct,
  };
  const bestCombo = findBestAcceptedSequence(committed, resolutionModifiers);
  const preview = computeResolution(bestCombo ? bestCombo.tiles : [], resolutionModifiers);
  const discardCost = getDiscardCost();
  const sequenceValid = isValidSequence(committed);
  const sequenceFull = picksUsed >= pickLimit;
  const rerollsLeftEnemy = Math.max(0, TUNING.draft.maxRerollsPerEnemy - rerollsUsedEnemy);
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
      enemyShield,
      playerHp,
      playerMana,
      playerShield,
      playerDamageBonusPct,
      playerDefenceBonusPct,
      turn,
      round,
      committed,
      selectedCommittedIndex,
      picksUsed,
      pickLimit,
      handSlotCount,
      currentRow,
      boardCardAnimationKeys,
      committedCardAnimationKeys,
      rerollsUsedEnemy,
      deckSize: deck.length,
      deckCounts,
      deckShuffleCount,
      deckIsShuffled: true,
      rerollsLeftEnemy,
      log,
      phase,
      incomingDamage,
      enemyTelegraph,
      enemyIntentQueue,
      preview,
      discardCost,
      sequenceValid,
      sequenceFull,
      combatBanner,
      victoryReward,
      selectedPerkKey,
      logEndRef,
    },
    actions: {
      pickTile,
      selectCommittedTile,
      moveCommittedTile,
      reroll,
      discardSelected,
      discardBoardTile,
      applyPerk,
      submitSequence,
      nextEnemy,
      restart,
    },
  };
}
