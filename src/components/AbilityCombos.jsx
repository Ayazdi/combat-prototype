import React from 'react';
import { tileGlyph } from '../tileHelpers';

export default function AbilityCombos({ combos = [], passives = [], totalCombos = 0, totalPassives = 0 }) {
  if (combos.length === 0 && passives.length === 0) {
    return (
      <section style={{ padding: '0.75rem', opacity: 0.5, fontSize: '0.75rem', textAlign: 'center' }}>
        No abilities or passives unlocked yet
      </section>
    );
  }

  const sectionStyle = {
    marginBottom: '0.5rem',
  };
  const headerStyle = {
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#b89a5a',
    marginBottom: '0.35rem',
    display: 'flex',
    justifyContent: 'space-between',
  };
  const itemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    padding: '0.35rem 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  };
  const patternStyle = {
    display: 'flex',
    gap: '2px',
    flexShrink: 0,
  };
  const tileStyle = {
    fontSize: '0.75rem',
    width: '16px',
    textAlign: 'center',
  };
  const nameStyle = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#e8d5a0',
  };
  const detailStyle = {
    fontSize: '0.65rem',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.3,
  };
  const passiveItemStyle = {
    ...itemStyle,
  };
  const passiveNameStyle = {
    ...nameStyle,
    color: '#a8c8e8',
  };

  return (
    <section style={{ padding: '0.5rem 0.75rem' }}>
      {combos.length > 0 && (
        <div style={sectionStyle}>
          <div style={headerStyle}>
            <span>Ability Combos</span>
            <span style={{ opacity: 0.6 }}>{combos.length} / {totalCombos}</span>
          </div>
          {combos.map((combo) => (
            <div key={combo.id} style={itemStyle}>
              <div style={patternStyle}>
                {combo.pattern.split('').map((tile, i) => (
                  <span key={i} style={tileStyle}>{tileGlyph(tile)}</span>
                ))}
              </div>
              <div>
                <div style={nameStyle}>{combo.name}</div>
                <div style={detailStyle}>{combo.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {passives.length > 0 && (
        <div style={sectionStyle}>
          <div style={headerStyle}>
            <span>Passives</span>
            <span style={{ opacity: 0.6 }}>{passives.length} / {totalPassives}</span>
          </div>
          {passives.map((passive) => (
            <div key={passive.id} style={passiveItemStyle}>
              <div>
                <div style={passiveNameStyle}>{passive.name}</div>
                <div style={detailStyle}>{passive.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
