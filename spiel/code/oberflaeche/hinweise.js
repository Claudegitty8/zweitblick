// Hinweise je nach Gerät: Auf iPhone und iPad löscht Safari die Daten einer Website,
// die längere Zeit nicht besucht wurde. Als Symbol auf dem Home-Bildschirm passiert das nicht.
import { el } from './bausteine.js';

export function istApfelGeraet() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function laeuftAlsApp() {
  return navigator.standalone === true || Boolean(globalThis.matchMedia?.('(display-mode: standalone)').matches);
}

// Karte für den Startbildschirm. Nur auf iPhone und iPad im Browser.
export function geraetHinweise(t) {
  if (!istApfelGeraet() || laeuftAlsApp()) return [];
  return [el('details', { klasse: 'karte eintrag home-hinweis' },
    el('summary', { text: t.homeTitel }),
    el('p', { text: t.homeWarum }),
    el('ol', { klasse: 'echt-schritte' }, t.homeSchritte.map((schritt) => el('li', { text: schritt }))))];
}
