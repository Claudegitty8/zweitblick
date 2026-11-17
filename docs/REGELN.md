# Regeln: Lernlogik, Gesundheitsinhalte, Länder, Daten

## Lernlogik (Zahlen in `spiel/inhalte/regeln.json`)

| Regel | Wert | Wo im Code |
|---|---|---|
| Ein Thema sitzt nach so vielen Punkten in verschiedenen Aufgaben | 3 | `logik/meisterschaft.js` |
| Punkt nur beim ersten Versuch, höchstens mit dem Tipp | – | `oberflaeche/runde.js` (zaehlt), `logik/ablauf.js` |
| Wiederholung nach so vielen Runden, wächst bei Erfolg | 1, 3, 7 | `naechsterAbstand`, `verbucheWiederholung` |
| Misslungene Wiederholung | eine Stufe zurück, nie unter 0 | `verbucheWiederholung` |
| Ausweg, wenn so viele Durchgänge ohne Punkt | 2 × Anzahl freier Aufgaben (8) | `auswegOffen` |
| Nach dem Ausweg | Thema «nachholen»: jede richtige Wiederholung zählt als Punkt | `verbucheWiederholungsErgebnis` |
| Schnelltest | 3 Aufgaben pro Thema, alle richtig = Thema sitzt | `logik/extras.js` |
| Springen | Themen davor gelten als gemeistert, kommen als Wiederholung | `springeZuAuftrag` |
| Mischrunde am Ende jedes Besuchs | jede Aufgabe muss gelöst werden, beliebig viele Versuche | `verbucheFrei` |
| Am iPhone üben: Stelle zeigen nach so vielen Fehlern auf einem Bildschirm | 2 | `logik/ueben.js` (`ZEIGEN_NACH`) |
| Am iPhone üben: Punkte und Speichern | keine Punkte, nichts gespeichert, beliebig oft | `oberflaeche/ueben.js` |
| Selber tippen: was zählt | alle wichtigen Wörter drin; Gross und klein, Satzzeichen und ä/ae egal | `pruefeEingabe` |
| Selber tippen: erlaubte Tippfehler pro Wort | 0 bis 4 Buchstaben, 1 ab 5, 2 ab 8 (vertauschte Buchstaben zählen als einer) | `logik/ueben.js` |
| Selber tippen: falsch oder leer | zählt nicht als Fehler, das Spiel nennt die fehlenden Wörter | `tippe` |
| Telefon-Tasten | Nummer muss genau stimmen | `pruefeEingabe` |

Sonderfälle: Probieren lässt sich nie lösen (die Inhaltsprüfung testet alle Kombinationen). Bei «Ergänzen» ist ein Teil vorgegeben. Jedes Fehlbild muss mit einer Auswahl erreichbar sein.

## Gesundheitsinhalte

- So wenig Medizin wie möglich: nur Hämoglobin, Referenzbereich, Schwindel, Müdigkeit, Röntgen-Abnutzung, Blutdruck-Liste als erfundene Beispiele.
- Medizinische Angaben mit zwei unabhängigen Quellen: `hb`, `referenzbereich`, `schwindel`, `muedigkeit`, `nicht-absetzen` in `fakten.json` (`quelle`, `quelle2`). Bei `muedigkeit` belegt die zweite Quelle Blutarmut und Schilddrüse, «Medikamente» nur die erste.
- Lupe stellt keine Diagnose für den Spieler. Mögliche Ursachen immer mit «was spricht dafür, was dagegen, was würde es klären» und «mit dem Arzt besprechen».
- Keine Ratschläge zu Medikamenten ausser: nicht ohne Rücksprache absetzen.
- Notfall (Brustschmerz, Atemnot, plötzliche Lähmung oder Sprachstörung): sofort Notruf, nicht chatten, nicht warten.
- Hinweis im Spiel: «nicht von einer Fachperson geprüft» (Über dieses Spiel).
- Karte «Wichtig: nur für das Gespräch mit dem Arzt» (`arztHinweisTitel`, `arztHinweis` in `texte.json`): Antworten sind keine Diagnose, mit den Original-Befunden zur Ärztin oder zum Arzt, nie selbst entscheiden. Pflicht laut Inhaltsprüfung.

## Länder (Platzhalter in `texte.json`, `laender`)

| Platzhalter | Schweiz | Deutschland |
|---|---|---|
| `[[notruf]]` | 144 | 112 |
| `[[dossier]]` | elektronisches Patientendossier (EPD) | elektronische Patientenakte (ePA) |
| `[[kopieRecht]]` | Gratis-Kopie der Krankengeschichte | erste Kopie der Patientenakte kostenlos |
| `[[nummer]]` | AHV-Nummer | Versichertennummer |
| `[[bereitschaft]]` | ärztlicher Notfalldienst der Region | Bereitschaftsdienst 116117 |

Weitere: `land`, `dossierKurz`, `dossierWeg`, `nummerLang`, `waehrung`, `arztpraxis`, `quelleKopie`, `quelleDossier`, `quelleNotruf`, `nummerBeispiel`. Die Inhaltsprüfung setzt jedes Land ein und meldet übrig gebliebene Platzhalter. Ohne gewähltes Land gilt vorerst die Schweiz.

## Fakten zur Claude-App

- In `fakten.json` mit Quelle und Prüfdatum: App-Name, Anbieter, Alter, iOS-Version, Anmelden, Training-Schalter und Fristen, Löschen, Inkognito, Projekte, Anhängen, Gesundheitsfunktionen nur in den USA.
- Die Knopf-Beschriftungen auf Deutsch sind «nicht geprüft», bis der Besitzer sie am iPhone bestätigt. Jede «So ist es in echt»-Karte nennt den Stand und sagt, dass Knöpfe anders heissen können.
- Dasselbe gilt für die nachgebauten Bildschirme in «Am iPhone üben» (Claude, Notizen, Kamera, Fotos, App Store, Telefon, Teilen). Jeder Bildschirm sagt: vereinfacht nachgebaut, nicht geprüft. Keine Bildschirmfotos echter Apps, keine Logos.
- Vor jeder Version neu prüfen, sonst alle drei Monate.

## Daten

- Gespeichert wird nur der Spielstand im Browser (`localStorage`, Schlüssel `zweitblick-stand`). Dazu `zweitblick-stand-vor-sprung` (Rückgängig) und `zweitblick-stand-alt` (unveränderte Kopie eines alten Stands).
- Spielstand-Version: `STAND_VERSION = 1`. Ältere oder fremde Stände werden mit `wandleUm` übernommen, unbekannte Werte durch Standardwerte ersetzt. Ein laufender Besuch, der nicht mehr passt, beginnt neu (`pruefeLauf`).
- Geladene Dateien: höchstens 2 MB, nur wenn sie wie ein Spielstand aussehen. Nie ungeprüft übernommen.
- Keine Cookies, keine fremden Server, keine Statistik.
