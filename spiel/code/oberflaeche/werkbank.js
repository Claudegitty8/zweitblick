// Die Werkbank: Hier steckt der Spieler seine Nachricht an Lupe aus Teilen zusammen.
// Sie kennt keine Spielregeln. Sie zeigt nur an und meldet die Auswahl.
import { el } from './bausteine.js';
import { bildKnoten } from './bild.js';
import { baueWahl } from './wahl.js';
import { baueReihe } from './reihe.js';
import { baueTippen } from './tippen.js';
import { ARTEN, baueNachricht, baueAnweisung, baueAnhaenge, hatAnweisung, hatAnhaenge } from '../logik/prompt.js';

// Wählt zur Aufgabe die passende Übungsform: Zusammenstecken, Vorhersagen, Sortieren oder Antippen.
export function baueUebung(optionen) {
  const { typ } = optionen.aufgabe;
  if (typ === 'wahl') return baueWahl(optionen);
  if (typ === 'reihe') return baueReihe(optionen);
  if (typ === 'tippen') return baueTippen(optionen);
  return baueWerkbank(optionen);
}

// Vorhersagen, Sortieren und Antippen sind Fragen, keine Nachricht an Lupe.
export function istFrage(aufgabe) {
  return ['wahl', 'reihe', 'tippen'].includes(aufgabe.typ);
}

export function baueWerkbank({ aufgabe, t, sichtbar = null, vorgabe = [], auswahl = [], gesperrt = false }) {
  const gewaehlt = new Set([...vorgabe, ...auswahl]);
  const fest = new Set(vorgabe);
  const knoepfe = new Map();
  let allesGesperrt = gesperrt;

  const mitAnweisung = hatAnweisung(aufgabe);
  const mitAnhaengen = hatAnhaenge(aufgabe);
  const anweisungVorschau = el('p', { klasse: 'nachricht anweisung' });
  const anhangListe = el('ul', { klasse: 'anhaenge' });
  const vorschau = el('p', { klasse: 'nachricht' });
  const hinweisZumTeil = el('p', { klasse: 'teil-hinweis', role: 'status' });

  function zeichne() {
    vorschau.textContent = baueNachricht(aufgabe, [...gewaehlt]);
    anweisungVorschau.textContent = baueAnweisung(aufgabe, [...gewaehlt]) || t.anweisungLeer;
    const anhaenge = baueAnhaenge(aufgabe, [...gewaehlt]);
    anhangListe.replaceChildren(...(anhaenge.length > 0
      ? anhaenge.map((text) => el('li', { klasse: 'anhang', text }))
      : [el('li', { klasse: 'anhang leer', text: t.anhangLeer })]));
    for (const [id, knoten] of knoepfe) {
      knoten.setAttribute('aria-pressed', String(gewaehlt.has(id)));
      knoten.disabled = allesGesperrt || fest.has(id);
    }
  }

  const teile = aufgabe.teile.filter((teil) => !sichtbar || sichtbar.includes(teil.id) || fest.has(teil.id));
  const gruppen = ARTEN.map((art) => {
    const derArt = teile.filter((teil) => teil.art === art);
    if (derArt.length === 0) return null;
    return el('div', { klasse: 'teil-gruppe' },
      el('p', { klasse: 'etikett', text: t.art[art] }),
      derArt.map((teil) => {
        const knoten = el('button', {
          type: 'button',
          klasse: `baustein art-${teil.art}`,
          onclick: () => {
            if (gewaehlt.has(teil.id)) gewaehlt.delete(teil.id);
            else gewaehlt.add(teil.id);
            knoten.classList.remove('markiert');
            hinweisZumTeil.textContent = '';
            zeichne();
          },
        }, el('span', { klasse: 'baustein-zeichen', 'aria-hidden': 'true' }),
        teil.bild ? bildKnoten(teil.bild, teil.bildText ?? '', 'bild-klein') : null,
        el('span', { text: teil.text }));
        knoepfe.set(teil.id, knoten);
        return knoten;
      }));
  });

  const knoten = el('section', { klasse: 'karte werkbank', 'aria-label': t.werkbankName },
    mitAnweisung ? el('p', { klasse: 'etikett', text: t.anweisungEtikett }) : null,
    mitAnweisung ? anweisungVorschau : null,
    mitAnhaengen ? el('p', { klasse: 'etikett', text: t.anhangEtikett }) : null,
    mitAnhaengen ? anhangListe : null,
    el('p', { klasse: 'etikett', text: t.nachrichtEtikett }),
    vorschau,
    teile.length > 0 && !gesperrt ? el('p', { klasse: 'klein', text: t.teileHilfe }) : null,
    gruppen,
    hinweisZumTeil);

  zeichne();

  return {
    knoten,
    auswahl: () => aufgabe.teile.filter((teil) => gewaehlt.has(teil.id)).map((teil) => teil.id),
    setze(ids) {
      gewaehlt.clear();
      for (const id of ids) gewaehlt.add(id);
      // Mit der gezeigten Lösung ist ein früherer Hinweis überholt.
      for (const k of knoepfe.values()) k.classList.remove('markiert');
      hinweisZumTeil.textContent = '';
      zeichne();
    },
    sperre() {
      allesGesperrt = true;
      zeichne();
    },
    markiere(id, text) {
      for (const k of knoepfe.values()) k.classList.remove('markiert');
      knoepfe.get(id)?.classList.add('markiert');
      hinweisZumTeil.textContent = text;
    },
  };
}
