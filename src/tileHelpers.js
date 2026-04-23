export const tileGlyph = (t) => (t === 'A' ? '⚔' : t === 'D' ? '⛨' : '·');
export const tileLabel = (t) => (t === 'A' ? 'ATTACK' : t === 'D' ? 'DEFENCE' : 'NO ACTION');

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
  return {
    background: 'linear-gradient(165deg, #1e1a16 0%, #14110e 100%)',
    borderColor: '#3a342c',
    color: '#5a5248',
  };
};
