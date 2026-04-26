import { useState, useEffect, useRef } from 'react';
import { TUNING, ABILITY_COMBOS, PASSIVE_ABILITIES } from './constants';
import { buildShuffledDeck, drawFromDeck, computeResolution, isValidSequence, findBestAcceptedSequence, isPassiveAvailable } from './gameHelpers';
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

  // --- Abilities and passives ---
  const [playerAbilityComboIds, setPlayerAbilityComboIds] = useState([]);
  const [playerPassives, setPlayerPassives] = useState([]);

  // Starting ability selection (4 random from 6 each run)
  const [startingAbilityOptions, setStartingAbilityOptions] = useState(() =>
    [...ABILITY_COMBOS].sort(() => Math.random() - 0.5).slice(0, 4),
  );
  const [gameResetCount, setGameResetCount] = useState(0);
  const isFirstBattleRef = useRef(true);

  // --- Status effects ---
  // burn: null | { turnsLeft, tickDamage }
  // vulnerable: null | { turnsLeft, bonusPct }
  // endure: boolean
  const [statusEffects, setStatusEffects] = useState({ burn: null, vulnerable: null, endure: false });
  const statusEffectsRef = useRef({ burn: null, vulnerable: null, endure: false });

  // --- Combat tracking ---
  const [lastDamageTaken, setLastDamageTaken] = useState(0);
  const [stockpileStacks, setStockpileStacks] = useState(0);
  const [lastWasFiveCardCombo, setLastWasFiveCardCombo] = useState(false);
  const [tenacityTriggeredThisBattle, setTenacityTriggeredThisBattle] = useState(false);
  const [setupBonusPicks, setSetupBonusPicks] = useState(0);

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
  const [discardsUsedEnemy, setDiscardsUsedEnemy] = useState(0);
  // Persistent battle deck — rebuilt fresh at the start of each enemy fight.
  const [deck, setDeck] = useState([]);
  const [deckShuffleCount, setDeckShuffleCount] = useState(1);
  const handSlotCount = TUNING.draft.maxSequence;

  // --- UI / phase state ---
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState('ability_select'); // ability_select | drafting | resolving | victory | defeat
  const [incomingDamage, setIncomingDamage] = useState(0);
  const [enemyTelegraph, setEnemyTelegraph] = useState('');
  const [enemyIntentQueue, setEnemyIntentQueue] = useState([]);
  const [combatBanner, setCombatBanner] = useState(null);
  const [victoryReward, setVictoryReward] = useState(null);
  const [selectedRewardKeys, setSelectedRewardKeys] = useState([]);

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

  /** Update status effects in both state and ref atomically */
  const updateStatusEffects = (updater) => {
    setStatusEffects((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      statusEffectsRef.current = next;
      return next;
    });
  };

  const buildResolutionContext = () => ({
    damageMultiplier: 1 + playerDamageBonusPct,
    defenceMultiplier: 1 + playerDefenceBonusPct,
    playerMana,
    playerMaxMana: TUNING.player.maxMana,
    playerShield,
    lastDamageTaken,
    enemyHp,
    enemyMaxHp: enemy.hp,
    unlockedAbilityIds: playerAbilityComboIds,
    passives: playerPassives,
  });

  /** Return the deck composition for this battle, adjusted for the enemy passive. */
  const getBattleDeckComposition = () => {
    const base = { ...TUNING.deckComposition };
    if (enemy.ability === 'empty_plus') {
      base.E += 4;
      base.A = Math.max(1, base.A - 2);
      base.D = Math.max(1, base.D - 2);
    }
    return base;
  };

  /**
   * Shuffle a fresh deck for this battle and draw the initial card pool.
   * Returns [remainingDeck, initialPool].
   * Builds initial rowSize-tile board from the shuffled deck.
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

  const buildRewardOptions = (defeatedEnemyIndex, ownedAbilityIds = [], ownedPassiveIds = []) => {
    const scale = 1 + defeatedEnemyIndex * TUNING.rewardPerks.perEnemyGrowthRate;
    const formatPercent = (v) => `${Math.round(v * 100)}%`;

    // Ability combos not yet owned
    const availableAbilities = ABILITY_COMBOS
      .filter((c) => !ownedAbilityIds.includes(c.id))
      .map((c) => ({
        key: `ability:${c.id}`,
        kind: 'ability',
        abilityId: c.id,
        label: `${c.name}`,
        sublabel: c.pattern,
        detail: c.detail,
      }));

    // Passives whose requirements are met and not yet owned
    const availablePassives = PASSIVE_ABILITIES
      .filter((p) => !ownedPassiveIds.includes(p.id) && isPassiveAvailable(p, ownedAbilityIds))
      .map((p) => ({
        key: `passive:${p.id}`,
        kind: 'passive',
        passiveId: p.id,
        label: p.name,
        sublabel: p.category === 'specific' ? 'Specific' : p.category === 'enhancer' ? 'Enhancer' : 'Universal',
        detail: p.detail,
      }));

    // Stat perks as fallback
    const damageIncrease = TUNING.rewardPerks.damageIncreaseBase * scale;
    const defenceIncrease = TUNING.rewardPerks.defenceIncreaseBase * scale;
    const manaBonus = Math.round(TUNING.rewardPerks.manaBonusBase * scale);
    const hpBonus = Math.round(TUNING.rewardPerks.hpBonusBase * scale);
    const statPerks = [
      { key: 'damage', kind: 'stat', label: `+${formatPercent(damageIncrease)} Damage`, sublabel: 'Stat', detail: 'Future attacks hit harder', amount: damageIncrease },
      { key: 'defence', kind: 'stat', label: `+${formatPercent(defenceIncrease)} Defence`, sublabel: 'Stat', detail: 'Future shield gains improve', amount: defenceIncrease },
      { key: 'mana', kind: 'stat', label: `+${manaBonus} Mana`, sublabel: 'Stat', detail: 'Restore mana up to max', amount: manaBonus },
      { key: 'hp', kind: 'stat', label: `+${hpBonus} HP`, sublabel: 'Stat', detail: 'Restore HP up to max', amount: hpBonus },
    ];

    // Pool: abilities + passives first, stat perks fill gaps
    const primaryPool = [...availableAbilities, ...availablePassives].sort(() => Math.random() - 0.5);
    const shuffledStats = statPerks.sort(() => Math.random() - 0.5);
    const pool = [...primaryPool, ...shuffledStats];

    // Return exactly 4 distinct options
    return pool.slice(0, 4);
  };

  /** Enemy defend amount is explicit per enemy definition. */
  const getEnemyDefendShield = () => {
    return enemy.defend || 0;
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

    // Goblin charged-strike keeps priority on every 3rd turn.
    if (enemy.ability === 'charged_strike' && turnNum % 3 === 0) {
      type = 'attack';
      return { type, amount: 50, text: 'ATTACK 50 (CHARGED)' };
    }

    if (type === 'attack') {
      return { type, amount: enemy.attack, text: `ATTACK ${enemy.attack}` };
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
  const startTurn = (turnNum, queueOverride = null, extraPickBonus = 0) => {
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

    // Base pick limit + Focused passive (+1) + extra bonus from Flow State or Setup
    const hasFocused = playerPassives.includes('focused');
    const baseLimit = TUNING.draft.maxSequence + (hasFocused ? 1 : 0) + extraPickBonus;
    setPickLimit(baseLimit);
    setSetupBonusPicks(0);

    if (turnNum === 1) setRerollsUsedEnemy(0);
    setDiscardsUsedEnemy(0);
    setRound(1);
    setPhase('drafting');
  };

  // ----------------------------------------------------------
  // Effects
  // ----------------------------------------------------------

  /** When the enemy changes (or game resets), set up the battle and optionally show ability select */
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
    setDiscardsUsedEnemy(0);
    setTenacityTriggeredThisBattle(false);
    setLastDamageTaken(0);
    setStockpileStacks(0);
    setLastWasFiveCardCombo(false);
    updateStatusEffects({ burn: null, vulnerable: null, endure: false });
    const initialQueue = buildIntentQueue(1);
    setEnemyIntentQueue(initialQueue);

    if (isFirstBattleRef.current) {
      // Show ability selection before starting the first fight
      setPhase('ability_select');
    } else {
      startTurn(1, initialQueue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyIdx, gameResetCount]);

  /** Keep the battle log scrolled to the bottom */
  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
  }, [log]);

  // ----------------------------------------------------------
  // Player actions
  // ----------------------------------------------------------

  /**
   * Pick one tile from the draft pool.
   * The picked slot is immediately replaced by drawing from the deck.
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

    // Scavenger: gain 5 MP when picking an E tile
    if (tile === 'E' && playerPassives.includes('scavenger')) {
      setPlayerMana((m) => Math.min(TUNING.player.maxMana, m + 5));
    }

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

    const bestCombo = findBestAcceptedSequence(committed, buildResolutionContext());

    if (bestCombo) {
      if (bestCombo.sequence !== committed.join('')) {
        addLog(`T${turn}: best combo found in hand -> ${bestCombo.sequence}`);
      }
      // Resolve using the strongest accepted combo found in the submitted hand.
      resolveTurn(bestCombo);
    } else {
      // Invalid sequence — log the failure and punish the player
      addLog(`T${turn}: INVALID sequence [${committed.join('')}] — no damage, no block`);
      resolveTurn([]); // resolve with empty = 0 dmg / 0 block, enemy still hits
    }
  };

  /** Reroll the board without ending the turn or spending a pick. Costs mana, limited per enemy. */
  const reroll = () => {
    if (phase !== 'drafting') return;
    if (rerollsUsedEnemy >= TUNING.draft.maxRerollsPerEnemy) return;
    const rerollCost = playerPassives.includes('sharpness') ? 15 : TUNING.draft.rerollManaCost;
    if (playerMana < rerollCost) return;
    setPlayerMana((mana) => mana - rerollCost);
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
    addLog(`T${turn}: reroll board (-${rerollCost} MP)`);
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
   * Permanently discard one selected committed tile (mana cost, limited per turn).
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

    const maxDiscards = enemy.ability === 'double_discard' ? 1 : TUNING.draft.maxDiscardsPerTurn;
    if (discardsUsedEnemy >= maxDiscards) return;
    if (playerMana < TUNING.draft.discardManaCost) return;

    setDiscardsUsedEnemy((v) => v + 1);
    setPlayerMana((mana) => mana - TUNING.draft.discardManaCost);
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
    addLog(`T${turn}: discard committed ${discardedCard} (-${TUNING.draft.discardManaCost} MP)`);
    if (enemy.ability === 'adaptive') {
      setEnemyShield((s) => s + 25);
      addLog(`  ${enemy.name} adapts: +25 shield (discard)`);
    }
  };

  /** Permanently discard one visible board card (mana cost, limited per turn). */
  const discardBoardTile = (index) => {
    if (phase !== 'drafting') return;
    if (index < 0 || index >= currentRow.length) return;
    if (currentRow[index] === undefined || currentRow[index] === null) return;

    const maxDiscards = enemy.ability === 'double_discard' ? 1 : TUNING.draft.maxDiscardsPerTurn;
    if (discardsUsedEnemy >= maxDiscards) return;
    if (playerMana < TUNING.draft.discardManaCost) return;

    setDiscardsUsedEnemy((v) => v + 1);
    setPlayerMana((mana) => mana - TUNING.draft.discardManaCost);
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
  // Victory helper
  // ----------------------------------------------------------

  const triggerVictory = (currentMana, currentHp) => {
    setTimeout(() => {
      const manaAfterFoe = Math.min(TUNING.player.maxMana, currentMana + TUNING.player.manaRegenPerFoe);
      const hpAfterFoe = Math.min(TUNING.player.maxHp, currentHp + TUNING.player.hpRegenPerFoe);
      setPlayerMana(manaAfterFoe);
      setPlayerHp(hpAfterFoe);
      setVictoryReward({
        baseManaGain: TUNING.player.manaRegenPerFoe,
        baseHpGain: TUNING.player.hpRegenPerFoe,
        manaAfter: manaAfterFoe,
        hpAfter: hpAfterFoe,
        choicesAllowed: TUNING.rewardChoicesPerKill,
        perks: buildRewardOptions(enemyIdx, playerAbilityComboIds, playerPassives),
      });
      setSelectedRewardKeys([]);
      setCombatBanner(null);
      playSound('victory');
      addLog(`❆ ${enemy.name} defeated`);
      addLog(`+${TUNING.player.manaRegenPerFoe} MP after foe (${manaAfterFoe}/${TUNING.player.maxMana})`);
      addLog(`+${TUNING.player.hpRegenPerFoe} HP after foe (${hpAfterFoe}/${TUNING.player.maxHp})`);
      setPhase('victory');
    }, 1300);
  };

  // ----------------------------------------------------------
  // Resolution — apply damage, shields, check win/loss
  // ----------------------------------------------------------
  const resolveTurn = (resolvedInput) => {
    setPhase('resolving');
    const resolution = Array.isArray(resolvedInput)
      ? {
          kind: 'basic',
          tiles: resolvedInput,
          sequence: resolvedInput.join(''),
          length: resolvedInput.length,
          heal: 0,
          manaCost: 0,
          statusEffect: null,
          abilityBonus: 0,
          ...computeResolution(resolvedInput, {
            damageMultiplier: 1 + playerDamageBonusPct,
            defenceMultiplier: 1 + playerDefenceBonusPct,
          }),
        }
      : resolvedInput;

    const {
      damage: baseDamage,
      block,
      mana,
      heal = 0,
      manaCost = 0,
      segments,
      ability,
      hits,
      statusEffect,
      abilityBonus = 0,
    } = resolution;

    const isAbilityCombo = resolution.kind === 'ability';
    const finalTiles = resolution.tiles || [];

    // Apply Last Stand (+20% dmg when HP < 40%)
    const lastStandActive = playerPassives.includes('last_stand') && playerHp < TUNING.player.maxHp * 0.4;
    const damage = lastStandActive ? Math.round(baseDamage * 1.2) : baseDamage;

    const applyDamageToEnemy = (rawHits, startingShield, startingHp) => {
      let nextShield = startingShield;
      let nextHp = startingHp;
      let absorbedTotal = 0;
      let dealtTotal = 0;
      let armorReductionTotal = 0;
      rawHits.forEach((rawHit) => {
        if (rawHit <= 0) return;
        const armorReduction = enemy.ability === 'armored' ? Math.min(10, rawHit) : 0;
        const effectiveHit = Math.max(0, rawHit - armorReduction);
        const absorbed = Math.min(nextShield, effectiveHit);
        const dealt = effectiveHit - absorbed;
        nextShield -= absorbed;
        nextHp = Math.max(0, nextHp - dealt);
        armorReductionTotal += armorReduction;
        absorbedTotal += absorbed;
        dealtTotal += dealt;
      });
      return { shield: nextShield, hp: nextHp, absorbed: absorbedTotal, dealt: dealtTotal, armorReduction: armorReductionTotal };
    };

    const seqStr = ability
      ? `${ability.pattern} ${ability.name}`
      : (segments || []).map((s) => {
          if (s.type === 'E') return '·';
          if (s.type === 'A') return `${'A'.repeat(s.count)}(${s.damage})`;
          if (s.type === 'D') return `${'D'.repeat(s.count)}(${s.block})`;
          if (s.type === 'M') return `${'M'.repeat(s.count)}(+${s.mana}mp)`;
          if (s.type === 'ABILITY') return `${s.pattern} ${s.name}`;
          return '';
        }).join(' ');

    setTimeout(() => {
      const shieldCap = TUNING.player.maxShield;
      const manaAfterResolution = Math.min(TUNING.player.maxMana, playerMana + mana);
      const playerHpAfterAbility = Math.min(TUNING.player.maxHp, playerHp + heal);
      const shieldBefore = playerShield;
      const shieldRaw = shieldBefore + block;
      let shieldAfterGain = Math.min(shieldCap, shieldRaw);
      let shieldWasted = shieldRaw - shieldAfterGain;

      // Overflow passive: excess shield -> HP at 50%
      let overflowHeal = 0;
      if (playerPassives.includes('overflow') && shieldWasted > 0) {
        overflowHeal = Math.floor(shieldWasted * 0.5);
      }
      const playerHpAfterOverflow = Math.min(TUNING.player.maxHp, playerHpAfterAbility + overflowHeal);

      // --- Process ability status effects ---
      let nextStatusEffects = { ...statusEffectsRef.current };
      let immediateStatusDmg = 0; // Resonance: 10 dmg when status applied
      let echoDmg = 0; // Echo: 10 dmg after any ability triggers
      let catalystMana = 0; // Catalyst: +10 MP refund

      if (isAbilityCombo) {
        // Catalyst: refund 10 MP
        if (playerPassives.includes('catalyst')) catalystMana = 10;

        // Echo: deal 10 bonus damage
        if (playerPassives.includes('echo')) echoDmg = 10;

        if (statusEffect?.type === 'burn') {
          const hasKindling = playerPassives.includes('kindling');
          const hasAfterburn = playerPassives.includes('afterburn');
          const hasAmplifier = playerPassives.includes('amplifier');
          const newTickDamage = hasKindling ? 25 : 15;
          const newBaseTurns = hasAfterburn ? 3 : 2;
          const newTurns = hasAmplifier ? newBaseTurns + 1 : newBaseTurns;

          const existingBurn = nextStatusEffects.burn;
          if (existingBurn) {
            // Stack: add turns (capped at 6), take highest tick damage
            nextStatusEffects = {
              ...nextStatusEffects,
              burn: {
                turnsLeft: Math.min(6, existingBurn.turnsLeft + newTurns),
                tickDamage: Math.max(existingBurn.tickDamage, newTickDamage),
              },
            };
          } else {
            nextStatusEffects = { ...nextStatusEffects, burn: { turnsLeft: newTurns, tickDamage: newTickDamage } };
          }

          // Resonance: 10 dmg on apply
          if (playerPassives.includes('resonance')) immediateStatusDmg += 10;

          // Opportunist: if enemy is also Vulnerable, trigger immediate Burn tick
          const isVulnerable = statusEffectsRef.current.vulnerable && statusEffectsRef.current.vulnerable.turnsLeft > 0;
          if (playerPassives.includes('opportunist') && isVulnerable) {
            immediateStatusDmg += tickDamage;
          }
        } else if (statusEffect?.type === 'endure') {
          nextStatusEffects = { ...nextStatusEffects, endure: true };
          // Resonance does not apply to Endure (it's defensive)
        } else if (statusEffect?.type === 'vulnerable') {
          const hasCruelty = playerPassives.includes('cruelty');
          const hasAmplifier = playerPassives.includes('amplifier');
          const bonusPct = hasCruelty ? 0.50 : 0.30;
          const turnsLeft = hasAmplifier ? 2 : 1;
          nextStatusEffects = { ...nextStatusEffects, vulnerable: { turnsLeft, bonusPct } };

          // Resonance: 10 dmg on apply
          if (playerPassives.includes('resonance')) immediateStatusDmg += 10;

          // Setup: grant +1 pick next turn
          if (playerPassives.includes('setup')) {
            setSetupBonusPicks(1);
          }
        }
      }

      // Apply status effects and update ref
      updateStatusEffects(nextStatusEffects);

      const manaFinal = Math.min(TUNING.player.maxMana, manaAfterResolution + catalystMana);

      const logParts = [`T${turn}: ${seqStr} → ${damage} dmg`];
      if (block > 0) {
        if (shieldWasted > 0) {
          logParts.push(`+${block - shieldWasted} shield (${shieldWasted} wasted${overflowHeal > 0 ? ` → +${overflowHeal} HP` : ''})`);
        } else {
          logParts.push(`+${block} shield`);
        }
      }
      if (mana > 0) logParts.push(`+${mana} mana`);
      if (catalystMana > 0) logParts.push(`+${catalystMana} mana (Catalyst)`);
      if (heal > 0) logParts.push(`+${heal} HP`);
      if (overflowHeal > 0) logParts.push(`+${overflowHeal} HP (Overflow)`);
      if (isAbilityCombo && statusEffect) logParts.push(statusEffect.type === 'burn' ? 'Burn applied' : statusEffect.type === 'endure' ? 'Endure active' : 'Vulnerable applied');
      if (lastStandActive && damage > baseDamage) logParts.push(`Last Stand +${damage - baseDamage} dmg`);
      if (ability?.detail && !statusEffect) logParts.push(ability.detail);

      setPlayerMana(manaFinal);
      setPlayerHp(playerHpAfterOverflow);
      addLog(logParts.join(' / '));

      showCombatBanner({
        eyebrow: 'Player Action',
        title: ability ? ability.name : seqStr || 'No action',
        detail: seqStr,
        tone: 'player',
      });
      if (finalTiles.length >= 2) playSound('combo');
      if (damage > 0) playSound('attack');
      if (block > 0) playSound('defence');

      // --- Apply player damage + echo + immediate status dmg to enemy ---
      const totalDamageToEnemy = damage + echoDmg + immediateStatusDmg;

      // Note: Vulnerable applies to the NEXT attack after Press, not to Press itself.
      // So we check the pre-update statusEffectsRef for the previous vulnerable state.
      const wasVulnerable = statusEffectsRef.current.vulnerable && statusEffectsRef.current.vulnerable.turnsLeft > 0;
      const vulnerableBonusPct = wasVulnerable ? statusEffectsRef.current.vulnerable.bonusPct : 0;
      const totalDmgWithVulnerable = wasVulnerable
        ? Math.round(totalDamageToEnemy * (1 + vulnerableBonusPct))
        : totalDamageToEnemy;

      // Consume Vulnerable if it was active
      if (wasVulnerable) {
        const newVulnLeft = statusEffectsRef.current.vulnerable.turnsLeft - 1;
        const newVulnState = newVulnLeft > 0 ? { ...statusEffectsRef.current.vulnerable, turnsLeft: newVulnLeft } : null;
        updateStatusEffects((prev) => ({ ...prev, vulnerable: newVulnState }));
        if (vulnerableBonusPct > 0) addLog(`  Vulnerable: +${Math.round(vulnerableBonusPct * 100)}% dmg bonus`);
      }

      // Handle Drain ability: steal enemy shield
      let drainStealAmount = 0;
      if (isAbilityCombo && ability?.effect === 'drain') {
        const maxSteal = abilityBonus; // already calculated in computeAbilityResolution
        drainStealAmount = Math.min(enemyShield, maxSteal);
        const hasLeech = playerPassives.includes('leech');
        if (hasLeech) {
          const leechHeal = Math.min(15, TUNING.player.maxHp - playerHpAfterOverflow);
          setPlayerHp((h) => Math.min(TUNING.player.maxHp, h + 15));
          if (leechHeal > 0) addLog(`  Leech: +${leechHeal} HP`);
        }
        addLog(`  Drain: stole ${drainStealAmount} shield from ${enemy.name}`);
      }

      const enemyShieldBeforeSteal = Math.max(0, enemyShield - drainStealAmount);
      const playerShieldAfterDrain = Math.min(shieldCap, shieldAfterGain + drainStealAmount);

      const enemyDamage = applyDamageToEnemy(
        hits || (totalDmgWithVulnerable > 0 ? [totalDmgWithVulnerable] : []),
        enemyShieldBeforeSteal,
        enemyHp,
      );
      const enemyShieldAfterHit = enemyDamage.shield;
      const newEnemyHp = enemyDamage.hp;

      if (enemyDamage.armorReduction > 0) addLog(`  ${enemy.name} armor reduces hit by ${enemyDamage.armorReduction}`);
      if (enemyDamage.absorbed > 0) addLog(`  ${enemy.name} shield absorbs ${enemyDamage.absorbed}`);
      if (echoDmg > 0) addLog(`  Echo: +${echoDmg} dmg`);

      setPlayerShield(playerShieldAfterDrain);
      setEnemyShield(enemyShieldAfterHit);
      setEnemyHp(newEnemyHp);

      // Track stockpile (non-ability turns stack +8 dmg, max 40)
      if (!isAbilityCombo && playerPassives.includes('stockpile')) {
        setStockpileStacks((s) => Math.min(40, s + 8));
      }
      // Track flow state (consecutive 5-card combos)
      const wasLastFiveCard = lastWasFiveCardCombo;
      setLastWasFiveCardCombo(isAbilityCombo);

      if (newEnemyHp <= 0) {
        triggerVictory(manaFinal, playerHpAfterOverflow);
        return;
      }

      // --- Enemy executes current intent ---
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
        let currentEnemyHp = newEnemyHp;
        let newPlayerHp = playerHpAfterOverflow;

        if (currentIntent.type === 'defend') {
          shieldAfterEnemyAction += currentIntent.amount;
          setEnemyShield(shieldAfterEnemyAction);
          setPlayerShield(playerShieldAfterDrain);
          addLog(`  ${enemy.name} fortifies +${currentIntent.amount} shield`);
          showCombatBanner({
            eyebrow: enemy.name,
            title: `Shield +${currentIntent.amount}`,
            detail: `Shield total ${shieldAfterEnemyAction}`,
            tone: 'enemy',
          });
          playSound('enemyDefend');
          setLastDamageTaken(0);
        } else {
          let rawDmg = currentIntent.amount;
          // Thick Skin: -5 flat
          const thickSkinReduction = playerPassives.includes('thick_skin') ? 5 : 0;
          const modifiedDmg = Math.max(0, rawDmg - thickSkinReduction);
          const absorbed = Math.min(playerShieldAfterDrain, modifiedDmg);

          // Endure: absorb the hit completely
          const currentEndure = nextStatusEffects.endure;
          if (currentEndure) {
            updateStatusEffects((prev) => ({ ...prev, endure: false }));
            addLog(`  Endure absorbs ${enemy.name}'s ${rawDmg} hit`);
            setLastDamageTaken(0);

            // Retaliate: deal 25 dmg back
            if (playerPassives.includes('retaliate')) {
              const retaliateAbsorbed = Math.min(shieldAfterEnemyAction, 25);
              const retaliateDmg = 25 - retaliateAbsorbed;
              shieldAfterEnemyAction -= retaliateAbsorbed;
              currentEnemyHp = Math.max(0, currentEnemyHp - retaliateDmg);
              setEnemyShield(shieldAfterEnemyAction);
              setEnemyHp(currentEnemyHp);
              addLog(`  Retaliate: 25 dmg to ${enemy.name} (${retaliateDmg} to HP)`);
            }
            // Bulwark: gain 20 HP
            if (playerPassives.includes('bulwark')) {
              const bulwarkHeal = Math.min(20, TUNING.player.maxHp - newPlayerHp);
              newPlayerHp += bulwarkHeal;
              if (bulwarkHeal > 0) addLog(`  Bulwark: +${bulwarkHeal} HP`);
            }
            showCombatBanner({
              eyebrow: enemy.name,
              title: 'Attack Absorbed',
              detail: 'Endure blocked the hit',
              tone: 'player',
            });
            playSound('defence');
          } else {
            const shieldAfterHit = playerShieldAfterDrain - absorbed;
            const taken = modifiedDmg - absorbed;
            newPlayerHp = Math.max(0, newPlayerHp - taken);

            if (thickSkinReduction > 0 && modifiedDmg !== rawDmg) addLog(`  Thick Skin reduces ${rawDmg} → ${modifiedDmg}`);
            if (absorbed > 0) {
              addLog(`  ${enemy.name} hits ${modifiedDmg} — shield absorbs ${absorbed}, you take ${taken}`);
            } else {
              addLog(`  ${enemy.name} hits ${modifiedDmg} — no shield, you take ${taken}`);
            }
            setPlayerShield(shieldAfterHit);
            setLastDamageTaken(taken);

            // Tenacity: first time HP drops below 40%, gain 30 shield
            if (playerPassives.includes('tenacity') && !tenacityTriggeredThisBattle) {
              const hpPct = newPlayerHp / TUNING.player.maxHp;
              if (hpPct < 0.4) {
                setPlayerShield((s) => Math.min(TUNING.player.maxShield, s + 30));
                setTenacityTriggeredThisBattle(true);
                addLog(`  Tenacity triggered: +30 shield`);
              }
            }

            showCombatBanner({
              eyebrow: enemy.name,
              title: `Attack ${modifiedDmg} damage`,
              detail: absorbed > 0 ? `Shield absorbed ${absorbed}, you took ${taken}` : `You took ${taken} damage`,
              tone: 'enemy',
            });
            playSound('enemyAttack');
          }
        }

        setPlayerHp(newPlayerHp);

        if (currentEnemyHp <= 0) {
          triggerVictory(manaFinal, newPlayerHp);
          return;
        }
        if (newPlayerHp <= 0) {
          setTimeout(() => {
            setCombatBanner(null);
            playSound('defeat');
            addLog('✖ You fell in battle');
            setPhase('defeat');
          }, 1200);
          return;
        }

        // Advance turn — process Burn tick and Second Wind before startTurn
        setTimeout(() => {
          const nextTurn = turn + 1;
          const nextQueue = buildIntentQueue(nextTurn, enemyIntentQueue.slice(1));
          setEnemyIntentQueue(nextQueue);
          setTurn(nextTurn);

          // Process burn tick at start of next turn
          let burnedEnemyHp = currentEnemyHp;
          let burnedEnemyShield = shieldAfterEnemyAction;
          const latestStatusEffects = statusEffectsRef.current;
          if (latestStatusEffects.burn && latestStatusEffects.burn.turnsLeft > 0) {
            const { tickDamage, turnsLeft } = latestStatusEffects.burn;
            const burnAbsorbed = Math.min(burnedEnemyShield, tickDamage);
            const burnToHp = tickDamage - burnAbsorbed;
            burnedEnemyShield -= burnAbsorbed;
            burnedEnemyHp = Math.max(0, burnedEnemyHp - burnToHp);
            const newBurn = turnsLeft > 1 ? { tickDamage, turnsLeft: turnsLeft - 1 } : null;
            updateStatusEffects((prev) => ({ ...prev, burn: newBurn }));
            setEnemyShield(burnedEnemyShield);
            setEnemyHp(burnedEnemyHp);
            addLog(`Burn: ${tickDamage} dmg to ${enemy.name}${burnAbsorbed > 0 ? ` (${burnAbsorbed} absorbed)` : ''}`);

            if (burnedEnemyHp <= 0) {
              triggerVictory(manaFinal, newPlayerHp);
              return;
            }
          }

          // Second Wind: heal 10 HP every 3rd turn
          if (playerPassives.includes('second_wind') && nextTurn % 3 === 0) {
            setPlayerHp((h) => Math.min(TUNING.player.maxHp, h + 10));
            addLog(`  Second Wind: +10 HP`);
          }

          // Flow State: two consecutive 5-card combos -> +2 picks this turn
          const flowBonus = (playerPassives.includes('flow_state') && wasLastFiveCard && isAbilityCombo) ? 2 : 0;

          // Setup bonus pick (from Press)
          const setupBonus = setupBonusPicks;

          startTurn(nextTurn, nextQueue, flowBonus + setupBonus);
        }, 1400);
      }, 2200);
    }, 250);
  };

  // ----------------------------------------------------------
  // Flow controls — next enemy / restart
  // ----------------------------------------------------------

  const applyPerk = (key) => {
    if (phase !== 'victory' || !victoryReward) return;
    if (selectedRewardKeys.includes(key)) return;
    if (selectedRewardKeys.length >= (victoryReward.choicesAllowed || TUNING.rewardChoicesPerKill)) return;
    const perk = victoryReward.perks.find((option) => option.key === key);
    if (!perk) return;

    if (perk.kind === 'ability') {
      setPlayerAbilityComboIds((ids) => (ids.includes(perk.abilityId) ? ids : [...ids, perk.abilityId]));
      addLog(`Ability unlocked: ${perk.label} (${perk.sublabel})`);
    } else if (perk.kind === 'passive') {
      setPlayerPassives((ids) => (ids.includes(perk.passiveId) ? ids : [...ids, perk.passiveId]));
      addLog(`Passive unlocked: ${perk.label}`);
    } else if (perk.key === 'damage') {
      setPlayerDamageBonusPct((v) => v + perk.amount);
      addLog(`Stat: ${perk.label}`);
    } else if (perk.key === 'defence') {
      setPlayerDefenceBonusPct((v) => v + perk.amount);
      addLog(`Stat: ${perk.label}`);
    } else if (perk.key === 'mana') {
      setPlayerMana((v) => Math.min(TUNING.player.maxMana, v + perk.amount));
      addLog(`Stat: ${perk.label}`);
    } else if (perk.key === 'hp') {
      setPlayerHp((v) => Math.min(TUNING.player.maxHp, v + perk.amount));
      addLog(`Stat: ${perk.label}`);
    }

    playSound('perk');
    setSelectedRewardKeys((keys) => [...keys, key]);
  };

  /** Advance to the next enemy in the gauntlet */
  const nextEnemy = () => {
    if (selectedRewardKeys.length < TUNING.rewardChoicesPerKill) return;
    if (enemyIdx < TUNING.enemies.length - 1) {
      playSound('submit');
      const next = enemyIdx + 1;
      setEnemyIdx(next);
      setEnemyHp(TUNING.enemies[next].hp);
      setEnemyShield(0);
      // Carry current HP/MP/shield to the next fight; no recovery between foes.
      setVictoryReward(null);
      setSelectedRewardKeys([]);
      setTurn(1);
      setLog([]);
    }
  };

  /** Restart the entire run from the beginning with a new ability selection */
  const restart = () => {
    playSound('submit');
    isFirstBattleRef.current = true;
    setStartingAbilityOptions([...ABILITY_COMBOS].sort(() => Math.random() - 0.5).slice(0, 4));
    setEnemyIdx(0);
    setEnemyHp(TUNING.enemies[0].hp);
    setEnemyShield(0);
    setPlayerHp(TUNING.player.maxHp);
    setPlayerMana(TUNING.player.startingMana);
    setPlayerShield(0);
    setPlayerDamageBonusPct(0);
    setPlayerDefenceBonusPct(0);
    setPlayerAbilityComboIds([]);
    setPlayerPassives([]);
    updateStatusEffects({ burn: null, vulnerable: null, endure: false });
    setLastDamageTaken(0);
    setStockpileStacks(0);
    setLastWasFiveCardCombo(false);
    setTenacityTriggeredThisBattle(false);
    setSetupBonusPicks(0);
    setTurn(1);
    setLog([]);
    setRerollsUsedEnemy(0);
    setDiscardsUsedEnemy(0);
    setSelectedCommittedIndex(null);
    setCommitted([]);
    setCommittedCardAnimationKeys(Array.from({ length: handSlotCount }, () => 0));
    setVictoryReward(null);
    setSelectedRewardKeys([]);
    // Increment reset counter to force the enemy effect to re-fire even if enemyIdx stays 0
    setGameResetCount((c) => c + 1);
  };

  /** Player picks one of the starting ability options to begin the run */
  const selectStartingAbility = (abilityId) => {
    isFirstBattleRef.current = false;
    setPlayerAbilityComboIds([abilityId]);
    startTurn(1, enemyIntentQueue);
  };

  // ----------------------------------------------------------
  // Derived / computed values the UI needs
  // ----------------------------------------------------------
  const resolutionModifiers = buildResolutionContext();
  const bestCombo = findBestAcceptedSequence(committed, resolutionModifiers);
  const preview = bestCombo || {
    ...computeResolution([], resolutionModifiers),
    kind: 'none',
    heal: 0,
    manaCost: 0,
    statusEffect: null,
    effects: [],
  };
  const sequenceValid = isValidSequence(committed, resolutionModifiers);
  const sequenceFull = picksUsed >= pickLimit;
  const rerollsLeftEnemy = Math.max(0, TUNING.draft.maxRerollsPerEnemy - rerollsUsedEnemy);
  const maxDiscards = enemy.ability === 'double_discard' ? 1 : TUNING.draft.maxDiscardsPerTurn;
  const discardsLeftEnemy = Math.max(0, maxDiscards - discardsUsedEnemy);
  const unlockedAbilityCombos = ABILITY_COMBOS.filter((c) => playerAbilityComboIds.includes(c.id));
  const deckCounts = deck.reduce((acc, card) => {
    acc[card] = (acc[card] || 0) + 1;
    return acc;
  }, { A: 0, D: 0, M: 0, E: 0 });
  const rerollCost = playerPassives.includes('sharpness') ? 15 : TUNING.draft.rerollManaCost;

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
      discardsUsedEnemy,
      deckSize: deck.length,
      deckCounts,
      deckShuffleCount,
      deckIsShuffled: true,
      rerollsLeftEnemy,
      discardsLeftEnemy,
      log,
      phase,
      incomingDamage,
      enemyTelegraph,
      enemyIntentQueue,
      preview,
      sequenceValid,
      sequenceFull,
      combatBanner,
      victoryReward,
      selectedRewardKeys,
      logEndRef,
      playerAbilityComboIds,
      playerPassives,
      statusEffects,
      unlockedAbilityCombos,
      totalAbilityComboCount: ABILITY_COMBOS.length,
      rerollCost,
      startingAbilityOptions,
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
      selectStartingAbility,
    },
  };
}
