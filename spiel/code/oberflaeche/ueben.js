// «Am iPhone üben»: Schritt für Schritt auf nachgebauten Bildschirmen tippen, als ob man es selber macht.
// Was richtig ist und wann das Spiel hilft, steht in logik/ueben.js. Hier wird nur gezeichnet.
// Alle Texte kommen aus spiel/inhalte/de/texte.json (app.ueben… und konzepte[…].ueben).
// Der Übungsstand wird nicht gespeichert: Üben ist freiwillig und lässt sich jederzeit wiederholen.
import { el, fuelle, knopf, lupeFigur } from './bausteine.js';
import { baueIphone } from './iphone.js';
import { neueUebung, tippe, zeigeZiel, schrittZurueck, zielIndex, uebungsListe } from '../logik/ueben.js';

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
    'aria-label': fuelle(t.uebenKnopfName, { konzept: konzept.uebenName ?? konzept.name }),
    onclick: () => nav.zu('ueben', { konzept: konzeptId, zurueck }),
  });
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
  let eingaben = {}; // Was in den Feldern des aktuellen Bildschirms steht. Gilt nur für diesen Bildschirm.
  let felder = [];

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
    const { stand: neu, ergebnis, ...pruefung } = tippe(stand, ablauf, index, eingaben);
    stand = neu;
    if (ergebnis === 'eingabe') {
      // Das Feld passt noch nicht: sagen, was fehlt. Der Bildschirm bleibt, der Text auch.
      const feld = ablauf[stand.schritt].elemente[pruefung.feld];
      let text = feld.art === 'ziffern' ? t.uebenZiffernLeer : t.uebenEingabeLeer;
      if (feld.art === 'ziffern' && !pruefung.leer) text = fuelle(t.uebenZiffernFalsch, { nummer: feld.vorschlag });
      else if (!pruefung.leer) text = fuelle(t.uebenEingabeFehlt, { woerter: pruefung.fehlt.map((wort) => `«${wort}»`).join(', ') });
      setzeMeldung(text, 'falsch');
      felder[pruefung.feld]?.focus?.();
      return;
    }
    if (ergebnis === 'falsch') {
      daneben = index;
      const hinweis = ablauf[vorher.schritt].hinweis ?? t.uebenFalsch;
      setzeMeldung(neu.gezeigt && !vorher.gezeigt ? `${hinweis} ${t.uebenGezeigt}` : hinweis, 'falsch');
      zeichne();
      knoepfe[neu.gezeigt ? zielIndex(ablauf[neu.schritt]) : index]?.focus();
      return;
    }
    daneben = null;
    eingaben = {};
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
    const gebaut = baueIphone(bildschirm, {
      t,
      gezeigt: stand.gezeigt,
      daneben,
      eingaben,
      beiTippen: tippeAn,
      beiEingabe: (index, wert) => { eingaben[index] = wert; },
      // Enter im Feld wirkt wie das Ziel (zum Beispiel «Senden»).
      beiEnter: () => tippeAn(zielIndex(bildschirm)),
    });
    knoepfe = gebaut.knoepfe;
    felder = gebaut.felder;
    return gebaut.knoten;
  }

  // Bei Feldern zum Schreiben: ein Beispiel, die wichtigen Wörter und «Für mich schreiben».
  function schreibHilfe(bildschirm) {
    const stellen = bildschirm.elemente.map((element, index) => ({ element, index })).filter(({ element }) => element.typ === 'eingabe');
    if (stellen.length === 0) return null;
    const ziffern = stellen.every(({ element }) => element.art === 'ziffern');
    const schreibeFuerMich = knopf(ziffern ? t.uebenFuerMichZiffern : t.uebenFuerMich, () => {
      for (const { element, index } of stellen) eingaben[index] = element.vorschlag;
      setzeMeldung(t.uebenGeschrieben);
      zeichne();
      knoepfe[zielIndex(bildschirm)]?.focus();
    }, 'knopf-zweit ueben-fuer-mich');
    if (ziffern) return el('div', { klasse: 'ueben-schreibhilfe' }, schreibeFuerMich);
    return el('div', { klasse: 'ueben-schreibhilfe' },
      stellen.map(({ element }) => el('div', { klasse: 'ueben-vorschlag' },
        el('p', { klasse: 'etikett', text: t.uebenVorschlag }),
        el('p', { klasse: 'ueben-vorschlag-text', text: `«${element.vorschlag}»` }),
        element.schluessel?.length
          ? el('p', { klasse: 'klein', text: fuelle(t.uebenWichtig, { woerter: element.schluessel.map((wort) => `«${wort}»`).join(', ') }) })
          : null)),
      schreibeFuerMich);
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
          eingaben = {};
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
      ...[schreibHilfe(bildschirm)].filter(Boolean),
      el('p', { klasse: 'ueben-app-name', text: fuelle(t.uebenAppName, { app: bildschirm.app }) }),
      telefon(bildschirm),
      el('p', { klasse: 'klein ueben-nachgebaut', text: t.uebenNachgebaut }),
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
          eingaben = {};
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
      el('h2', { klasse: 'ueben-thema', text: konzept.uebenName ?? konzept.name }),
      el('p', { klasse: 'etikett', text: fuelle(t.uebenThema, { name: konzept.name }) }),
      el('p', { klasse: 'klein', text: t.uebenInfo }),
      oben,
      meldung,
      unten),
  );
}

