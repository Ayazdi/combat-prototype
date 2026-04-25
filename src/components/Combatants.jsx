import { TUNING } from '../constants';
import { abilityDescription } from '../gameHelpers';
import { styles } from '../styles';

// ============================================================
// Combatants — renders the player panel (HP / MP / Shield),
// the "versus" divider, and the enemy panel (HP + telegraph).
// ============================================================
export default function Combatants({
  playerHp,
  playerMana,
  playerShield,
  enemy,
  enemyHp,
  enemyShield,
  enemyTelegraph,
  enemyIntentQueue,
}) {
  return (
    <section style={styles.combatants}>
      {/* ---- Player stats ---- */}
      <div style={styles.combatant}>
        <div style={styles.combatantLabel}>YOU · Lv1</div>
        <div style={styles.statsLine}>ATK {TUNING.tiles.attackBase} · DEF {TUNING.tiles.defenceBase}</div>

        {/* HP bar */}
        <StatBar
          label="HP"
          current={playerHp}
          max={TUNING.player.maxHp}
          gradient="linear-gradient(90deg, #c8412e 0%, #e56947 100%)"
        />
        {/* MP bar */}
        <StatBar
          label="MP"
          current={playerMana}
          max={TUNING.player.maxMana}
          gradient="linear-gradient(90deg, #2c5d8f 0%, #4a8bc2 100%)"
        />
        {/* Shield bar */}
        <StatBar
          label="SH"
          current={playerShield}
          max={TUNING.player.maxShield}
          gradient="linear-gradient(90deg, #4a6a3a 0%, #7aa85a 100%)"
        />
      </div>

      {/* ---- Versus divider ---- */}
      <div style={styles.versus}>
        <div style={styles.versusLine} />
        <div style={styles.versusMark}>✦</div>
        <div style={styles.versusLine} />
      </div>

      {/* ---- Enemy stats ---- */}
      <div style={styles.combatant}>
        <div style={{ ...styles.combatantLabel, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {enemy.name.toUpperCase()} · Lv{enemy.id}
          {enemy.ability && (
            <span className="ability-wrap" style={styles.abilityWrap}>
              <span
                className="ability-badge"
                style={styles.abilityBadge}
                title={abilityDescription(enemy.ability)}
              >
                ⓘ
              </span>
              <span className="ability-tooltip" style={styles.abilityTooltip}>
                {abilityDescription(enemy.ability)}
              </span>
            </span>
          )}
        </div>
        <div style={{ ...styles.statsLine, textAlign: 'right' }}>ATK {enemy.attack} · DEF {enemy.defend}</div>

        {/* Enemy HP bar */}
        <StatBar
          label="HP"
          current={enemyHp}
          max={enemy.hp}
          gradient="linear-gradient(90deg, #7a2a2a 0%, #a64444 100%)"
        />

        {/* Enemy shield bar */}
        <StatBar
          label="SH"
          current={enemyShield}
          max={Math.max(enemy.hp, 1)}
          gradient="linear-gradient(90deg, #4a6a3a 0%, #7aa85a 100%)"
        />

        {/* Enemy telegraph — shows optional status + current and next intents */}
        <div style={styles.telegraph}>
          {enemyTelegraph ? (
            <div>
              <span style={styles.telegraphIcon}>⚔</span> {enemyTelegraph}
            </div>
          ) : null}
          {enemyIntentQueue?.length > 0 && (
            <div style={styles.telegraphQueue}>
              {enemyIntentQueue.slice(0, 2).map((intent, i) => (
                <span key={i} style={styles.telegraphChip}>
                  {i === 0 ? 'NOW' : 'NEXT'}: {intent.text}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// StatBar — reusable HP / MP / Shield bar used by both
// the player and enemy panels.
// ============================================================
function StatBar({ label, current, max, gradient }) {
  return (
    <div style={styles.statBar}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.barTrack}>
        <div
          style={{
            ...styles.barFill,
            width: `${(current / max) * 100}%`,
            background: gradient,
          }}
        />
        <span style={styles.barText}>
          {current} / {max}
        </span>
      </div>
    </div>
  );
}
