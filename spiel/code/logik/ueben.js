// «Am iPhone üben»: ein nachgebauter Ablauf in der echten App, Bildschirm für Bildschirm.
// Reine Logik: welcher Bildschirm dran ist, ob ein Tippen stimmt und wann die richtige Stelle gezeigt wird.
// Ein Ablauf ist eine Liste von Bildschirmen. Jeder hat genau ein Element mit «ziel: true».

// Diese Elemente kann man antippen. Text und Chat-Nachrichten sind nur zum Lesen.
export const TIPPBAR = ['knopf', 'feld', 'schalter', 'datei', 'bild'];

// Nach so vielen falschen Versuchen zeigt das Spiel die richtige Stelle von selbst.
export const ZEIGEN_NACH = 2;

export function istTippbar(element) {
  return Boolean(element) && TIPPBAR.includes(element.typ);
}

export function zielIndex(bildschirm) {
  return (bildschirm?.elemente ?? []).findIndex((element) => element.ziel === true);
}

export function neueUebung() {
  return { schritt: 0, fehler: 0, gezeigt: false, fertig: false };
}

// Verbucht ein Tippen auf das Element an Stelle «index».
// Ergebnis: «richtig» (nächster Bildschirm), «fertig» (letzter geschafft), «falsch» oder «nichts» (nicht tippbar).
export function tippe(stand, ablauf, index) {
  const bildschirm = ablauf[stand.schritt];
  if (stand.fertig || !bildschirm) return { stand, ergebnis: 'nichts' };
  const element = bildschirm.elemente[index];
  if (!istTippbar(element)) return { stand, ergebnis: 'nichts' };
  if (element.ziel === true) {
    const naechster = stand.schritt + 1;
    const fertig = naechster >= ablauf.length;
    return {
      stand: { schritt: fertig ? stand.schritt : naechster, fehler: 0, gezeigt: false, fertig },
      ergebnis: fertig ? 'fertig' : 'richtig',
    };
  }
  const fehler = stand.fehler + 1;
  return { stand: { ...stand, fehler, gezeigt: stand.gezeigt || fehler >= ZEIGEN_NACH }, ergebnis: 'falsch' };
}

// «Zeig mir, wo»: Die richtige Stelle wird sofort markiert.
export function zeigeZiel(stand) {
  return { ...stand, gezeigt: true };
}

// Einen Bildschirm zurück. Am Anfang bleibt man am Anfang.
export function schrittZurueck(stand) {
  return { schritt: Math.max(0, stand.schritt - (stand.fertig ? 0 : 1)), fehler: 0, gezeigt: false, fertig: false };
}

// Liste aller Übungen, nach Besuchen geordnet wie im Spiel. Nur Themen mit einem Ablauf.
// Jedes Thema erscheint nur einmal. Besuche ohne Übung fallen weg.
export function uebungsListe(auftraege, konzepte) {
  const gesehen = new Set();
  return auftraege.map((auftrag) => ({
    auftrag: auftrag.id,
    thema: auftrag.thema,
    konzepte: auftrag.runden
      .map((runde) => runde.konzept)
      .filter((id) => id && konzepte[id]?.ueben?.length && !gesehen.has(id) && gesehen.add(id)),
  })).filter((gruppe) => gruppe.konzepte.length > 0);
}
