import { ELEMENTS } from './constants';

export const tileGlyph = (tile) => ELEMENTS[tile]?.glyph || '?';

export const tileShort = (tile) => ELEMENTS[tile]?.short || '?';

export const tileLabel = (tile) => ELEMENTS[tile]?.label || 'Unknown';

export const tileStyle = (tile) => {
  if (tile === 'steel') {
    return {
      background: 'linear-gradient(165deg, #8a8a8a 0%, #515151 46%, #2f2f2f 100%)',
      borderColor: '#b8b8b8',
      color: '#f0f0ea',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -12px 18px rgba(0,0,0,0.24)',
    };
  }

  if (tile === 'fire') {
    return {
      background: 'linear-gradient(165deg, #5a2017 0%, #33130e 100%)',
      borderColor: '#c74a32',
      color: '#ffb18f',
      boxShadow: 'inset 0 1px 0 rgba(255,210,160,0.16), 0 0 18px rgba(199,74,50,0.14)',
    };
  }

  if (tile === 'ice') {
    return {
      background: 'linear-gradient(165deg, #1c3b4f 0%, #102333 100%)',
      borderColor: '#65a9c8',
      color: '#b9e7f4',
      boxShadow: 'inset 0 1px 0 rgba(220,250,255,0.18), 0 0 18px rgba(101,169,200,0.12)',
    };
  }

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
