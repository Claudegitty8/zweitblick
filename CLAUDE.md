# Zweitblick: Regeln für jede Sitzung

Lernspiel für ältere Menschen in der Schweiz und in Deutschland: Sie lernen, wie sie die Claude-App auf dem iPhone holen, sicher einrichten und mit eigenen Arztberichten nutzen (erklären lassen, zweite Sicht, mögliche Ursachen mit dem Arzt besprechen). Anrede: Du. Der Besitzer ist kein Programmierer: Erkläre alles kurz, auf Deutsch, in Schweizer Schreibweise (immer «ss»), ohne Fachbegriffe.

## Zuerst lesen

- `docs/STAND.md`: Version, was fertig ist, was offen ist.
- `docs/REGELN.md`: Lernregeln, Gesundheitsinhalte, Länder, Datenregeln.
- `docs/ARCHITEKTUR.md`: Ordner, Datenformate, wie man einen Besuch ergänzt.
- `docs/FEATURES.md`: was das Spiel kann. Vor jeder Änderung abgleichen, damit nichts verloren geht.
- Planung, Recherche und Entscheide liegen im Claude-Projekt «Spielerisch Lernen»: `claude/ZWEITBLICK-PROJEKT.md`, `ZWEITBLICK-KONZEPT.md`, `ZWEITBLICK-RECHERCHE.md`, `ZWEITBLICK-ENTSCHEIDE.md`, `ZWEITBLICK-STAND.md`.
- Die anderen Dokumente im Claude-Projekt und das Repository `game-how-to-use-claudecode` gehören zum KI-Studio. Nur als Beispiel lesen, nie ändern.

## Befehle

- `npm run pruefen`: alle Tests und die Prüfung der Lerninhalte. Muss vor jedem Commit bestehen.
- `npm test`: nur die Tests.
- `npm run inhalte`: nur die Prüfung der Lerninhalte.
- `npm start`: Spiel lokal ansehen unter http://localhost:8080.

Keine Pakete, kein Build-Schritt. Keine Abhängigkeit ohne Entscheid.

## Feste Regeln

1. **Drei Schichten.** `spiel/code/logik/` kennt keine Oberfläche. `spiel/code/oberflaeche/` enthält keine Spielregeln und keine festen Texte. Inhalte liegen als JSON in `spiel/inhalte/`.
2. **Alle sichtbaren Texte in `spiel/inhalte/de/`.** Was je nach Land anders ist, steht als Platzhalter `[[name]]` im Text. Die Werte stehen in `texte.json` unter `laender.ch` und `laender.de`.
3. **Gesundheit: so wenig Medizin wie möglich.** Jede medizinische Angabe (Werte, Ursachen, Medikamente) steht in `spiel/inhalte/fakten.json` mit zwei unabhängigen Quellen (`quelle`, `quelle2`) und Prüfdatum. Notrufnummern und Rechte mit einer offiziellen Quelle. Keine Ratschläge zu Behandlung oder Medikamenten. Lupe verweist immer an Ärztin oder Arzt. Notfall heisst immer: Notruf statt Chat.
4. **Alle Fälle sind erfunden.** Das Spiel fragt nie nach echten Gesundheitsdaten und schickt nichts weg.
5. **Fakten zur Claude-App** (Namen, Knöpfe, Fristen) nur mit offizieller Quelle und Prüfdatum in `fakten.json`. Knopf-Beschriftungen der echten App gelten als «nicht geprüft», bis der Besitzer sie am iPhone bestätigt.
6. **Texte für ältere Menschen:** kurze Sätze, kein Textblock über 30 Wörter, keine Emoji, jeder Knopf mit Text.
7. **Bedienung:** Grundschrift 20 px, Klickflächen mindestens 44 × 44 px (Ziel 52), Kontrast 4,5:1 auch bei gesperrten Antworten, hell und dunkel, nichts nur über Gesten.
8. **Immer ein Ausweg.** Wer nicht weiterkommt, darf weitergehen und holt das Thema später nach.
9. **Gespeicherte Daten nie verwerfen.** Neue Spielstand-Version heisst: `STAND_VERSION` erhöhen und `wandleUm` erweitern, mit Test.
10. **Keine fremden Server, kein Tracking, keine Cookies.** Eigene Bilder (SVG), keine Logos, keine Bildschirmfotos echter Apps.
11. **Nichts löschen, umbauen, veröffentlichen oder kostenpflichtig machen ohne Ja des Besitzers.**

## Arbeitsweise

- Erst Plan, dann bauen. Neue Logik bekommt einen Test, jeder behobene Fehler auch.
- Erst «fertig» melden, wenn `npm run pruefen` besteht und die Seite im Browser angesehen wurde: 320, 390, 768 und 1280 px, hell und dunkel.
- Jede Auslieferung: Versionsnummer in `package.json` und in `texte.json` (`fuss`), Eintrag in `docs/CHANGELOG.md` (Neu, Geändert, Behoben), `docs/STAND.md` und `docs/FEATURES.md` nachführen.
- Kleine Commits auf `main` mit klarer deutscher Nachricht.
- Fragen als Auswahl mit höchstens vier Antworten, Empfehlung zuerst.

## Sprache im Code

Namen und Kommentare auf Deutsch, ohne Umlaute in Dateinamen und Bezeichnern (`pruefen`). Ein Besuch heisst im Code `auftrag` (aus dem KI-Studio übernommen).
