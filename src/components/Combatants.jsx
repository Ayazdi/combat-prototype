import { ELEMENTS, ENEMY_TRAITS, TUNING } from '../constants';
import { getIntentShieldInfo } from '../gameHelpers';
import { styles } from '../styles';

export default function Combatants({
  playerHp,
  playerMana,
  playerShield,
  playerShieldEffects,
  playerStatuses,
  enemy,
  enemyHp,
  enemyShield,
  enemyShieldElement,
  enemyShieldContact,
  enemyStatuses,
  enemyIntentQueue,
}) {
  return (
    <section style={styles.combatants}>
      <div style={styles.combatant}>
        <div style={styles.combatantLabel}>YOU · Lv1</div>
        <div style={styles.statsLine}>Steel / Fire / Ice allocation</div>

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
        <StatBar
          label="SH"
          current={playerShield}
          max={TUNING.player.maxShield}
          gradient="linear-gradient(90deg, #4a6a3a 0%, #7aa85a 100%)"
        />

        <PlayerShieldBadges shield={playerShield} effects={playerShieldEffects} />
        <StatusBadges statuses={playerStatuses} align="left" />
      </div>

      <div style={styles.versus}>
        <div style={styles.versusLine} />
        <div style={styles.versusMark}>✦</div>
        <div style={styles.versusLine} />
      </div>

      <div style={styles.combatant}>
        <div style={{ ...styles.combatantLabel, textAlign: 'right' }}>
          {enemy.name.toUpperCase()} · Lv{enemy.id}
        </div>
        <div style={{ ...styles.statsLine, textAlign: 'right' }}>Elemental attack pattern</div>

        <StatBar
          label="HP"
          current={enemyHp}
          max={enemy.hp}
          gradient="linear-gradient(90deg, #7a2a2a 0%, #a64444 100%)"
        />
        <StatBar
          label="SH"
          current={enemyShield}
          max={Math.max(enemy.hp, 1)}
          gradient="linear-gradient(90deg, #4a6a3a 0%, #7aa85a 100%)"
        />

        <EnemyBadgeRow
          enemy={enemy}
          enemyShield={enemyShield}
          enemyShieldElement={enemyShieldElement}
          enemyShieldContact={enemyShieldContact}
        />
        <StatusBadges statuses={enemyStatuses} align="right" />

        <div style={styles.telegraph}>
          {enemyIntentQueue?.length > 0 && (
            <div style={styles.telegraphQueue}>
              {enemyIntentQueue.slice(0, 2).map((intent, index) => (
                <span key={index} style={styles.telegraphChip} title={intentDetail(intent)}>
                  {index === 0 ? 'NOW' : 'NEXT'}: {intent.dmg} {ELEMENTS[intent.element]?.short || '?'}
                  {intent.shieldInfo?.block > 0 && (
                    <span style={styles.intentShieldText}>
                      {' '}+{intent.shieldInfo.block} {ELEMENTS[intent.shieldInfo.shieldElement]?.short || '?'} SH
                      {intent.shieldInfo.contactBurnStacks > 0 && ` / Burn ${intent.shieldInfo.contactBurnStacks}`}
                      {intent.shieldInfo.contactFreezeStacks > 0 && ` / Freeze ${intent.shieldInfo.contactFreezeStacks}`}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function intentDetail(intent) {
  const parts = [`Attack: ${intent.dmg} ${elementName(intent.element)} damage.`];
  if (intent.shieldInfo?.block > 0) {
    const boosted = intent.shieldInfo.unmodifiedBlock && intent.shieldInfo.unmodifiedBlock !== intent.shieldInfo.block
      ? `, boosted from ${intent.shieldInfo.unmodifiedBlock}`
      : '';
    parts.push(`Shield: after attacking, gains ${intent.shieldInfo.block} ${elementName(intent.shieldInfo.shieldElement)} shield from ${intent.shieldInfo.shieldTiles} ${tileWord(intent.shieldInfo.shieldTiles)}${boosted}.`);
    parts.push(contactDetail(intent.shieldInfo));
  }
  return parts.join(' ');
}

function EnemyBadgeRow({ enemy, enemyShield, enemyShieldElement, enemyShieldContact }) {
  const traits = enemy.traits || [];
  const hasShieldPattern = enemy.pattern?.some((intent) => getIntentShieldInfo(intent, enemy).block > 0);
  const hasBadges = traits.length > 0 || enemyShield > 0 || hasShieldPattern;
  if (!hasBadges) return <div style={{ ...styles.infoBadgeRow, justifyContent: 'flex-end' }} />;

  return (
    <div style={{ ...styles.infoBadgeRow, justifyContent: 'flex-end' }}>
      {traits.map((traitId) => {
        const trait = ENEMY_TRAITS[traitId];
        if (!trait) return null;
        return (
          <HoverBadge
            key={trait.id}
            icon={trait.icon}
            label={trait.label}
            detail={trait.detail}
            tone="negative"
          />
        );
      })}
      {enemyShield > 0 && (
        <HoverBadge
          icon={ELEMENTS[enemyShieldElement]?.short || 'S'}
          label="Active Shield"
          detail={enemyShieldDetail(enemyShield, enemyShieldElement, enemyShieldContact)}
          tone="defense"
        />
      )}
      {hasShieldPattern && (
        <HoverBadge
          icon="SH"
          label="Shield Pattern"
          detail={enemyShieldPatternDetail(enemy)}
          tone="defense"
        />
      )}
    </div>
  );
}

function enemyShieldDetail(enemyShield, enemyShieldElement, contact) {
  const label = elementName(enemyShieldElement || 'steel');
  const parts = [`${enemyShield} current total ${label} shield absorbs your damage before HP.`];
  if (contact?.shieldTiles > 0) {
    const blockText = contact.block > 0
      ? `${contact.block} shield`
      : `${contact.shieldTiles} ${tileWord(contact.shieldTiles)}`;
    parts.push(`The active contact effect comes from ${blockText} of ${label} shield.`);
  }
  if (contact?.contactBurnStacks > 0) {
    parts.push(`Contact applies ${burnDetail(contact.contactBurnStacks)}. Counter with ${contact.contactBurnStacks} active Ice attack ${tileWord(contact.contactBurnStacks)}; each counter tile spends its Freeze.`);
  }
  if (contact?.contactFreezeStacks > 0) {
    parts.push(`Contact applies ${freezeDetail(contact.contactFreezeStacks)}. Counter with ${contact.contactFreezeStacks} active Fire attack ${tileWord(contact.contactFreezeStacks)}; each counter tile spends its Burn.`);
  }
  if (!contact?.contactBurnStacks && !contact?.contactFreezeStacks) {
    parts.push('No contact status. Bring enough damage to break through.');
  }
  return parts.join(' ');
}

function PlayerShieldBadges({ shield, effects }) {
  if (shield <= 0) return <div style={styles.infoBadgeRow} />;
  const sourceElements = effects?.sourceElements || [];
  const elementBlocks = effects?.elementBlocks || {};
  const badges = [];

  if (sourceElements.includes('steel')) {
    badges.push({
      icon: 'S',
      label: 'Steel Shield',
      detail: `${shield} total shield now. Steel generated ${elementBlocks.steel || 0} block in your latest shield action. ${shieldAppliedText(effects)} Steel shield is pure block and has no contact status effect.`,
    });
  }
  if ((elementBlocks.mixed || 0) > 0) {
    badges.push({
      icon: 'FI',
      label: 'Mixed Shield',
      detail: `${shield} total shield now. Fire/Ice cancellation generated ${elementBlocks.mixed} block in your latest shield action. ${shieldAppliedText(effects)} Canceled Fire/Ice shield has no contact status effect.`,
    });
  }
  if ((effects?.contactBurnStacks || 0) > 0) {
    badges.push({
      icon: 'F',
      label: 'Fire Shield',
      detail: `${shield} total shield now. Fire generated ${elementBlocks.fire || 0} block in your latest shield action. ${shieldAppliedText(effects)} If the next enemy attack hits at least 1 shield, it applies ${burnDetail(effects.contactBurnStacks)} to the enemy, then the contact effect clears.`,
    });
  }
  if ((effects?.contactFreezeStacks || 0) > 0) {
    badges.push({
      icon: 'I',
      label: 'Ice Shield',
      detail: `${shield} total shield now. Ice generated ${elementBlocks.ice || 0} block in your latest shield action. ${shieldAppliedText(effects)} If the next enemy attack hits at least 1 shield, it applies ${freezeDetail(effects.contactFreezeStacks)} to the enemy, then the contact effect clears.`,
    });
  }
  if (badges.length === 0) {
    badges.push({
      icon: 'SH',
      label: 'Stored Shield',
      detail: `${shield} total shield remains. It absorbs incoming damage, but no elemental contact effect is active.`,
    });
  }

  return (
    <div style={styles.infoBadgeRow}>
      {badges.map((badge) => (
        <HoverBadge
          key={badge.label}
          icon={badge.icon}
          label={badge.label}
          detail={badge.detail}
          tone="defense"
        />
      ))}
    </div>
  );
}

function enemyShieldPatternDetail(enemy) {
  const entries = (enemy.pattern || [])
    .map((intent, index) => ({ intent, index, shieldInfo: getIntentShieldInfo(intent, enemy) }))
    .filter(({ shieldInfo }) => shieldInfo.block > 0);

  if (entries.length === 0) return 'This foe has no shield turns.';

  return entries.map(({ intent, index, shieldInfo }) => {
    const boosted = shieldInfo.unmodifiedBlock && shieldInfo.unmodifiedBlock !== shieldInfo.block
      ? `, boosted from ${shieldInfo.unmodifiedBlock}`
      : '';
    return `Pattern ${index + 1}: ${intent.dmg} ${elementName(intent.element)} attack, then ${shieldInfo.block} ${elementName(shieldInfo.shieldElement)} shield from ${shieldInfo.shieldTiles} ${tileWord(shieldInfo.shieldTiles)}${boosted}. ${contactDetail(shieldInfo)}`;
  }).join(' ');
}

function shieldAppliedText(effects) {
  const generated = effects?.generatedBlock || 0;
  const applied = effects?.appliedBlock ?? generated;
  if (generated <= 0) return 'No new shield was generated this action.';
  if (generated === applied) return `${applied} shield was added.`;
  return `${generated} shield was generated; ${applied} was added after the cap.`;
}

function contactDetail(shieldInfo) {
  if (shieldInfo.contactBurnStacks > 0) {
    return `Contact: ${burnDetail(shieldInfo.contactBurnStacks)} unless you attack with ${shieldInfo.contactBurnStacks} active Ice ${tileWord(shieldInfo.contactBurnStacks)}.`;
  }
  if (shieldInfo.contactFreezeStacks > 0) {
    return `Contact: ${freezeDetail(shieldInfo.contactFreezeStacks)} unless you attack with ${shieldInfo.contactFreezeStacks} active Fire ${tileWord(shieldInfo.contactFreezeStacks)}.`;
  }
  return 'Contact: no status effect.';
}

function burnDetail(stacks) {
  return `Burn ${stacks} (${stacks * TUNING.status.burnPerStack} damage per tick for ${TUNING.status.burnDuration} ticks)`;
}

function freezeDetail(stacks) {
  return `Freeze ${stacks} (+${Math.round(stacks * TUNING.status.freezeMultPerStack * 100)}% Steel damage taken until it decays)`;
}

function elementName(element) {
  return ELEMENTS[element]?.label || element || 'Steel';
}

function tileWord(count) {
  return count === 1 ? 'tile' : 'tiles';
}

function HoverBadge({ icon, label, detail, tone }) {
  return (
    <span className="ability-wrap" style={styles.infoBadgeWrap}>
      <span
        className="ability-badge"
        style={{
          ...styles.infoBadge,
          ...(tone === 'negative' ? styles.infoBadgeNegative : styles.infoBadgeDefense),
        }}
        title={`${label}: ${detail}`}
      >
        {icon}
      </span>
      <span className="ability-tooltip" style={styles.abilityTooltip}>
        <strong>{label}</strong>
        <br />
        {detail}
      </span>
    </span>
  );
}

function StatusBadges({ statuses, align }) {
  const burn = statuses?.burn;
  const freezeStacks = statuses?.freeze?.stacks || 0;
  const hasStatus = (burn?.stacks || 0) > 0 || freezeStacks > 0;
  if (!hasStatus) return <div style={{ ...styles.statusBadges, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }} />;

  return (
    <div style={{ ...styles.statusBadges, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
      {burn?.stacks > 0 && (
        <span
          style={{ ...styles.statusBadge, ...styles.statusBadgeBurn }}
          title={`Burn ${burn.stacks}: ${burn.stacks * TUNING.status.burnPerStack} damage per tick. Remaining ticks: ${burn.turnsLeft}.`}
        >
          Burn {burn.stacks} · {burn.turnsLeft}
        </span>
      )}
      {freezeStacks > 0 && (
        <span
          style={{ ...styles.statusBadge, ...styles.statusBadgeFreeze }}
          title={`Freeze ${freezeStacks}: Steel damage taken is increased by ${Math.round(freezeStacks * TUNING.status.freezeMultPerStack * 100)}% until it decays.`}
        >
          Freeze {freezeStacks}
        </span>
      )}
    </div>
  );
}

function StatBar({ label, current, max, gradient }) {
  const widthPct = Math.max(0, Math.min(100, (current / max) * 100));

  return (
    <div style={styles.statBar}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.barTrack}>
        <div
          style={{
            ...styles.barFill,
            width: `${widthPct}%`,
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
