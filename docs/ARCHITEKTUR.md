# Architektur

Reines Web: HTML, CSS, JavaScript-Module, Inhalte als JSON. Keine Pakete, kein Build-Schritt. Läuft auf jedem statischen Hoster (geplant: GitHub Pages).

## Ordner

```
spiel/                     alles, was veröffentlicht wird
  index.html               Einstieg, lädt code/start.js
  manifest.webmanifest     Name und Symbol für den Home-Bildschirm
  sw.js                    Service Worker: Offline nach dem ersten Laden (erst Netz, sonst Ablage)
  stil/haupt.css           ganze Gestaltung, hell und dunkel, Druck
  bilder/                  Lupe-Symbol (SVG, PNG) und fotos/ (14 eigene Beispielbilder, SVG)
  code/
    start.js               holt Inhalte, Speicher, Übungs-KI; schaltet Ansichten um
    inhalte/lader.js       lädt JSON, setzt Länderwerte ein ([[name]])
    logik/                 reine Funktionen, ohne Oberfläche, alle getestet
      ablauf.js            Spielstand, Runden, Schritte, Ausweg, Wiederholungen
      meisterschaft.js     Punkte, Voraussetzungen, Abstände
      bewertung.js         prüft eine Antwort, wählt die Hilfe
      prompt.js            setzt die Nachricht an Lupe zusammen
      extras.js            Schnelltest, Fragen, Daumen, Spielstand prüfen und umwandeln, Springen, Spickzettel
    ki/                    Übungs-KI «Lupe» (simuliert, nur nach Regeln aus den Inhalten)
    speicher/speicher.js   localStorage mit Rückfall auf Arbeitsspeicher
    oberflaeche/           Ansichten: Café, Runde, Übungsformen, Lexikon, Einstellungen, Spickzettel
  inhalte/
    regeln.json            Zahlen der Lernregeln
    lehrplan.json          7 Kapitel, 21 Themen mit Voraussetzungen
    fakten.json            Angaben mit Quelle und Prüfdatum
    betreiber.json         Angaben fürs Impressum, Schalter «testumgebung»
    de/texte.json          alle Oberflächentexte, Länderwerte, Themen (Aha, Tipp, Merkbild, echte Schritte, Bilder)
    de/lexikon.json        32 Begriffe
    de/umfrage.json        6 freiwillige Fragen
    de/besuche/<id>.json   ein Besuch: Gast, Runden, Aufgaben
tests/                     node --test
werkzeuge/pruefe-inhalte.mjs   Inhaltsprüfung
werkzeuge/server.mjs           lokaler Server
werkzeuge/pruefe-veroeffentlichung.mjs   Prüfung vor dem Veröffentlichen (Impressum, noindex)
```

## Ein Besuch (`de/besuche/<id>.json`)

- `id`, `kapitel`, `gast`, `thema`, `wunsch`, `dank`, `danach`, `lexikon` (Zusatzbegriffe)
- `runden`: drei Themen-Runden (`art: konzept`, mit `probieren` + `nurTeile`, `beispiel`, `luecke` + `vorgabe`, `frei` mit vier Aufgaben) und eine Mischrunde (`art: misch`, `titel`, `frei`).
- `aufgaben`: pro Aufgabe ein `wunsch` (im ganzen Spiel einmalig) und eine Übungsform:
  - Zusammenstecken (ohne `typ`): `grundprompt`, `teile` mit `art` (anweisung, anhang, frage, angaben, wie) und optional `bild` + `bildText`, `pruefungen` (`gewaehlt`, `fehlt`, `aus` + `hoechstens`), `fehlbilder` (mindestens zwei Texte und ein `hinweis`), `erfolg`, `loesung`.
  - Vorhersagen (`typ: wahl`): `frage`, `optionen` (genau eine `richtig`, jede mit `hinweis`), `lupe`, optional `bild`.
  - Antippen (`typ: tippen`): `frage`, `bildschirm` (`titel`, `zeilen`, `anordnung` liste oder raster), `flaechen` (je `hinweis` und `folge`, optional `bild`, `zusatz`, `art: foto`).
  - Sortieren (`typ: reihe`): `frage`, `schritte`, `loesung`, `lupe`, `daneben` (Texte, Hinweis).

## Einen Besuch ergänzen

1. Datei in `spiel/inhalte/de/besuche/` anlegen, Kennung in `AUFTRAEGE` in `code/inhalte/lader.js` eintragen.
2. Themen in `lehrplan.json` und Texte in `texte.json` unter `konzepte` (name, analogie, aha, tipp, echt, optional bilder), Begriffe in `lexikon.json`.
3. `npm run pruefen`. Die Prüfung findet fehlende Teile, unlösbare oder zu leichte Aufgaben, zu lange Texte, Emoji, fehlende Bilder und Platzhalter.
4. Tests in `tests/ganzes-spiel.test.js` anpassen (Anzahl Themen).

## Spielstand

`{ version, lauf, erledigt, fortschritt, lexikon, rundenZaehler, umfrage, daumen, schnelltest, einstellungen: { schrift, land } }`. Details in `docs/REGELN.md`.

## Budgets

Ganzer Ordner `spiel/` rund 680 KB (Ziel unter 1 MB). Start ohne Netzwerkanfragen ausser den eigenen Dateien.
