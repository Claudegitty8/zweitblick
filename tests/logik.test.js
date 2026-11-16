import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  neuerFortschritt, verbucheVersuch, erfolge, istGemeistert,
  darfStarten, naechsterAbstand, verbucheWiederholung,
} from '../spiel/code/logik/meisterschaft.js';
import { bewerte, hilfeTeil, antworten } from '../spiel/code/logik/bewertung.js';
import { baueNachricht, baueAnweisung, baueAnhaenge, hatAnweisung, hatAnhaenge } from '../spiel/code/logik/prompt.js';

const regeln = { erfolgeFuerMeisterschaft: 3, wiederholungsAbstaende: [1, 3, 7] };

function loese(fortschritt, ...situationen) {
  return situationen.reduce((f, situation) => verbucheVersuch(f, { situation, richtig: true }), fortschritt);
}

test('Meisterschaft braucht drei Erfolge in verschiedenen Situationen', () => {
  let f = loese(neuerFortschritt(), 'a', 'b');
  assert.equal(istGemeistert(f, regeln), false);
  f = loese(f, 'c');
  assert.equal(istGemeistert(f, regeln), true);
});

test('Dieselbe Situation zählt nur einmal', () => {
  assert.equal(erfolge(loese(neuerFortschritt(), 'a', 'a', 'a')), 1);
});

test('Falsche Lösungen und Lösungen mit Hilfe zählen nicht, kosten aber nichts', () => {
  let f = loese(neuerFortschritt(), 'a');
  f = verbucheVersuch(f, { situation: 'b', richtig: false });
  f = verbucheVersuch(f, { situation: 'c', richtig: true, mitHilfe: true });
  assert.equal(erfolge(f), 1);
});

test('Ein Konzept startet erst, wenn seine Voraussetzungen gemeistert sind', () => {
  const k = { id: 'nachfragen', braucht: ['erklaeren'] };
  assert.equal(darfStarten(k, {}, regeln), false);
  assert.equal(darfStarten(k, { erklaeren: loese(neuerFortschritt(), 'a', 'b') }, regeln), false);
  assert.equal(darfStarten(k, { erklaeren: loese(neuerFortschritt(), 'a', 'b', 'c') }, regeln), true);
});

test('Wiederholungen kommen in wachsenden Abständen und bei Misserfolg früher', () => {
  let f = neuerFortschritt();
  assert.equal(naechsterAbstand(f, regeln), 1);
  f = verbucheWiederholung(f, true);
  assert.equal(naechsterAbstand(f, regeln), 3);
  f = verbucheWiederholung(f, true);
  assert.equal(naechsterAbstand(f, regeln), 7);
  f = verbucheWiederholung(f, false);
  assert.equal(naechsterAbstand(f, regeln), 3);
  f = verbucheWiederholung(verbucheWiederholung(f, true), true);
  assert.equal(naechsterAbstand(f, regeln), null);
});

const nachricht = {
  grundprompt: 'Hallo Lupe.',
  teile: [
    { id: 'alter', art: 'anweisung', text: 'Ich bin 81.' },
    { id: 'bericht', art: 'anhang', text: 'Laborbericht (Foto)' },
    { id: 'erklaer', art: 'frage', text: 'Erklär mir das.' },
    { id: 'einfach', art: 'wie', text: 'Einfach.' },
    { id: 'katze', art: 'anweisung', text: 'Meine Katze heisst Mimi.' },
  ],
  pruefungen: [
    { wenn: { gewaehlt: ['katze'] }, fehlbild: 'katze' },
    { wenn: { fehlt: ['bericht'] }, fehlbild: 'keiner' },
    { wenn: { aus: ['erklaer', 'einfach'], hoechstens: 0 }, fehlbild: 'nichts' },
    { wenn: { aus: ['erklaer', 'einfach'], hoechstens: 1 }, fehlbild: 'wenig' },
  ],
  loesung: ['alter', 'bericht', 'erklaer', 'einfach'],
};

