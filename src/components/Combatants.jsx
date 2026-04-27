import { TUNING } from '../constants';
import { buildTelegraphText } from '../gameHelpers';
import { styles } from '../styles';

// ============================================================
// Combatants — player panel + enemy panel with element statuses
// ============================================================
export default function Combatants({
  phase,
  playerHp,
  playerMana,
  playerShieldBreakdown,
  shieldPreview,
  playerBurnStacks,
  playerBurnDuration,
  playerFreezeStacks,
  enemy,
  enemyHp,
  enemyBurnStacks,
  enemyBurnDuration,
  enemyFreezeStacks,
  currentIntent,
  nextIntent,
}) {
  // During drafting show the preview; during resolving show the actual breakdown
  const activeShield = (phase === 'drafting' ? shieldPreview : playerShieldBreakdown) ?? { steel: 0, ice: 0, fire: 0 };
  const hasShield = activeShield.steel > 0 || activeShield.ice > 0 || activeShield.fire > 0;

  return (
    <section style={styles.combatants}>
      {/* ---- Player stats ---- */}
      <div style={styles.combatant}>
        <div style={styles.combatantLabel}>YOU</div>

        <StatBar
          label="HP"
          current={playerHp}
          max={TUNING.player.maxHp}
          gradient="linear-gradient(90deg, #c8412e 0%, #e56947 100%)"
        />
        <StatBar
          label="MP"
          current={playerMana}
          max={TUNING.player.maxMana}
          gradient="linear-gradient(90deg, #2c5d8f 0%, #4a8bc2 100%)"
        />

        {/* Elemental shield badges (replaces shield bar) */}
        {hasShield && (
          <div style={styles.statusBadges}>
            {activeShield.steel > 0 && (
              <span style={{ ...styles.statusBadge, ...styles.shieldBadgeSteel }}>
                ◆ {activeShield.steel} BLK{phase === 'drafting' ? ' ◌' : ''}
              </span>
            )}
            {activeShield.ice > 0 && (
              <span style={{ ...styles.statusBadge, ...styles.shieldBadgeIce }}>
                ❄ ×{activeShield.ice} ICE{phase === 'drafting' ? ' ◌' : ''}
              </span>
            )}
            {activeShield.fire > 0 && (
              <span style={{ ...styles.statusBadge, ...styles.shieldBadgeFire }}>
                ✦ ×{activeShield.fire} FIRE{phase === 'drafting' ? ' ◌' : ''}
              </span>
            )}
          </div>
        )}

        {/* Player status badges */}
        {(playerBurnStacks > 0 || playerFreezeStacks > 0) && (
          <div style={styles.statusBadges}>
            {playerBurnStacks > 0 && (
              <span style={{ ...styles.statusBadge, ...styles.statusBadgeBurn }}>
                🔥 {playerBurnStacks} burn · {playerBurnDuration}t
              </span>
            )}
            {playerFreezeStacks > 0 && (
              <span style={{ ...styles.statusBadge, ...styles.statusBadgeFreeze }}>
                ❄ {playerFreezeStacks} freeze
              </span>
            )}
          </div>
        )}
      </div>

      {/* ---- Versus divider ---- */}
      <div style={styles.versus}>
        <div style={styles.versusLine} />
        <div style={styles.versusMark}>✦</div>
        <div style={styles.versusLine} />
      </div>

      {/* ---- Enemy stats ---- */}
      <div style={styles.combatant}>
        <div style={{ ...styles.combatantLabel, textAlign: 'right' }}>
          {enemy.name.toUpperCase()} · Lv{enemy.id}
        </div>

        <StatBar
          label="HP"
          current={enemyHp}
          max={enemy.hp}
          gradient="linear-gradient(90deg, #7a2a2a 0%, #a64444 100%)"
        />

        {/* Enemy status badges */}
        {(enemyBurnStacks > 0 || enemyFreezeStacks > 0) && (
          <div style={{ ...styles.statusBadges, justifyContent: 'flex-end' }}>
            {enemyBurnStacks > 0 && (
              <span style={{ ...styles.statusBadge, ...styles.statusBadgeBurn }}>
                🔥 {enemyBurnStacks} burn · {enemyBurnDuration}t
              </span>
            )}
            {enemyFreezeStacks > 0 && (
              <span style={{ ...styles.statusBadge, ...styles.statusBadgeFreeze }}>
                ❄ {enemyFreezeStacks} freeze
              </span>
            )}
          </div>
        )}

        {/* Enemy telegraph */}
        {currentIntent && (
          <div style={styles.telegraph}>
            <div style={styles.telegraphQueue}>
              <span style={{ ...styles.telegraphChip, borderColor: '#c04040', color: '#e8c0c0' }}>
                NOW: {buildTelegraphText(currentIntent)}
              </span>
              {nextIntent && (
                <span style={styles.telegraphChip}>
                  NEXT: {buildTelegraphText(nextIntent)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatBar({ label, current, max, gradient }) {
  const widthPct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div style={styles.statBar}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${widthPct}%`, background: gradient }} />
        <span style={styles.barText}>
          {current} / {max}
        </span>
      </div>
    </div>
  );
}
