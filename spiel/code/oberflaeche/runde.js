// Zeigt den aktuellen Schritt einer Runde: Probieren, Aha, Beispiel, Lücke, Frei,
// Mischrunde oder Wiederholung. Die Regeln dazu stehen in logik/ablauf.js.
import { el, fuelle, knopf, lupeFigur, punkte, leiste } from './bausteine.js';
import { beispielBild } from './bild.js';
import { baueUebung, istFrage } from './werkbank.js';
import {
  ansicht, weiter, verbucheFrei, verbucheWiederholungsErgebnis, SCHRITTE, auswegOffen, ueberspringeRunde,
} from '../logik/ablauf.js';
import { hilfeTeil } from '../logik/bewertung.js';
import { erfolge, neuerFortschritt } from '../logik/meisterschaft.js';
import { daumenKarte } from './extras.js';

function schrittReihe(t, aktuell) {
  return el('ol', { klasse: 'schritte', 'aria-label': t.schritteName }, SCHRITTE.map((schritt) => el('li', {
    klasse: schritt === aktuell ? 'aktuell' : null,
    'aria-current': schritt === aktuell ? 'step' : null,
    text: t.schritt[schritt],
  })));
}

export function zeigeRunde(wurzel, app, nav) {
  const auftrag = app.auftrag();
  const a = auftrag ? ansicht(app.stand, auftrag) : { art: 'cafe' };
  if (a.art === 'cafe') {
    nav.zu('cafe');
    return;
  }
  const t = app.inhalte.texte.app;
  wurzel.append(leiste(t, nav, fuelle(t.rundeEtikett, { nr: a.rundenNr, anzahl: auftrag.runden.length })));
  if (a.art === 'aha') zeigeAha(wurzel, app, nav, a, auftrag);
  else zeigeAufgabe(wurzel, app, nav, a, auftrag);
}

// Die «So ist es in echt»-Karte: die Schritte in der echten Claude-App, mit Stand.
export function echtKarte(app, konzeptId) {
  const { texte } = app.inhalte;
  const t = texte.app;
  const konzept = texte.konzepte[konzeptId];
  return el('section', { klasse: 'karte echt' },
    el('p', { klasse: 'etikett', text: t.echtEtikett }),
    el('h3', { text: konzept.name }),
    el('ol', { klasse: 'echt-schritte' }, (konzept.echt ?? []).map((schritt) => el('li', { text: schritt }))),
    el('p', { klasse: 'klein', text: t.echtStand }));
}

function zeigeAha(wurzel, app, nav, a, auftrag) {
  const { texte, lexikon } = app.inhalte;
  const t = texte.app;
  const konzept = texte.konzepte[a.konzept];
  wurzel.append(
    schrittReihe(t, 'aha'),
    el('section', { klasse: 'karte aha' },
      el('p', { klasse: 'etikett', text: t.schritt.aha }),
      el('h2', { text: konzept.name }),
      konzept.aha.map((satz) => el('p', { text: satz })),
      konzept.bilder?.length ? el('div', { klasse: 'beispiel-bilder' }, konzept.bilder.map((bild) => beispielBild(bild, t))) : null,
      el('div', { klasse: 'merkbild' },
        el('p', { klasse: 'etikett', text: t.ahaAnalogie }),
        el('p', { text: konzept.analogie })),
      el('p', { klasse: 'klein', text: fuelle(t.ahaLexikon, { begriff: lexikon[a.konzept].begriff }) })),
    knopf(t.ahaWeiter, () => {
      app.setze(weiter(app.stand, auftrag));
      nav.zu('runde');
    }, 'los'),
  );
}

