// ============================================================
// GLOBAL CSS — injected via <style> tag in the root component.
// Handles hover effects, transitions, and keyframe animations
// that can't be expressed with inline styles alone.
// ============================================================
export const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

  /* Draft tile hover lift */
  .tile-btn {
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .tile-btn:not(:disabled):hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(212, 162, 76, 0.4);
  }
  .tile-btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .tile-card-enter {
    animation: boardDealIn 0.34s cubic-bezier(0.18, 0.89, 0.32, 1.16);
    transform-origin: 50% 80%;
  }
  .tile-discard-btn {
    cursor: pointer;
    transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
  }
  .tile-discard-btn:not(:disabled):hover {
    transform: translateY(-1px);
    background: #3a1d1d !important;
    border-color: #e8a890 !important;
  }
  .tile-discard-btn:disabled {
    cursor: not-allowed;
  }

  /* Reroll / discard button hover glow */
  .ctrl-btn {
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .ctrl-btn:not(:disabled):hover {
    background: #2a2318 !important;
    border-color: #d4a24c !important;
    color: #e8c98c !important;
  }

  /* Committed slots are interactive when they contain a tile */
  .committed-slot-btn {
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
  }
  .committed-slot-btn:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(0,0,0,0.45);
  }
  .committed-slot-btn:disabled {
    cursor: default;
  }
  .committed-slot-dragging {
    animation: dragPulse 0.45s ease-in-out infinite alternate;
  }
  .committed-card-enter {
    animation: handLandIn 0.28s cubic-bezier(0.2, 0.8, 0.2, 1.1);
    transform-origin: 50% 100%;
  }
  .combat-banner {
    animation: combatBannerIn 0.28s ease-out, combatBannerPulse 1.15s ease-in-out 0.28s infinite alternate;
  }

  /* Victory / defeat overlay buttons */
  .overlay-btn {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .overlay-btn:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.6);
  }
  .overlay-btn:disabled {
    cursor: not-allowed;
  }

  /* Entrance animation for tiles and overlays */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes boardDealIn {
    0% {
      opacity: 0;
      transform: translateY(-18px) rotateX(22deg) scale(0.9);
      filter: brightness(1.35) saturate(0.9);
    }
    64% {
      opacity: 1;
      transform: translateY(3px) rotateX(0deg) scale(1.03);
      filter: brightness(1.08) saturate(1);
    }
    100% {
      opacity: 1;
      transform: translateY(0) rotateX(0deg) scale(1);
      filter: brightness(1) saturate(1);
    }
  }
  @keyframes handLandIn {
    0% {
      opacity: 0;
      transform: translateY(-28px) scale(0.82) rotate(-4deg);
      filter: brightness(1.25);
    }
    70% {
      opacity: 1;
      transform: translateY(3px) scale(1.04) rotate(1deg);
      filter: brightness(1.05);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1) rotate(0deg);
      filter: brightness(1);
    }
  }
  @keyframes combatBannerIn {
    from {
      opacity: 0;
      transform: translate(-50%, -44%) scale(0.92);
      filter: blur(2px) brightness(1.4);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
      filter: blur(0) brightness(1);
    }
  }
  @keyframes combatBannerPulse {
    from { box-shadow: 0 18px 55px rgba(0,0,0,0.65), 0 0 20px rgba(212,162,76,0.18); }
    to { box-shadow: 0 22px 70px rgba(0,0,0,0.78), 0 0 34px rgba(212,162,76,0.34); }
  }
  @keyframes dragPulse {
    from { transform: scale(0.96); filter: brightness(0.95); }
    to { transform: scale(1.04); filter: brightness(1.08); }
  }
