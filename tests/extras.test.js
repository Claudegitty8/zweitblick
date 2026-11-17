import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUFTRAEGE } from '../spiel/code/inhalte/lader.js';
import { neuerStand, starteAuftrag, ansicht, verbucheFrei, STAND_VERSION } from '../spiel/code/logik/ablauf.js';
import { istGemeistert } from '../spiel/code/logik/meisterschaft.js';
import {
  schnelltestAufgaben, verbucheSchnelltest, verbucheUmfrage, verbucheDaumen, istSpielstand, wandleUm, spickzettel,
} from '../spiel/code/logik/extras.js';
import { erstelleKi } from '../spiel/code/ki/schnittstelle.js';

const lies = async (pfad) => JSON.parse(await readFile(new URL(`../spiel/inhalte/${pfad}`, import.meta.url), 'utf8'));
const regeln = await lies('regeln.json');
const alle = await Promise.all(AUFTRAEGE.map((id) => lies(`de/besuche/${id}.json`)));
const nachId = (id) => alle.find((a) => a.id === id);
const gerber = nachId('gerber');
const meier = nachId('meier');
const fragen = (await lies('de/umfrage.json')).fragen;
const konzepteVon = (auftrag) => auftrag.runden.filter((r) => r.konzept).map((r) => r.konzept);

const alleRichtig = (auftrag) => schnelltestAufgaben(auftrag, regeln).map((e) => ({ ...e, richtig: true }));

test('Schnelltest: drei Aufgaben pro Konzept', () => {
  const reihe = schnelltestAufgaben(gerber, regeln);
  assert.equal(reihe.length, 9);
  assert.deepEqual([...new Set(reihe.map((e) => e.konzept))], ['erklaeren', 'nachfragen', 'arzt-entscheidet']);
});

test('Schnelltest bestanden: Konzepte gemeistert, direkt in die Mischrunde, Lexikon gefüllt', () => {
  const { stand, bestanden } = verbucheSchnelltest(neuerStand(), gerber, regeln, alleRichtig(gerber));
  assert.deepEqual(bestanden, konzepteVon(gerber));
  assert.ok(konzepteVon(gerber).every((id) => stand.lexikon.includes(id)));
  const gestartet = starteAuftrag(stand, gerber, regeln, alle);
  assert.equal(ansicht(gestartet, gerber).art, 'misch');
  let aktuell = gestartet;
  let ereignis = 'weiter';
  while (ereignis !== 'auftragFertig') ({ stand: aktuell, ereignis } = verbucheFrei(aktuell, gerber, regeln, { ok: true, zaehlt: true }, alle));
  assert.deepEqual(aktuell.erledigt, ['gerber']);
});

test('Schnelltest teilweise bestanden: Nur die bestandenen Konzepte zählen, Scheitern kostet nichts', () => {
  const ergebnisse = alleRichtig(gerber).map((e) => (e.konzept === 'nachfragen' ? { ...e, richtig: false } : e));
  const { stand, bestanden } = verbucheSchnelltest(neuerStand(), gerber, regeln, ergebnisse);
  assert.deepEqual(bestanden, ['erklaeren', 'arzt-entscheidet']);
  assert.equal(stand.fortschritt.nachfragen, undefined);
  // Die Runde beginnt beim nicht bestandenen Konzept.
  const gestartet = starteAuftrag(stand, gerber, regeln, alle);
  assert.equal(ansicht(gestartet, gerber).konzept, 'nachfragen');
});

test('Das ganze Spiel lässt sich auch nur mit Schnelltests und Mischrunden durchspielen', () => {
  let stand = neuerStand();
  for (const auftrag of alle) {
    ({ stand } = verbucheSchnelltest(stand, auftrag, regeln, alleRichtig(auftrag)));
    stand = starteAuftrag(stand, auftrag, regeln, alle);
    let ereignis = 'weiter';
    let schritte = 0;
    while (ereignis !== 'auftragFertig') {
      schritte += 1;
      assert.ok(schritte < 100);
      const sicht = ansicht(stand, auftrag);
      if (sicht.art === 'wiederholung') {
        stand = { ...stand, lauf: { ...stand.lauf, wiederholung: null } };
        continue;
      }
      assert.equal(sicht.art, 'misch');
      ({ stand, ereignis } = verbucheFrei(stand, auftrag, regeln, { ok: true, zaehlt: true }, alle));
    }
  }
  assert.deepEqual(stand.erledigt, AUFTRAEGE);
  for (const auftrag of alle) for (const id of konzepteVon(auftrag)) assert.ok(istGemeistert(stand.fortschritt[id], regeln), id);
});

