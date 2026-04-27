import useCombat from './useCombat';
import { styles, globalCss } from './styles';
import { TUNING } from './constants';

import Header from './components/Header';
import Combatants from './components/Combatants';
import DraftArea from './components/DraftArea';
import HandAndAllocation from './components/HandAndAllocation';
import CombatLog from './components/CombatLog';
import CombatBanner from './components/CombatBanner';
import ResultOverlay from './components/ResultOverlay';

// ============================================================
// DraftCombat — top-level layout shell (Phase 2).
// All game state lives in useCombat(). This component wires
// state → child components only.
// ============================================================
export default function DraftCombat() {
  const { state, actions } = useCombat();

  const rerollsLeftEnemy = TUNING.draft.maxRerollsPerEnemy - state.rerollsUsedEnemy;
  const discardsLeftEnemy = TUNING.draft.maxDiscardsPerTurn - state.discardsUsedEnemy;

  // Per-element deck counts for the DraftArea display
  const deckCounts = (state.deck ?? []).reduce(
    (acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }),
    { S: 0, F: 0, I: 0, E: 0 },
  );

  // Shield preview for Combatants: show what current allocation would give
  const shieldPreview = state.allocPreview?.shieldResult
    ? {
        steel: state.allocPreview.shieldResult.steelBlock,
        ice: state.allocPreview.shieldResult.iceBurnCancel,
        fire: state.allocPreview.shieldResult.fireFreezeCancel,
      }
    : { steel: 0, ice: 0, fire: 0 };

  return (
    <div style={styles.root}>
      <style>{globalCss}</style>
      <div style={styles.bgGrain} />

      <div style={styles.frame}>
        <Header enemyIdx={state.enemyIdx} turn={state.turn} />

        <Combatants
          phase={state.phase}
          playerHp={state.playerHp}
          playerMana={state.playerMana}
          playerShieldBreakdown={state.playerShieldBreakdown}
          shieldPreview={shieldPreview}
          playerBurnStacks={state.playerBurnStacks}
          playerBurnDuration={state.playerBurnDuration}
          playerFreezeStacks={state.playerFreezeStacks}
          enemy={state.enemy}
          enemyHp={state.enemyHp}
          enemyBurnStacks={state.enemyBurnStacks}
          enemyBurnDuration={state.enemyBurnDuration}
          enemyFreezeStacks={state.enemyFreezeStacks}
          currentIntent={state.currentIntent}
          nextIntent={state.nextIntent}
        />

        <DraftArea
          phase={state.phase}
          currentRow={state.currentRow}
          boardCardAnimationKeys={state.boardCardAnimationKeys}
          rerollsLeftEnemy={rerollsLeftEnemy}
          discardsLeftEnemy={discardsLeftEnemy}
          playerMana={state.playerMana}
          deckCounts={deckCounts}
          deckShuffleCount={state.deckShuffleCount}
          handLength={state.hand.length}
          handFull={state.handFull}
          allTilesAllocated={state.allTilesAllocated}
          onPickTile={actions.pickTile}
          onReroll={actions.reroll}
          onDiscardBoardTile={actions.discardBoardTile}
          onResolve={actions.resolveAllocation}
        />

        <HandAndAllocation
          hand={state.hand}
          allocationSlots={state.allocationSlots}
          allocPreview={state.allocPreview}
          phase={state.phase}
          allTilesAllocated={state.allTilesAllocated}
          onAssignTile={actions.assignTile}
          onDiscardHandTile={actions.discardHandTile}
          discardsUsedEnemy={state.discardsUsedEnemy}
          maxDiscards={TUNING.draft.maxDiscardsPerTurn}
          playerMana={state.playerMana}
          discardCost={TUNING.draft.discardManaCost}
        />

        <CombatLog log={state.log} logEndRef={state.logEndRef} />

        <CombatBanner banner={state.combatBanner} />

        <ResultOverlay
          phase={state.phase}
          enemy={state.enemy}
          enemyIdx={state.enemyIdx}
          victoryReward={state.victoryReward}
          selectedRewardKeys={state.selectedRewardKeys}
          onApplyPerk={actions.applyPerk}
          onRestart={actions.restart}
          onNextEnemy={actions.nextEnemy}
        />
      </div>
    </div>
  );
}
