export const tileGlyph = (t) => (t === 'A' ? '⚔' : t === 'D' ? '⛨' : t === 'M' ? '✦' : '▦');
export const tileLabel = (t) => (t === 'A' ? 'ATTACK' : t === 'D' ? 'DEFENCE' : t === 'M' ? 'MANA' : 'NO ACTION');

export const tileStyle = (t) => {
  if (t === 'A') return {
    background: 'linear-gradient(165deg, #3a1f1a 0%, #2a1410 100%)',
    borderColor: '#a64432',
    color: '#e8a890',
  };
  if (t === 'D') return {
    background: 'linear-gradient(165deg, #1a2838 0%, #10192a 100%)',
    borderColor: '#3a6fa6',
    color: '#8ab4d8',
  };
  if (t === 'M') return {
    background: 'linear-gradient(165deg, #251838 0%, #160e2a 100%)',
    borderColor: '#6a4caf',
    color: '#c4a8e8',
  };
  return {
    background: `
      linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 42%),
      repeating-linear-gradient(35deg, rgba(255,255,255,0.035) 0 2px, rgba(0,0,0,0.035) 2px 5px),
      linear-gradient(165deg, #77736a 0%, #55524b 48%, #34332f 100%)
    `,
    borderColor: '#9a9488',
    color: '#e1ded4',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -10px 18px rgba(0,0,0,0.22)',
  };
};
