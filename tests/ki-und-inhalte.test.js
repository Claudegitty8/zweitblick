import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUFTRAEGE, setzeLandEin, inhalteFuerLand, LAND_PLATZHALTER } from '../spiel/code/inhalte/lader.js';
import { erstelleKi } from '../spiel/code/ki/schnittstelle.js';
import { erstelleSpeicher } from '../spiel/code/speicher/speicher.js';
import { neuerStand, STAND_VERSION } from '../spiel/code/logik/ablauf.js';
import { pruefeInhalte, pruefeAufgabe, pruefeUeber } from '../werkzeuge/pruefe-inhalte.mjs';

const lies = async (pfad) => JSON.parse(await readFile(new URL(`../spiel/inhalte/${pfad}`, import.meta.url), 'utf8'));
const alle = await Promise.all(AUFTRAEGE.map((id) => lies(`de/besuche/${id}.json`)));
const [gerber, meier, iphone] = alle;
const texte = await lies('de/texte.json');

test('Lupe zeigt beim Zusammenstecken das passende Fehlbild und beim nächsten Versuch eine andere Variante', async () => {
  const ki = erstelleKi('simuliert');
  const aufgabe = gerber.aufgaben['e-a'];
  const ohneBericht = aufgabe.loesung.filter((id) => id !== 'bericht');
  const erster = await ki.antworte({ aufgabe, auswahl: ohneBericht, versuch: 0 });
  const zweiter = await ki.antworte({ aufgabe, auswahl: ohneBericht, versuch: 1 });
  assert.equal(erster.ok, false);
  assert.equal(erster.fehlbild, 'keiner');
  assert.equal(erster.hinweis, aufgabe.fehlbilder.keiner.hinweis);
  assert.notEqual(erster.text, zweiter.text);
});

test('Antippen: Lupe zeigt, was nach dem Tippen passiert, und erklärt die gewählte Fläche', async () => {
  const ki = erstelleKi('simuliert');
  const aufgabe = meier.aufgaben['fs-a'];
  const richtig = aufgabe.flaechen.find((f) => f.richtig);
  const falsch = aufgabe.flaechen.find((f) => !f.richtig);
  const gut = await ki.antworte({ aufgabe, auswahl: [richtig.id] });
  const schlecht = await ki.antworte({ aufgabe, auswahl: [falsch.id] });
  assert.equal(gut.ok, true);
  assert.equal(gut.text, richtig.folge);
  assert.equal(schlecht.ok, false);
  assert.equal(schlecht.text, falsch.folge);
  assert.equal(schlecht.hinweis, falsch.hinweis);
});

test('Vorhersagen: Lupe löst immer gleich auf, der Hinweis erklärt die gewählte Antwort', async () => {
  const ki = erstelleKi('simuliert');
  const aufgabe = gerber.aufgaben['e-e'];
  const richtig = aufgabe.optionen.find((o) => o.richtig);
  const falsch = aufgabe.optionen.find((o) => !o.richtig);
  const a = await ki.antworte({ aufgabe, auswahl: [richtig.id] });
  const b = await ki.antworte({ aufgabe, auswahl: [falsch.id] });
  const leer = await ki.antworte({ aufgabe, auswahl: [] });
  assert.equal(a.ok, true);
  assert.equal(b.ok, false);
  assert.equal(leer.ok, false);
  assert.equal(a.text, b.text);
  assert.notEqual(a.hinweis, b.hinweis);
});

test('Jede Aufgabe des Spiels lässt sich mit ihrer Lösung lösen, und nichts tun ist nie richtig', async () => {
  const ki = erstelleKi('simuliert');
  let anzahl = 0;
  for (const auftrag of alle) {
    for (const [id, aufgabe] of Object.entries(auftrag.aufgaben)) {
      anzahl += 1;
      const gut = await ki.antworte({ aufgabe, auswahl: aufgabe.loesung ?? [aufgabe.optionen?.find((o) => o.richtig)?.id] });
      assert.equal(gut.ok, true, `${auftrag.id} ${id} mit Lösung`);
      assert.ok(gut.text, `${auftrag.id} ${id} hat eine Antwort von Lupe`);
      const leer = await ki.antworte({ aufgabe, auswahl: [] });
      assert.equal(leer.ok, false, `${auftrag.id} ${id} leer`);
    }
  }
  assert.equal(anzahl, 133);
});

test('Antippen: Jede Fläche hat eine Folge und einen Hinweis, genau eine ist richtig', () => {
  for (const auftrag of alle) for (const [id, aufgabe] of Object.entries(auftrag.aufgaben)) {
    if (aufgabe.typ !== 'tippen') continue;
    assert.equal(aufgabe.flaechen.filter((f) => f.richtig).length, 1, `${auftrag.id} ${id}`);
    for (const flaeche of aufgabe.flaechen) {
      assert.ok(flaeche.folge && flaeche.hinweis, `${auftrag.id} ${id} ${flaeche.id}`);
    }
  }
});

