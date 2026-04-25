import { getSpell } from '../spells';
import { styles } from '../styles';
import { TUNING } from '../constants';

// ============================================================
// SpellsPanel — shows the player's owned spells during combat.
//
// Renders nothing when the player has no spells yet.
// Each spell button is disabled when:
//   - phase is not 'drafting'
//   - the player has already cast this turn
//   - the player doesn't have enough mana
// ============================================================
export default function SpellsPanel({ playerSpells, playerMana, spellsCastThisTurn, phase, onCast }) {
  if (!playerSpells || playerSpells.length === 0) return null;

  const castLimitReached = spellsCastThisTurn >= TUNING.spells.maxCastsPerTurn;

  return (
    <section style={styles.spellsPanel}>
      <div style={styles.spellsPanelLabel}>SPELLS</div>
      <div style={styles.spellsPanelRow}>
        {playerSpells.map((id) => {
          const spell = getSpell(id);
          if (!spell) return null;
          const disabled = phase !== 'drafting' || castLimitReached || playerMana < spell.manaCost;
          return (
            <button
              key={spell.id}
              type="button"
              onClick={() => onCast(spell.id)}
              disabled={disabled}
              title={spell.description}
              style={{
                ...styles.spellBtn,
                ...(disabled ? styles.spellBtnDisabled : {}),
              }}
            >
              <span>{spell.name}</span>
              <span style={styles.spellBtnCost}>{spell.manaCost} MP</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
