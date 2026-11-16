// Die Übungsform «Vorhersagen»: Der Spieler wählt eine von mehreren Antworten.
// Bietet dieselben Funktionen wie die Werkbank, damit der Rundenablauf alle Formen gleich behandelt.
import { el } from './bausteine.js';
import { bildKnoten } from './bild.js';

// Mischt die Antworten, damit die richtige nicht immer am selben Platz steht.
// Die Reihenfolge hängt nur vom Text ab: Dieselbe Frage sieht jedes Mal gleich aus.
export function gemischt(optionen, schluessel) {
  const zahl = (text) => [...text].reduce((summe, zeichen) => (summe * 31 + zeichen.codePointAt(0)) % 100003, 7);
  return [...optionen].sort((a, b) => zahl(schluessel + a.id) - zahl(schluessel + b.id));
}

export function baueWahl({ aufgabe, t, sichtbar = null, auswahl = [], gesperrt = false }) {
  let gewaehlt = auswahl[0] ?? null;
  let zu = gesperrt;
  const knoepfe = new Map();
  const hinweisZumTeil = el('p', { klasse: 'teil-hinweis', role: 'status' });

  function zeichne() {
    for (const [id, knoten] of knoepfe) {
      knoten.setAttribute('aria-pressed', String(id === gewaehlt));
      knoten.disabled = zu;
    }
  }

  const zuZeigen = aufgabe.optionen.filter((option) => !sichtbar || sichtbar.includes(option.id));
  const optionen = gemischt(zuZeigen, aufgabe.frage).map((option) => {
    const knoten = el('button', {
      type: 'button',
      klasse: 'baustein wahl',
      onclick: () => {
        gewaehlt = option.id;
        knoten.classList.remove('markiert');
        hinweisZumTeil.textContent = '';
        zeichne();
      },
    }, el('span', { klasse: 'baustein-zeichen', 'aria-hidden': 'true' }), el('span', { text: option.text }));
    knoepfe.set(option.id, knoten);
    return knoten;
  });

  const knoten = el('section', { klasse: 'karte werkbank', 'aria-label': t.frageEtikett },
    el('p', { klasse: 'etikett', text: t.frageEtikett }),
    el('p', { klasse: 'frage', text: aufgabe.frage }),
    aufgabe.bild ? bildKnoten(aufgabe.bild, aufgabe.bildText, 'bild-gross') : null,
    el('div', { klasse: 'bausteine' }, optionen),
    hinweisZumTeil);

  zeichne();

  return {
    knoten,
    auswahl: () => (gewaehlt ? [gewaehlt] : []),
    setze(ids) {
      gewaehlt = ids[0] ?? null;
      // Mit der gezeigten Lösung ist ein früherer Hinweis überholt.
      for (const k of knoepfe.values()) k.classList.remove('markiert');
      hinweisZumTeil.textContent = '';
      zeichne();
    },
    sperre() {
      zu = true;
      zeichne();
    },
    markiere(id, text) {
      for (const k of knoepfe.values()) k.classList.remove('markiert');
      knoepfe.get(id)?.classList.add('markiert');
      hinweisZumTeil.textContent = text;
    },
  };
}
