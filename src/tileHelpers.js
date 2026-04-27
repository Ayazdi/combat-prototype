// Tile keys: 'S' (Steel), 'F' (Fire), 'I' (Ice), 'E' (Empty)

export const tileGlyph = (t) => ({ S: '◆', F: '✦', I: '❄', E: '·' }[t] ?? t);

export const tileLabel = (t) => ({ S: 'STEEL', F: 'FIRE', I: 'ICE', E: 'EMPTY' }[t] ?? t);

export const tileStyle = (t) => ({
  S: {
    background: 'linear-gradient(135deg,#3a3e44,#1e2226)',
    borderColor: '#8a9aaa',
    color: '#c8d4e0',
  },
  F: {
    background: 'linear-gradient(135deg,#4a1a1a,#2a0808)',
    borderColor: '#c04040',
    color: '#e8a0a0',
  },
  I: {
    background: 'linear-gradient(135deg,#1a2a4a,#080c1e)',
    borderColor: '#4080c0',
    color: '#a0c0e8',
  },
  E: {
    background: 'linear-gradient(135deg,#1a1a1a,#0a0a0a)',
    borderColor: '#333',
    color: '#555',
  },
}[t] ?? {});
