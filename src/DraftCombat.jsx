import React from 'react';
import useCombat from './useCombat';
import { styles, globalCss } from './styles';

// Sub-components — each handles one visual section of the UI
import Header from './components/Header';
import Combatants from './components/Combatants';
import DraftArea from './components/DraftArea';
import CommittedSequence from './components/CommittedSequence';
import CombatLog from './components/CombatLog';
import ResultOverlay from './components/ResultOverlay';

// ============================================================
// DraftCombat — top-level layout shell.
//
// All game state lives in the useCombat() hook.
// This component simply wires state → child components.
// ============================================================
export default function DraftCombat() {
  const { state, actions } = useCombat();

  return (
    <div style={styles.root}>
      {/* Inject global CSS (hover effects, keyframes) */}
      <style>{globalCss}</style>

      {/* Decorative background grain overlay */}
      <div style={styles.bgGrain} />

      <div style={styles.frame}>
        {/* Game title + stage progression dots */}
        <Header enemyIdx={state.enemyIdx} turn={state.turn} />

        {/* Player & enemy stat bars + telegraph */}
        <Combatants
          playerHp={state.playerHp}
          playerMana={state.playerMana}
          playerShield={state.playerShield}
          enemy={state.enemy}
          enemyHp={state.enemyHp}
          enemyTelegraph={state.enemyTelegraph}
        />

        {/* Tile draft row + reroll / discard / submit controls */}
        <DraftArea
          round={state.round}
          phase={state.phase}
          currentRow={state.currentRow}
          rerollLocked={state.rerollLocked}
          rerolledThisRound={state.rerolledThisRound}
          playerMana={state.playerMana}
          discardCost={state.discardCost}
          committedLength={state.committed.length}
                selectedCommittedIndex={state.selectedCommittedIndex}
          sequenceValid={state.sequenceValid}
          sequenceFull={state.sequenceFull}
          onPickTile={actions.pickTile}
          onReroll={actions.reroll}
          onDiscardSelected={actions.discardSelected}
          onSubmit={actions.submitSequence}
        />

        {/* Committed tile sequence + live damage/block preview */}
        <CommittedSequence
          committed={state.committed}
          preview={state.preview}
          selectedCommittedIndex={state.selectedCommittedIndex}
          onSelectCommittedTile={actions.selectCommittedTile}
        />

        {/* Scrollable battle log */}
        <CombatLog log={state.log} logEndRef={state.logEndRef} />

        {/* Victory / defeat full-screen overlay */}
        <ResultOverlay
          phase={state.phase}
          enemy={state.enemy}
          enemyIdx={state.enemyIdx}
          onRestart={actions.restart}
          onNextEnemy={actions.nextEnemy}
        />
      </div>
    </div>
  );
}
