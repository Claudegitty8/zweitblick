// Prüft die Lerninhalte automatisch. Aufruf: npm run inhalte
// Gibt eine Liste von Fehlern zurück. Leere Liste = alles in Ordnung.
// Geprüft wird für jedes Land einzeln, denn die Texte enthalten Länderwerte wie [[notruf]].
import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { bewerte, antworten, EINE_ANTWORT } from '../spiel/code/logik/bewertung.js';
import { ARTEN } from '../spiel/code/logik/prompt.js';
import { AUFTRAEGE, LAND_PLATZHALTER, setzeLandEin } from '../spiel/code/inhalte/lader.js';
import { TIPPBAR } from '../spiel/code/logik/ueben.js';

const STANDARD_ORDNER = fileURLToPath(new URL('../spiel/inhalte/', import.meta.url));
const BILDER_ORDNER = fileURLToPath(new URL('../spiel/bilder/', import.meta.url));
export const MAX_WOERTER = 30; // Leitlinie: kein Textblock über 30 Wörter (Annahme für ältere Menschen)
const EMOJI = /\p{Extended_Pictographic}/u;

async function lies(ordner, datei, fehler) {
  try {
    return JSON.parse(await readFile(path.join(ordner, datei), 'utf8'));
  } catch (grund) {
    fehler.push(`${datei}: nicht lesbar (${grund.message})`);
    return null;
  }
}

function istText(wert) {
  return typeof wert === 'string' && wert.trim().length > 0;
}

function woerter(text) {
  return text.trim().split(/\s+/).length;
}

function zuLang(text) {
  return istText(text) && woerter(text) > MAX_WOERTER;
}

// Alle Teilmengen einer kleinen Liste (für «Probieren muss immer Quatsch ergeben»).
function teilmengen(liste) {
  return liste.reduce((mengen, eintrag) => [...mengen, ...mengen.map((menge) => [...menge, eintrag])], [[]]);
}

// Sammelt alle Texte in einem Wert (für Länge, Emoji und Platzhalter).
function alleTexte(wert, liste = []) {
  if (typeof wert === 'string') liste.push(wert);
  else if (Array.isArray(wert)) wert.forEach((eintrag) => alleTexte(eintrag, liste));
  else if (wert && typeof wert === 'object') Object.values(wert).forEach((eintrag) => alleTexte(eintrag, liste));
  return liste;
}

async function bildDa(datei) {
  try {
    await access(path.join(BILDER_ORDNER, datei));
    return true;
  } catch {
    return false;
  }
}

