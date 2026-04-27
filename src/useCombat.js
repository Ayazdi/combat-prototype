import { useEffect, useMemo, useRef, useState } from 'react';
import { ELEMENTS, TUNING } from './constants';
import {
  applyStatus,
  buildShuffledDeck,
  computeEnemyShieldFromTiles,
  computeActionBucket,
  countDeckByElement,
  createShieldContact,
  createEmptyStatuses,
  drawManyFromDeck,
  getEnemyIntent,
  getEnemyIntentQueue,
  getIntentShieldInfo,
  getNextFoePlayerCarryover,
  replaceRowSlotFromDeck,
  resolveAttackAgainstShield,
  tickStatuses,
} from './gameHelpers';
import { playSound } from './soundEffects';

const isAllocated = (bucket) => bucket === 'attack' || bucket === 'shield';

const createEmptyShieldEffects = () => ({
  contactBurnStacks: 0,
  contactFreezeStacks: 0,
  sourceElements: [],
  elementBlocks: { steel: 0, fire: 0, ice: 0, mixed: 0 },
  generatedBlock: 0,
  appliedBlock: 0,
});

const formatTiles = (tiles) => (tiles.length > 0 ? tiles.map((tile) => ELEMENTS[tile]?.short || '?').join('') : 'none');

const formatStatus = ({ burnStacks = 0, freezeStacks = 0, contactBurnStacks = 0, contactFreezeStacks = 0 }) => {
  const parts = [];
  if (burnStacks > 0) parts.push(`+${burnStacks} Burn`);
  if (freezeStacks > 0) parts.push(`+${freezeStacks} Freeze`);
  if (contactBurnStacks > 0) parts.push(`${contactBurnStacks} contact Burn`);
  if (contactFreezeStacks > 0) parts.push(`${contactFreezeStacks} contact Freeze`);
  return parts;
};

const buildFightDraftState = () => {
  const startingDeck = buildShuffledDeck(TUNING.deckComposition);
  const initialDraw = drawManyFromDeck(startingDeck, TUNING.hand.rowSize, TUNING.deckComposition);
  return {
    deck: initialDraw.deck,
    currentRow: initialDraw.cards,
    deckShuffleCount: 1 + initialDraw.reshuffleCount,
  };
};

const buildShieldEffects = (shieldResult, appliedBlock = shieldResult.block) => {
  const sourceElements = Object.entries(shieldResult.counts)
    .filter(([, count]) => count > 0)
    .map(([element]) => element);
  const elementBlocks = shieldResult.segments.reduce(
    (blocks, segment) => {
      if (segment.type === 'cancelled') blocks.mixed += segment.value || 0;
      if (segment.type === 'steel') blocks.steel += segment.block || 0;
      if (segment.type === 'fire') blocks.fire += segment.block || 0;
      if (segment.type === 'ice') blocks.ice += segment.block || 0;
      return blocks;
    },
    { steel: 0, fire: 0, ice: 0, mixed: 0 },
  );

  return {
    contactBurnStacks: shieldResult.contactBurnStacks,
    contactFreezeStacks: shieldResult.contactFreezeStacks,
    sourceElements,
    elementBlocks,
    generatedBlock: shieldResult.block,
    appliedBlock,
  };
};

const hasTrait = (enemy, trait) => enemy.traits?.includes(trait);