test('Unbekannter Modus der Übungs-KI wird klar abgelehnt', () => {
  assert.throws(() => erstelleKi('echt'));
});

test('Speicher funktioniert auch ohne Gerätespeicher', () => {
  const speicher = erstelleSpeicher(null);
  assert.equal(speicher.dauerhaft, false);
  assert.deepEqual(speicher.laden(), neuerStand());
  assert.equal(speicher.speichern({ ...neuerStand(), rundenZaehler: 2 }), false);
  assert.equal(speicher.laden().rundenZaehler, 2);
  assert.deepEqual(speicher.loeschen(), neuerStand());
  assert.deepEqual(speicher.laden(), neuerStand());
});

test('Speicher übersteht kaputte Daten und behält alte Stände als Kopie', () => {
  assert.deepEqual(erstelleSpeicher({ getItem: () => '{kaputt', setItem: () => {} }).laden(), neuerStand());
  const geschrieben = {};
  const lager = {
    getItem: (k) => (k === 'zweitblick-stand' ? JSON.stringify({ version: 0, erledigt: ['gerber'], fortschritt: {} }) : null),
    setItem: (k, v) => { geschrieben[k] = v; },
    removeItem: () => {},
  };
  const stand = erstelleSpeicher(lager).laden();
  assert.equal(stand.version, STAND_VERSION);
  assert.deepEqual(stand.erledigt, ['gerber']);
  assert.ok(geschrieben['zweitblick-stand-alt'], 'Das Original bleibt als Kopie liegen');
});

test('Länder: Platzhalter werden ersetzt, unbekannte bleiben stehen', () => {
  assert.equal(setzeLandEin('Ruf [[notruf]] an.', { notruf: '144' }), 'Ruf 144 an.');
  assert.equal(setzeLandEin('[[gibtsnicht]]', { notruf: '144' }), '[[gibtsnicht]]');
  assert.deepEqual(setzeLandEin({ a: ['[[notruf]]', 3] }, { notruf: '112' }), { a: ['112', 3] });
});

test('Länder: Für die Schweiz und Deutschland bleibt kein Platzhalter übrig, die Notrufnummern stimmen', async () => {
  const roh = {
    texte, auftraege: alle, lexikon: await lies('de/lexikon.json'), umfrage: (await lies('de/umfrage.json')).fragen,
  };
  for (const land of ['ch', 'de']) {
    const inhalte = inhalteFuerLand(roh, land);
    const json = JSON.stringify(inhalte);
    assert.equal(json.match(LAND_PLATZHALTER), null, `${land}: Platzhalter übrig`);
  }
  assert.ok(JSON.stringify(inhalteFuerLand(roh, 'ch')).includes('144'));
  assert.ok(JSON.stringify(inhalteFuerLand(roh, 'de')).includes('112'));
  // Ohne gewähltes Land gilt vorerst die Schweiz.
  assert.deepEqual(inhalteFuerLand(roh, null), inhalteFuerLand(roh, 'ch'));
  // In den deutschen Besuchen und Konzepten taucht die Schweizer Notrufnummer nicht auf.
  const de = inhalteFuerLand(roh, 'de');
  assert.equal(JSON.stringify([de.auftraege, de.texte.konzepte, de.texte.app]).includes('144'), false);
});

test('Die Lerninhalte im Repository sind vollständig', async () => {
  assert.deepEqual(await pruefeInhalte(), []);
});

test('Die Inhaltsprüfung findet typische Fehler in einer Aufgabe', () => {
  const fehler = [];
  pruefeAufgabe({
    wunsch: 'w',
    grundprompt: 'x',
    erfolg: ['y'],
    teile: [{ id: 'ziel', art: 'frage', text: 't' }],
    pruefungen: [{ wenn: { fehlt: ['ziel'] }, fehlbild: 'keinZiel' }],
    fehlbilder: { keinZiel: { texte: ['nur einer'] } },
    loesung: [],
  }, 'probe', fehler);
  // Zu wenige Varianten, kein Hinweis, Lösung besteht nicht.
  assert.equal(fehler.length, 3);
  const tippen = [];
  pruefeAufgabe({ typ: 'tippen', wunsch: 'w', frage: 'f', flaechen: [{ id: 'a', text: 'A', hinweis: 'h' }] }, 'probe', tippen);
  assert.ok(tippen.length > 0, 'Antippen ohne richtige Fläche und ohne Folge fällt auf');
});

