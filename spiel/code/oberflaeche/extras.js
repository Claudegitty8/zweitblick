// Zusätze: Schnelltest, freiwillige Fragen, Daumen.
// Die Regeln dazu stehen in logik/extras.js.
import { el, fuelle, knopf, lupeFigur, leiste } from './bausteine.js';
import { baueUebung, istFrage } from './werkbank.js';
import {
  starteSchnelltest, laufenderSchnelltest, verbucheSchnelltest, verbucheUmfrage, verbucheDaumen,
} from '../logik/extras.js';

// --- Schnelltest: «Das kann ich schon» ---

export function zeigeSchnelltest(wurzel, app, nav, daten = {}) {
  const { texte, regeln } = app.inhalte;
  const t = texte.app;
  const auftrag = app.auftrag();
  if (!auftrag || app.stand.lauf) {
    nav.zu('cafe');
    return;
  }
  const ergebnisse = daten.ergebnisse ?? [];
  wurzel.append(leiste(t, nav, t.schnelltestTitel));

  // Einstieg: erklären, was passiert.
  if (!daten.laeuft) {
    wurzel.append(
      el('section', { klasse: 'karte' },
        el('h2', { text: t.schnelltestKnopf }),
        el('p', { text: t.schnelltestInfo })),
      knopf(t.schnelltestStart, () => {
        // Jeder Start bringt andere Aufgaben als der letzte (E-048).
        app.setze(starteSchnelltest(app.stand, auftrag, regeln));
        nav.zu('schnelltest', { laeuft: true, ergebnisse: [] });
      }, 'los'));
    return;
  }
  const reihe = laufenderSchnelltest(app.stand, auftrag, regeln);

  // Schluss: gutschreiben und zeigen, was übersprungen wird.
  if (ergebnisse.length >= reihe.length) {
    const { stand, bestanden } = verbucheSchnelltest(app.stand, auftrag, regeln, ergebnisse);
    app.setze(stand);
    const konzepte = auftrag.runden.filter((runde) => runde.konzept).map((runde) => runde.konzept);
    wurzel.append(
      el('section', { klasse: 'karte' },
        el('h2', { text: t.schnelltestErgebnis }),
        el('ul', { klasse: 'ergebnis-liste' }, konzepte.map((konzept) => el('li', {},
          el('strong', { text: `${texte.konzepte[konzept].name} ` }),
          el('span', { text: bestanden.includes(konzept) ? t.schnelltestBestanden : t.schnelltestOffen }))))),
      knopf(t.zumCafe, () => nav.zu('cafe'), 'los'));
    return;
  }

  const { konzept, aufgabe: aufgabeId } = reihe[ergebnisse.length];
  const aufgabe = auftrag.aufgaben[aufgabeId];
  const istWahl = istFrage(aufgabe);
  const werkbank = baueUebung({ aufgabe, t });
  const lupe = lupeFigur(t.lupeName);
  const sprechblase = el('p', { klasse: 'sprechblase', text: istWahl ? t.lupeFrage : t.lupeBereit });
  const status = el('p', { klasse: 'status' });
  const aktionen = el('div', { klasse: 'aktionen' });

  const pruefen = knopf(istWahl ? t.antworten : t.los, async () => {
    if (istWahl && werkbank.auswahl().length === 0) {
      status.textContent = aufgabe.typ === 'tippen' ? t.tippeZuerst : t.waehleZuerst;
      return;
    }
    const antwort = await app.ki.antworte({ aufgabe, auswahl: werkbank.auswahl(), versuch: 0 });
    werkbank.sperre();
    pruefen.hidden = true;
    sprechblase.textContent = antwort.text;
    lupe.classList.toggle('froh', antwort.ok);
    status.textContent = antwort.ok ? t.schnelltestRichtig : t.schnelltestFalsch;
    const neu = [...ergebnisse, { konzept, aufgabe: aufgabeId, richtig: antwort.ok }];
    aktionen.replaceChildren(knopf(t.weiter, () => nav.zu('schnelltest', { laeuft: true, ergebnisse: neu }), 'los'));
  }, 'los');

  wurzel.append(
    el('p', { klasse: 'etikett', text: `${fuelle(t.schnelltestZaehler, { nr: ergebnisse.length + 1, anzahl: reihe.length })} · ${texte.konzepte[konzept].name}` }),
    el('section', { klasse: 'karte auftrag' },
      el('p', { klasse: 'etikett', text: auftrag.gast }),
      el('p', { klasse: 'wunsch', text: `«${aufgabe.wunsch}»` })),
    werkbank.knoten,
    pruefen,
    el('section', { klasse: 'karte ergebnis', role: 'status' }, el('div', { klasse: 'lupe-zeile' }, lupe, sprechblase), status),
    aktionen);
}

