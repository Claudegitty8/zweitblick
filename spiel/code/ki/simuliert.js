// Simulierte Übungs-KI «Lupe»: antwortet nach festen Regeln aus den Lerninhalten.
// Braucht kein Konto, kostet nichts, läuft ohne Internet und liest nie echte Gesundheitsdaten.
import { bewerte, EINE_ANTWORT } from '../logik/bewertung.js';

export function erstelleSimulierteKi() {
  return {
    modus: 'simuliert',
    async antworte({ aufgabe, auswahl = [], versuch = 0 }) {
      const urteil = bewerte(aufgabe, auswahl);
      if (EINE_ANTWORT.includes(aufgabe.typ)) {
        // Bei «Antippen» zeigt Lupe, was nach dem Tippen passiert. Bei «Vorhersagen» löst Lupe auf.
        const text = aufgabe.typ === 'tippen' && urteil.option?.folge ? urteil.option.folge : aufgabe.lupe;
        return { text, ok: urteil.ok, fehlbild: urteil.fehlbild, hinweis: urteil.option?.hinweis ?? null, modus: 'simuliert' };
      }
      if (aufgabe.typ === 'reihe') {
        const text = urteil.ok ? aufgabe.lupe : aufgabe.daneben.texte[versuch % aufgabe.daneben.texte.length];
        return { text, ok: urteil.ok, fehlbild: urteil.fehlbild, hinweis: urteil.ok ? null : aufgabe.daneben.hinweis, modus: 'simuliert' };
      }
      const fehlbild = urteil.ok ? null : aufgabe.fehlbilder[urteil.fehlbild];
      const varianten = urteil.ok ? aufgabe.erfolg : fehlbild.texte;
      return {
        text: varianten[versuch % varianten.length],
        ok: urteil.ok,
        fehlbild: urteil.fehlbild,
        hinweis: fehlbild?.hinweis ?? null,
        modus: 'simuliert',
      };
    },
  };
}
