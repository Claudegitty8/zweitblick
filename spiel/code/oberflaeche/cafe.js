// Das Café: Startbildschirm mit dem nächsten Besuch, allen Besuchen und der Meisterschaft.
// Dazu die Land-Wahl, die vor dem ersten Besuch kommt.
import { el, fuelle, knopf, lupeFigur, punkte, hauptnavigation, arztHinweisKarte } from './bausteine.js';
import { starteAuftrag } from '../logik/ablauf.js';
import { erfolge, neuerFortschritt } from '../logik/meisterschaft.js';
import { sprungStatus } from '../logik/extras.js';
import { umfrageKarte } from './extras.js';
import { geraetHinweise } from './hinweise.js';

const SVG = 'http://www.w3.org/2000/svg';

function svg(tag, eigenschaften = {}, ...kinder) {
  const knoten = document.createElementNS(SVG, tag);
  for (const [name, wert] of Object.entries(eigenschaften)) knoten.setAttribute(name, String(wert));
  knoten.append(...kinder);
  return knoten;
}

// Das Café als kleines Bild: ein Tisch pro Besuch. Besetzte Tische haben Gäste und Tassen.
function cafeBild(t, anzahl, besetzt) {
  const breite = 60 * anzahl + 20;
  const bild = svg('svg', { viewBox: `0 0 ${breite} 90`, class: 'cafe-bild', role: 'img', 'aria-label': fuelle(t.cafeBild, { besetzt, anzahl }) });
  bild.append(svg('rect', { x: 0, y: 70, width: breite, height: 20, class: 'cafe-boden' }));
  for (let i = 0; i < anzahl; i += 1) {
    const x = 40 + i * 60;
    const voll = i < besetzt;
    const gruppe = svg('g', { class: voll ? 'tisch besetzt' : 'tisch' });
    if (voll) {
      gruppe.append(svg('circle', { cx: x - 16, cy: 34, r: 8, class: 'gast-kopf' }));
      gruppe.append(svg('rect', { x: x - 24, y: 43, width: 16, height: 22, rx: 6, class: 'gast-koerper' }));
    }
    gruppe.append(svg('rect', { x: x - 14, y: 50, width: 28, height: 5, rx: 2, class: 'tisch-platte' }));
    gruppe.append(svg('rect', { x: x - 2, y: 55, width: 4, height: 15, class: 'tisch-bein' }));
    if (voll) gruppe.append(svg('rect', { x: x + 2, y: 42, width: 9, height: 8, rx: 2, class: 'tasse' }));
    bild.append(gruppe);
  }
  return bild;
}

function rundenName(runde, texte) {
  return runde.konzept ? texte.konzepte[runde.konzept].name : runde.titel;
}

