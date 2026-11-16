// Setzt zusammen, was der Spieler gebaut hat: seine Nachricht an Lupe.
//
// Anweisung im Projekt: gilt für jede Nachricht im Projekt «Meine Gesundheit».
// Anhänge: Dokumente oder Fotos, die mitgeschickt werden. Sie sind kein Text der Nachricht.
// Nachricht: Grundtext, dann die gewählten Sätze in der Reihenfolge der Arten.

// Alle Arten von Teilen, in der Reihenfolge, in der die Werkbank sie zeigt.
export const ARTEN = ['anweisung', 'anhang', 'frage', 'angaben', 'wie'];

// Diese Teile gelten dauernd (Anweisung im Projekt). Sie stehen in einem eigenen Feld.
const DAUERND = ['anweisung'];
// Diese Teile werden angehängt, nicht geschrieben.
const ANHAENGE = ['anhang'];

export function baueAnweisung(aufgabe, auswahl = []) {
  return (aufgabe.teile ?? [])
    .filter((teil) => DAUERND.includes(teil.art) && auswahl.includes(teil.id))
    .map((teil) => teil.text)
    .join(' ');
}

export function baueAnhaenge(aufgabe, auswahl = []) {
  return (aufgabe.teile ?? [])
    .filter((teil) => ANHAENGE.includes(teil.art) && auswahl.includes(teil.id))
    .map((teil) => teil.text);
}

export function baueNachricht(aufgabe, auswahl = []) {
  const reihenfolge = ARTEN.filter((art) => !DAUERND.includes(art) && !ANHAENGE.includes(art));
  const saetze = reihenfolge.flatMap((art) => (aufgabe.teile ?? [])
    .filter((teil) => teil.art === art && auswahl.includes(teil.id))
    .map((teil) => teil.text));
  return [aufgabe.grundprompt, ...saetze].filter(Boolean).join(' ');
}

export function hatAnweisung(aufgabe) {
  return (aufgabe.teile ?? []).some((teil) => DAUERND.includes(teil.art));
}

export function hatAnhaenge(aufgabe) {
  return (aufgabe.teile ?? []).some((teil) => ANHAENGE.includes(teil.art));
}
