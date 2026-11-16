// Bewertet eine Lösung anhand der Prüfungen einer Aufgabe.
// Reine Logik ohne Oberfläche, damit sie automatisch testbar ist.
//
// Übungsform «Zusammenstecken»: Eine Prüfung trifft zu, wenn
//   gewaehlt:   mindestens eines dieser Teile angesteckt ist (zum Beispiel ein schädliches Teil),
//   fehlt:      mindestens eines dieser Teile nicht angesteckt ist,
//   aus + hoechstens: höchstens so viele Teile aus der Liste angesteckt sind.
// Die erste zutreffende Prüfung bestimmt das Fehlbild. Trifft keine zu, ist die Lösung gut.

// Übungsformen mit genau einer richtigen Antwort: «Vorhersagen» (wahl) und «Antippen» (tippen).
export const EINE_ANTWORT = ['wahl', 'tippen'];

function trifftZu(wenn, gewaehlt) {
  if (wenn.gewaehlt?.some((id) => gewaehlt.has(id))) return true;
  if (wenn.fehlt?.some((id) => !gewaehlt.has(id))) return true;
  if (wenn.aus && Number.isInteger(wenn.hoechstens)) {
    return wenn.aus.filter((id) => gewaehlt.has(id)).length <= wenn.hoechstens;
  }
  return false;
}

// Die Antworten einer Aufgabe mit genau einer richtigen: bei «Antippen» heissen sie Flächen.
export function antworten(aufgabe) {
  return aufgabe.typ === 'tippen' ? aufgabe.flaechen ?? [] : aufgabe.optionen ?? [];
}

// Genau eine Antwort ist richtig.
function bewerteEine(aufgabe, auswahl) {
  const option = antworten(aufgabe).find((o) => o.id === auswahl[0]) ?? null;
  return { ok: Boolean(option?.richtig), fehlbild: option?.richtig ? null : option?.id ?? 'leer', pruefung: null, option };
}

// Übungsform «Sortieren»: Die Schritte müssen genau in der richtigen Reihenfolge stehen.
function bewerteReihe(aufgabe, auswahl) {
  const ok = auswahl.length === aufgabe.loesung.length && aufgabe.loesung.every((id, stelle) => auswahl[stelle] === id);
  return { ok, fehlbild: ok ? null : 'daneben', pruefung: null };
}

export function bewerte(aufgabe, auswahl = []) {
  if (EINE_ANTWORT.includes(aufgabe.typ)) return bewerteEine(aufgabe, auswahl);
  if (aufgabe.typ === 'reihe') return bewerteReihe(aufgabe, auswahl);
  const gewaehlt = new Set(auswahl);
  const treffer = aufgabe.pruefungen.find((pruefung) => trifftZu(pruefung.wenn, gewaehlt)) ?? null;
  return { ok: !treffer, fehlbild: treffer?.fehlbild ?? null, pruefung: treffer };
}

// Für Hilfestufe 2: Worauf soll der Spieler schauen?
// Zuerst ein angestecktes Teil, das schadet. Sonst ein Teil der Lösung, das fehlt.
export function hilfeTeil(aufgabe, auswahl = []) {
  if (EINE_ANTWORT.includes(aufgabe.typ)) {
    // Eine falsche Antwort ausschliessen, am liebsten die gerade gewählte.
    const falsche = antworten(aufgabe).filter((o) => !o.richtig);
    const ziel = falsche.find((o) => o.id === auswahl[0]) ?? falsche[0];
    return ziel ? { id: ziel.id, grund: 'falsch' } : null;
  }
  if (aufgabe.typ === 'reihe') {
    // Beim Sortieren: der erste Platz, der nicht stimmt.
    const stelle = aufgabe.loesung.findIndex((id, index) => auswahl[index] !== id);
    return stelle < 0 ? null : { id: aufgabe.loesung[stelle], grund: 'platz' };
  }
  const gewaehlt = new Set(auswahl);
  const schaedlich = new Set(aufgabe.pruefungen.flatMap((pruefung) => pruefung.wenn.gewaehlt ?? []));
  const zuviel = auswahl.find((id) => schaedlich.has(id));
  if (zuviel) return { id: zuviel, grund: 'zuviel' };
  const fehlt = aufgabe.loesung.find((id) => !gewaehlt.has(id));
  return fehlt ? { id: fehlt, grund: 'fehlt' } : null;
}
