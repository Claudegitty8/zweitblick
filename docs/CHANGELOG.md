# Änderungen

## 0.13 (17. November 2026): Echt wirkendes iPhone und selber tippen

### Neu
- Das nachgebaute iPhone wirkt echt: Rahmen, Statusleiste, Home-Bildschirm mit gezeichneten App-Kacheln, schwarze Kamera mit rundem Auslöser, Fenster von unten, Rückfragen, Listen mit Pfeilen, Schalter, Leisten oben und unten. Alles selbst gezeichnet, ohne Logos.
- Selber tippen: In 18 Feldern schreibt man selbst, zum Beispiel die Bitte an Claude, den Projektnamen oder «Claude» im App Store. Es zählen die wichtigen Wörter, eigene Worte und kleine Tippfehler sind erlaubt. Fehlt etwas, sagt das Spiel welches Wort.
- «Für mich schreiben» füllt das Feld mit einem Beispiel, wenn das Tippen zu mühsam ist.
- Notruf: Die Nummer tippt man auf nachgebauten Telefon-Tasten ein, mit «Löschen».
- Zwei neue Bilder: die Akte als Tabelle und eine Verlaufsgrafik, beide in Claudes Antwort.
- Die Inhaltsprüfung kennt Bildschirm-Arten, Symbole, Knopf-Arten und Felder. Jedes Beispiel muss zu seinen wichtigen Wörtern passen.

### Geändert
- Abläufe mit Schreiben sind kürzer: Schreiben und Senden geschieht auf demselben Bildschirm (zusammen 97 statt 115 Bildschirme).
- Über dem iPhone steht, in welcher App man ist. Der Hinweis «vereinfacht nachgebaut» steht darunter.

## 0.12 (17. November 2026): Alle Übungen am iPhone

### Neu
- Liste «Alle Übungen am iPhone»: alle 23 Übungen auf einen Blick, nach Besuchen geordnet, mit Anzahl Schritte. Jede Übung geht jederzeit, auch bevor man das Thema gespielt hat.
- Erreichbar in Hilfe und Einstellungen (eigene Karte «Am iPhone üben») und oben im Spickzettel, auch wenn er noch leer ist.
- Jede Übung hat einen kurzen Namen nach der Handlung, zum Beispiel «Dokumente scannen in der App Notizen». Darunter steht das Thema.

### Geändert
- Zurück-Knöpfe führen genau dorthin, woher man kam (Liste, Hilfe, Spickzettel, Runde), und der Fokus steht wieder auf dem gewählten Knopf.

## 0.11 (17. November 2026): Am iPhone üben

### Neu
- «Am iPhone üben»: Zu 23 Themen tippt man Schritt für Schritt auf einem nachgebauten iPhone, als ob man es selber macht. 115 Bildschirme, oben steht immer, was zu tun ist.
- Dokumente scannen in der App Notizen mit Bildern: neue Notiz, Büroklammer, «Dokumente scannen», gelber Rahmen, zweite Seite, Sichern, in Dateien sichern, in Claude anhängen.
- Weitere Abläufe unter anderem: App im App Store finden, Konto, Datenschutz-Schalter, Projekt und Anweisungen, Foto zuschneiden, Chat löschen, Notruf wählen, Akte anlegen, nachführen und als Grafik auslesen.
- Falsch getippt: «Nicht hier» an der Stelle und ein Hinweis. Nach zwei Fehlern zeigt das Spiel die richtige Stelle. Dazu die Knöpfe «Zeig mir, wo» und «Einen Schritt zurück».
- Knopf «Am iPhone üben» nach jedem Thema und auf jeder Karte im Spickzettel (nicht beim Drucken). Der Zurück-Knopf führt dorthin zurück.
- Die Inhaltsprüfung verlangt pro Bildschirm eine Anleitung und genau eine richtige Stelle. Tests spielen jeden Ablauf durch.

### Geändert
- Nichts entfernt. Der Übungsstand wird nicht gespeichert, der Spielstand bleibt unverändert.

## 0.10 (17. November 2026): Besuch «Eine Akte für alle Werte»

### Neu
- Besuch 2 mit Herrn Baumann, gleich nach Frau Gerber: Akte als Tabelle anlegen, Akte nachführen, Trends auslesen. 19 Aufgaben, alle vier Übungsformen.
- Lupe zeigt typische Fehler: kein Datum (kein Verlauf), keine Quelle (nicht nachprüfbar), gerundete Werte, zwei Akten gleichzeitig, «Bin ich gesund?» (keine Diagnose), «Tablette absetzen?» (nie selbst entscheiden).
- Karten «So ist es in echt»: Erstellen von Dateien einschalten, Tabelle sichern, nachführen, Grafik und Fragen mit den Original-Befunden zum Arzt.
- Lexikon: Gesundheitsakte, Nachführen, Diagramm, Tabelle (Excel). Zwei Fakten zum Erstellen von Dateien mit Quelle.

