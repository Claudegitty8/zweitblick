// Die eine Schnittstelle für die Übungs-KI.
//
// Vertrag: ki.antworte(anfrage) liefert ein Promise mit
//   { text, ok, fehlbild, hinweis, modus }
// anfrage = { aufgabe, auswahl, versuch }
//
// Zweitblick verbindet sich nie mit einer echten KI (Entscheid E-008). Bewertet wird immer in logik/.
import { erstelleSimulierteKi } from './simuliert.js';

export function erstelleKi(modus = 'simuliert') {
  if (modus === 'simuliert') return erstelleSimulierteKi();
  throw new Error(`Den KI-Modus «${modus}» gibt es nicht.`);
}
