import { styles } from '../styles';

export default function CombatBanner({ banner }) {
  if (!banner) return null;

  const toneStyle = banner.tone === 'enemy' ? styles.combatBannerEnemy : styles.combatBannerPlayer;

  return (
    <div key={banner.id} style={{ ...styles.combatBanner, ...toneStyle }} className="combat-banner">
      <div style={styles.combatBannerEyebrow}>{banner.eyebrow}</div>
      <div style={styles.combatBannerTitle}>{banner.title}</div>
      {banner.detail && <div style={styles.combatBannerDetail}>{banner.detail}</div>}
    </div>
  );
}
