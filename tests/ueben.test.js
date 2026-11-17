import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  neueUebung, tippe, zeigeZiel, schrittZurueck, zielIndex, istTippbar, ZEIGEN_NACH,
} from '../spiel/code/logik/ueben.js';

const ablauf = [
  { anleitung: 'a', app: 'Test', titel: 'Eins', elemente: [{ typ: 'text', text: 'Info' }, { typ: 'knopf', text: 'Falsch' }, { typ: 'knopf', text: 'Richtig', ziel: true }] },
  { anleitung: 'b', app: 'Test', titel: 'Zwei', elemente: [{ typ: 'feld', text: 'Feld', ziel: true }, { typ: 'knopf', text: 'Andere' }] },
];

test('Üben: richtig tippen führt Bildschirm für Bildschirm bis zum Schluss', () => {
  let { stand, ergebnis } = tippe(neueUebung(), ablauf, 2);
  assert.equal(ergebnis, 'richtig');
  assert.equal(stand.schritt, 1);
  ({ stand, ergebnis } = tippe(stand, ablauf, 0));
  assert.equal(ergebnis, 'fertig');
  assert.equal(stand.fertig, true);
  // Nach dem Schluss passiert nichts mehr.
  assert.equal(tippe(stand, ablauf, 0).ergebnis, 'nichts');
});

test('Üben: Nach zwei Fehlern zeigt das Spiel die richtige Stelle, Text lässt sich nicht antippen', () => {
  let stand = neueUebung();
  assert.equal(tippe(stand, ablauf, 0).ergebnis, 'nichts');
  ({ stand } = tippe(stand, ablauf, 1));
  assert.equal(stand.gezeigt, false);
  ({ stand } = tippe(stand, ablauf, 1));
  assert.equal(ZEIGEN_NACH, 2);
  assert.equal(stand.gezeigt, true);
  // Beim nächsten Bildschirm beginnt es wieder ohne Markierung.
  ({ stand } = tippe(stand, ablauf, 2));
  assert.deepEqual([stand.fehler, stand.gezeigt], [0, false]);
});

test('Üben: «Zeig mir, wo» und «Schritt zurück»', () => {
  assert.equal(zeigeZiel(neueUebung()).gezeigt, true);
  assert.equal(schrittZurueck(neueUebung()).schritt, 0);
  const { stand } = tippe(neueUebung(), ablauf, 2);
  assert.equal(schrittZurueck(stand).schritt, 0);
  assert.equal(zielIndex(ablauf[1]), 0);
  assert.equal(istTippbar({ typ: 'nachricht' }), false);
});

test('Üben: Jeder Ablauf in den Inhalten ist durchspielbar', async () => {
  const texte = JSON.parse(await readFile(new URL('../spiel/inhalte/de/texte.json', import.meta.url), 'utf8'));
  const mitUeben = Object.entries(texte.konzepte).filter(([, k]) => k.ueben);
  assert.ok(mitUeben.length >= 20, 'fast jedes Thema hat einen Ablauf');
  for (const [id, konzept] of mitUeben) {
    let stand = neueUebung();
    let ergebnis = null;
    for (const bildschirm of konzept.ueben) ({ stand, ergebnis } = tippe(stand, konzept.ueben, zielIndex(bildschirm)));
    assert.equal(ergebnis, 'fertig', id);
  }
});

test('Üben: Die Inhaltsprüfung findet kaputte Abläufe', async () => {
  const { pruefeUeben } = await import('../werkzeuge/pruefe-inhalte.mjs');
  const fehler = [];
  await pruefeUeben([ablauf[0]], 'kurz', fehler);
  assert.match(fehler[0], /zwei bis zehn/);
  const kaputt = [
    { anleitung: 'a', app: 'Test', titel: 'Kein Ziel', elemente: [{ typ: 'knopf', text: 'A' }, { typ: 'knopf', text: 'B' }] },
    { anleitung: 'b', app: 'Test', titel: 'Text als Ziel', elemente: [{ typ: 'text', text: 'Info', ziel: true }, { typ: 'knopf', text: 'B' }] },
    { anleitung: '', app: 'Test', titel: 'Bild fehlt', elemente: [{ typ: 'bild', text: 'X', datei: 'fotos/gibtsnicht.svg', ziel: true }, { typ: 'wolke', text: 'B' }] },
  ];
  fehler.length = 0;
  await pruefeUeben(kaputt, 'kaputt', fehler);
  const alles = fehler.join('\n');
  assert.match(alles, /Bildschirm 1 braucht genau ein Ziel, hat 0/);
  assert.match(alles, /lässt sich nicht antippen/);
  assert.match(alles, /Bildschirm 3 braucht anleitung/);
  assert.match(alles, /gibtsnicht\.svg» fehlt/);
  assert.match(alles, /unbekannte Art «wolke»/);
  assert.match(alles, /Bildschirm 3 braucht mindestens zwei Stellen/);
});

test('Üben: Die Liste aller Übungen folgt dem Spiel, jedes Thema einmal', async () => {
  const { uebungsListe } = await import('../spiel/code/logik/ueben.js');
  const { AUFTRAEGE } = await import('../spiel/code/inhalte/lader.js');
  const texte = JSON.parse(await readFile(new URL('../spiel/inhalte/de/texte.json', import.meta.url), 'utf8'));
  const auftraege = await Promise.all(AUFTRAEGE.map(async (id) => JSON.parse(await readFile(new URL(`../spiel/inhalte/de/besuche/${id}.json`, import.meta.url), 'utf8'))));
  const liste = uebungsListe(auftraege, texte.konzepte);
  const alle = liste.flatMap((gruppe) => gruppe.konzepte);
  assert.equal(alle.length, Object.values(texte.konzepte).filter((k) => k.ueben).length);
  assert.equal(new Set(alle).size, alle.length);
  assert.equal(alle[0], 'erklaeren');
  assert.ok(alle.includes('alle-seiten'));
  assert.ok(!alle.includes('arzt-entscheidet'));
  // Jede Übung hat einen kurzen Namen für die Liste.
  for (const id of alle) assert.ok(texte.konzepte[id].uebenName?.trim(), id);
  // Kleine Liste: Ein Besuch ohne Übung fällt weg, doppelte Themen erscheinen einmal.
  const klein = uebungsListe(
    [{ id: 'a', thema: 'A', runden: [{ konzept: 'x' }, { konzept: 'y' }, { art: 'misch' }] }, { id: 'b', thema: 'B', runden: [{ konzept: 'x' }] }],
    { x: { ueben: [{}] }, y: {} },
  );
  assert.deepEqual(klein, [{ auftrag: 'a', thema: 'A', konzepte: ['x'] }]);
});
