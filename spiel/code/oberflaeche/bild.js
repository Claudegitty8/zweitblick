// Zeigt ein Bild aus spiel/bilder/. Jedes Bild hat einen beschreibenden Text für Vorlesehilfen.
// Die Bilder sind selbst gezeichnet (SVG). Es gibt keine fremden Fotos (Entscheid E-020).
import { el } from './bausteine.js';

const BILDER = new URL('../../bilder/', import.meta.url);

export function bildKnoten(datei, text, klasse = 'bild') {
  return el('img', {
    klasse,
    src: new URL(datei, BILDER).href,
    alt: text ?? '',
    // Nicht verzögert laden: Die Bilder sind klein, und beim Drucken des Spickzettels müssen alle da sein.
    decoding: 'async',
  });
}

// Ein Bild mit Bildunterschrift und Markierung «So nicht» oder «So ist es gut».
export function beispielBild({ datei, text, gut }, t) {
  return el('figure', { klasse: gut ? 'beispiel-bild gut' : 'beispiel-bild schlecht' },
    bildKnoten(datei, text),
    el('figcaption', {},
      el('strong', { text: gut ? t.soGut : t.soNicht }),
      el('span', { text: ` ${text}` })));
}
