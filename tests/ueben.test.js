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

test('Üben: Jeder Ablauf in den Inhalten ist durchspielbar, in beiden Ländern', async () => {
  const { setzeLandEin } = await import('../spiel/code/inhalte/lader.js');
  const roh = JSON.parse(await readFile(new URL('../spiel/inhalte/de/texte.json', import.meta.url), 'utf8'));
  for (const land of ['ch', 'de']) {
    const texte = setzeLandEin(roh, roh.laender[land]);
    const mitUeben = Object.entries(texte.konzepte).filter(([, k]) => k.ueben);
    assert.ok(mitUeben.length >= 20, 'fast jedes Thema hat einen Ablauf');
    for (const [id, konzept] of mitUeben) {
      let stand = neueUebung();
      let ergebnis = null;
      for (const bildschirm of konzept.ueben) {
        // Wer «Für mich schreiben» nimmt, kommt immer weiter.
        const eingaben = Object.fromEntries(bildschirm.elemente.map((e, i) => [i, e.vorschlag]).filter(([, v]) => v !== undefined));
        const ohneText = tippe(stand, konzept.ueben, zielIndex(bildschirm), {});
        if (Object.keys(eingaben).length) assert.equal(ohneText.ergebnis, 'eingabe', `${id}: leeres Feld darf nicht reichen`);
        ({ stand, ergebnis } = tippe(stand, konzept.ueben, zielIndex(bildschirm), eingaben));
      }
      assert.equal(ergebnis, 'fertig', `${land} ${id}`);
    }
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
  // Felder zum Schreiben, Symbole und Arten.
  fehler.length = 0;
  await pruefeUeben([
    { anleitung: 'a', app: 'Claude', titel: 'Chat', art: 'zauber', elemente: [
      { typ: 'knopf', text: '+', symbol: 'gibtsnicht' },
      { typ: 'eingabe', text: 'Schreib …', vorschlag: 'Hallo', schluessel: ['tschuess'] },
      { typ: 'knopf', text: 'Senden', ziel: true, stil: 'glitzer' },
    ] },
    { anleitung: 'b', app: 'Telefon', titel: 'Ziffern', elemente: [
      { typ: 'eingabe', text: 'Nummer', art: 'ziffern', vorschlag: 'keine Ziffern' },
      { typ: 'knopf', text: 'Anrufen', ziel: true },
      { typ: 'knopf', text: 'Kontakte' },
      { typ: 'nachricht', text: 'Bild', bild: 'fotos/gibtsnicht.svg' },
    ] },
  ], 'felder', fehler);
  const felder = fehler.join('\n');
  assert.match(felder, /unbekannte Bildschirm-Art «zauber»/);
  assert.match(felder, /unbekanntes Symbol «gibtsnicht»/);
  assert.match(felder, /unbekannter Stil «glitzer»/);
  assert.match(felder, /Beispiel «Hallo» passt nicht/);
  assert.match(felder, /Beispiel «keine Ziffern» passt nicht/);
  assert.match(felder, /Bild in der Nachricht/);
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

test('Üben: Selber tippen prüft die wichtigen Wörter und erlaubt kleine Tippfehler', async () => {
  const { pruefeEingabe, normalisiere, abstand } = await import('../spiel/code/logik/ueben.js');
  const feld = { typ: 'eingabe', text: 'Schreib Claude …', vorschlag: 'Erklär mir diesen Bericht in einfachen Worten, kurz.', schluessel: ['erklär', 'einfach', 'kurz'] };
  assert.equal(normalisiere('Erklär mir, kurz!'), 'erklaer mir kurz');
  assert.equal(abstand('kitten', 'sitting'), 3);
  assert.equal(abstand('einfahc', 'einfach'), 1, 'vertauschte Buchstaben sind ein Fehler');
  assert.equal(pruefeEingabe(feld, feld.vorschlag).passt, true);
  assert.equal(pruefeEingabe(feld, 'Bitte erklaere den Bericht einfach und kurz').passt, true, 'eigene Worte und ae statt ä');
  assert.equal(pruefeEingabe(feld, 'Erklär mir das ganz einfahc und kurz').passt, true, 'ein Tippfehler');
  assert.deepEqual(pruefeEingabe(feld, 'Erklär mir das').fehlt, ['einfach', 'kurz']);
  assert.equal(pruefeEingabe(feld, '   ').leer, true);
  assert.equal(pruefeEingabe(feld, 'Was ist das?').passt, false);
  // Mehrere Wörter in einem Stichwort, Zahlen mit Komma.
  assert.equal(pruefeEingabe({ schluessel: ['sonst nichts'] }, 'Ändere sonst bitte nichts').passt, true);
  assert.equal(pruefeEingabe({ schluessel: ['11,2'] }, 'Auf dem Bericht steht 11.2').passt, true);
  assert.equal(pruefeEingabe({ schluessel: ['11,2'] }, 'Auf dem Bericht steht 17,2').passt, false);
  // Langes Fachwort mit einem fehlenden Buchstaben.
  assert.equal(pruefeEingabe({ schluessel: ['Erythrozyten'] }, 'Was heisst Erytrozyten?').passt, true);
  // Ohne Stichwörter genügt irgendein Text.
  assert.equal(pruefeEingabe({}, 'Meine Gesundheit').passt, true);
  // Telefon-Tasten: Die Nummer muss genau stimmen.
  const nummer = { typ: 'eingabe', art: 'ziffern', vorschlag: '144' };
  assert.equal(pruefeEingabe(nummer, '144').passt, true);
  assert.equal(pruefeEingabe(nummer, '1444').passt, false);
  assert.equal(pruefeEingabe(nummer, '').leer, true);
});

test('Üben: Senden geht erst weiter, wenn das Feld passt', () => {
  const mitFeld = [
    { anleitung: 'a', app: 'Claude', titel: 'Chat', elemente: [
      { typ: 'knopf', text: '+' },
      { typ: 'eingabe', text: 'Schreib Claude …', vorschlag: 'Was heisst das?', schluessel: ['heisst'] },
      { typ: 'knopf', text: 'Senden', ziel: true },
    ] },
    ablauf[1],
  ];
  let { stand, ergebnis, fehlt } = tippe(neueUebung(), mitFeld, 2, {});
  assert.equal(ergebnis, 'eingabe');
  assert.deepEqual(fehlt, ['heisst']);
  assert.equal(stand.fehler, 0, 'Schreiben zählt nicht als Fehler');
  ({ stand, ergebnis } = tippe(stand, mitFeld, 2, { 1: 'Was heisst Hämoglobin?' }));
  assert.equal(ergebnis, 'richtig');
  assert.equal(stand.schritt, 1);
});