`;

// ============================================================
// INLINE STYLES — organised by UI section so each component
// can import only the keys it needs.
// ============================================================
export const styles = {
  // --- Root wrapper ---
  root: {
    minHeight: '100vh',
    width: '100%',
    background: 'radial-gradient(ellipse at top, #1a1612 0%, #0d0a08 60%, #070504 100%)',
    fontFamily: '"JetBrains Mono", monospace',
    color: '#d8cfc2',
    padding: '24px 16px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGrain: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E")`,
    opacity: 0.08,
    pointerEvents: 'none',
    mixBlendMode: 'overlay',
  },
  frame: {
    maxWidth: 880,
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },

  // --- Header ---
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottom: '1px solid #2a2418',
    marginBottom: 24,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  runeMark: {
    fontSize: 28,
    color: '#d4a24c',
    textShadow: '0 0 18px rgba(212, 162, 76, 0.5)',
  },
  titleSmall: {
    fontFamily: '"Cinzel", serif',
    fontSize: 18,
    letterSpacing: '0.25em',
    color: '#e8d4a8',
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: '0.3em',
    color: '#7a7265',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  stageIndicator: { display: 'flex', gap: 8 },
  stageDot: { width: 8, height: 8, borderRadius: '50%', transition: 'background 0.3s' },

  // --- Combatant panels (player + enemy) ---
  combatants: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: 20,
    alignItems: 'center',
    marginBottom: 28,
  },
  combatant: { display: 'flex', flexDirection: 'column', gap: 10 },
  combatantLabel: {
    fontFamily: '"Cinzel", serif',
    fontSize: 12,
    letterSpacing: '0.2em',
    color: '#b8a88a',
    fontWeight: 600,
  },

  // --- Stat bars (HP / MP / Shield) ---
  statBar: { display: 'flex', alignItems: 'center', gap: 10 },
  statLabel: {
    fontSize: 10,
    color: '#7a7265',
    letterSpacing: '0.15em',
    width: 22,
  },
  barTrack: {
    flex: 1,
    height: 18,
    background: '#0f0c08',
    border: '1px solid #2a2418',
    position: 'relative',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    transition: 'width 0.4s ease',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  barText: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: '#f2e6d0',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    letterSpacing: '0.05em',
  },

  // --- Enemy telegraph banner ---
  telegraph: {
    fontSize: 12,
    color: '#d4a24c',
    textAlign: 'right',
    letterSpacing: '0.05em',
    padding: '6px 10px',
    background: 'rgba(212, 162, 76, 0.06)',
    border: '1px solid rgba(212, 162, 76, 0.2)',
    borderRadius: 2,
  },
  telegraphIcon: { marginRight: 4 },
  telegraphQueue: {
    marginTop: 8,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 6,
    flexWrap: 'wrap',
  },
  telegraphChip: {
    fontSize: 10,
    letterSpacing: '0.08em',
    color: '#c9b28a',
    border: '1px solid rgba(212, 162, 76, 0.25)',
    background: 'rgba(20, 17, 14, 0.85)',
    padding: '3px 6px',
    borderRadius: 2,
  },
  telegraphChipDanger: {
    color: '#e8a890',
    borderColor: 'rgba(198, 72, 56, 0.55)',
    background: 'rgba(58, 22, 18, 0.85)',
    boxShadow: '0 0 12px rgba(198, 72, 56, 0.22)',
  },

  // --- Run modifiers ---
  statusChips: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  statusChip: {
    fontSize: 10,
    letterSpacing: '0.08em',
    padding: '4px 7px',
    border: '1px solid',
    borderRadius: 2,
    background: '#11100d',
    fontWeight: 600,
  },
  statusChipDamage: {
    color: '#e8a890',
    borderColor: 'rgba(232, 168, 144, 0.42)',
  },
  statusChipDefence: {
    color: '#8ab4d8',
    borderColor: 'rgba(138, 180, 216, 0.42)',
  },

  // --- Versus divider ---
  versus: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    height: '100%',
    justifyContent: 'center',
  },
  versusLine: { width: 1, height: 24, background: '#3a342a' },
  versusMark: { fontSize: 16, color: '#d4a24c' },

  // --- Draft area (tile row + controls) ---
  draftArea: {
    background: 'linear-gradient(180deg, rgba(26, 22, 18, 0.6) 0%, rgba(13, 10, 8, 0.6) 100%)',
    border: '1px solid #2a2418',
    padding: 20,
    marginBottom: 20,
    borderRadius: 2,
  },
  roundHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  roundLabel: {
    fontFamily: '"Cinzel", serif',
    fontSize: 13,
    letterSpacing: '0.25em',
    color: '#d4a24c',
    fontWeight: 600,
  },
  hint: {
    fontSize: 10,
    color: '#7a7265',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginBottom: 16,
  },
  tileWrap: {
    position: 'relative',
    minWidth: 0,
  },
  tile: {
    width: '100%',
    aspectRatio: '3 / 4',
    border: '2px solid',
    background: '#1a1612',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: '"Cinzel", serif',
    position: 'relative',
    borderRadius: 2,
  },
  tileGlyph: { fontSize: 42, lineHeight: 1 },
  tileLabel: {
    fontSize: 10,
    letterSpacing: '0.2em',
    opacity: 0.85,
    fontWeight: 600,
  },
  boardDiscardBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 2,
    border: '1px solid rgba(232, 168, 144, 0.65)',
    background: 'rgba(46, 26, 26, 0.9)',
    color: '#e8a890',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 14,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  boardDiscardBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  deckInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  deckChip: {
    fontSize: 10,
    letterSpacing: '0.08em',
    color: '#8a8070',
    border: '1px solid #2a2418',
    background: '#11100d',
    padding: '4px 8px',
    borderRadius: 2,
  },

  // --- Reroll / discard / submit controls ---
  controls: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  // 3-column layout when submit button is present
  controls3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 10,
  },
  controlBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '10px 14px',
    background: '#14110e',
    border: '1px solid #3a342a',
    color: '#b8a88a',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    letterSpacing: '0.15em',
    fontWeight: 500,
    borderRadius: 2,
  },
  controlBtnDisabled: { opacity: 0.35, cursor: 'not-allowed' },
  // Submit button — green glow when the committed sequence is valid
  submitBtnValid: {
    background: 'linear-gradient(165deg, #1a2e1a 0%, #102a10 100%)',
    borderColor: '#3aa644',
    color: '#8ad88a',
  },
  // Submit button — red tint when the committed sequence is invalid
  submitBtnInvalid: {
    background: 'linear-gradient(165deg, #2e1a1a 0%, #2a1010 100%)',
    borderColor: '#a64432',
    color: '#d88a8a',
  },
  ctrlIcon: { fontSize: 14 },
  ctrlCost: {
    fontSize: 10,
    color: '#4a8bc2',
    marginLeft: 4,
    letterSpacing: '0.1em',
  },

  // --- Committed tile sequence ---
  committedArea: { marginBottom: 20 },
  committedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  committedLabel: {
    fontFamily: '"Cinzel", serif',
    fontSize: 12,
    letterSpacing: '0.25em',
    color: '#8a8070',
    fontWeight: 600,
  },
  previewStats: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 },
  previewDmg: { color: '#e8a890', fontWeight: 600 },
  previewBlk: { color: '#8ab4d8', fontWeight: 600 },
  previewSep: { color: '#3a342a' },
  committedRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 10,
    marginBottom: 10,
  },
  committedSlot: {
    border: '2px solid',
    aspectRatio: '3 / 2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontFamily: '"Cinzel", serif',
    borderRadius: 2,
    padding: 0,
    margin: 0,
  },
  committedSelected: {
    boxShadow: '0 0 0 2px rgba(232, 201, 140, 0.85), 0 0 14px rgba(212, 162, 76, 0.4)',
    borderColor: '#e8c98c',
  },
  committedDropTarget: {
    boxShadow: '0 0 0 2px rgba(74, 139, 194, 0.7), 0 0 14px rgba(74, 139, 194, 0.35)',
    borderColor: '#4a8bc2',
  },
  committedDragging: {
    opacity: 0.72,
  },
  committedEmpty: {
    background: '#0d0a08',
    borderColor: '#1f1c16',
    borderStyle: 'dashed',
    color: '#3a342a',
  },
  slotNum: { fontSize: 14, color: '#3a342a' },
  segmentBreakdown: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 24,
  },
  segChip: {
    fontSize: 10,
    padding: '4px 10px',
    background: '#1a1612',
    border: '1px solid #2a2418',
    color: '#b8a88a',
    letterSpacing: '0.1em',
    borderRadius: 2,
  },
  segChipFinisher: {
    color: '#e8c98c',
    borderColor: 'rgba(212, 162, 76, 0.55)',
    background: 'rgba(70, 48, 18, 0.45)',
    boxShadow: '0 0 10px rgba(212, 162, 76, 0.18)',
  },
  breakdownEmpty: {
    fontSize: 10,
    color: '#3a342a',
    fontStyle: 'italic',
    letterSpacing: '0.1em',
  },

  // --- Battle log ---
  logSection: {
    background: '#0a0806',
    border: '1px solid #2a2418',
    padding: '14px 18px',
    borderRadius: 2,
  },
  logHeader: {
    fontFamily: '"Cinzel", serif',
    fontSize: 11,
    letterSpacing: '0.25em',
    color: '#8a8070',
    fontWeight: 600,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1px solid #2a2418',
  },
  logBody: {
    maxHeight: 120,
    overflowY: 'auto',
    fontSize: 11,
    lineHeight: 1.6,
    color: '#a89c88',
  },
  logEntry: {
    paddingLeft: 10,
    borderLeft: '2px solid #2a2418',
    marginBottom: 3,
  },

  // --- Combat action banner ---
  combatBanner: {
    position: 'fixed',
    left: '50%',
    top: '48%',
    transform: 'translate(-50%, -50%)',
    zIndex: 45,
    width: 'min(560px, calc(100vw - 32px))',
    padding: '24px 28px',
    border: '1px solid',
    borderRadius: 2,
    textAlign: 'center',
    pointerEvents: 'none',
    backdropFilter: 'blur(6px)',
  },
  combatBannerPlayer: {
    background: 'linear-gradient(180deg, rgba(28, 24, 18, 0.96) 0%, rgba(12, 10, 8, 0.94) 100%)',
    borderColor: 'rgba(212, 162, 76, 0.75)',
    color: '#e8d4a8',
  },
  combatBannerEnemy: {
    background: 'linear-gradient(180deg, rgba(38, 18, 16, 0.96) 0%, rgba(13, 8, 8, 0.94) 100%)',
    borderColor: 'rgba(198, 72, 56, 0.75)',
    color: '#e8a890',
  },
  combatBannerEyebrow: {
    fontSize: 11,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: '#8a8070',
    marginBottom: 10,
    fontWeight: 600,
  },
  combatBannerTitle: {
    fontFamily: '"Cinzel", serif',
    fontSize: 25,
    letterSpacing: '0.08em',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  combatBannerDetail: {
    marginTop: 10,
    fontSize: 12,
    letterSpacing: '0.08em',
    color: '#c9b28a',
    lineHeight: 1.45,
  },

  // --- Victory / defeat overlay ---
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5, 3, 2, 0.88)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    backdropFilter: 'blur(8px)',
    animation: 'fadeIn 0.4s ease',
  },
  overlayContent: {
    textAlign: 'center',
    padding: '36px 42px',
    background: 'linear-gradient(180deg, #1a1612 0%, #0a0806 100%)',
    border: '1px solid #3a342a',
    width: 'min(560px, calc(100vw - 32px))',
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
    borderRadius: 2,
  },
  overlayMark: { fontSize: 44, color: '#d4a24c', marginBottom: 12 },
  overlayTitle: {
    fontFamily: '"Cinzel", serif',
    fontSize: 28,
    letterSpacing: '0.35em',
    color: '#e8d4a8',
    fontWeight: 700,
    marginBottom: 10,
  },
  overlaySubtitle: {
    fontSize: 12,
    color: '#8a8070',
    letterSpacing: '0.15em',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  overlayReward: {
    fontSize: 12,
    color: '#8ad88a',
    letterSpacing: '0.08em',
    marginBottom: 18,
    fontWeight: 600,
  },
  perkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
    marginBottom: 24,
  },
  perkBtn: {
    minHeight: 76,
    padding: '12px 10px',
    background: '#14110e',
    border: '1px solid #3a342a',
    color: '#b8a88a',
    fontFamily: '"JetBrains Mono", monospace',
    borderRadius: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  perkBtnSelected: {
    background: 'linear-gradient(180deg, #1a2e1a 0%, #102a10 100%)',
    borderColor: '#8ad88a',
    color: '#8ad88a',
  },
  perkBtnDisabled: {
    opacity: 0.42,
  },
  perkLabel: {
    fontSize: 12,
    letterSpacing: '0.08em',
    fontWeight: 700,
  },
  perkDetail: {
    fontSize: 10,
    color: '#7a7265',
    letterSpacing: '0.06em',
    lineHeight: 1.35,
  },
  overlayButtons: { display: 'flex', gap: 10, justifyContent: 'center' },
  overlayBtn: {
    padding: '12px 22px',
    background: '#14110e',
    border: '1px solid #3a342a',
    color: '#b8a88a',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    letterSpacing: '0.2em',
    fontWeight: 600,
    borderRadius: 2,
  },
  overlayBtnPrimary: {
    background: 'linear-gradient(180deg, #d4a24c 0%, #a67c2a 100%)',
    color: '#1a1612',
    borderColor: '#d4a24c',
  },
  overlayBtnDisabled: {
    opacity: 0.4,
    filter: 'grayscale(0.35)',
  },
};
