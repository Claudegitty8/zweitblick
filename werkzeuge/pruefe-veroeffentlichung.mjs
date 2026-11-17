// Prüft vor dem Veröffentlichen, ob alles zum gewählten Betrieb passt.
// - Testumgebung (betreiber.json: testumgebung true): Angaben dürfen fehlen, die Seite muss aber
//   «noindex» tragen, damit Suchmaschinen sie nicht aufnehmen.
// - Offizielle Version (testumgebung false): Impressum vollständig, kein «noindex» mehr.
// Läuft im Ablauf «Spiel veröffentlichen». Fehlt etwas, wird nichts veröffentlicht.
// Aufruf: npm run veroeffentlichung
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DATEI = new URL('../spiel/inhalte/betreiber.json', import.meta.url);
const SEITE = new URL('../spiel/index.html', import.meta.url);
const text = (wert) => (typeof wert === 'string' ? wert.trim() : '');

// Gibt eine Liste von Fehlern zum Impressum zurück. Leer heisst: alles da.
export function pruefeBetreiber(betreiber) {
  const b = betreiber && typeof betreiber === 'object' ? betreiber : {};
  const fehler = [];
  if (text(b.name).split(/\s+/).length < 2) fehler.push('Name: Vor- und Nachname fehlen');
  // Ein Postfach allein reicht nicht, es braucht eine Strasse.
  if (!text(b.strasse)) fehler.push('Strasse und Hausnummer fehlen');
  else if (/^post(fach|box)|^p\.?\s?o\.?\s?box|^case postale/i.test(text(b.strasse))) fehler.push('Ein Postfach allein reicht nicht, es braucht eine Strasse');
  if (!/^\d{4,5}\s+\S/.test(text(b.ort))) fehler.push('Ort fehlt (Postleitzahl und Ort, zum Beispiel «8000 Zürich»)');
  if (!text(b.land)) fehler.push('Land fehlt');
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/.test(text(b.email))) fehler.push('E-Mail-Adresse fehlt oder ist ungültig');
  return fehler;
}

// Prüft Betrieb und Seite zusammen. Gibt { fehler, hinweise } zurück.
export function pruefeVeroeffentlichung(betreiber, seite) {
  const noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(seite);
  if (betreiber?.testumgebung === true) {
    const fehler = noindex ? [] : ['Testumgebung ohne «noindex» in index.html: Suchmaschinen würden sie aufnehmen'];
    const hinweise = pruefeBetreiber(betreiber).length ? ['Testumgebung: Impressum ohne Angaben zum Betreiber'] : [];
    return { fehler, hinweise };
  }
  const fehler = pruefeBetreiber(betreiber);
  if (noindex) fehler.push('Offizielle Version mit «noindex» in index.html: bitte entfernen');
  return { fehler, hinweise: [] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { fehler, hinweise } = pruefeVeroeffentlichung(JSON.parse(await readFile(DATEI, 'utf8')), await readFile(SEITE, 'utf8'));
  for (const h of hinweise) console.log(`Hinweis: ${h}`);
  if (fehler.length) {
    console.error('Nicht bereit zum Veröffentlichen:');
    for (const f of fehler) console.error(`- ${f}`);
    process.exit(1);
  }
  console.log('Bereit zum Veröffentlichen.');
}
