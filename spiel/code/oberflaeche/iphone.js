// Das nachgebaute iPhone für «Am iPhone üben»: Rahmen, Statusleiste und ein Bildschirm aus den Inhalten.
// Es wirkt echt, ist aber selbst gezeichnet: keine Logos, keine Bildschirmfotos echter Apps.
// Keine Spielregeln hier: Was beim Tippen passiert, entscheidet ueben.js mit logik/ueben.js.
//
// Bildschirm-Arten («art»): home, kamera, chat, liste, blatt (Fenster von unten), dialog (Rückfrage), fotos, app.
// Bereiche über «gruppe»: kopf = Leiste oben, unten = Leiste unten, eingabe = Schreibzeile unten im Chat.
// Gleiche andere Gruppe hintereinander = eine Zeile.
import { el, fuelle } from './bausteine.js';
import { bildKnoten } from './bild.js';
import { symbolKnoten } from './symbole.js';
import { istTippbar } from '../logik/ueben.js';

// Farben der App-Kacheln auf dem Home-Bildschirm. Eigene Farben, nicht die der echten Apps.
const KACHEL = {
  telefon: '#2e8540', kamera: '#5b6270', fotos: '#ffffff', notizen: '#f2c94c', laden: '#1f6fd1',
  chat: '#8a4a17', ordner: '#2b7bd8', zahnrad: '#8e8e93',
};

// Ziffern mit den Buchstaben darunter, wie auf dem Telefon.
const TASTEN = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']];

// Linke Seite der Leiste oben: zurück, abbrechen, Menü.
function linksOben(element) {
  return element.symbol === 'zurueck' || element.symbol === 'menue' || ['Zurück', 'Abbrechen'].includes(element.text);
}

function statusleiste(dunkel) {
  return el('div', { klasse: dunkel ? 'ios-status hell' : 'ios-status', 'aria-hidden': 'true' },
    el('span', { klasse: 'ios-zeit', text: '9:41' }),
    el('span', { klasse: 'ios-insel' }),
    el('span', { klasse: 'ios-anzeigen' }, symbolKnoten('empfang', 'ios-anzeige'), symbolKnoten('wlan', 'ios-anzeige'), symbolKnoten('akku', 'ios-anzeige')));
}