export default function useCombat() {
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [playerHp, setPlayerHp] = useState(TUNING.player.maxHp);
  const [playerMana, setPlayerMana] = useState(TUNING.player.startingMana);
  const [playerShield, setPlayerShield] = useState(0);
  const [playerShieldEffects, setPlayerShieldEffects] = useState(() => createEmptyShieldEffects());
  const [enemyHp, setEnemyHp] = useState(TUNING.enemies[0].hp);
  const [enemyShield, setEnemyShield] = useState(0);
  const [enemyShieldElement, setEnemyShieldElement] = useState(null);
  const [enemyShieldContact, setEnemyShieldContact] = useState(() => createShieldContact());

  const [playerStatuses, setPlayerStatuses] = useState(() => createEmptyStatuses());
  const [enemyStatuses, setEnemyStatuses] = useState(() => createEmptyStatuses());
  const [triggeredTraits, setTriggeredTraits] = useState({});

  const [turn, setTurn] = useState(1);
  const [hand, setHand] = useState([]);
  const [allocationsByIndex, setAllocationsByIndex] = useState([]);
  const [draftState, setDraftState] = useState(() => buildFightDraftState());
  const [boardCardAnimationKeys, setBoardCardAnimationKeys] = useState(
    Array.from({ length: TUNING.hand.rowSize }, () => 0),
  );
  const [handCardAnimationKeys, setHandCardAnimationKeys] = useState(
    Array.from({ length: TUNING.hand.handSize }, () => 0),
  );
  const [rerolledThisRound, setRerolledThisRound] = useState(false);

  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState('drafting');
  const [combatBanner, setCombatBanner] = useState(null);

  const logEndRef = useRef(null);
  const combatBannerTimeoutRef = useRef(null);

  const enemy = TUNING.enemies[enemyIdx];
  const handSlotCount = TUNING.hand.handSize;
  const handFull = hand.length >= handSlotCount;
  const currentRow = draftState.currentRow;

  const addLog = (entry) => setLog((entries) => [...entries, entry]);

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

  const clearDraftHand = () => {
    setHand([]);
    setAllocationsByIndex([]);
    setHandCardAnimationKeys(Array.from({ length: TUNING.hand.handSize }, () => 0));
    setRerolledThisRound(false);
  };

  const resetDraftForTurn = (nextTurn) => {
    setTurn(nextTurn);
    clearDraftHand();
    setPhase('drafting');
    showCombatBanner({
      eyebrow: 'Player Turn',
      title: 'Allocate the hand',
      detail: `Turn ${nextTurn}`,
      tone: 'player',
    }, 1400);
    playSound('playerTurn');
  };

  const startFight = (nextEnemyIdx) => {
    const nextEnemyData = TUNING.enemies[nextEnemyIdx];
    setEnemyHp(nextEnemyData.hp);
    setEnemyShield(0);
    setEnemyShieldElement(null);
    setEnemyShieldContact(createShieldContact());
    setEnemyStatuses(createEmptyStatuses());
    setPlayerStatuses(createEmptyStatuses());
    setPlayerShieldEffects(createEmptyShieldEffects());
    setTriggeredTraits({});
    setDraftState(buildFightDraftState());
    setBoardCardAnimationKeys(Array.from({ length: TUNING.hand.rowSize }, () => 0));
    setTurn(1);
    clearDraftHand();
    setPhase('drafting');
    showCombatBanner({
      eyebrow: 'Player Turn',
      title: 'Allocate the hand',
      detail: 'Turn 1',
      tone: 'player',
    }, 1400);
    playSound('playerTurn');
  };

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
  }, [log]);

  const pickTile = (index) => {
    if (phase !== 'drafting' || handFull) return;
    const tile = currentRow[index];
    if (!tile) return;

    const placedIndex = hand.length;
    setHand((tiles) => [...tiles, tile]);
    setAllocationsByIndex((allocations) => [...allocations, null]);
    setHandCardAnimationKeys((keys) => {
      const next = [...keys];
      next[placedIndex] = (next[placedIndex] || 0) + 1;
      return next;
    });
    setDraftState((prev) => {
      const replacement = replaceRowSlotFromDeck(prev.currentRow, index, prev.deck, TUNING.deckComposition);
      return {
        deck: replacement.deck,
        currentRow: replacement.row,
        deckShuffleCount: prev.deckShuffleCount + (replacement.reshuffled ? 1 : 0),
      };
    });
    setBoardCardAnimationKeys((keys) => {
      const next = [...keys];
      next[index] = (next[index] || 0) + 1;
      return next;
    });
    setRerolledThisRound(false);
    playSound('cardPick');
    playSound('cardDeal');
  };

  const assignTileToBucket = (index, bucket) => {
    if (phase !== 'drafting') return;
    if (index < 0 || index >= hand.length || !isAllocated(bucket)) return;
    setAllocationsByIndex((allocations) => {
      const next = [...allocations];
      next[index] = bucket;
      return next;
    });
    playSound('cardDeal');
  };

  const reroll = () => {
    if (phase !== 'drafting' || handFull || rerolledThisRound) return;
    if (playerMana < TUNING.hand.rerollCost) return;
    setPlayerMana((mana) => mana - TUNING.hand.rerollCost);
    setDraftState((prev) => {
      const draw = drawManyFromDeck(prev.deck, TUNING.hand.rowSize, TUNING.deckComposition);
      return {
        deck: draw.deck,
        currentRow: draw.cards,
        deckShuffleCount: prev.deckShuffleCount + draw.reshuffleCount,
      };
    });
    setBoardCardAnimationKeys((keys) => keys.map((key) => key + 1));
    setRerolledThisRound(true);
    addLog(`T${turn}: reroll draft row (-${TUNING.hand.rerollCost} MP)`);
    playSound('reroll');
  };

  const discardSelected = () => {
    if (phase !== 'drafting' || hand.length === 0) return;
    if (playerMana < TUNING.hand.discardCost) return;
    const discarded = hand[hand.length - 1];
    setPlayerMana((mana) => mana - TUNING.hand.discardCost);
    setHand((tiles) => tiles.slice(0, -1));
    setAllocationsByIndex((allocations) => allocations.slice(0, -1));
    setRerolledThisRound(false);
    addLog(`T${turn}: discard last drafted ${ELEMENTS[discarded]?.label || discarded} (-${TUNING.hand.discardCost} MP)`);
    playSound('discard');
  };

  const attackTiles = useMemo(
    () => hand.filter((_, index) => allocationsByIndex[index] === 'attack'),
    [hand, allocationsByIndex],
  );
  const shieldTiles = useMemo(
    () => hand.filter((_, index) => allocationsByIndex[index] === 'shield'),
    [hand, allocationsByIndex],
  );
  const bucketPreview = useMemo(() => ({
    attack: (() => {
      const attack = computeActionBucket(attackTiles, 'attack', enemyStatuses.freeze?.stacks || 0);
      return {
        ...attack,
        shieldPreview: resolveAttackAgainstShield(attack, {
          shield: enemyShield,
          hp: enemyHp,
          shieldElement: enemyShieldElement,
          shieldContact: enemyShieldContact,
          hpDamageReduction: hasTrait(enemy, 'plated') && enemyShield > 0 ? 8 : 0,
        }),
      };
    })(),
    shield: computeActionBucket(shieldTiles, 'shield'),
    boost: { disabled: true },
  }), [attackTiles, shieldTiles, enemyStatuses.freeze?.stacks, enemyShield, enemyHp, enemyShieldElement, enemyShieldContact, enemy]);

  const canResolve = phase === 'drafting' &&
    hand.length === handSlotCount &&
    hand.every((_, index) => isAllocated(allocationsByIndex[index]));

  const triggerVictory = () => {
    setTimeout(() => {
      setCombatBanner(null);
      addLog(`${enemy.name} defeated`);
      playSound('victory');
      setPhase('victory');
    }, 700);
  };

  const triggerDefeat = () => {
    setTimeout(() => {
      setCombatBanner(null);
      addLog('You fell in battle');
      playSound('defeat');
      setPhase('defeat');
    }, 1000);
  };

  const resolveAllocation = () => {
    if (!canResolve) return;
    playSound('submit');
    setPhase('resolving');

    const playerStartTick = tickStatuses(playerStatuses);
    let workingPlayerHp = Math.max(0, playerHp - playerStartTick.burnDamage);
    let workingPlayerStatuses = playerStartTick.statuses;
    if (playerStartTick.burnDamage > 0) addLog(`T${turn}: Burn ticks ${playerStartTick.burnDamage} HP from you`);
    if (playerStartTick.freezeLost > 0) addLog(`T${turn}: you lose ${playerStartTick.freezeLost} Freeze`);
    setPlayerHp(workingPlayerHp);
    setPlayerStatuses(workingPlayerStatuses);
    if (workingPlayerHp <= 0) {
      triggerDefeat();
      return;
    }

    const shieldResult = computeActionBucket(shieldTiles, 'shield');
    const attackResult = computeActionBucket(attackTiles, 'attack', enemyStatuses.freeze?.stacks || 0);
    const currentIntent = getEnemyIntent(enemy, turn);

    setTimeout(() => {
      const shieldRaw = playerShield + shieldResult.block;
      const shieldAfterGain = Math.min(TUNING.player.maxShield, shieldRaw);
      const shieldWasted = shieldRaw - shieldAfterGain;
      const shieldActuallyAdded = Math.max(0, shieldAfterGain - playerShield);
      const nextPlayerShieldEffects = shieldAfterGain > 0
        ? buildShieldEffects(shieldResult, shieldActuallyAdded)
        : createEmptyShieldEffects();

      const shieldResolution = resolveAttackAgainstShield(attackResult, {
        enemyShield,
        shield: enemyShield,
        hp: enemyHp,
        shieldElement: enemyShieldElement,
        shieldContact: enemyShieldContact,
        hpDamageReduction: hasTrait(enemy, 'plated') && enemyShield > 0 ? 8 : 0,
      });
      let nextEnemyShield = shieldResolution.shield;
      let nextEnemyShieldElement = nextEnemyShield > 0 ? enemyShieldElement : null;
      let nextEnemyShieldContact = nextEnemyShield > 0 ? enemyShieldContact : createShieldContact();
      let nextEnemyHp = shieldResolution.hp;
      let nextEnemyStatuses = applyStatus(enemyStatuses, shieldResolution.attackBurnStacks, 'burn');
      nextEnemyStatuses = applyStatus(nextEnemyStatuses, shieldResolution.attackFreezeStacks, 'freeze');
      workingPlayerStatuses = applyStatus(workingPlayerStatuses, shieldResolution.contactBurnStacks, 'burn');
      workingPlayerStatuses = applyStatus(workingPlayerStatuses, shieldResolution.contactFreezeStacks, 'freeze');

      if (
        hasTrait(enemy, 'kindle_guard') &&
        !triggeredTraits.kindle_guard &&
        nextEnemyHp > 0 &&
        nextEnemyHp <= Math.floor(enemy.hp * 0.5)
      ) {
        const kindleShield = computeEnemyShieldFromTiles('fire', 2);
        nextEnemyShield += kindleShield.block;
        nextEnemyShieldElement = kindleShield.shieldElement;
        nextEnemyShieldContact = createShieldContact(kindleShield);
        setTriggeredTraits({ ...triggeredTraits, kindle_guard: true });
        addLog(`  Kindle Guard: ${enemy.name} gains ${kindleShield.block} Fire shield`);
      }

      const shieldLog = shieldResult.block > 0
        ? [`+${shieldAfterGain - playerShield} shield${shieldWasted > 0 ? ` (${shieldWasted} wasted)` : ''}`, ...formatStatus(shieldResult)].join(' / ')
        : 'no shield';
      const attackLogParts = [`${attackResult.damage} dmg`];
      if (shieldResolution.absorbed > 0) attackLogParts.push(`${shieldResolution.absorbed} absorbed`);
      if (shieldResolution.reduction > 0) attackLogParts.push(`${shieldResolution.reduction} reduced by Plated`);
      if (shieldResolution.hpDamage > 0) attackLogParts.push(`${shieldResolution.hpDamage} to HP`);
      if (shieldResolution.cancelledByIce > 0) attackLogParts.push(`Ice cancels ${shieldResolution.cancelledByIce} Fire shield Burn`);
      if (shieldResolution.cancelledByFire > 0) attackLogParts.push(`Fire cancels ${shieldResolution.cancelledByFire} Ice shield Freeze`);
      if (shieldResolution.contactBurnStacks > 0) attackLogParts.push(`take ${shieldResolution.contactBurnStacks} Burn from shield`);
      if (shieldResolution.contactFreezeStacks > 0) attackLogParts.push(`take ${shieldResolution.contactFreezeStacks} Freeze from shield`);
      attackLogParts.push(...formatStatus({
        burnStacks: shieldResolution.attackBurnStacks,
        freezeStacks: shieldResolution.attackFreezeStacks,
      }));
      if (attackResult.cancelledPairs > 0) attackLogParts.push(`${attackResult.cancelledPairs} Fire/Ice pair${attackResult.cancelledPairs === 1 ? '' : 's'} cancelled`);

      setPlayerShield(shieldAfterGain);
      setPlayerShieldEffects(nextPlayerShieldEffects);
      setPlayerStatuses(workingPlayerStatuses);
      setEnemyHp(nextEnemyHp);
      setEnemyShield(nextEnemyShield);
      setEnemyShieldElement(nextEnemyShieldElement);
      setEnemyShieldContact(nextEnemyShieldContact);
      setEnemyStatuses(nextEnemyStatuses);
      addLog(`T${turn}: Shield [${formatTiles(shieldTiles)}] -> ${shieldLog}`);
      addLog(`T${turn}: Attack [${formatTiles(attackTiles)}] -> ${attackLogParts.join(' / ')}`);
      showCombatBanner({
        eyebrow: 'Player Action',
        title: attackResult.damage > 0 ? `${attackResult.damage} Damage` : 'Guard',
        detail: `Shield ${shieldResult.block} / Attack ${attackResult.damage}`,
        tone: 'player',
      });
      if (shieldResult.block > 0) playSound('defence');
      if (attackResult.damage > 0) playSound('attack');
      if (attackResult.segments.length + shieldResult.segments.length > 1) playSound('combo');

      if (nextEnemyHp <= 0) {
        triggerVictory();
        return;
      }

      setTimeout(() => {
        const intentShieldInfo = getIntentShieldInfo(currentIntent, enemy);
        const shieldText = intentShieldInfo.block > 0
          ? ` + ${intentShieldInfo.block} ${ELEMENTS[intentShieldInfo.shieldElement]?.label || intentShieldInfo.shieldElement} shield`
          : '';
        showCombatBanner({
          eyebrow: 'Enemy Turn',
          title: enemy.name,
          detail: `${currentIntent.dmg} ${ELEMENTS[currentIntent.element]?.label || currentIntent.element}${shieldText}`,
          tone: 'enemy',
        });
        playSound('enemyTurn');
      }, 700);

      setTimeout(() => {
        const freezeStacks = workingPlayerStatuses.freeze?.stacks || 0;
        const rawDamage = currentIntent.element === 'steel' && freezeStacks > 0
          ? Math.round(currentIntent.dmg * (1 + freezeStacks * TUNING.status.freezeMultPerStack))
          : currentIntent.dmg;
        const absorbed = Math.min(shieldAfterGain, rawDamage);
        const taken = rawDamage - absorbed;
        workingPlayerHp = Math.max(0, workingPlayerHp - taken);
        const shieldAfterHit = shieldAfterGain - absorbed;
        let statusesAfterContact = nextEnemyStatuses;
        let nextPlayerStatuses = workingPlayerStatuses;

        if (absorbed > 0) {
          statusesAfterContact = applyStatus(statusesAfterContact, nextPlayerShieldEffects.contactBurnStacks, 'burn');
          statusesAfterContact = applyStatus(statusesAfterContact, nextPlayerShieldEffects.contactFreezeStacks, 'freeze');
        }

        if (taken > 0 && currentIntent.element === 'fire' && hasTrait(enemy, 'singe')) {
          nextPlayerStatuses = applyStatus(nextPlayerStatuses, 1, 'burn');
          addLog('  Singe: you gain 1 Burn');
        }
        if (taken > 0 && currentIntent.element === 'ice' && hasTrait(enemy, 'numbing_bite')) {
          nextPlayerStatuses = applyStatus(nextPlayerStatuses, 1, 'freeze');
          addLog('  Numbing Bite: you gain 1 Freeze');
        }

        let shieldAfterEnemyAction = nextEnemyShield;
        let shieldElementAfterEnemyAction = nextEnemyShieldElement;
        let shieldContactAfterEnemyAction = nextEnemyShieldContact;
        const intentShieldInfo = getIntentShieldInfo(currentIntent, enemy);
        if (intentShieldInfo.block > 0) {
          shieldAfterEnemyAction += intentShieldInfo.block;
          shieldElementAfterEnemyAction = intentShieldInfo.shieldElement || 'steel';
          shieldContactAfterEnemyAction = createShieldContact(intentShieldInfo);
          addLog(`  ${enemy.name} gains ${intentShieldInfo.block} ${ELEMENTS[shieldElementAfterEnemyAction]?.label || shieldElementAfterEnemyAction} shield`);
        }

        setPlayerShield(shieldAfterHit);
        setPlayerShieldEffects(createEmptyShieldEffects());
        setPlayerHp(workingPlayerHp);
        setPlayerStatuses(nextPlayerStatuses);
        setEnemyShield(shieldAfterEnemyAction);
        setEnemyShieldElement(shieldAfterEnemyAction > 0 ? shieldElementAfterEnemyAction : null);
        setEnemyShieldContact(shieldAfterEnemyAction > 0 ? shieldContactAfterEnemyAction : createShieldContact());
        setEnemyStatuses(statusesAfterContact);

        const enemyAttackText = `${enemy.name} attacks for ${rawDamage} ${ELEMENTS[currentIntent.element]?.label || currentIntent.element}`;
        addLog(`  ${enemyAttackText}: shield absorbs ${absorbed}, you take ${taken}`);
        if (absorbed > 0) {
          const contactParts = formatStatus(nextPlayerShieldEffects);
          if (contactParts.length > 0) addLog(`  Shield contact: ${contactParts.join(' / ')}`);
        }
        showCombatBanner({
          eyebrow: enemy.name,
          title: `${rawDamage} Damage`,
          detail: absorbed > 0 ? `Shield absorbed ${absorbed}; you took ${taken}` : `You took ${taken}`,
          tone: 'enemy',
        });
        playSound('enemyAttack');

        if (workingPlayerHp <= 0) {
          triggerDefeat();
          return;
        }

        setTimeout(() => {
          const tick = tickStatuses(statusesAfterContact);
          nextEnemyHp = Math.max(0, nextEnemyHp - tick.burnDamage);
          setEnemyHp(nextEnemyHp);
          setEnemyStatuses(tick.statuses);

          if (tick.burnDamage > 0) addLog(`  Burn ticks ${tick.burnDamage} HP from ${enemy.name}`);
          if (tick.freezeLost > 0) addLog(`  ${enemy.name} loses ${tick.freezeLost} Freeze`);

          if (nextEnemyHp <= 0) {
            triggerVictory();
            return;
          }

          const manaAfterRegen = Math.min(TUNING.player.maxMana, playerMana + TUNING.player.manaRegenPerTurn);
          setPlayerMana(manaAfterRegen);
          addLog(`  +${manaAfterRegen - playerMana} MP regen (${manaAfterRegen}/${TUNING.player.maxMana})`);
          resetDraftForTurn(turn + 1);
        }, 1000);
      }, 1500);
    }, 250);
  };

  const nextEnemy = () => {
    if (phase !== 'victory' || enemyIdx >= TUNING.enemies.length - 1) return;
    const nextIdx = enemyIdx + 1;
    const carryover = getNextFoePlayerCarryover({ hp: playerHp, mana: playerMana });
    setEnemyIdx(nextIdx);
    setPlayerHp(carryover.hp);
    setPlayerMana(carryover.mana);
    setPlayerShield(carryover.shield);
    setPlayerShieldEffects(createEmptyShieldEffects());
    setLog([]);
    setCombatBanner(null);
    startFight(nextIdx);
    playSound('submit');
  };

  const restart = () => {
    setEnemyIdx(0);
    setPlayerHp(TUNING.player.maxHp);
    setPlayerMana(TUNING.player.startingMana);
    setPlayerShield(0);
    setPlayerShieldEffects(createEmptyShieldEffects());
    setLog([]);
    setCombatBanner(null);
    startFight(0);
    playSound('submit');
  };

  const enemyIntentQueue = useMemo(() => getEnemyIntentQueue(enemy, turn), [enemy, turn]);
  const rerollsLeftRound = rerolledThisRound || handFull ? 0 : 1;
  const deckCounts = useMemo(() => countDeckByElement(draftState.deck), [draftState.deck]);

  return {
    state: {
      enemy,
      enemyIdx,
      enemyHp,
      enemyShield,
      enemyShieldElement,
      enemyShieldContact,
      playerHp,
      playerMana,
      playerShield,
      playerShieldEffects,
      playerStatuses,
      enemyStatuses,
      turn,
      round: Math.min(hand.length + 1, TUNING.hand.rounds),
      hand,
      allocationsByIndex,
      handSlotCount,
      currentRow,
      boardCardAnimationKeys,
      handCardAnimationKeys,
      rerollsLeftRound,
      discardsAvailable: hand.length > 0 ? 1 : 0,
      deckCounts,
      deckSize: draftState.deck.length,
      deckShuffleCount: draftState.deckShuffleCount,
      log,
      phase,
      enemyIntentQueue,
      bucketPreview,
      canResolve,
      handFull,
      combatBanner,
      logEndRef,
    },
    actions: {
      pickTile,
      assignTileToBucket,
      reroll,
      discardSelected,
      resolveAllocation,
      nextEnemy,
      restart,
    },
  };
}