export async function pruefeInhalte(ordner = STANDARD_ORDNER, sprachen = ['de']) {
  const fehler = [];
  const regeln = await lies(ordner, 'regeln.json', fehler);
  const lehrplan = await lies(ordner, 'lehrplan.json', fehler);
  const fakten = await lies(ordner, 'fakten.json', fehler);
  // Angaben für Impressum und Datenschutz: Die Datei muss da sein, die Felder dürfen vor dem Veröffentlichen leer sein.
  const betreiber = await lies(ordner, 'betreiber.json', fehler);
  if (betreiber) {
    for (const feld of ['name', 'strasse', 'ort', 'land', 'email']) {
      if (typeof betreiber[feld] !== 'string') fehler.push(`betreiber.json: ${feld} muss ein Text sein (darf leer sein)`);
    }
    if (typeof betreiber.testumgebung !== 'boolean') fehler.push('betreiber.json: testumgebung muss true oder false sein');
  }

  if (regeln) {
    if (!Number.isInteger(regeln.erfolgeFuerMeisterschaft) || regeln.erfolgeFuerMeisterschaft < 1) {
      fehler.push('regeln.json: erfolgeFuerMeisterschaft muss eine ganze Zahl ab 1 sein');
    }
    const abstaende = regeln.wiederholungsAbstaende ?? [];
    if (abstaende.length === 0 || abstaende.some((a, i) => i > 0 && a <= abstaende[i - 1])) {
      fehler.push('regeln.json: wiederholungsAbstaende müssen wachsen');
    }
    if (!Number.isInteger(regeln.durchgaengeBisAusweg) || regeln.durchgaengeBisAusweg < 1) {
      fehler.push('regeln.json: durchgaengeBisAusweg muss eine ganze Zahl ab 1 sein');
    }
  }

  if (fakten) {
    for (const fakt of fakten.fakten ?? []) {
      if (!istText(fakt.id) || !istText(fakt.aussage)) fehler.push('fakten.json: Eintrag ohne id oder aussage');
      if (!/^https:\/\//.test(fakt.quelle ?? '')) fehler.push(`fakten.json: «${fakt.id}» braucht eine Quelle (https)`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fakt.geprueft ?? '')) fehler.push(`fakten.json: «${fakt.id}» braucht ein Prüfdatum (JJJJ-MM-TT)`);
      if ('quelle2' in fakt && (!/^https:\/\//.test(fakt.quelle2) || fakt.quelle2 === fakt.quelle)) {
        fehler.push(`fakten.json: «${fakt.id}» braucht als zweite Quelle eine andere https-Adresse`);
      }
    }
  }

  if (!lehrplan) return fehler;
  const kapitelIds = new Set(lehrplan.kapitel.map((k) => k.id));
  const gesehen = new Set();
  let letztesKapitel = 0;
  for (const konzept of lehrplan.konzepte) {
    if (gesehen.has(konzept.id)) fehler.push(`lehrplan.json: Konzept «${konzept.id}» ist doppelt`);
    if (!kapitelIds.has(konzept.kapitel)) fehler.push(`lehrplan.json: «${konzept.id}» hat ein unbekanntes Kapitel`);
    if (konzept.kapitel < letztesKapitel) fehler.push(`lehrplan.json: «${konzept.id}» steht nicht in Kapitel-Reihenfolge`);
    for (const voraussetzung of konzept.braucht ?? []) {
      if (!gesehen.has(voraussetzung)) fehler.push(`lehrplan.json: «${konzept.id}» braucht «${voraussetzung}», das nicht vorher kommt`);
    }
    gesehen.add(konzept.id);
    letztesKapitel = konzept.kapitel;
  }

  for (const sprache of sprachen) {
    const texteRoh = await lies(ordner, `${sprache}/texte.json`, fehler);
    const lexikonRoh = await lies(ordner, `${sprache}/lexikon.json`, fehler);
    const umfrageRoh = await lies(ordner, `${sprache}/umfrage.json`, fehler);
    if (!texteRoh || !lexikonRoh) continue;

    let dateien = [];
    try {
      dateien = (await readdir(path.join(ordner, sprache, 'besuche'))).filter((d) => d.endsWith('.json'));
    } catch {
      fehler.push(`${sprache}/besuche: Ordner fehlt`);
    }
    for (const id of AUFTRAEGE) {
      if (!dateien.includes(`${id}.json`)) fehler.push(`${sprache}/besuche: Besuch «${id}» fehlt, steht aber in lader.js`);
    }
    for (const datei of dateien) {
      if (!AUFTRAEGE.includes(datei.replace(/\.json$/, ''))) fehler.push(`${sprache}/besuche/${datei}: steht nicht in lader.js`);
    }
    const besucheRoh = [];
    for (const datei of dateien) {
      const besuch = await lies(ordner, `${sprache}/besuche/${datei}`, fehler);
      if (besuch) besucheRoh.push({ name: `${sprache}/besuche/${datei}`, besuch });
    }

    // Länder: alle mit denselben Namen, und jeder Platzhalter in den Inhalten hat einen Wert.
    const laender = texteRoh.laender ?? {};
    const landNamen = Object.keys(laender);
    if (landNamen.length === 0) fehler.push(`${sprache}/texte.json: laender fehlen`);
    const schluessel = landNamen.map((land) => Object.keys(laender[land]).sort().join());
    if (new Set(schluessel).size > 1) fehler.push(`${sprache}/texte.json: Die Länder haben nicht dieselben Werte`);
    const roheTexte = alleTexte([texteRoh, lexikonRoh, umfrageRoh, besucheRoh.map((b) => b.besuch)]);
    for (const text of roheTexte) {
      for (const [, name] of text.matchAll(LAND_PLATZHALTER)) {
        for (const land of landNamen) {
          if (!istText(laender[land][name])) fehler.push(`Platzhalter [[${name}]] hat keinen Wert für «${land}»`);
        }
      }
      if (EMOJI.test(text)) fehler.push(`Emoji im Text: «${text.slice(0, 40)}…»`);
    }

    for (const land of landNamen) {
      const werte = laender[land];
      const texte = setzeLandEin(texteRoh, werte);
      const lexikon = setzeLandEin(lexikonRoh, werte);
      const umfrage = setzeLandEin(umfrageRoh, werte);
      const vor = `${sprache}/${land}`;
      await pruefeTexte({ texte, lexikon, umfrage, lehrplan, gesehen, vor }, fehler);
      for (const { name, besuch } of besucheRoh) {
        pruefeAuftrag(setzeLandEin(besuch, werte), `${vor} ${name}`, { regeln, konzepte: gesehen, texte, lexikon }, fehler);
        await pruefeBilder(besuch, `${vor} ${name}`, fehler);
      }
    }
  }
  // Fehler, die in allen Ländern gleich sind, nur einmal melden (ohne Länder-Kürzel).
  return [...new Set(fehler.map((zeile) => zeile.replace(/^(\w+)\/(ch|de) /, '$1 ')))];
}

async function pruefeTexte({ texte, lexikon, umfrage, lehrplan, gesehen, vor }, fehler) {
  for (const kapitel of lehrplan.kapitel) {
    const eintrag = texte.kapitel?.[kapitel.id];
    if (!istText(eintrag?.name)) fehler.push(`${vor}/texte.json: Kapitel ${kapitel.id} braucht einen Namen`);
  }
  for (const konzept of lehrplan.konzepte) {
    const eintrag = texte.konzepte?.[konzept.id];
    const name = `${vor}/texte.json Konzept «${konzept.id}»`;
    if (!istText(eintrag?.name) || !istText(eintrag?.analogie)) fehler.push(`${name}: braucht name und analogie`);
    const echt = eintrag?.echt ?? [];
    if (echt.length < 2 || echt.length > 5 || echt.some((schritt) => !istText(schritt))) fehler.push(`${name}: echt braucht zwei bis fünf Schritte`);
    for (const bild of eintrag?.bilder ?? []) {
      if (!istText(bild.datei) || !istText(bild.text) || typeof bild.gut !== 'boolean') fehler.push(`${name}: Bild braucht datei, text und gut`);
      else if (!(await bildDa(bild.datei))) fehler.push(`${name}: Bild «${bild.datei}» fehlt`);
    }
    for (const text of alleTexte(eintrag)) if (zuLang(text)) fehler.push(`${name}: Text über ${MAX_WOERTER} Wörter`);
    if (eintrag && 'ueben' in eintrag) {
      if (!istText(eintrag.uebenName)) fehler.push(`${name}: ueben braucht uebenName (kurzer Name für die Liste aller Übungen)`);
      await pruefeUeben(eintrag.ueben, name, fehler);
    }
  }
  // Jeder sichtbare Text der Oberfläche ist kurz genug.
  for (const [schluessel, wert] of Object.entries(texte.app ?? {})) {
    for (const text of alleTexte(wert)) if (zuLang(text)) fehler.push(`${vor}/texte.json: app.${schluessel} hat mehr als ${MAX_WOERTER} Wörter`);
  }
  pruefeUeber(texte.app ?? {}, `${vor}/texte.json`, fehler);
  for (const feld of ['hilfeRegel', 'schonGesehen', 'auswegText', 'auswegKnopf', 'verschobenTitel', 'verschobenText', 'notrufZeile', 'notfallText', 'arztHinweisTitel',
    'fussImpressum', 'fussDatenschutz', 'impressumTitel', 'impressumPrivat', 'impressumFehlt', 'impressumGesundheit', 'datenschutzTitel', 'datenschutzStand', 'testTitel', 'testText', 'impressumTest']) {
    if (!istText(texte.app?.[feld])) fehler.push(`${vor}/texte.json: ${feld} fehlt`);
  }
  // Datenschutz: Abschnitte mit Titel und Sätzen, darunter einer zu GitHub als Hoster.
  const abschnitte = texte.app?.datenschutzAbschnitte;
  if (!Array.isArray(abschnitte) || abschnitte.length === 0 || abschnitte.some((a) => !istText(a?.titel) || !Array.isArray(a.saetze) || !a.saetze.every(istText))) {
    fehler.push(`${vor}/texte.json: datenschutzAbschnitte braucht Abschnitte mit titel und saetze`);
  } else if (!abschnitte.some((a) => a.saetze.some((s) => s.includes('GitHub')))) {
    fehler.push(`${vor}/texte.json: datenschutzAbschnitte muss GitHub als Hoster nennen`);
  }
  if (!/^https:\/\/\S+$/.test(texte.app?.impressumQuellcodeAdresse ?? '')) fehler.push(`${vor}/texte.json: impressumQuellcodeAdresse braucht eine https-Adresse`);
  // Der Gesundheitshinweis (nur für das Gespräch mit dem Arzt) muss da sein und die Original-Befunde nennen.
  const arztHinweis = texte.app?.arztHinweis;
  if (!Array.isArray(arztHinweis) || arztHinweis.length === 0 || !arztHinweis.every(istText)) {
    fehler.push(`${vor}/texte.json: arztHinweis braucht mindestens einen Satz`);
  } else if (!arztHinweis.some((satz) => satz.includes('Original-Befund'))) {
    fehler.push(`${vor}/texte.json: arztHinweis muss die Original-Befunde nennen`);
  }
  for (const [id, eintrag] of Object.entries(lexikon)) {
    const name = `${vor}/lexikon.json «${id}»`;
    if (!istText(eintrag.begriff) || !istText(eintrag.erklaerung)) fehler.push(`${name}: braucht begriff und erklaerung`);
    if (eintrag.kern && !gesehen.has(eintrag.kern)) fehler.push(`${name}: unbekanntes Kernkonzept`);
    if (eintrag.kern && eintrag.kern !== id) fehler.push(`${name}: kern muss gleich heissen wie der Eintrag`);
    if ('quelle' in eintrag && !/^https:\/\/\S+$/.test(eintrag.quelle)) fehler.push(`${name}: quelle braucht eine https-Adresse`);
    for (const feld of ['erklaerung', 'quatsch', 'genauer']) {
      if (zuLang(eintrag[feld])) fehler.push(`${name}: ${feld} hat mehr als ${MAX_WOERTER} Wörter`);
    }
  }
  for (const frage of umfrage?.fragen ?? []) {
    const name = `${vor}/umfrage.json «${frage.id}»`;
    if (!istText(frage.frage) || zuLang(frage.frage)) fehler.push(`${name}: frage fehlt oder ist zu lang`);
    if ((frage.optionen ?? []).filter((o) => o.richtig).length !== 1) fehler.push(`${name}: genau eine Antwort muss richtig sein`);
    if ((frage.optionen ?? []).some((o) => !istText(o.text))) fehler.push(`${name}: Antwort ohne text`);
  }
}

// «Am iPhone üben»: nachgebaute Bildschirme. Jeder hat eine Anleitung und genau eine richtige Stelle zum Tippen.
export const UEBEN_ARTEN = ['text', 'nachricht', ...TIPPBAR];
export async function pruefeUeben(ablauf, name, fehler) {
  if (!Array.isArray(ablauf) || ablauf.length < 2 || ablauf.length > 10) {
    fehler.push(`${name}: ueben braucht zwei bis zehn Bildschirme`);
    return;
  }
  for (const [nummer, bildschirm] of ablauf.entries()) {
    const wo = `${name}: ueben Bildschirm ${nummer + 1}`;
    for (const feld of ['anleitung', 'app', 'titel']) if (!istText(bildschirm?.[feld])) fehler.push(`${wo} braucht ${feld}`);
    if ('hinweis' in (bildschirm ?? {}) && !istText(bildschirm.hinweis)) fehler.push(`${wo}: hinweis ist leer`);
    const elemente = Array.isArray(bildschirm?.elemente) ? bildschirm.elemente : [];
    if (elemente.length === 0) fehler.push(`${wo} braucht elemente`);
    for (const element of elemente) {
      if (!UEBEN_ARTEN.includes(element?.typ)) fehler.push(`${wo}: unbekannte Art «${element?.typ}»`);
      if (!istText(element?.text)) fehler.push(`${wo}: Element ohne text`);
      if (element?.ziel && !TIPPBAR.includes(element.typ)) fehler.push(`${wo}: Ziel «${element.text}» lässt sich nicht antippen`);
      if (element?.typ === 'bild' && !(istText(element.datei) && await bildDa(element.datei))) fehler.push(`${wo}: Bild «${element.datei}» fehlt`);
      if (element?.typ === 'schalter' && typeof element.an !== 'boolean') fehler.push(`${wo}: Schalter braucht an (ja oder nein)`);
    }
    const ziele = elemente.filter((element) => element?.ziel === true);
    if (ziele.length !== 1) fehler.push(`${wo} braucht genau ein Ziel, hat ${ziele.length}`);
    if (elemente.filter((element) => TIPPBAR.includes(element?.typ)).length < 2) fehler.push(`${wo} braucht mindestens zwei Stellen zum Tippen`);
  }
}

// Teil «Über dieses Spiel». Die Kontakt-Adresse darf leer sein, dann fehlt der Kontakt im Spiel.
export function pruefeUeber(app, name, fehler) {
  const pflicht = ['ueberEtikett', 'ueberZweckEtikett', 'ueberZweck', 'ueberDatenEtikett', 'ueberDaten', 'ueberGithubLink',
    'ueberFachEtikett', 'ueberFach', 'ueberInoffiziellEtikett', 'ueberInoffiziell', 'ueberKontaktEtikett', 'ueberKontakt'];
  for (const feld of pflicht) {
    if (!istText(app[feld])) fehler.push(`${name}: ${feld} fehlt`);
  }
  if (!/^https:\/\/\S+$/.test(app.ueberGithubAdresse ?? '')) fehler.push(`${name}: ueberGithubAdresse braucht eine https-Adresse`);
  const adresse = app.ueberKontaktAdresse ?? '';
  if (typeof adresse !== 'string' || (adresse.trim() !== '' && !/^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/.test(adresse.trim()))) {
    fehler.push(`${name}: ueberKontaktAdresse ist keine gültige E-Mail-Adresse (oder leer lassen)`);
  }
}

// Jedes Bild, auf das ein Besuch verweist, muss es geben und einen beschreibenden Text haben.
async function pruefeBilder(besuch, name, fehler) {
  for (const [id, aufgabe] of Object.entries(besuch.aufgaben ?? {})) {
    const mitBild = [aufgabe, ...(aufgabe.teile ?? []), ...(aufgabe.flaechen ?? [])].filter((x) => x.bild);
    for (const x of mitBild) {
      if (!istText(x.bildText)) fehler.push(`${name} Aufgabe ${id}: Bild «${x.bild}» braucht bildText`);
      if (!(await bildDa(x.bild))) fehler.push(`${name} Aufgabe ${id}: Bild «${x.bild}» fehlt`);
    }
  }
}

export function pruefeAuftrag(auftrag, name, { regeln, konzepte, texte, lexikon }, fehler) {
  for (const feld of ['id', 'gast', 'thema', 'wunsch', 'dank', 'danach']) {
    if (!istText(auftrag[feld])) fehler.push(`${name}: ${feld} fehlt`);
    if (zuLang(auftrag[feld])) fehler.push(`${name}: ${feld} hat mehr als ${MAX_WOERTER} Wörter`);
  }
  for (const id of auftrag.lexikon ?? []) {
    if (!lexikon[id]) fehler.push(`${name}: Lexikon-Eintrag «${id}» fehlt`);
  }
  const aufgaben = auftrag.aufgaben ?? {};
  const benutzt = new Set();
  const kennt = (id, wo) => {
    benutzt.add(id);
    if (!aufgaben[id]) fehler.push(`${name}: ${wo} verweist auf unbekannte Aufgabe «${id}»`);
    return aufgaben[id];
  };

  for (const runde of auftrag.runden ?? []) {
    const wo = `${name} Runde ${runde.id}`;
    const mindestens = runde.art === 'misch' ? 1 : (regeln?.erfolgeFuerMeisterschaft ?? 3) + 1;
    if ((runde.frei ?? []).length < mindestens) fehler.push(`${wo}: braucht mindestens ${mindestens} freie Situationen`);
    for (const id of runde.frei ?? []) kennt(id, wo);

    if (runde.art === 'misch') {
      if (!istText(runde.titel)) fehler.push(`${wo}: Mischrunde braucht einen titel`);
      continue;
    }
    // Jede Konzept-Runde hat alle fünf Schritte: Probieren, Aha, Beispiel, Lücke, Frei.
    if (!konzepte.has(runde.konzept)) fehler.push(`${wo}: unbekanntes Konzept «${runde.konzept}»`);
    const konzeptText = texte.konzepte?.[runde.konzept];
    const aha = konzeptText?.aha ?? [];
    if (aha.length < 1 || aha.length > 3) fehler.push(`${wo}: Aha braucht ein bis drei Sätze`);
    if (!istText(konzeptText?.tipp)) fehler.push(`${wo}: Konzept «${runde.konzept}» braucht einen tipp`);
    if (lexikon[runde.konzept]?.kern !== runde.konzept) fehler.push(`${wo}: Lexikon-Eintrag für «${runde.konzept}» fehlt`);

    const probieren = kennt(runde.probieren?.aufgabe, `${wo} Probieren`);
    if (probieren) {
      const nur = runde.probieren.nurTeile ?? [];
      // Bei Fragen mit einer richtigen Antwort darf die richtige beim Probieren nicht sichtbar sein.
      if (EINE_ANTWORT.includes(probieren.typ)) {
        if (nur.length === 0) fehler.push(`${wo}: Probieren braucht nurTeile`);
        if (nur.some((id) => antworten(probieren).find((o) => o.id === id)?.richtig)) fehler.push(`${wo}: Probieren zeigt die richtige Antwort`);
      } else if (probieren.typ === 'reihe') {
        fehler.push(`${wo}: Probieren kann kein Sortieren sein`);
      } else {
        for (const menge of teilmengen(nur)) {
          if (bewerte(probieren, menge).ok) fehler.push(`${wo}: Probieren lässt sich lösen (${menge.join(', ')})`);
        }
      }
      for (const id of nur) {
        const da = [...(probieren.teile ?? []), ...antworten(probieren)].some((x) => x.id === id);
        if (!da) fehler.push(`${wo}: Probieren nennt unbekanntes Teil «${id}»`);
      }
    }
    kennt(runde.beispiel?.aufgabe, `${wo} Beispiel`);
    const luecke = kennt(runde.luecke?.aufgabe, `${wo} Lücke`);
    if (luecke) {
      const vorgabe = runde.luecke.vorgabe ?? [];
      if (vorgabe.some((id) => !luecke.loesung?.includes(id))) fehler.push(`${wo}: Vorgabe der Lücke gehört nicht zur Lösung`);
      if (bewerte(luecke, vorgabe).ok) fehler.push(`${wo}: Die Lücke ist schon gelöst`);
    }
  }

  for (const [id, aufgabe] of Object.entries(aufgaben)) {
    if (!benutzt.has(id)) fehler.push(`${name}: Aufgabe «${id}» wird nirgends verwendet`);
    pruefeAufgabe(aufgabe, `${name} Aufgabe ${id}`, fehler);
  }
}

// Eine Aufgabe ist in Ordnung, wenn ihre Lösung besteht, eine leere Nachricht scheitert
// und jedes Fehlbild zwei Varianten und einen erklärenden Hinweis hat.
export function pruefeAufgabe(aufgabe, name, fehler) {
  for (const text of alleTexte(aufgabe)) if (zuLang(text)) fehler.push(`${name}: Text über ${MAX_WOERTER} Wörter: «${text.slice(0, 50)}…»`);
  if (!istText(aufgabe.wunsch)) fehler.push(`${name}: wunsch fehlt`);
  if (EINE_ANTWORT.includes(aufgabe.typ)) {
    pruefeEine(aufgabe, name, fehler);
    return;
  }
  if (aufgabe.typ === 'reihe') {
    pruefeReihe(aufgabe, name, fehler);
    return;
  }
  if (aufgabe.typ) {
    fehler.push(`${name}: unbekannter typ «${aufgabe.typ}»`);
    return;
  }
  if (!istText(aufgabe.grundprompt)) fehler.push(`${name}: grundprompt fehlt`);
  if (!Array.isArray(aufgabe.erfolg) || aufgabe.erfolg.length < 1) fehler.push(`${name}: mindestens ein Erfolgstext nötig`);

  const ids = new Set();
  for (const teil of aufgabe.teile ?? []) {
    if (ids.has(teil.id)) fehler.push(`${name}: Teil «${teil.id}» ist doppelt`);
    ids.add(teil.id);
    if (!istText(teil.text)) fehler.push(`${name}: Teil «${teil.id}» braucht einen text`);
    if (!ARTEN.includes(teil.art)) fehler.push(`${name}: Teil «${teil.id}» hat eine unbekannte art`);
  }

  const fehlbilder = aufgabe.fehlbilder ?? {};
  const erreichbar = new Set();
  for (const pruefung of aufgabe.pruefungen ?? []) {
    erreichbar.add(pruefung.fehlbild);
    if (!fehlbilder[pruefung.fehlbild]) fehler.push(`${name}: Fehlbild «${pruefung.fehlbild}» fehlt`);
    const genannt = [...(pruefung.wenn.gewaehlt ?? []), ...(pruefung.wenn.fehlt ?? []), ...(pruefung.wenn.aus ?? [])];
    if (genannt.length === 0) fehler.push(`${name}: Prüfung für «${pruefung.fehlbild}» nennt kein Teil`);
    for (const id of genannt) {
      if (!ids.has(id)) fehler.push(`${name}: Prüfung nennt unbekanntes Teil «${id}»`);
    }
  }
  for (const [id, fehlbild] of Object.entries(fehlbilder)) {
    if (!erreichbar.has(id)) fehler.push(`${name}: Fehlbild «${id}» wird von keiner Prüfung benutzt`);
    if ((fehlbild.texte ?? []).length < 2) fehler.push(`${name}: Fehlbild «${id}» braucht mindestens zwei Varianten`);
    if (!istText(fehlbild.hinweis)) fehler.push(`${name}: Fehlbild «${id}» braucht einen Hinweis`);
  }
  // Jedes Fehlbild muss mit irgendeiner Auswahl wirklich drankommen können (alle Teilmengen der Teile).
  const alleIds = (aufgabe.teile ?? []).map((teil) => teil.id);
  if (alleIds.length <= 12) {
    const gezeigt = new Set(teilmengen(alleIds).map((menge) => bewerte(aufgabe, menge).fehlbild));
    for (const pruefung of aufgabe.pruefungen ?? []) {
      if (!gezeigt.has(pruefung.fehlbild)) fehler.push(`${name}: Fehlbild «${pruefung.fehlbild}» kommt mit keiner Auswahl dran`);
    }
  }

  const loesung = aufgabe.loesung ?? [];
  if (loesung.some((id) => !ids.has(id))) fehler.push(`${name}: Lösung nennt ein unbekanntes Teil`);
  if (aufgabe.pruefungen) {
    if (!bewerte(aufgabe, loesung).ok) fehler.push(`${name}: Die Lösung besteht die eigenen Prüfungen nicht`);
    if (bewerte(aufgabe, []).ok) fehler.push(`${name}: Eine leere Nachricht gilt als richtig`);
  } else {
    fehler.push(`${name}: pruefungen fehlen`);
  }
}

// Übungsform «Sortieren»: mindestens drei Schritte, die Lösung nennt jeden genau einmal,
// und die gezeigte Anfangsreihenfolge ist noch nicht die Lösung.
function pruefeReihe(aufgabe, name, fehler) {
  for (const feld of ['frage', 'lupe']) {
    if (!istText(aufgabe[feld])) fehler.push(`${name}: ${feld} fehlt`);
  }
  const schritte = aufgabe.schritte ?? [];
  const ids = schritte.map((schritt) => schritt.id);
  if (schritte.length < 3) fehler.push(`${name}: mindestens drei Schritte nötig`);
  if (schritte.some((schritt) => !istText(schritt.text))) fehler.push(`${name}: Schritt ohne text`);
  const loesung = aufgabe.loesung ?? [];
  if (new Set(ids).size !== ids.length || loesung.length !== ids.length || [...loesung].sort().join() !== [...ids].sort().join()) {
    fehler.push(`${name}: Die Lösung muss jeden Schritt genau einmal nennen`);
  }
  if (bewerte(aufgabe, ids).ok) fehler.push(`${name}: Die Schritte stehen schon in der richtigen Reihenfolge`);
  if (!bewerte(aufgabe, loesung).ok) fehler.push(`${name}: Die Lösung besteht nicht`);
  if ((aufgabe.daneben?.texte ?? []).length < 2 || !istText(aufgabe.daneben?.hinweis)) fehler.push(`${name}: daneben braucht zwei Varianten und einen Hinweis`);
}

// «Vorhersagen» und «Antippen»: genau eine richtige Antwort, jede mit Erklärung.
function pruefeEine(aufgabe, name, fehler) {
  if (!istText(aufgabe.frage)) fehler.push(`${name}: frage fehlt`);
  const liste = antworten(aufgabe);
  if (liste.length < 2) fehler.push(`${name}: mindestens zwei Antworten nötig`);
  const richtige = liste.filter((option) => option.richtig);
  if (richtige.length !== 1) fehler.push(`${name}: genau eine Antwort muss richtig sein`);
  if (new Set(liste.map((option) => option.id)).size !== liste.length) fehler.push(`${name}: Antwort doppelt`);
  for (const option of liste) {
    if (!istText(option.text) || !istText(option.hinweis)) fehler.push(`${name}: Antwort «${option.id}» braucht text und hinweis`);
    if (aufgabe.typ === 'tippen' && !istText(option.folge)) fehler.push(`${name}: Fläche «${option.id}» braucht eine folge`);
  }
  if (aufgabe.typ === 'wahl' && !istText(aufgabe.lupe)) fehler.push(`${name}: lupe fehlt`);
  if (aufgabe.typ === 'tippen' && !istText(aufgabe.bildschirm?.titel)) fehler.push(`${name}: bildschirm.titel fehlt`);
  if (aufgabe.loesung?.length !== 1 || aufgabe.loesung[0] !== richtige[0]?.id) fehler.push(`${name}: loesung muss die richtige Antwort nennen`);
}

// Direkter Aufruf von der Kommandozeile
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fehler = await pruefeInhalte();
  if (fehler.length === 0) {
    console.log('Lerninhalte: alles in Ordnung.');
  } else {
    console.error(`Lerninhalte: ${fehler.length} Fehler gefunden.`);
    for (const zeile of fehler) console.error(` - ${zeile}`);
    process.exit(1);
  }
}