### Geändert
- Die übrigen Besuche rücken eine Stelle nach hinten (Kapitel 3 bis 8). Frau Gerber kündigt jetzt Herrn Baumann an.
- Wer Frau Gerber schon fertig hat, bekommt als Nächstes Herrn Baumann. Gespeicherte Stände bleiben erhalten.

## 0.9.2 (17. November 2026): Testversion mit Impressum und Datenschutz

### Neu
- Seiten «Impressum» und «Datenschutz», erreichbar über die Fusszeile jeder Hauptseite (auch schon bei der Land-Wahl).
- Band «Testversion» oben auf jeder Seite. Die Testumgebung trägt «noindex» und erscheint nicht in Suchmaschinen.
- Angaben zum Betreiber in `spiel/inhalte/betreiber.json`. In der Testumgebung bleiben sie leer (Wunsch des Besitzers), das Impressum sagt dann: Angaben folgen vor der offiziellen Veröffentlichung.
- Prüfung vor dem Veröffentlichen (`npm run veroeffentlichung`, auch im Ablauf «Spiel veröffentlichen»): Testumgebung nur mit «noindex», offizielle Version nur mit vollständigem Impressum und ohne «noindex».
- Zwei Fakten zum Hoster GitHub (IP-Adressen, Data Privacy Framework) mit Quelle.

## 0.9.1 (17. November 2026): Hinweis «nur für das Gespräch mit dem Arzt»

### Neu
- Karte «Wichtig: nur für das Gespräch mit dem Arzt»: Claudes Antworten sind keine Diagnose. Mit den Original-Befunden zur Ärztin oder zum Arzt. Nie selbst entscheiden, auch nicht nach den Befunden. Erscheint bei der Land-Wahl, im Café, oben auf dem Spickzettel (auch gedruckt) und in Hilfe und Einstellungen.
- Die Inhaltsprüfung verlangt diesen Hinweis, ein Test prüft ihn.
- Lizenz: Code unter MIT, Texte und Bilder unter CC BY 4.0.

## 0.9 (16. November 2026): erste vollständige Fassung, nicht veröffentlicht

### Neu
- Gesundheits-Café mit 7 Besuchen und 21 Themen in 7 Kapiteln: Blutwerte verstehen, Gute Fotos von Berichten, App holen und einrichten, Ein Ordner für alles, Die zweite Sicht, Mögliche Ursachen, Sicher bleiben.
- 133 Aufgaben: Zusammenstecken 42, Vorhersagen 64, Antippen 20, Sortieren 7.
- Neue Übungsform «Antippen» auf einem vereinfacht nachgebauten iPhone.
- Kapitel «Gute Fotos» mit 14 eigenen Bildern: 9 Fehler (verwackelt, abgeschnitten, zu weit weg, schief, Schatten, Blitz, Finger, zu dunkel, zerknittert), 3 gute Beispiele (Foto, Scan, PDF), «Seite 1 von 2» und ein Laborbericht.
- Land-Wahl Schweiz oder Deutschland mit 15 Länderwerten.
- Karten «So ist es in echt» nach jedem Thema und Spickzettel zum Drucken.
- Lexikon mit 32 Begriffen, 31 Fakten mit Quelle und Prüfdatum, 5 medizinische mit zweiter Quelle.
- Notfall-Karte und Notrufzeile mit der Nummer des Landes.

### Übernommen aus dem KI-Studio (angepasst)
- Lernregeln, Ausweg, Wiederholungen, Schnelltest, Springen mit Rückgängig, freiwillige Fragen, Spielstand sichern und laden, Umwandlung alter Stände, Inhaltsprüfung, Tests.
- Entfernt, weil hier ohne Nutzen: Tokens und Budget, Einrichtung (Kaufen), Kiwi.

### Behoben während der Prüfung
- Länder-Knöpfe beim ersten Start waren riesig.
- Lange Wörter (zum Beispiel «Versichertennummer») ragten bei 320 px und sehr grosser Schrift aus dem Bild.
- Knöpfe «Hoch» und «Runter» passten bei 320 px nicht neben den Text.
- Lupes Sprechblase war auf schmalen Handys nur ein Wort breit.
- Gesperrte Antworten waren zu blass (Kontrast unter 4,5:1), im dunklen Modus auf dem nachgebauten iPhone kaum lesbar.
- Nach «Lösung zeigen» blieb der Hinweis von «Zeig mir, wo» stehen.
- Bilder im Spickzettel fehlten beim Drucken (verzögertes Laden), Bilder waren auf dem Handy zu klein.
- Rückfragen: Escape bricht jetzt ab, der Fokus liegt auf «Abbrechen».
- Schritt «Lücke» heisst jetzt «Ergänzen».
