// «Am iPhone üben»: Schritt für Schritt auf nachgebauten Bildschirmen tippen, als ob man es selber macht.
// Was richtig ist und wann das Spiel hilft, steht in logik/ueben.js. Hier wird nur gezeichnet.
// Alle Texte kommen aus spiel/inhalte/de/texte.json (app.ueben… und konzepte[…].ueben).
// Der Übungsstand wird nicht gespeichert: Üben ist freiwillig und lässt sich jederzeit wiederholen.
import { el, fuelle, knopf, lupeFigur } from './bausteine.js';
import { bildKnoten } from './bild.js';
import { neueUebung, tippe, zeigeZiel, schrittZurueck, istTippbar, zielIndex } from '../logik/ueben.js';

// Knopf «Am iPhone üben» zu einem Thema. Hat das Thema keinen Ablauf, gibt es keinen Knopf.
// zurueck = { ziel, daten, text }: wohin der Zurück-Knopf der Übung führt und wie er heisst.
export function uebenKnopf(app, nav, konzeptId, zurueck, klasse = 'knopf-zweit') {
  const konzept = app.inhalte.texte.konzepte[konzeptId];
  if (!konzept?.ueben?.length) return null;
  const t = app.inhalte.texte.app;
  return el('button', {
    type: 'button',
    klasse: `${klasse} ueben-start`,
    text: t.uebenKnopf,
    'aria-label': fuelle(t.uebenKnopfName, { konzept: konzept.name }),
    onclick: () => nav.zu('ueben', { konzept: konzeptId, zurueck }),
  });
}

// Fasst Elemente mit gleicher «gruppe» direkt hintereinander zu einer Zeile zusammen.
function inZeilen(elemente) {
  const zeilen = [];
  elemente.forEach((element, index) => {
    const letzte = zeilen.at(-1);
    if (element.gruppe && letzte?.gruppe === element.gruppe) letzte.teile.push({ element, index });
    else zeilen.push({ gruppe: element.gruppe ?? null, teile: [{ element, index }] });
  });
  return zeilen;
}

// Inhalt eines Elements auf dem nachgebauten Bildschirm.
function elementInhalt(element, t) {
  switch (element.typ) {
    case 'schalter':
      return [
        el('span', { klasse: 'ueben-schalter-text', text: element.text }),
        el('span', { klasse: element.an ? 'ueben-schalter an' : 'ueben-schalter' },
          el('span', { klasse: 'ueben-schalter-bahn', 'aria-hidden': 'true' }, el('span', { klasse: 'ueben-schalter-knopf' })),
          el('span', { klasse: 'ueben-schalter-wert', text: element.an ? t.uebenAn : t.uebenAus })),
      ];
    case 'datei':
      return [el('span', { klasse: 'ueben-datei-zeichen', 'aria-hidden': 'true' }), el('span', { text: element.text })];
    case 'bild':
      return [bildKnoten(element.datei, element.text, 'ueben-foto'), el('span', { klasse: 'ueben-foto-text', text: element.text })];
    default:
      return [el('span', { text: element.text })];
  }
}