function zeigeAufgabe(wurzel, app, nav, a, auftrag) {
  const { texte, regeln } = app.inhalte;
  const t = texte.app;
  // Eine Wiederholung kann aus einem früheren Besuch stammen.
  const quelle = app.inhalte.auftraege.find((x) => x.id === a.aufgabeVon) ?? auftrag;
  const aufgabe = quelle.aufgaben[a.aufgabeId];
  const art = a.art;
  const mitHilfeKnopf = art === 'luecke' || art === 'frei' || art === 'misch';
  const noetig = regeln.erfolgeFuerMeisterschaft;

  let versuche = 0;
  let fehlschlaege = 0;
  let hilfeStufe = 0;

  const istWahl = istFrage(aufgabe);
  const werkbank = baueUebung({
    aufgabe,
    t,
    sichtbar: a.nurTeile ?? null,
    vorgabe: a.vorgabe ?? [],
    auswahl: art === 'beispiel' ? aufgabe.loesung : [],
    gesperrt: art === 'beispiel',
  });

  // --- Kopf: Wo bin ich? ---
  const kopf = [];
  if (art === 'frei') {
    const stand = erfolge(app.stand.fortschritt[a.konzept] ?? neuerFortschritt());
    kopf.push(schrittReihe(t, 'frei'));
    kopf.push(el('p', { klasse: 'meister-zeile' },
      el('span', { text: texte.konzepte[a.konzept].name }), punkte(Math.min(stand, noetig), noetig, t.punkteLabel)));
  } else if (art === 'misch') {
    const gesamt = a.runde.frei.length;
    const nr = gesamt - app.stand.lauf.reihe.length + 1;
    kopf.push(el('p', { klasse: 'etikett', text: `${t.schritt.misch} · ${fuelle(t.situationZaehler, { nr, anzahl: gesamt })}` }));
  } else if (art === 'wiederholung') {
    kopf.push(el('p', { klasse: 'etikett', text: fuelle(t.wiederholungEtikett, { konzept: texte.konzepte[a.konzept].name }) }));
  } else {
    kopf.push(schrittReihe(t, art));
  }
  const hilfeZumSchritt = (istWahl && t.schrittHilfeFrage[art]) || t.schrittHilfe[art];
  if (hilfeZumSchritt) kopf.push(el('p', { klasse: 'klein', text: fuelle(hilfeZumSchritt, { anzahl: noetig }) }));

  // Hinweis und Ausweg, wenn freie Situationen immer wieder nicht zählen.
  if (art === 'frei' && a.schonGesehen) kopf.push(el('p', { klasse: 'hinweis schon-gesehen', text: t.schonGesehen }));
  if (art === 'frei' && auswegOffen(app.stand, auftrag, regeln)) {
    kopf.push(el('section', { klasse: 'karte ausweg' },
      el('p', { text: fuelle(t.auswegText, { konzept: texte.konzepte[a.konzept].name }) }),
      knopf(t.auswegKnopf, () => {
        const { stand, ereignis } = ueberspringeRunde(app.stand, auftrag, regeln, app.inhalte.auftraege);
        app.setze(stand);
        nav.zu('zwischen', { ereignis, konzept: a.konzept, titel: a.runde?.titel, auftrag });
      }, 'knopf-zweit')));
  }

  // --- Ergebnis ---
  const lupe = lupeFigur(t.lupeName);
  const sprechblase = el('p', { klasse: 'sprechblase', text: istWahl ? t.lupeFrage : t.lupeBereit });
  const hinweis = el('p', { klasse: 'hinweis' });
  const status = el('p', { klasse: 'status' });
  const hilfeText = el('p', { klasse: 'hilfe-text', role: 'status' });
  const aktionen = el('div', { klasse: 'aktionen' });
  const ergebnis = el('section', { klasse: 'karte ergebnis', role: 'status', 'aria-live': 'polite' },
    el('div', { klasse: 'lupe-zeile' }, lupe, sprechblase), hinweis, status);

  function weiterSchritt() {
    app.setze(weiter(app.stand, auftrag));
    nav.zu('runde');
  }

  function schliesseAb(resultat) {
    const { stand, ereignis } = verbucheFrei(app.stand, auftrag, regeln, resultat, app.inhalte.auftraege);
    app.setze(stand);
    if (ereignis === 'weiter') nav.zu('runde');
    else nav.zu('zwischen', { ereignis, konzept: a.konzept, titel: a.runde?.titel, auftrag });
  }

  function fertig(...knoepfe) {
    werkbank.sperre();
    los.hidden = true;
    hilfeKnopf.hidden = true;
    aktionen.replaceChildren(...knoepfe);
  }

  const los = knopf(istWahl ? t.antworten : t.los, async () => {
    if (istWahl && werkbank.auswahl().length === 0) {
      status.textContent = aufgabe.typ === 'tippen' ? t.tippeZuerst : t.waehleZuerst;
      return;
    }
    los.disabled = true;
    const antwort = await app.ki.antworte({ aufgabe, auswahl: werkbank.auswahl(), versuch: versuche });
    versuche += 1;
    if (!antwort.ok) fehlschlaege += 1;
    sprechblase.textContent = antwort.text;
    hinweis.textContent = antwort.ok ? antwort.hinweis ?? t.gelungen : antwort.hinweis;
    hinweis.className = antwort.ok ? 'hinweis gut' : 'hinweis';
    lupe.classList.toggle('froh', antwort.ok);
    status.textContent = '';
    los.disabled = false;

    if (art === 'probieren') {
      fertig(knopf(t.wasPassiert, weiterSchritt, 'los'));
    } else if (art === 'beispiel') {
      fertig(knopf(t.beispielWeiter, weiterSchritt, 'los'));
    } else if (art === 'luecke') {
      if (antwort.ok) fertig(knopf(t.weiter, weiterSchritt, 'los'));
      else status.textContent = t.nochmalLuecke;
    } else if (art === 'frei') {
      if (antwort.ok) {
        // Für die Meisterschaft zählt nur: beim ersten Versuch und höchstens mit dem Tipp.
        const zaehlt = versuche === 1 && hilfeStufe < 2;
        status.textContent = zaehlt ? t.gezaehlt : t.nichtGezaehlt;
        fertig(knopf(t.naechste, () => schliesseAb({ ok: true, zaehlt }), 'los'));
      } else {
        status.textContent = aufgabe.typ === 'reihe' ? t.nochmalReihe : istWahl ? t.nochmalWahl : t.nochmal;
        aktionen.replaceChildren(knopf(t.andere, () => schliesseAb({ ok: false, zaehlt: false }), 'knopf-zweit'));
      }
    } else if (art === 'misch') {
      if (antwort.ok) fertig(knopf(t.weiter, () => schliesseAb({ ok: true, zaehlt: true }), 'los'));
      else status.textContent = t.nochmalMisch;
    } else if (art === 'wiederholung') {
      // Wer ein Konzept nachholt, hatte es noch nie «drauf»: Dann zählt die Antwort für die Meisterschaft.
      const nachholen = Boolean(app.stand.fortschritt[a.konzept]?.nachholen);
      status.textContent = antwort.ok ? (nachholen ? t.gezaehltNachholen : t.wiederholungGut) : t.wiederholungSchlecht;
      fertig(knopf(t.weiter, () => {
        app.setze(verbucheWiederholungsErgebnis(app.stand, regeln, antwort.ok));
        nav.zu('runde');
      }, 'los'));
    }

    // Wer zweimal danebenliegt, bekommt die erste Hilfe angeboten.
    if (mitHilfeKnopf && !antwort.ok && fehlschlaege >= 2 && hilfeStufe === 0) {
      hilfeText.textContent = t.hilfeAngebot;
    }
    ergebnis.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, 'los');

  // --- Drei Hilfestufen: Tipp, Zeig mir, wo, Lösung zeigen ---
  const hilfeKnopf = knopf(t.hilfe[0], () => {
    hilfeStufe += 1;
    if (hilfeStufe === 1) {
      hilfeText.textContent = art === 'misch' ? t.tippMisch : texte.konzepte[a.konzept].tipp;
    } else if (hilfeStufe === 2) {
      const teil = hilfeTeil(aufgabe, werkbank.auswahl());
      hilfeText.textContent = '';
      const text = { zuviel: t.hilfeZuviel, fehlt: t.hilfeFehlt, falsch: t.hilfeFalscheWahl, platz: t.hilfePlatz };
      if (teil) werkbank.markiere(teil.id, text[teil.grund]);
    } else {
      werkbank.setze(aufgabe.loesung);
      hilfeText.textContent = t.hilfeLoesung;
    }
    if (hilfeStufe >= t.hilfe.length) hilfeKnopf.hidden = true;
    else hilfeKnopf.textContent = t.hilfe[hilfeStufe];
  }, 'knopf-zweit');
  hilfeKnopf.hidden = !mitHilfeKnopf;

  wurzel.append(...[
    ...kopf,
    el('section', { klasse: 'karte gast' },
      el('p', { klasse: 'etikett', text: quelle.gast }),
      el('p', { klasse: 'wunsch', text: `«${aufgabe.wunsch}»` })),
    werkbank.knoten,
    hilfeText,
    el('div', { klasse: 'knopf-reihe' }, los, hilfeKnopf),
    // Was bei den Hilfen zählt, steht direkt bei den Knöpfen.
    art === 'frei' ? el('p', { klasse: 'klein', text: fuelle(t.hilfeRegel, { zeig: t.hilfe[1], loesung: t.hilfe[2] }) }) : null,
    ergebnis,
    aktionen,
  ].filter(Boolean));
}

// Zwischenbild nach einer Runde oder nach dem ganzen Besuch.
export function zeigeZwischen(wurzel, app, nav, { ereignis, konzept, titel, auftrag }) {
  const { texte, regeln } = app.inhalte;
  const t = texte.app;
  const zumCafe = knopf(t.zumCafe, () => nav.zu('cafe'), 'los');
  const naechsteRunde = app.stand.lauf ? knopf(t.weiterRunde, () => nav.zu('runde'), 'knopf-zweit') : null;

  if (ereignis === 'auftragFertig') {
    wurzel.append(
      el('section', { klasse: 'karte feier' },
        lupeFigur(t.lupeName, true),
        el('h1', { text: t.besuchFertigTitel }),
        el('p', { klasse: 'etikett', text: fuelle(t.gastSagt, { gast: auftrag.gast }) }),
        el('p', { klasse: 'wunsch', text: `«${auftrag.dank}»` })),
      el('section', { klasse: 'karte' },
        el('p', { klasse: 'etikett', text: t.cafeWaechstEtikett }),
        el('p', { text: auftrag.danach })),
      daumenKarte(app, auftrag),
      zumCafe,
    );
    return;
  }

  // Über den Ausweg weitergegangen: Das Konzept kommt später als Wiederholung.
  if (ereignis === 'rundeVerschoben') {
    wurzel.append(
      el('section', { klasse: 'karte feier' },
        lupeFigur(t.lupeName, true),
        el('h1', { text: t.verschobenTitel }),
        el('p', { text: fuelle(t.verschobenText, { konzept: texte.konzepte[konzept].name }) })),
      echtKarte(app, konzept),
      el('p', { klasse: 'klein', text: t.aufSpickzettel }),
      el('p', { klasse: 'klein', text: t.pause }),
      el('div', { klasse: 'knopf-reihe' }, zumCafe, naechsteRunde),
    );
    return;
  }

  // Eine Mischrunde hat kein eigenes Konzept: Sie ist eine Etappe.
  if (!konzept) {
    wurzel.append(
      el('section', { klasse: 'karte feier' },
        lupeFigur(t.lupeName, true),
        el('h1', { text: fuelle(t.etappeFertigTitel, { titel: titel ?? '' }) }),
        el('p', { text: t.etappeFertigText }),
        el('p', { klasse: 'klein', text: t.pause })),
      el('div', { klasse: 'knopf-reihe' }, zumCafe, naechsteRunde),
    );
    return;
  }

  const noetig = regeln.erfolgeFuerMeisterschaft;
  wurzel.append(
    el('section', { klasse: 'karte feier' },
      lupeFigur(t.lupeName, true),
      el('h1', { text: fuelle(t.rundeFertigTitel, { konzept: texte.konzepte[konzept].name }) }),
      punkte(noetig, noetig, t.punkteLabel),
      el('p', { text: fuelle(t.rundeFertigText, { anzahl: noetig }) })),
    echtKarte(app, konzept),
    el('p', { klasse: 'klein', text: t.aufSpickzettel }),
    el('p', { klasse: 'klein', text: t.pause }),
    el('div', { klasse: 'knopf-reihe' }, zumCafe, naechsteRunde),
  );
}