test('«Über dieses Spiel»: Kontakt darf leer sein, eine falsche E-Mail-Adresse fällt auf', () => {
  const pruefe = (aenderung) => {
    const fehler = [];
    pruefeUeber({ ...texte.app, ...aenderung }, 'probe', fehler);
    return fehler;
  };
  assert.deepEqual(pruefe({}), []);
  assert.deepEqual(pruefe({ ueberKontaktAdresse: '' }), []);
  assert.deepEqual(pruefe({ ueberKontaktAdresse: 'spiel@beispiel.ch' }), []);
  assert.equal(pruefe({ ueberKontaktAdresse: 'keine adresse' }).length, 1);
  assert.equal(pruefe({ ueberKontaktAdresse: '<b>@x.ch' }).length, 1);
  assert.equal(pruefe({ ueberGithubAdresse: 'http://unsicher.example' }).length, 1);
  assert.equal(pruefe({ ueberFach: '' }).length, 1);
});

test('Brunner-iPhone: Der Besuch übt das Antippen auf einem nachgebauten iPhone', () => {
  const tippen = Object.values(iphone.aufgaben).filter((a) => a.typ === 'tippen');
  assert.ok(tippen.length >= 5);
  for (const aufgabe of tippen) assert.ok(aufgabe.bildschirm?.titel, 'Jeder Bildschirm hat einen Titel');
});

test('Gesundheitshinweis: Antworten nur für das Gespräch mit dem Arzt, mit den Original-Befunden', () => {
  const { arztHinweisTitel, arztHinweis } = texte.app;
  assert.ok(arztHinweisTitel.includes('Arzt'));
  assert.ok(Array.isArray(arztHinweis) && arztHinweis.length >= 2);
  assert.ok(arztHinweis.some((satz) => satz.includes('Original-Befunde')), 'nennt die Original-Befunde');
  assert.ok(arztHinweis.some((satz) => satz.includes('Entscheide nie selbst')), 'sagt: nichts selbst entscheiden');
  for (const satz of arztHinweis) assert.ok(satz.split(/\s+/).length <= 30, satz);
});

test('Impressum: Vor dem Veröffentlichen müssen Name, Strasse, Ort und E-Mail da sein, ein Postfach allein reicht nicht', async () => {
  const { pruefeBetreiber } = await import('../werkzeuge/pruefe-veroeffentlichung.mjs');
  const gut = { name: 'Anna Muster', strasse: 'Dorfstrasse 1', ort: '8000 Zürich', land: 'Schweiz', email: 'anna@beispiel.ch' };
  assert.deepEqual(pruefeBetreiber(gut), []);
  assert.equal(pruefeBetreiber({ ...gut, name: 'Anna' }).length, 1);
  assert.equal(pruefeBetreiber({ ...gut, strasse: 'Postfach 12' }).length, 1);
  assert.equal(pruefeBetreiber({ ...gut, ort: 'Zürich' }).length, 1);
  assert.equal(pruefeBetreiber({ ...gut, email: 'keine adresse' }).length, 1);
  assert.equal(pruefeBetreiber(null).length, 5);
});

test('Datenschutz: Abschnitte sind kurz und nennen GitHub und die IP-Adresse', () => {
  const abschnitte = texte.app.datenschutzAbschnitte;
  const alle = abschnitte.flatMap((a) => a.saetze).join(' ');
  assert.ok(alle.includes('GitHub') && alle.includes('IP-Adresse'));
  for (const satz of abschnitte.flatMap((a) => a.saetze)) assert.ok(satz.split(/\s+/).length <= 30, satz);
});

test('Veröffentlichen: Testumgebung braucht «noindex», die offizielle Version ein vollständiges Impressum', async () => {
  const { pruefeVeroeffentlichung } = await import('../werkzeuge/pruefe-veroeffentlichung.mjs');
  const mit = '<meta name="robots" content="noindex, nofollow">';
  const ohne = '<meta name="theme-color" content="#1d5c63">';
  const leer = { name: '', strasse: '', ort: '', land: 'Schweiz', email: '' };
  const voll = { name: 'Anna Muster', strasse: 'Dorfstrasse 1', ort: '8000 Zürich', land: 'Schweiz', email: 'anna@beispiel.ch' };
  assert.deepEqual(pruefeVeroeffentlichung({ ...leer, testumgebung: true }, mit).fehler, []);
  assert.equal(pruefeVeroeffentlichung({ ...leer, testumgebung: true }, ohne).fehler.length, 1);
  assert.ok(pruefeVeroeffentlichung({ ...leer, testumgebung: false }, ohne).fehler.length > 0);
  assert.deepEqual(pruefeVeroeffentlichung({ ...voll, testumgebung: false }, ohne).fehler, []);
  assert.equal(pruefeVeroeffentlichung({ ...voll, testumgebung: false }, mit).fehler.length, 1);
  // Der Stand im Repository passt zusammen.
  const seite = await readFile(new URL('../spiel/index.html', import.meta.url), 'utf8');
  assert.deepEqual(pruefeVeroeffentlichung(await lies('betreiber.json'), seite).fehler, []);
});