// Knopf zur Liste aller Übungen (in Hilfe und Einstellungen und im Spickzettel).
// zurueck = { ziel, daten, text }: wohin der Zurück-Knopf der Liste führt.
export function uebungenKnopf(app, nav, zurueck, klasse = 'knopf-zweit') {
  const t = app.inhalte.texte.app;
  return el('button', {
    type: 'button',
    klasse: `${klasse} uebungen-start`,
    text: t.uebungenKnopf,
    onclick: () => nav.zu('uebungen', { zurueck }),
  });
}

// Alle Übungen auf einen Blick, nach Besuchen geordnet. Jede geht jederzeit, auch vor dem Thema.
export function zeigeUebungen(wurzel, app, nav, daten = {}) {
  const { texte, auftraege } = app.inhalte;
  const t = texte.app;
  const zurueck = daten.zurueck ?? { ziel: 'einstellungen', daten: { fokus: 'uebungen' }, text: t.zurueckHilfe };
  const gruppen = uebungsListe(auftraege, texte.konzepte).map((gruppe) => el('section', { klasse: 'karte uebungen-gruppe' },
    el('h2', { text: gruppe.thema }),
    el('ul', { klasse: 'uebungen-liste' }, gruppe.konzepte.map((id) => {
      const konzept = texte.konzepte[id];
      return el('li', {},
        el('button', {
          type: 'button',
          klasse: 'knopf-zweit uebung-wahl',
          'data-konzept': id,
          onclick: () => nav.zu('ueben', { konzept: id, zurueck: { ziel: 'uebungen', daten: { zurueck, konzept: id }, text: t.uebungenZurueck } }),
        },
        el('span', { klasse: 'uebung-name', text: konzept.uebenName ?? konzept.name }),
        el('span', { klasse: 'uebung-zusatz', text: fuelle(t.uebungenSchritte, { anzahl: konzept.ueben.length }) })));
    }))));

  wurzel.append(
    el('nav', { klasse: 'leiste', 'aria-label': t.leisteName },
      knopf(zurueck.text, () => nav.zu(zurueck.ziel, zurueck.daten), 'knopf-leise zurueck'),
      el('h1', { klasse: 'leiste-titel', text: t.uebungenTitel })),
    el('p', { text: t.uebungenInfo }),
    ...gruppen,
  );

  // Zurück aus einer Übung: Der Knopf dieser Übung bekommt wieder den Fokus.
  if (daten.konzept) {
    const knopfDerUebung = wurzel.querySelector(`.uebung-wahl[data-konzept="${CSS.escape(daten.konzept)}"]`);
    setTimeout(() => {
      knopfDerUebung?.scrollIntoView({ block: 'center' });
      knopfDerUebung?.focus({ preventScroll: true });
    }, 0);
  }
}

// Nach dem Zurückkommen: einen Knopf wieder ins Bild holen und fokussieren.
export function fokussiereSpaeter(knoten) {
  if (!knoten) return;
  setTimeout(() => {
    knoten.scrollIntoView({ block: 'center' });
    knoten.focus({ preventScroll: true });
  }, 0);
}
