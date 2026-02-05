
/**
 * @fileOverview Utilitaire pour les retours haptiques (vibrations).
 * Améliore l'expérience sensorielle sur les appareils mobiles.
 */

export const haptic = {
  /** Vibration légère pour les interactions simples */
  light: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
  /** Vibration moyenne pour les actions significatives */
  medium: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  },
  /** Séquence de succès */
  success: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([10, 30, 10]);
    }
  },
  /** Séquence d'erreur ou d'échec */
  error: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 100, 50]);
    }
  },
  /** Vibration longue pour les moments intenses */
  impact: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }
  }
};