export function baueIphone(bildschirm, optionen) {
  const { t, gezeigt = false, daneben = null, eingaben = {}, beiTippen, beiEingabe, beiEnter } = optionen;
  const art = bildschirm.art ?? 'app';
  const knoepfe = [];
  const felder = [];

  // --- Ein Element zum Antippen ---
  function tippKnopf(element, index, ort) {
    const istZiel = gezeigt && element.ziel === true;
    const klassen = ['ueben-el', `ueben-${element.typ}`, `ort-${ort}`];
    if (element.stil) klassen.push(`stil-${element.stil}`);
    if (element.leer) klassen.push('leer');
    if (element.rahmen) klassen.push('mit-rahmen');
    if (istZiel) klassen.push('gezeigt');
    if (daneben === index && !istZiel) klassen.push('daneben');

    const inhalt = [];
    if (ort === 'home') {
      inhalt.push(el('span', { klasse: 'ios-kachel', style: `background:${KACHEL[element.symbol] ?? '#5b6270'}` },
        symbolKnoten(element.symbol, element.symbol === 'fotos' ? 'symbol bunt' : 'symbol')));
    } else if (element.typ === 'bild') {
      inhalt.push(el('span', { klasse: 'ios-bildrahmen' }, bildKnoten(element.datei, element.text, 'ueben-foto')));
    } else if (element.typ === 'datei') {
      inhalt.push(symbolKnoten('datei', 'symbol datei-symbol'));
    } else if (element.stil === 'ausloeser') {
      inhalt.push(el('span', { klasse: 'ios-ausloeser', 'aria-hidden': 'true' }));
    } else if (element.stil === 'vorschau') {
      inhalt.push(el('span', { klasse: 'ios-vorschau' }, bildKnoten('fotos/gut.svg', '', 'ueben-foto')));
    } else if (element.symbol) {
      inhalt.push(ort === 'zeile' || ort === 'blatt'
        ? el('span', { klasse: 'ios-zeilen-symbol' }, symbolKnoten(element.symbol))
        : symbolKnoten(element.symbol));
    }

    if (element.typ === 'schalter') {
      inhalt.push(el('span', { klasse: 'ueben-schalter-text', text: element.text }),
        el('span', { klasse: element.an ? 'ios-schalter an' : 'ios-schalter' },
          el('span', { klasse: 'ueben-schalter-bahn', 'aria-hidden': 'true' }, el('span', { klasse: 'ueben-schalter-knopf' })),
          el('span', { klasse: 'ueben-schalter-wert', text: element.an ? t.uebenAn : t.uebenAus })));
    } else {
      inhalt.push(el('span', { klasse: element.typ === 'bild' ? 'ueben-foto-text' : 'ueben-el-text', text: element.text }));
    }
    // Zeilen in Listen haben rechts einen Pfeil, wie auf dem iPhone.
    if ((ort === 'zeile') && element.typ === 'knopf' && !element.stil) inhalt.push(symbolKnoten('weiter', 'symbol ios-pfeil'));
    if (istZiel) inhalt.push(el('span', { klasse: 'ueben-marke hier', text: t.uebenHier }));
    if (daneben === index && !istZiel) inhalt.push(el('span', { klasse: 'ueben-marke nicht', text: t.uebenDaneben }));

    const knopf = el('button', { type: 'button', klasse: klassen.join(' '), 'data-index': String(index), onclick: () => beiTippen(index) }, inhalt);
    knoepfe[index] = knopf;
    return knopf;
  }

  // --- Ein Feld zum selber Schreiben ---
  function eingabeFeld(element, index, ort) {
    const wert = eingaben[index] ?? '';
    if (element.art === 'ziffern') {
      const anzeige = el('output', { klasse: wert ? 'ios-nummer' : 'ios-nummer leer', 'aria-live': 'polite', text: wert || element.text });
      const setze = (neu) => {
        anzeige.textContent = neu || element.text;
        anzeige.className = neu ? 'ios-nummer' : 'ios-nummer leer';
        beiEingabe(index, neu);
      };
      const tasten = TASTEN.map(([ziffer, buchstaben]) => el('button', {
        type: 'button',
        klasse: 'ueben-taste',
        'aria-label': ziffer,
        onclick: () => setze(`${eingaben[index] ?? ''}${ziffer}`),
      }, el('span', { klasse: 'taste-ziffer', text: ziffer }), buchstaben ? el('span', { klasse: 'taste-buchstaben', 'aria-hidden': 'true', text: buchstaben }) : null));
      const weg = el('button', {
        type: 'button',
        klasse: 'ueben-taste-weg',
        text: t.uebenTasteWeg,
        onclick: () => setze((eingaben[index] ?? '').slice(0, -1)),
      });
      felder[index] = anzeige;
      return el('div', { klasse: 'ios-tastenfeld' }, el('div', { klasse: 'ios-nummer-zeile' }, anzeige, weg), el('div', { klasse: 'ios-tasten' }, tasten));
    }
    const lang = ort === 'eingabe' || String(element.vorschlag ?? '').length > 32;
    const feld = el(lang ? 'textarea' : 'input', {
      klasse: `ueben-eingabe ort-${ort}`,
      'data-index': String(index),
      'aria-label': element.text,
      placeholder: element.text,
      autocomplete: 'off',
      enterkeyhint: ort === 'eingabe' ? 'send' : 'done',
      rows: lang ? '1' : null,
      type: lang ? null : 'text',
      oninput: (ereignis) => {
        beiEingabe(index, ereignis.target.value);
        if (lang) passeHoeheAn(ereignis.target);
      },
      onkeydown: (ereignis) => {
        if (ereignis.key === 'Enter' && !ereignis.shiftKey) {
          ereignis.preventDefault();
          beiEnter();
        }
      },
    });
    feld.value = wert;
    if (lang) setTimeout(() => passeHoeheAn(feld), 0);
    felder[index] = feld;
    return feld;
  }

  function teil(element, index, ort) {
    if (element.typ === 'eingabe') return eingabeFeld(element, index, ort);
    if (element.typ === 'text') return el('p', { klasse: 'ueben-text', text: element.text });
    if (element.typ === 'nachricht') {
      return el('div', { klasse: `ueben-nachricht von-${element.von ?? 'claude'}` },
        element.bild ? bildKnoten(element.bild, element.bildText ?? '', 'nachricht-bild') : null,
        el('p', { text: element.text }));
    }
    return istTippbar(element) ? tippKnopf(element, index, ort) : null;
  }

  // --- Bereiche verteilen ---
  const kopf = [];
  const unten = [];
  const eingabe = [];
  const inhalt = [];
  bildschirm.elemente.forEach((element, index) => {
    const eintrag = { element, index };
    if (element.gruppe === 'kopf') kopf.push(eintrag);
    else if (element.gruppe === 'unten') unten.push(eintrag);
    else if (element.gruppe === 'eingabe') eingabe.push(eintrag);
    else inhalt.push(eintrag);
  });

  // Inhalt: Zeilen in Listen werden zu einer Gruppe zusammengefasst, Fotos nebeneinander zu einem Raster.
  function baueInhalt(eintraege, ortZeile) {
    const teile = [];
    let gruppe = null;
    let raster = null;
    let zeile = null;
    const schliesse = () => { gruppe = null; raster = null; zeile = null; };
    for (const { element, index } of eintraege) {
      const istZeile = (element.typ === 'knopf' && !element.stil) || element.typ === 'schalter' || element.typ === 'datei';
      if (element.gruppe) {
        if (!zeile || zeile.dataset.gruppe !== element.gruppe) {
          schliesse();
          zeile = el('div', { klasse: 'ueben-zeile', 'data-gruppe': element.gruppe });
          teile.push(zeile);
        }
        zeile.append(teil(element, index, 'frei'));
        continue;
      }
      if (element.typ === 'bild' && art !== 'kamera') {
        if (!raster) {
          schliesse();
          raster = el('div', { klasse: 'ios-raster' });
          teile.push(raster);
        }
        raster.append(teil(element, index, 'raster'));
        continue;
      }
      if (istZeile && ortZeile) {
        if (!gruppe) {
          schliesse();
          gruppe = el('div', { klasse: 'ios-gruppe' });
          teile.push(gruppe);
        }
        gruppe.append(teil(element, index, ortZeile));
        continue;
      }
      schliesse();
      teile.push(teil(element, index, 'frei'));
    }
    // Ein einzelnes Foto füllt die ganze Breite.
    for (const knoten of teile) if (knoten.classList?.contains('ios-raster') && knoten.children.length === 1) knoten.classList.add('einzeln');
    return teile;
  }

  function leisteOben(titel) {
    const links = kopf.filter(({ element }) => linksOben(element));
    const rechts = kopf.filter(({ element }) => !linksOben(element));
    return el('div', { klasse: 'ios-leiste' },
      el('div', { klasse: 'ios-leiste-seite' }, links.map(({ element, index }) => teil(element, index, 'kopf'))),
      titel ? el('p', { klasse: 'ios-titel', text: titel }) : el('span'),
      el('div', { klasse: 'ios-leiste-seite rechts' }, rechts.map(({ element, index }) => teil(element, index, 'kopf'))));
  }

  const leisteUnten = () => (unten.length
    ? el('div', { klasse: `ios-unten anzahl-${unten.length}` }, unten.map(({ element, index }) => teil(element, index, 'unten')))
    : null);

  let bildschirmInhalt;
  if (art === 'home') {
    bildschirmInhalt = [el('div', { klasse: 'ios-home' }, bildschirm.elemente.map((element, index) => teil(element, index, 'home')))];
  } else if (art === 'kamera') {
    bildschirmInhalt = [
      el('div', { klasse: 'ios-kamera-oben' }, kopf.map(({ element, index }) => teil(element, index, 'kopf'))),
      el('div', { klasse: 'ios-sucher' }, baueInhalt(inhalt, null)),
      leisteUnten(),
    ];
  } else if (art === 'blatt') {
    bildschirmInhalt = [
      el('div', { klasse: 'ios-hintergrund', 'aria-hidden': 'true' }, el('span'), el('span'), el('span')),
      el('div', { klasse: 'ios-blatt' },
        el('p', { klasse: 'ios-blatt-titel', text: bildschirm.titel }),
        baueInhalt([...kopf, ...inhalt, ...unten].map((e) => ({ ...e, element: { ...e.element, gruppe: undefined } })), 'blatt')),
    ];
  } else if (art === 'dialog') {
    bildschirmInhalt = [
      el('div', { klasse: 'ios-hintergrund', 'aria-hidden': 'true' }, el('span'), el('span'), el('span')),
      el('div', { klasse: 'ios-dialog' },
        el('p', { klasse: 'ios-dialog-titel', text: bildschirm.titel }),
        baueInhalt(inhalt, null),
        unten.length ? el('div', { klasse: 'ios-dialog-knoepfe' }, unten.map(({ element, index }) => teil(element, index, 'dialog'))) : null),
    ];
  } else {
    bildschirmInhalt = [
      leisteOben(bildschirm.titel),
      el('div', { klasse: `ios-inhalt art-${art}` }, baueInhalt(inhalt, art === 'chat' ? null : 'zeile')),
      eingabe.length ? el('div', { klasse: 'ios-schreibzeile' }, eingabe.map(({ element, index }) => teil(element, index, 'eingabe'))) : null,
      leisteUnten(),
    ];
  }

  const dunkel = art === 'kamera' || art === 'home';
  const knoten = el('div', {
    klasse: `telefon ueben-telefon art-${art}${dunkel ? ' dunkel' : ''}`,
    role: 'group',
    'aria-label': fuelle(t.uebenTelefonName, { app: bildschirm.app, titel: bildschirm.titel }),
  },
  statusleiste(dunkel),
  el('div', { klasse: 'ios-bildschirm' }, bildschirmInhalt),
  el('span', { klasse: 'ios-strich', 'aria-hidden': 'true' }));

  return { knoten, knoepfe, felder };
}

// Mehrzeilige Felder wachsen mit dem Text, wie die Schreibzeile in der echten App.
function passeHoeheAn(feld) {
  feld.style.height = 'auto';
  feld.style.height = `${Math.min(feld.scrollHeight + 2, 220)}px`;
}
