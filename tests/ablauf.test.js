import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUFTRAEGE } from '../spiel/code/inhalte/lader.js';
import {
  neuerStand, starteAuftrag, ansicht, weiter, verbucheFrei, verbucheWiederholungsErgebnis, SCHRITTE,
} from '../spiel/code/logik/ablauf.js';
import { istGemeistert } from '../spiel/code/logik/meisterschaft.js';

const lies = async (pfad) => JSON.parse(await readFile(new URL(`../spiel/inhalte/${pfad}`, import.meta.url), 'utf8'));
const regeln = await lies('regeln.json');
const alle = await Promise.all(AUFTRAEGE.map((id) => lies(`de/besuche/${id}.json`)));
const [gerber, meier] = alle;

// Spielt einen Besuch durch, mit gutem Spieler. Merkt sich, welche Wiederholungen kamen.
function spieleDurch(stand, auftrag) {
  let s = starteAuftrag(stand, auftrag, regeln, alle);
  let ereignis = 'weiter';
  const wiederholungen = [];
  let schritte = 0;
  while (ereignis !== 'auftragFertig') {
    schritte += 1;
    assert.ok(schritte < 300, 'Der Ablauf darf nicht hängen bleiben');
    const sicht = ansicht(s, auftrag);
    if (sicht.art === 'wiederholung') {
      wiederholungen.push(`${sicht.konzept} aus ${sicht.aufgabeVon}`);
      s = verbucheWiederholungsErgebnis(s, regeln, true);
    } else if (sicht.art === 'frei' || sicht.art === 'misch') {
      ({ stand: s, ereignis } = verbucheFrei(s, auftrag, regeln, { ok: true, zaehlt: true }, alle));
    } else {
      s = weiter(s, auftrag);
    }
  }
  return { stand: s, wiederholungen };
}

test('Ohne laufenden Besuch zeigt die Ansicht das Café', () => {
  assert.deepEqual(ansicht(neuerStand(), gerber), { art: 'cafe' });
});

test('Ein neuer Stand hat noch kein Land und normale Schrift', () => {
  assert.deepEqual(neuerStand().einstellungen, { schrift: 'normal', land: null });
});

test('Eine Runde geht durch alle fünf Schritte, beim Aha kommt der Lexikon-Eintrag', () => {
  let stand = starteAuftrag(neuerStand(), gerber, regeln, alle);
  const gesehen = [];
  while (ansicht(stand, gerber).art !== 'frei') {
    gesehen.push(ansicht(stand, gerber).art);
    stand = weiter(stand, gerber);
  }
  gesehen.push('frei');
  assert.deepEqual(gesehen, SCHRITTE);
  assert.ok(stand.lexikon.includes(gerber.runden[0].konzept));
  // Beim Starten kommen auch die Zusatzbegriffe des Besuchs ins Lexikon.
  for (const id of gerber.lexikon) assert.ok(stand.lexikon.includes(id), id);
});

test('Probieren zeigt nur die erlaubten Teile, die Lücke hat ihre Vorgabe', () => {
  const stand = starteAuftrag(neuerStand(), gerber, regeln, alle);
  assert.deepEqual(ansicht(stand, gerber).nurTeile, gerber.runden[0].probieren.nurTeile);
  const luecke = weiter(weiter(weiter(stand, gerber), gerber), gerber);
  assert.equal(ansicht(luecke, gerber).art, 'luecke');
  assert.deepEqual(ansicht(luecke, gerber).vorgabe, gerber.runden[0].luecke.vorgabe);
});

test('Ein ganzer Besuch: alle Konzepte gemeistert, Besuch erledigt', () => {
  const { stand } = spieleDurch(neuerStand(), gerber);
  assert.deepEqual(stand.erledigt, ['gerber']);
  for (const runde of gerber.runden.filter((r) => r.konzept)) assert.ok(istGemeistert(stand.fortschritt[runde.konzept], regeln));
  assert.equal(stand.lauf, null);
});

test('Wiederholungen kommen auch im nächsten Besuch, in wachsenden Abständen', () => {
  const erster = spieleDurch(neuerStand(), gerber);
  const zweiter = spieleDurch(erster.stand, meier);
  assert.ok(erster.wiederholungen.length > 0, 'Schon im ersten Besuch wird wiederholt');
  assert.ok(zweiter.wiederholungen.some((w) => w.endsWith('aus gerber')), 'Im zweiten Besuch kommt der erste wieder');
});

test('Ein erledigter Besuch lässt sich nicht nochmals starten', () => {
  const { stand } = spieleDurch(neuerStand(), gerber);
  assert.equal(starteAuftrag(stand, gerber, regeln, alle), stand);
});