export function zeigeUeben(wurzel, app, nav, daten = {}) {
  const t = app.inhalte.texte.app;
  const konzept = app.inhalte.texte.konzepte[daten.konzept];
  const ablauf = konzept?.ueben;
  if (!ablauf?.length) {
    nav.zu('cafe');
    return;
  }
  const zurueck = daten.zurueck ?? { ziel: 'cafe', text: t.zurueck };
  const zurueckKnopf = (klasse) => knopf(zurueck.text, () => nav.zu(zurueck.ziel, zurueck.daten), klasse);

  let stand = neueUebung();
  let daneben = null; // Stelle, die zuletzt falsch angetippt wurde.

  const oben = el('div', { klasse: 'ueben-oben' });
  // Die Rückmeldung bleibt immer derselbe Knoten, damit Vorlesehilfen jede Änderung ansagen.
  const meldung = el('p', { klasse: 'ueben-meldung', role: 'status' });
  const unten = el('div', { klasse: 'ueben-unten' });
  let knoepfe = [];
  let anleitung = null;

  function setzeMeldung(text, art = '') {
    meldung.textContent = text;
    meldung.className = art ? `ueben-meldung ${art}` : 'ueben-meldung';
  }

  function tippeAn(index) {
    const vorher = stand;
    const { stand: neu, ergebnis } = tippe(stand, ablauf, index);
    stand = neu;
    if (ergebnis === 'falsch') {
      daneben = index;
      const hinweis = ablauf[vorher.schritt].hinweis ?? t.uebenFalsch;
      setzeMeldung(neu.gezeigt && !vorher.gezeigt ? `${hinweis} ${t.uebenGezeigt}` : hinweis, 'falsch');
      zeichne();
      knoepfe[neu.gezeigt ? zielIndex(ablauf[neu.schritt]) : index]?.focus();
      return;
    }
    daneben = null;
    if (ergebnis === 'richtig') {
      setzeMeldung(fuelle(t.uebenRichtig, { nr: neu.schritt + 1 }), 'richtig');
      zeichne();
      anleitung?.focus();
    } else if (ergebnis === 'fertig') {
      setzeMeldung('');
      zeichne();
      oben.querySelector('h2')?.focus();
    }
  }

  function telefon(bildschirm) {
    knoepfe = [];
    const zeilen = inZeilen(bildschirm.elemente).map(({ gruppe, teile }) => {
      const knoten = teile.map(({ element, index }) => {
        if (!istTippbar(element)) {
          const klasse = element.typ === 'nachricht' ? `ueben-nachricht von-${element.von ?? 'claude'}` : 'ueben-text';
          return el('p', { klasse, text: element.text });
        }
        const gezeigt = stand.gezeigt && element.ziel === true;
        const klassen = ['ueben-el', `ueben-${element.typ}`];
        if (element.leer) klassen.push('leer');
        if (element.rahmen) klassen.push('mit-rahmen');
        if (gezeigt) klassen.push('gezeigt');
        if (daneben === index && !gezeigt) klassen.push('daneben');
        const button = el('button', { type: 'button', klasse: klassen.join(' '), onclick: () => tippeAn(index) },
          elementInhalt(element, t),
          gezeigt ? el('span', { klasse: 'ueben-marke hier', text: t.uebenHier }) : null,
          daneben === index && !gezeigt ? el('span', { klasse: 'ueben-marke nicht', text: t.uebenDaneben }) : null);
        knoepfe[index] = button;
        return button;
      });
      return gruppe ? el('div', { klasse: `ueben-zeile zeile-${gruppe.replace(/\d+$/, '')}` }, knoten) : knoten;
    });
    const dunkel = bildschirm.app === 'Kamera';
    return el('div', {
      klasse: dunkel ? 'telefon ueben-telefon dunkel' : 'telefon ueben-telefon',
      role: 'group',
      'aria-label': fuelle(t.uebenTelefonName, { app: bildschirm.app, titel: bildschirm.titel }),
    },
    el('div', { klasse: 'telefon-kopf' },
      el('span', { klasse: 'ueben-app', text: bildschirm.app }),
      el('span', { klasse: 'telefon-titel', text: bildschirm.titel })),
    el('div', { klasse: 'ueben-flaechen' }, zeilen.flat()),
    el('p', { klasse: 'telefon-fuss', text: t.uebenNachgebaut }));
  }

  function zeichne() {
    if (stand.fertig) {
      knoepfe = [];
      anleitung = null;
      oben.replaceChildren(
        el('section', { klasse: 'karte feier' },
          lupeFigur(t.lupeName, true),
          el('h2', { tabindex: '-1', text: t.uebenFertigTitel }),
          el('p', { text: fuelle(t.uebenFertigText, { anzahl: ablauf.length }) }),
          el('p', { text: t.uebenFertigEcht })));
      unten.replaceChildren(el('div', { klasse: 'knopf-reihe' },
        zurueckKnopf('los'),
        knopf(t.uebenNochmals, () => {
          stand = neueUebung();
          setzeMeldung('');
          zeichne();
          anleitung?.focus();
        }, 'knopf-zweit')));
      return;
    }
    const bildschirm = ablauf[stand.schritt];
    anleitung = el('p', { klasse: 'ueben-anleitung', tabindex: '-1', text: bildschirm.anleitung });
    oben.replaceChildren(
      el('p', { klasse: 'etikett', text: fuelle(t.uebenSchritt, { nr: stand.schritt + 1, anzahl: ablauf.length }) }),
      anleitung,
    );
    unten.replaceChildren(
      telefon(bildschirm),
      el('div', { klasse: 'knopf-reihe' },
        stand.gezeigt ? null : knopf(t.uebenZeig, () => {
          stand = zeigeZiel(stand);
          daneben = null;
          setzeMeldung(t.uebenGezeigt);
          zeichne();
          knoepfe[zielIndex(ablauf[stand.schritt])]?.focus();
        }, 'knopf-zweit'),
        stand.schritt > 0 ? knopf(t.uebenZurueckSchritt, () => {
          stand = schrittZurueck(stand);
          daneben = null;
          setzeMeldung('');
          zeichne();
          anleitung?.focus();
        }, 'knopf-zweit') : null),
    );
  }

  zeichne();
  wurzel.append(
    el('nav', { klasse: 'leiste', 'aria-label': t.leisteName },
      zurueckKnopf('knopf-leise zurueck'),
      el('h1', { klasse: 'leiste-titel', text: t.uebenKnopf })),
    el('section', { klasse: 'karte ueben' },
      el('h2', { klasse: 'ueben-thema', text: konzept.name }),
      el('p', { klasse: 'klein', text: t.uebenInfo }),
      oben,
      meldung,
      unten),
  );
}