test('Freiwillige Fragen: Festgehalten wird nur die Anzahl richtiger Antworten', () => {
  const antworten = Object.fromEntries(fragen.map((f) => [f.id, f.optionen.find((o) => o.richtig).id]));
  antworten[fragen[0].id] = fragen[0].optionen.find((o) => !o.richtig).id;
  const stand = verbucheUmfrage(neuerStand(), 'vorher', antworten, fragen);
  assert.deepEqual(stand.umfrage.vorher, { richtig: fragen.length - 1, von: fragen.length });
  // Leere Antworten zählen als falsch.
  assert.deepEqual(verbucheUmfrage(neuerStand(), 'nachher', {}, fragen).umfrage.nachher, { richtig: 0, von: fragen.length });
});

test('Daumen und Prüfung eines Spielstands aus einer Datei', () => {
  const stand = verbucheDaumen(neuerStand(), 'gerber', true);
  assert.equal(stand.daumen.gerber, 'hoch');
  assert.equal(verbucheDaumen(stand, 'gerber', false).daumen.gerber, 'runter');
  assert.equal(istSpielstand(stand), true);
  assert.equal(istSpielstand(null), false);
  assert.equal(istSpielstand('text'), false);
  assert.equal(istSpielstand({ ...stand, version: STAND_VERSION + 1 }), false);
  assert.equal(istSpielstand({ ...stand, erledigt: [3] }), false);
  assert.equal(istSpielstand({ ...stand, einstellungen: null }), false);
});

test('Umwandeln: Unbekannte Einstellungen werden zu Standardwerten, das Land bleibt', () => {
  const alt = { erledigt: ['gerber'], fortschritt: {}, einstellungen: { schrift: 'riesig', land: 'de' } };
  const neu = wandleUm(alt);
  assert.deepEqual(neu.einstellungen, { schrift: 'normal', land: 'de' });
  assert.deepEqual(neu.erledigt, ['gerber']);
  assert.equal(wandleUm({ ...alt, einstellungen: { land: 'fr' } }).einstellungen.land, null);
  assert.equal(wandleUm('kaputt'), null);
  assert.equal(wandleUm({ irgendwas: 1 }), null);
});

test('Spickzettel: Karten kommen erst, wenn die Runde vorbei ist', () => {
  assert.deepEqual(spickzettel(neuerStand(), alle, regeln), []);
  const { stand } = verbucheSchnelltest(neuerStand(), meier, regeln, alleRichtig(meier));
  assert.deepEqual(spickzettel(stand, alle, regeln).map((k) => k.konzept), konzepteVon(meier));
  // Über den Ausweg verlassen (nachholen): Die Karte kommt trotzdem, damit niemand ohne Hilfe dasteht.
  const nachholen = { ...neuerStand(), fortschritt: { erklaeren: { geloesteSituationen: [], wiederholungsStufe: 0, nachholen: true } } };
  assert.deepEqual(spickzettel(nachholen, alle, regeln), [{ auftrag: 'gerber', konzept: 'erklaeren' }]);
});

test('Sortieren: Lupe zeigt, was bei falscher Reihenfolge passiert', async () => {
  const ki = erstelleKi('simuliert');
  const aufgabe = meier.aufgaben['fs-e'];
  const gut = await ki.antworte({ aufgabe, auswahl: aufgabe.loesung });
  const schlecht = await ki.antworte({ aufgabe, auswahl: [...aufgabe.loesung].reverse() });
  assert.equal(gut.ok, true);
  assert.equal(gut.text, aufgabe.lupe);
  assert.equal(schlecht.ok, false);
  assert.ok(aufgabe.daneben.texte.includes(schlecht.text));
  assert.equal(schlecht.hinweis, aufgabe.daneben.hinweis);
});
