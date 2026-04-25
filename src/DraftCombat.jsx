import useCombat from './useCombat';
import { styles, globalCss } from './styles';

// Sub-components — each handles one visual section of the UI
import Header from './components/Header';
import Combatants from './components/Combatants';
import DraftArea from './components/DraftArea';
import SpellsPanel from './components/SpellsPanel';
import CommittedSequence from './components/CommittedSequence';
import CombatLog from './components/CombatLog';
import CombatBanner from './components/CombatBanner';
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
          enemyShield={state.enemyShield}
          enemyTelegraph={state.enemyTelegraph}
          enemyIntentQueue={state.enemyIntentQueue}
        />

        {/* Tile draft row + reroll / discard / submit controls */}
        <DraftArea
          phase={state.phase}
          currentRow={state.currentRow}
          boardCardAnimationKeys={state.boardCardAnimationKeys}
          rerollsLeftEnemy={state.rerollsLeftEnemy}
          discardsLeftEnemy={state.discardsLeftEnemy}
          deckSize={state.deckSize}
          deckCounts={state.deckCounts}
          deckShuffleCount={state.deckShuffleCount}
          deckIsShuffled={state.deckIsShuffled}
          picksUsed={state.picksUsed}
          pickLimit={state.pickLimit}
          committedLength={state.committed.length}
          selectedCommittedIndex={state.selectedCommittedIndex}
          sequenceValid={state.sequenceValid}
          sequenceFull={state.sequenceFull}
          onPickTile={actions.pickTile}
          onReroll={actions.reroll}
          onDiscardSelected={actions.discardSelected}
          onDiscardBoardTile={actions.discardBoardTile}
          onSubmit={actions.submitSequence}
        />

        {/* Spells panel — shown only when the player owns at least one spell */}
        <SpellsPanel
          playerSpells={state.playerSpells}
          playerMana={state.playerMana}
          spellsCastThisTurn={state.spellsCastThisTurn}
          phase={state.phase}
          onCast={actions.castSpell}
        />

        {/* Committed tile sequence + live damage/block preview */}
        <CommittedSequence
          committed={state.committed}
          committedCardAnimationKeys={state.committedCardAnimationKeys}
          slotCount={state.handSlotCount}
          preview={state.preview}
          selectedCommittedIndex={state.selectedCommittedIndex}
          onSelectCommittedTile={actions.selectCommittedTile}
          onMoveCommittedTile={actions.moveCommittedTile}
        />

        {/* Scrollable battle log */}
        <CombatLog log={state.log} logEndRef={state.logEndRef} />

        <CombatBanner banner={state.combatBanner} />

        {/* Victory / defeat full-screen overlay */}
        <ResultOverlay
          phase={state.phase}
          enemy={state.enemy}
          enemyIdx={state.enemyIdx}
          victoryReward={state.victoryReward}
          selectedPerkKey={state.selectedPerkKey}
          onApplyPerk={actions.applyPerk}
          onRestart={actions.restart}
          onNextEnemy={actions.nextEnemy}
        />
      </div>
    </div>
  );
}