// --- Freiwillige Fragen vor und nach dem Spiel ---

export function zeigeUmfrage(wurzel, app, nav, { wann, antworten = {} }) {
  const { texte, umfrage } = app.inhalte;
  const t = texte.app;
  const nr = Object.keys(antworten).length;
  wurzel.append(leiste(t, nav, wann === 'vorher' ? t.umfrageVorherTitel : t.umfrageNachherTitel));

  if (nr >= umfrage.length) {
    app.setze(verbucheUmfrage(app.stand, wann, antworten, umfrage));
    wurzel.append(
      el('section', { klasse: 'karte' }, el('p', { text: wann === 'vorher' ? t.umfrageDanke : umfrageText(t, app.stand) })),
      knopf(t.zumCafe, () => nav.zu('cafe'), 'los'));
    return;
  }

  const frage = umfrage[nr];
  const waehle = (id) => nav.zu('umfrage', { wann, antworten: { ...antworten, [frage.id]: id } });
  wurzel.append(
    el('p', { klasse: 'etikett', text: fuelle(t.umfrageZaehler, { nr: nr + 1, anzahl: umfrage.length }) }),
    el('section', { klasse: 'karte' },
      el('h2', { text: frage.frage }),
      frage.optionen.map((option) => el('button', { type: 'button', klasse: 'baustein wahl', onclick: () => waehle(option.id) },
        el('span', { klasse: 'baustein-zeichen', 'aria-hidden': 'true' }), el('span', { text: option.text }))),
      knopf(t.umfrageWeissNicht, () => waehle('weissnicht'), 'knopf-zweit')));
}

function umfrageText(t, stand) {
  const { vorher, nachher } = stand.umfrage ?? {};
  if (!nachher) return '';
  return vorher
    ? fuelle(t.umfrageErgebnis, { vorher: vorher.richtig, nachher: nachher.richtig, anzahl: nachher.von })
    : fuelle(t.umfrageNurNachher, { nachher: nachher.richtig, anzahl: nachher.von });
}

// Karte im Café: vor dem ersten Besuch und nach dem letzten. Immer freiwillig.
export function umfrageKarte(app, nav) {
  const t = app.inhalte.texte.app;
  const { stand } = app;
  const umfrage = stand.umfrage ?? {};
  const amAnfang = stand.erledigt.length === 0 && !stand.lauf && !umfrage.vorher;
  const amEnde = !app.auftrag() && !umfrage.nachher;
  if (amAnfang || amEnde) {
    const wann = amAnfang ? 'vorher' : 'nachher';
    return el('section', { klasse: 'karte' },
      el('p', { klasse: 'etikett', text: amAnfang ? t.umfrageVorherTitel : t.umfrageNachherTitel }),
      el('p', { text: amAnfang ? t.umfrageVorherText : t.umfrageNachherText }),
      knopf(t.umfrageStart, () => nav.zu('umfrage', { wann }), 'knopf-zweit'));
  }
  if (umfrage.nachher) {
    return el('section', { klasse: 'karte' },
      el('p', { klasse: 'etikett', text: t.umfrageNachherTitel }),
      el('p', { text: umfrageText(t, stand) }));
  }
  return null;
}

// --- Daumen am Ende eines Besuchs ---

export function daumenKarte(app, auftrag) {
  const t = app.inhalte.texte.app;
  const dank = el('p', { klasse: 'klein', role: 'status' });
  const waehle = (hoch) => () => {
    app.setze(verbucheDaumen(app.stand, auftrag.id, hoch));
    reihe.hidden = true;
    dank.textContent = t.daumenDanke;
  };
  const reihe = el('div', { klasse: 'knopf-reihe' }, knopf(t.daumenHoch, waehle(true), 'knopf-zweit'), knopf(t.daumenRunter, waehle(false), 'knopf-zweit'));
  return el('section', { klasse: 'karte' }, el('p', { text: t.daumenFrage }), reihe, dank);
}