export function zeigeCafe(wurzel, app, nav, daten) {
  if (!app.stand.einstellungen.land) {
    nav.zu('land');
    return;
  }
  const { texte, regeln, auftraege } = app.inhalte;
  const t = texte.app;
  const { stand } = app;
  const auftrag = app.auftrag(); // laufender oder nächster Besuch, null wenn alle erledigt sind
  const laeuft = Boolean(stand.lauf);
  const noetig = regeln.erfolgeFuerMeisterschaft;

  let gruss = t.lupeNeu;
  if (!auftrag) gruss = t.lupeFertig;
  else if (laeuft) gruss = t.lupeLaeuft;
  else if (stand.erledigt.length > 0) gruss = t.lupeNaechster;
  if (daten?.gruss) gruss = daten.gruss;

  // --- Der nächste Besuch ---
  const besuchKarte = el('section', { klasse: 'karte gast' }, el('p', { klasse: 'etikett', text: t.besuchEtikett }));
  if (!auftrag) {
    besuchKarte.append(el('p', { text: t.allesFertig }));
  } else {
    const aktuelle = laeuft ? stand.lauf.runde : -1;
    besuchKarte.append(...[
      el('h2', { text: auftrag.gast }),
      el('p', { klasse: 'wunsch', text: `«${auftrag.wunsch}»` }),
      el('p', { klasse: 'klein', text: t.besuchRunden }),
      el('ol', { klasse: 'runden' }, auftrag.runden.map((runde, index) => el('li', {
        klasse: index < aktuelle ? 'geschafft' : index === aktuelle ? 'aktuell' : null,
        'aria-current': index === aktuelle ? 'step' : null,
        text: rundenName(runde, texte),
      }))),
      knopf(laeuft ? t.weiterUeben : t.besuchStarten, () => {
        if (!laeuft) app.setze(starteAuftrag(app.stand, auftrag, regeln, auftraege));
        nav.zu('runde');
      }, 'los'),
      // Wer schon Vorwissen hat, kann vor dem Start abkürzen.
      !laeuft && auftrag.runden.some((runde) => runde.konzept)
        ? knopf(t.schnelltestKnopf, () => nav.zu('schnelltest'), 'knopf-zweit')
        : null,
      // Ganz am Anfang: Wer schon weiter war (anderes Gerät, Stand verloren), findet hier das Springen.
      !laeuft && stand.erledigt.length === 0
        ? knopf(t.sprungHinweis, () => nav.zu('einstellungen', { springen: true }), 'knopf-leise')
        : null,
    ].filter(Boolean));
  }

  // --- Alle Besuche mit Stand ---
  const status = sprungStatus(stand, auftraege);
  const statusText = { erledigt: t.besuchErledigt, dran: t.besuchDran, ziel: t.besuchKommt, offen: t.besuchKommt };
  const alle = el('section', { klasse: 'karte' },
    el('h2', { klasse: 'etikett', text: t.alleBesucheEtikett }),
    el('ol', { klasse: 'besuch-liste' }, auftraege.map((a, stelle) => el('li', { klasse: `besuch-${status[stelle].status}` },
      el('span', { klasse: 'besuch-name', text: `${a.gast}: ${a.thema}` }),
      el('span', { klasse: 'besuch-status', text: statusText[status[stelle].status] })))));

  // --- Meisterschaft: alle Konzepte, die schon vorgekommen sind oder gerade dran sind ---
  const sichtbar = auftraege.filter((a) => stand.erledigt.includes(a.id) || a === auftrag);
  const konzepte = sichtbar.flatMap((a) => a.runden).filter((runde) => runde.konzept);
  const meisterschaft = konzepte.length === 0 ? null : el('section', { klasse: 'karte' },
    el('h2', { klasse: 'etikett', text: t.meisterschaftEtikett }),
    el('ul', { klasse: 'meister-liste' }, konzepte.map((runde) => {
      const anzahl = Math.min(noetig, erfolge(stand.fortschritt[runde.konzept] ?? neuerFortschritt()));
      return el('li', {}, el('span', { text: texte.konzepte[runde.konzept].name }), punkte(anzahl, noetig, t.punkteLabel));
    })));

  wurzel.append(...[
    el('header', { klasse: 'kopf' },
      el('h1', { text: t.titel }),
      el('p', { text: t.untertitel })),
    hauptnavigation(t, nav, 'cafe'),
    cafeBild(t, auftraege.length, stand.erledigt.length),
    el('div', { klasse: 'lupe-zeile' }, lupeFigur(t.lupeName, !auftrag), el('p', { klasse: 'sprechblase', text: gruss })),
    besuchKarte,
    arztHinweisKarte(t),
    umfrageKarte(app, nav),
    ...geraetHinweise(t),
    alle,
    meisterschaft,
    el('p', { klasse: 'notruf-zeile', text: t.notrufZeile }),
    el('footer', { klasse: 'fuss', text: t.fuss }),
  ].filter(Boolean));
}

// Vor dem ersten Besuch: Schweiz oder Deutschland? Lässt sich in den Einstellungen ändern.
export function zeigeLand(wurzel, app, nav) {
  const t = app.inhalte.texte.app;
  const waehle = (land) => {
    app.setzeLand(land);
    nav.zu('cafe');
  };
  wurzel.append(
    el('header', { klasse: 'kopf' }, el('h1', { text: t.titel }), el('p', { text: t.untertitel })),
    el('div', { klasse: 'lupe-zeile' }, lupeFigur(t.lupeName), el('p', { klasse: 'sprechblase', text: t.lupeWillkommen })),
    el('section', { klasse: 'karte' },
      el('h2', { text: t.landFrage }),
      el('p', { text: t.landInfo }),
      el('div', { klasse: 'knopf-reihe senkrecht' },
        knopf(t.landName.ch, () => waehle('ch'), 'los'),
        knopf(t.landName.de, () => waehle('de'), 'los')),
      el('p', { klasse: 'klein', text: t.landSpaeter })),
    arztHinweisKarte(t),
    el('footer', { klasse: 'fuss', text: t.fuss }),
  );
}
