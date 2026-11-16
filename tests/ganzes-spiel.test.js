import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUFTRAEGE } from '../spiel/code/inhalte/lader.js';
import {
  neuerStand, starteAuftrag, ansicht, weiter, verbucheFrei, verbucheWiederholungsErgebnis,
  auswegOffen, ueberspringeRunde,
} from '../spiel/code/logik/ablauf.js';
import { istGemeistert } from '../spiel/code/logik/meisterschaft.js';
import { spickzettel } from '../spiel/code/logik/extras.js';

const lies = async (pfad) => JSON.parse(await readFile(new URL(`../spiel/inhalte/${pfad}`, import.meta.url), 'utf8'));
const regeln = await lies('regeln.json');
const lehrplan = await lies('lehrplan.json');
const lexikon = await lies('de/lexikon.json');
const texte = await lies('de/texte.json');
const alle = await Promise.all(AUFTRAEGE.map((id) => lies(`de/besuche/${id}.json`)));

// Spielt einen Besuch durch. «kann» sagt, ob der Spieler eine freie Situation beim ersten Versuch schafft.
// Wer nie zählt, kommt nur über den Ausweg weiter.
function spieleBesuch(stand, auftrag, kann) {
  let s = starteAuftrag(stand, auftrag, regeln, alle);
  let ereignis = 'weiter';
  let schritte = 0;
  let auswege = 0;
  while (ereignis !== 'auftragFertig') {
    schritte += 1;
    assert.ok(schritte < 500, `Der Ablauf in «${auftrag.id}» darf nicht hängen bleiben`);
    const sicht = ansicht(s, auftrag);
    if (sicht.art === 'wiederholung') {
      const quelle = alle.find((x) => x.id === sicht.aufgabeVon);
      assert.ok(quelle.aufgaben[sicht.aufgabeId], 'Die Wiederholung nennt eine echte Aufgabe');
      s = verbucheWiederholungsErgebnis(s, regeln, kann);
    } else if (sicht.art === 'frei' && auswegOffen(s, auftrag, regeln)) {
      auswege += 1;
      ({ stand: s, ereignis } = ueberspringeRunde(s, auftrag, regeln, alle));
    } else if (sicht.art === 'frei' || sicht.art === 'misch') {
      // In der Mischrunde löst auch der schwache Spieler irgendwann (beliebig viele Versuche, mit Hilfe).
      ({ stand: s, ereignis } = verbucheFrei(s, auftrag, regeln, { ok: true, zaehlt: kann }, alle));
    } else {
      if (sicht.art !== 'aha') assert.ok(auftrag.aufgaben[sicht.aufgabeId], `${auftrag.id}: Schritt ${sicht.art} nennt eine echte Aufgabe`);
      s = weiter(s, auftrag);
    }
  }
  return { stand: s, auswege };
}

test('Guter Spieler: Das ganze Spiel lässt sich durchspielen, alles ist gemeistert und das Lexikon voll', () => {
  let stand = neuerStand();
  for (const auftrag of alle) ({ stand } = spieleBesuch(stand, auftrag, true));
  assert.deepEqual(stand.erledigt, AUFTRAEGE);
  assert.equal(lehrplan.konzepte.length, 21);
  for (const konzept of lehrplan.konzepte) {
    assert.ok(istGemeistert(stand.fortschritt[konzept.id], regeln), `«${konzept.id}» ist gemeistert`);
  }
  assert.deepEqual([...stand.lexikon].sort(), Object.keys(lexikon).sort());
  assert.equal(spickzettel(stand, alle, regeln).length, 21);
});

test('Schwacher Spieler: Wer nie beim ersten Versuch richtig liegt, kommt über den Ausweg trotzdem ans Ende', () => {
  let stand = neuerStand();
  let auswege = 0;
  for (const auftrag of alle) {
    const ergebnis = spieleBesuch(stand, auftrag, false);
    stand = ergebnis.stand;
    auswege += ergebnis.auswege;
  }
  assert.deepEqual(stand.erledigt, AUFTRAEGE);
  assert.equal(auswege, 21, 'Jede Konzept-Runde wurde über den Ausweg verlassen');
  // Nichts ist gemeistert, aber alles wird nachgeholt und liegt auf dem Spickzettel.
  for (const konzept of lehrplan.konzepte) assert.equal(stand.fortschritt[konzept.id].nachholen, true, konzept.id);
  assert.equal(spickzettel(stand, alle, regeln).length, 21);
});

test('Jedes Kernkonzept hat genau eine Konzept-Runde, in der Reihenfolge des Lehrplans', () => {
  const reihenfolge = alle.flatMap((auftrag) => auftrag.runden.filter((r) => r.art === 'konzept').map((r) => r.konzept));
  assert.deepEqual(reihenfolge, lehrplan.konzepte.map((k) => k.id));
});

test('Jeder Wunsch kommt im ganzen Spiel nur einmal vor', () => {
  const wuensche = alle.flatMap((auftrag) => Object.values(auftrag.aufgaben).map((a) => a.wunsch));
  assert.equal(new Set(wuensche).size, wuensche.length);
});

test('Jedes Konzept hat eine «So ist es in echt»-Karte mit zwei bis fünf Schritten', () => {
  for (const konzept of lehrplan.konzepte) {
    const echt = texte.konzepte[konzept.id]?.echt;
    assert.ok(Array.isArray(echt) && echt.length >= 2 && echt.length <= 5, konzept.id);
  }
});

test('Das Foto-Kapitel zeigt gute und schlechte Beispielbilder', () => {
  const bilder = ['foto-scharf', 'foto-licht', 'alle-seiten'].flatMap((id) => texte.konzepte[id].bilder ?? []);
  assert.ok(bilder.some((b) => b.gut === true), 'mindestens ein gutes Beispiel');
  assert.ok(bilder.filter((b) => b.gut === false).length >= 4, 'mehrere schlechte Beispiele');
  for (const bild of bilder) assert.ok(bild.text, `${bild.datei} hat einen beschreibenden Text`);
});

test('Lupe schickt bei Notfällen immer zur Notrufnummer', () => {
  const hofmann = alle.find((a) => a.id === 'hofmann');
  const notfall = JSON.stringify(Object.entries(hofmann.aufgaben).filter(([id]) => id.startsWith('no-')));
  assert.ok(notfall.includes('[[notruf]]'));
});
