# Veröffentlichen

Noch nicht veröffentlicht. Veröffentlicht wird nur nach ausdrücklichem Ja des Besitzers.

## Wichtig vorher

- GitHub Pages gibt es mit dem Gratis-Konto nur für öffentliche Repositories, für private erst ab GitHub Pro (bezahlt). Quelle: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages, geprüft 16.11.2026.
- Wer die Seite besucht, hinterlässt bei GitHub seine IP-Adresse (Sicherheitsprotokoll von GitHub, gleiche Quelle). Das steht im Spiel unter «Deine Daten».
- Was einmal öffentlich war, bleibt in Kopien und in der Geschichte des Repositorys auffindbar.
- Vor dem öffentlichen Teilen: Impressum und Datenschutzhinweis klären (siehe `docs/BACKLOG.md`).

## Einmal einrichten (Besitzer)

1. Auf github.com ein neues, leeres Repository «zweitblick» anlegen (privat, ohne README).
2. Claude Schreibzugriff darauf geben. Claude lädt dann den Stand hoch.
3. Wenn veröffentlicht werden soll: Repository öffentlich machen, dann unter «Settings», «Pages», bei «Source» den Eintrag «GitHub Actions» wählen.

## Jede Veröffentlichung

1. `npm run pruefen` besteht, Version und `docs/CHANGELOG.md` sind nachgeführt.
2. Auf github.com im Reiter «Actions» den Ablauf «Spiel veröffentlichen» wählen und «Run workflow» drücken.
3. Der Ablauf prüft alles nochmals. Nur wenn alles besteht, wird der Ordner `spiel/` veröffentlicht.
4. Danach die Seite auf dem iPhone öffnen und mit dem lokalen Stand vergleichen (Version unten auf der Startseite).