test('Bewertung: Die erste zutreffende Prüfung bestimmt das Fehlbild', () => {
  assert.equal(bewerte(nachricht, []).fehlbild, 'keiner');
  assert.equal(bewerte(nachricht, ['bericht', 'katze']).fehlbild, 'katze');
  assert.equal(bewerte(nachricht, ['bericht']).fehlbild, 'nichts');
  assert.equal(bewerte(nachricht, ['bericht', 'einfach']).fehlbild, 'wenig');
  assert.equal(bewerte(nachricht, nachricht.loesung).ok, true);
});

test('Hilfe zeigt zuerst auf ein schädliches Teil, sonst auf ein fehlendes', () => {
  assert.deepEqual(hilfeTeil(nachricht, ['katze', 'bericht']), { id: 'katze', grund: 'zuviel' });
  assert.deepEqual(hilfeTeil(nachricht, ['bericht']), { id: 'alter', grund: 'fehlt' });
  assert.equal(hilfeTeil(nachricht, nachricht.loesung), null);
});

test('Nachricht: Anweisung, Anhänge und Text stehen getrennt', () => {
  const auswahl = ['alter', 'bericht', 'erklaer', 'einfach'];
  assert.equal(baueNachricht(nachricht, auswahl), 'Hallo Lupe. Erklär mir das. Einfach.');
  assert.equal(baueAnweisung(nachricht, auswahl), 'Ich bin 81.');
  assert.deepEqual(baueAnhaenge(nachricht, auswahl), ['Laborbericht (Foto)']);
  assert.equal(hatAnweisung(nachricht), true);
  assert.equal(hatAnhaenge(nachricht), true);
  assert.equal(hatAnhaenge({ teile: [] }), false);
  // Die Reihenfolge der Sätze folgt den Arten, nicht der Klick-Reihenfolge.
  assert.equal(baueNachricht(nachricht, ['einfach', 'erklaer']), 'Hallo Lupe. Erklär mir das. Einfach.');
});

const tippen = {
  typ: 'tippen',
  flaechen: [
    { id: 'falsch1', text: 'Profil', hinweis: 'h', folge: 'f' },
    { id: 'richtig', text: 'Datenschutz', hinweis: 'h', folge: 'f', richtig: true },
    { id: 'falsch2', text: 'Abmelden', hinweis: 'h', folge: 'f' },
  ],
  loesung: ['richtig'],
};

test('Antippen: genau eine Fläche ist richtig, nichts antippen ist falsch', () => {
  assert.equal(bewerte(tippen, ['richtig']).ok, true);
  assert.equal(bewerte(tippen, ['falsch1']).ok, false);
  assert.equal(bewerte(tippen, ['falsch1']).fehlbild, 'falsch1');
  assert.equal(bewerte(tippen, []).ok, false);
  assert.equal(bewerte(tippen, ['gibtsnicht']).ok, false);
  assert.equal(antworten(tippen).length, 3);
});

test('Antippen: Die Hilfe schliesst die gewählte falsche Fläche aus', () => {
  assert.deepEqual(hilfeTeil(tippen, ['falsch2']), { id: 'falsch2', grund: 'falsch' });
  assert.deepEqual(hilfeTeil(tippen, []), { id: 'falsch1', grund: 'falsch' });
});

test('Sortieren: nur die genaue Reihenfolge ist richtig, die Hilfe zeigt den ersten falschen Platz', () => {
  const reihe = { typ: 'reihe', loesung: ['a', 'b', 'c'] };
  assert.equal(bewerte(reihe, ['a', 'b', 'c']).ok, true);
  assert.equal(bewerte(reihe, ['b', 'a', 'c']).ok, false);
  assert.equal(bewerte(reihe, ['a', 'b']).ok, false);
  assert.deepEqual(hilfeTeil(reihe, ['a', 'c', 'b']), { id: 'b', grund: 'platz' });
});
