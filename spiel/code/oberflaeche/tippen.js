// Die Übungsform «Antippen»: ein vereinfacht nachgebauter iPhone-Bildschirm.
// Der Spieler tippt die richtige Stelle an. Eine falsche Stelle zeigt, was in echt passieren würde.
// Bietet dieselben Funktionen wie die Werkbank, damit der Rundenablauf alle Formen gleich behandelt.
import { el } from './bausteine.js';
import { bildKnoten } from './bild.js';

export function baueTippen({ aufgabe, t, sichtbar = null, auswahl = [], gesperrt = false }) {
  let gewaehlt = auswahl[0] ?? null;
  let zu = gesperrt;
  const knoepfe = new Map();
  const hinweisZumTeil = el('p', { klasse: 'teil-hinweis', role: 'status' });
  const bildschirm = aufgabe.bildschirm ?? {};

  function zeichne() {
    for (const [id, knoten] of knoepfe) {
      knoten.setAttribute('aria-pressed', String(id === gewaehlt));
      knoten.disabled = zu;
    }
  }

  // Die Flächen stehen in der Reihenfolge der Daten, wie auf einem echten Bildschirm.
  const flaechen = aufgabe.flaechen
    .filter((flaeche) => !sichtbar || sichtbar.includes(flaeche.id))
    .map((flaeche) => {
      const knoten = el('button', {
        type: 'button',
        klasse: `flaeche flaeche-${flaeche.art ?? 'zeile'}`,
        onclick: () => {
          gewaehlt = flaeche.id;
          knoten.classList.remove('markiert');
          hinweisZumTeil.textContent = '';
          zeichne();
        },
      },
      flaeche.bild ? bildKnoten(flaeche.bild, flaeche.bildText ?? '', 'flaeche-bild') : null,
      el('span', { klasse: 'flaeche-text', text: flaeche.text }),
      flaeche.zusatz ? el('span', { klasse: 'flaeche-zusatz', text: flaeche.zusatz }) : null);
      knoepfe.set(flaeche.id, knoten);
      return knoten;
    });

  const telefon = el('div', { klasse: `telefon anordnung-${bildschirm.anordnung ?? 'liste'}`, role: 'group', 'aria-label': t.telefonName },
    el('div', { klasse: 'telefon-kopf' },
      el('span', { klasse: 'telefon-titel', text: bildschirm.titel ?? '' })),
    (bildschirm.zeilen ?? []).map((zeile) => el('p', { klasse: 'telefon-zeile', text: zeile })),
    el('div', { klasse: 'telefon-flaechen' }, flaechen),
    el('p', { klasse: 'telefon-fuss', text: t.nachgebaut }));

  const knoten = el('section', { klasse: 'karte werkbank', 'aria-label': t.frageEtikett },
    el('p', { klasse: 'etikett', text: t.tippenEtikett }),
    el('p', { klasse: 'frage', text: aufgabe.frage }),
    telefon,
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
