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

// --- Selber tippen ---
// Ein Element «eingabe» ist ein Feld, in das man selbst schreibt. Geprüft wird beim Tippen auf das Ziel (zum Beispiel «Senden»).
// Es zählt nicht der genaue Wortlaut, sondern ob die wichtigen Wörter («schluessel») drin sind. Kleine Tippfehler sind erlaubt.
// Bei «art: ziffern» (Telefon-Tasten) muss die Nummer genau stimmen.

// Kleinbuchstaben, Umlaute ausgeschrieben, Satzzeichen weg: «Erklär mir!» wird «erklaer mir».
export function normalisiere(text) {
  return String(text ?? '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Anzahl Tippfehler zwischen a und b: Buchstabe zu viel, zu wenig, falsch oder zwei vertauscht
// (Damerau-Levenshtein-Abstand, einfache Form).
export function abstand(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const kosten = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + kosten);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Erlaubte Tippfehler: keiner bei kurzen Wörtern, einer ab 5, zwei ab 8 Buchstaben.
function toleranz(wort) {
  if (wort.length >= 8) return 2;
  return wort.length >= 5 ? 1 : 0;
}

// Ein Wort zählt als getroffen, wenn ein getipptes Wort damit beginnt (auch «einfachen» für «einfach»)
// oder fast gleich anfängt (Tippfehler).
function wortGetroffen(wort, woerter) {
  const erlaubt = toleranz(wort);
  return woerter.some((getippt) => getippt.startsWith(wort)
    || (erlaubt > 0 && abstand(getippt.slice(0, wort.length + 1), wort) <= erlaubt)
    || (erlaubt > 0 && abstand(getippt.slice(0, wort.length), wort) <= erlaubt));
}

// Prüft, was in einem Feld steht. Ergebnis: { passt, leer, fehlt: [wichtige Wörter, die fehlen] }.
export function pruefeEingabe(element, text) {
  const roh = String(text ?? '');
  if (element?.art === 'ziffern') {
    const soll = String(element.vorschlag ?? '').replace(/\D/g, '');
    const ist = roh.replace(/\D/g, '');
    const passt = soll !== '' && ist === soll;
    return { passt, leer: ist === '', fehlt: passt ? [] : [element.vorschlag] };
  }
  const getippt = normalisiere(roh);
  const schluessel = element?.schluessel ?? [];
  if (getippt.replace(/ /g, '').length < 2) return { passt: false, leer: true, fehlt: schluessel };
  const woerter = getippt.split(' ');
  const fehlt = schluessel.filter((eintrag) => {
    const gesucht = normalisiere(eintrag);
    if (getippt.includes(gesucht)) return false;
    return !gesucht.split(' ').every((teil) => wortGetroffen(teil, woerter));
  });
  return { passt: fehlt.length === 0, leer: false, fehlt };
}

// Verbucht ein Tippen auf das Element an Stelle «index».
// eingaben: was in den Feldern dieses Bildschirms steht, nach Stelle des Feldes.
// Ergebnis: «richtig» (nächster Bildschirm), «fertig» (letzter geschafft), «falsch», «eingabe» (Feld passt noch nicht)
// oder «nichts» (nicht tippbar).
export function tippe(stand, ablauf, index, eingaben = {}) {
  const bildschirm = ablauf[stand.schritt];
  if (stand.fertig || !bildschirm) return { stand, ergebnis: 'nichts' };
  const element = bildschirm.elemente[index];
  if (!istTippbar(element)) return { stand, ergebnis: 'nichts' };
  if (element.ziel === true) {
    // Erst wenn jedes Feld passt, geht es weiter. Das zählt nicht als Fehler: Schreiben braucht Zeit.
    for (const [stelle, feld] of bildschirm.elemente.entries()) {
      if (feld.typ !== 'eingabe') continue;
      const pruefung = pruefeEingabe(feld, eingaben[stelle]);
      if (!pruefung.passt) return { stand, ergebnis: 'eingabe', feld: stelle, ...pruefung };
    }
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
