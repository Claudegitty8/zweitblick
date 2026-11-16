// Lädt die Lerninhalte. Inhalte sind Daten (JSON), kein Programmcode.
//
// Was je nach Land anders ist (Notrufnummer, Wege zu den Berichten), steht in den Inhalten
// als Platzhalter wie [[notruf]]. Die Werte dafür stehen in texte.json unter «laender».
// So bleibt jede Aufgabe eine einzige Datei für beide Länder.
const BASIS = new URL('../../inhalte/', import.meta.url);

// Die Besuche in Spielreihenfolge. Neue Besuche werden hier eingetragen.
export const AUFTRAEGE = ['gerber', 'meier', 'brunner-iphone', 'brunner-ordner', 'keller', 'rossi', 'hofmann'];

// Platzhalter für Länderwerte: zwei eckige Klammern um einen Namen aus Buchstaben.
export const LAND_PLATZHALTER = /\[\[([a-zA-Z]+)\]\]/g;

async function ladeJson(pfad) {
  const antwort = await fetch(new URL(pfad, BASIS));
  if (!antwort.ok) throw new Error(`Inhalt fehlt: ${pfad}`);
  return antwort.json();
}

// Ersetzt in allen Texten die Länderwerte. Unbekannte Platzhalter bleiben stehen (die Inhaltsprüfung findet sie).
export function setzeLandEin(wert, werte) {
  if (typeof wert === 'string') return wert.replace(LAND_PLATZHALTER, (ganz, name) => werte[name] ?? ganz);
  if (Array.isArray(wert)) return wert.map((eintrag) => setzeLandEin(eintrag, werte));
  if (wert && typeof wert === 'object') {
    return Object.fromEntries(Object.entries(wert).map(([schluessel, eintrag]) => [schluessel, setzeLandEin(eintrag, werte)]));
  }
  return wert;
}

// Lädt alles einmal. Das Ergebnis ist «roh»: noch mit Platzhaltern.
export async function ladeRoh(sprache = 'de') {
  const [regeln, lehrplan, texte, lexikon, umfrage, fakten, ...auftraege] = await Promise.all([
    ladeJson('regeln.json'),
    ladeJson('lehrplan.json'),
    ladeJson(`${sprache}/texte.json`),
    ladeJson(`${sprache}/lexikon.json`),
    ladeJson(`${sprache}/umfrage.json`),
    ladeJson('fakten.json'),
    ...AUFTRAEGE.map((id) => ladeJson(`${sprache}/besuche/${id}.json`)),
  ]);
  return { regeln, lehrplan, texte, lexikon, auftraege, umfrage: umfrage.fragen, fakten: fakten.fakten };
}

// Macht aus den rohen Inhalten die Inhalte für ein Land. Ohne gewähltes Land gilt die Schweiz,
// bis der Spieler gewählt hat (die Wahl kommt vor dem ersten Besuch).
export function inhalteFuerLand(roh, land) {
  const werte = roh.texte.laender?.[land] ?? roh.texte.laender?.ch ?? {};
  return setzeLandEin(roh, werte);
}
