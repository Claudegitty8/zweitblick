// Einstieg: holt Inhalte, Speicher und Übungs-KI und schaltet zwischen den Ansichten um.
import { ladeRoh, inhalteFuerLand } from './inhalte/lader.js';
import { erstelleSpeicher } from './speicher/speicher.js';
import { erstelleKi } from './ki/schnittstelle.js';
import { zeigeCafe, zeigeLand } from './oberflaeche/cafe.js';
import { zeigeRunde, zeigeZwischen } from './oberflaeche/runde.js';
import { zeigeLexikon, zeigeEinstellungen } from './oberflaeche/lexikon.js';
import { zeigeSchnelltest, zeigeUmfrage } from './oberflaeche/extras.js';
import { zeigeSpickzettel } from './oberflaeche/spickzettel.js';
import { zeigeImpressum, zeigeDatenschutz } from './oberflaeche/recht.js';
import { wendeSchriftAn } from './oberflaeche/schrift.js';
import { pruefeLauf } from './logik/extras.js';

const ANSICHTEN = {
  cafe: zeigeCafe,
  land: zeigeLand,
  runde: zeigeRunde,
  zwischen: zeigeZwischen,
  lexikon: zeigeLexikon,
  einstellungen: zeigeEinstellungen,
  schnelltest: zeigeSchnelltest,
  umfrage: zeigeUmfrage,
  spickzettel: zeigeSpickzettel,
  impressum: zeigeImpressum,
  datenschutz: zeigeDatenschutz,
};

// Ohne Internet spielen: Ein kleiner Helfer im Browser (Service Worker) legt alle Dateien auf dem Gerät ab.
// Wo das nicht erlaubt ist (zum Beispiel in der Vorschau), läuft das Spiel normal weiter, nur eben mit Internet.
const ABLAGE = 'zweitblick-ablage';
async function richteOfflineEin() {
  try {
    if (!('serviceWorker' in navigator) || !('caches' in globalThis)) return;
    await navigator.serviceWorker.register(new URL('../sw.js', import.meta.url));
    const geladen = performance.getEntriesByType('resource')
      .map((eintrag) => eintrag.name)
      .filter((adresse) => adresse.startsWith(location.origin));
    const ablage = await caches.open(ABLAGE);
    await ablage.addAll([...new Set([location.href.split('#')[0], ...geladen])]);
  } catch {
    // Kein Offline-Betrieb auf diesem Gerät oder an diesem Ort. Das Spiel selbst ist davon nicht betroffen.
  }
}

// Testumgebung: Ein Band oben auf jeder Seite sagt, dass dies eine Testversion ist.
// Ein- und ausgeschaltet wird es in spiel/inhalte/betreiber.json (testumgebung).
function zeigeTesthinweis(app) {
  if (app.roh.betreiber?.testumgebung !== true) return;
  const t = app.inhalte.texte.app;
  const band = document.createElement('div');
  band.className = 'testband';
  band.setAttribute('role', 'note');
  const titel = document.createElement('strong');
  titel.textContent = `${t.testTitel}: `;
  band.append(titel, t.testText);
  document.body.prepend(band);
}

async function start() {
  const wurzel = document.getElementById('app');
  try {
    const roh = await ladeRoh('de');
    const speicher = erstelleSpeicher();
    const gelesen = speicher.laden();
    const app = {
      roh,
      inhalte: inhalteFuerLand(roh, gelesen.einstellungen.land),
      speicher,
      ki: erstelleKi('simuliert'),
      // Passt ein angefangener Besuch nach einem Update nicht mehr zu den Inhalten, beginnt er neu.
      stand: pruefeLauf(gelesen, roh.auftraege),
      // Jede Änderung am Spielstand wird sofort gespeichert.
      setze(stand) {
        this.stand = stand;
        speicher.speichern(stand);
      },
      // Land wählen: Die Inhalte werden mit den Werten dieses Landes neu zusammengesetzt.
      setzeLand(land) {
        this.inhalte = inhalteFuerLand(roh, land);
        this.setze({ ...this.stand, einstellungen: { ...this.stand.einstellungen, land } });
      },
      // Der laufende Besuch, sonst der nächste offene. Sind alle erledigt: null.
      auftrag() {
        const { lauf, erledigt } = this.stand;
        if (lauf) return this.inhalte.auftraege.find((a) => a.id === lauf.auftrag);
        return this.inhalte.auftraege.find((a) => !erledigt.includes(a.id)) ?? null;
      },
    };
    const nav = {
      zu(name, daten) {
        wurzel.replaceChildren();
        (ANSICHTEN[name] ?? zeigeCafe)(wurzel, app, nav, daten);
        window.scrollTo(0, 0);
        wurzel.focus({ preventScroll: true });
      },
    };
    wendeSchriftAn(app.stand.einstellungen.schrift);
    zeigeTesthinweis(app);
    nav.zu('cafe');
    richteOfflineEin();
  } catch (fehler) {
    wurzel.replaceChildren();
    const meldung = document.createElement('p');
    meldung.className = 'fehler';
    meldung.textContent = `Zweitblick konnte nicht starten: ${fehler.message}. Bitte lade die Seite neu. Hilft das nicht, prüfe die Internetverbindung.`;
    wurzel.append(meldung);
  }
}

start();
