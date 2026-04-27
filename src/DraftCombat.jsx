import useCombat from './useCombat';
import { styles, globalCss } from './styles';

import Header from './components/Header';
import Combatants from './components/Combatants';
import DraftArea from './components/DraftArea';
import HandAllocation from './components/HandAllocation';
import ElementLegend from './components/ElementLegend';
import CombatLog from './components/CombatLog';
import CombatBanner from './components/CombatBanner';
import ResultOverlay from './components/ResultOverlay';

export default function DraftCombat() {
  const { state, actions } = useCombat();

  return (
    <div style={styles.root}>
      <style>{globalCss}</style>
      <div style={styles.bgGrain} />

      <div style={styles.frame}>
        <Header enemyIdx={state.enemyIdx} turn={state.turn} />

        <Combatants
          playerHp={state.playerHp}
          playerMana={state.playerMana}
          playerShield={state.playerShield}
          playerShieldEffects={state.playerShieldEffects}
          playerStatuses={state.playerStatuses}
          enemy={state.enemy}
          enemyHp={state.enemyHp}
          enemyShield={state.enemyShield}
          enemyShieldElement={state.enemyShieldElement}
          enemyShieldContact={state.enemyShieldContact}
          enemyStatuses={state.enemyStatuses}
          enemyIntentQueue={state.enemyIntentQueue}
        />

        <DraftArea
          phase={state.phase}
          currentRow={state.currentRow}
          boardCardAnimationKeys={state.boardCardAnimationKeys}
          rerollsLeftRound={state.rerollsLeftRound}
          discardsAvailable={state.discardsAvailable}
          playerMana={state.playerMana}
          handLength={state.hand.length}
          handFull={state.handFull}
          canResolve={state.canResolve}
          deckCounts={state.deckCounts}
          deckSize={state.deckSize}
          deckShuffleCount={state.deckShuffleCount}
          onPickTile={actions.pickTile}
          onReroll={actions.reroll}
          onDiscardSelected={actions.discardSelected}
          onResolve={actions.resolveAllocation}
        />

        <HandAllocation
          phase={state.phase}
          hand={state.hand}
          allocationsByIndex={state.allocationsByIndex}
          handCardAnimationKeys={state.handCardAnimationKeys}
          slotCount={state.handSlotCount}
          bucketPreview={state.bucketPreview}
          onAssignTileToBucket={actions.assignTileToBucket}
        />

        <ElementLegend />

        <CombatLog log={state.log} logEndRef={state.logEndRef} />

        <CombatBanner banner={state.combatBanner} />

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
