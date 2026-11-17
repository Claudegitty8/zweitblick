// Lexikon sowie Einstellungen und Hilfe: zwei Nebenansichten.
import { el, fuelle, knopf, punkte, hauptnavigation, arztHinweisKarte, fusszeile } from './bausteine.js';
import { erfolge, neuerFortschritt } from '../logik/meisterschaft.js';
import { wendeSchriftAn } from './schrift.js';
import { wandleUm, pruefeLauf, sprungStatus, springeZuAuftrag, SCHRIFTEN, LAENDER } from '../logik/extras.js';
import { istApfelGeraet, laeuftAlsApp } from './hinweise.js';

function kopf(t, titel, nav, aktuell) {
  return [el('header', { klasse: 'kopf' }, el('h1', { text: titel })), hauptnavigation(t, nav, aktuell)];
}

function quellenLink(t, adresse) {
  return el('a', { klasse: 'link-zeile', href: adresse, target: '_blank', rel: 'noopener noreferrer', text: t.quelleLink });
}

export function zeigeLexikon(wurzel, app, nav) {
  const { texte, lexikon, lehrplan, regeln } = app.inhalte;
  const t = texte.app;
  const noetig = regeln.erfolgeFuerMeisterschaft;
  const offen = lehrplan.konzepte.filter((konzept) => !app.stand.lexikon.includes(konzept.id)).length;

  function zeile(etikett, text) {
    return text ? el('p', {}, el('strong', { text: `${etikett}: ` }), el('span', { text })) : null;
  }

  // Bekannte Einträge in der Reihenfolge, in der sie freigeschaltet wurden.
  const eintraege = app.stand.lexikon.filter((id) => lexikon[id]).map((id) => {
    const eintrag = lexikon[id];
    const kern = eintrag.kern ? texte.konzepte[eintrag.kern] : null;
    const anzahl = eintrag.kern ? Math.min(noetig, erfolge(app.stand.fortschritt[eintrag.kern] ?? neuerFortschritt())) : 0;
    return el('details', { klasse: 'karte eintrag' },
      el('summary', {}, el('span', { text: eintrag.begriff }), kern ? punkte(anzahl, noetig, t.punkteLabel) : null),
      el('p', { text: eintrag.erklaerung }),
      zeile(t.lexEnglisch, eintrag.englisch),
      zeile(t.lexAnalogie, kern?.analogie),
      zeile(t.lexQuatsch, eintrag.quatsch),
      zeile(t.lexGenauer, eintrag.genauer),
      eintrag.quelle ? quellenLink(t, eintrag.quelle) : null);
  });

  wurzel.append(
    ...kopf(t, t.lexikonTitel, nav, 'lexikon'),
    el('p', { klasse: 'klein', text: t.lexikonInfo }),
    ...eintraege,
    el('p', { klasse: 'klein', text: fuelle(t.lexikonOffen, { anzahl: offen }) }),
    fusszeile(t, nav),
  );
}

export function zeigeEinstellungen(wurzel, app, nav, daten) {
  const t = app.inhalte.texte.app;
  const auswahlKnoepfe = (werte, namen, aktuell, beiWahl) => el('div', { klasse: 'bausteine' }, werte.map((wert) => el('button', {
    type: 'button',
    klasse: 'baustein wahl',
    'aria-pressed': String(aktuell === wert),
    onclick: () => beiWahl(wert),
  }, el('span', { klasse: 'baustein-zeichen', 'aria-hidden': 'true' }), el('span', { text: namen[wert] }))));

  const schrift = auswahlKnoepfe(SCHRIFTEN, t.schrift, app.stand.einstellungen.schrift, (wert) => {
    app.setze({ ...app.stand, einstellungen: { ...app.stand.einstellungen, schrift: wert } });
    wendeSchriftAn(wert);
    nav.zu('einstellungen');
  });
  const land = auswahlKnoepfe(LAENDER, t.landName, app.stand.einstellungen.land, (wert) => {
    app.setzeLand(wert);
    nav.zu('einstellungen', { gespeichert: t.landGeaendert });
  });

  // Eigene Rückfrage statt Browser-Dialog: funktioniert überall gleich.
  // Escape bricht ab, nie bestätigen.
  const rueckfrage = el('div', { klasse: 'rueckfrage', hidden: true, onkeydown: (e) => { if (e.key === 'Escape') schliesseLoeschen(); } },
    el('p', { text: t.loeschenFrage }),
    el('div', { klasse: 'knopf-reihe' },
      knopf(t.loeschenNein, () => schliesseLoeschen(), 'knopf-zweit'),
      knopf(t.loeschenJa, () => {
        const land = app.stand.einstellungen.land;
        const schriftWert = app.stand.einstellungen.schrift;
        app.stand = app.speicher.loeschen();
        // Land und Schrift bleiben: Wer neu anfängt, will nicht alles neu einstellen.
        app.setze({ ...app.stand, einstellungen: { ...app.stand.einstellungen, land, schrift: schriftWert } });
        nav.zu('cafe', { gruss: t.geloescht });
      }, 'knopf-warn')));

  // Löschen braucht eine Rückfrage. Der Fokus springt auf «Abbrechen», damit Enter nichts löscht.
  const loeschenKnopf = knopf(t.loeschen, () => {
    rueckfrage.hidden = false;
    rueckfrage.querySelector('button')?.focus();
  }, 'knopf-zweit');
  function schliesseLoeschen() {
    rueckfrage.hidden = true;
    loeschenKnopf.focus();
  }

  // Spielstand als Datei sichern und wieder laden. Die Datei bleibt beim Spieler.
  const dateiStatus = el('p', { klasse: 'klein', role: 'status' });
  const sichern = knopf(t.standSichern, () => {
    const adresse = URL.createObjectURL(new Blob([JSON.stringify(app.stand, null, 2)], { type: 'application/json' }));
    const link = el('a', { href: adresse, download: 'zweitblick-spielstand.json' });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(adresse), 1000);
    dateiStatus.textContent = t.standGesichert;
  }, 'knopf-zweit');
  const dateiWahl = el('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
    'aria-label': t.standLaden,
    onchange: async () => {
      try {
        const datei = dateiWahl.files?.[0];
        if (!datei) return;
        if (datei.size > 2_000_000) throw new Error('zu gross');
        // Auch Dateien aus älteren Versionen werden angenommen und umgewandelt, nie ungeprüft übernommen.
        const gelesen = wandleUm(JSON.parse(await datei.text()));
        if (!gelesen) throw new Error('kein Spielstand');
        const stand = pruefeLauf(gelesen, app.inhalte.auftraege);
        app.setze(stand);
        if (stand.einstellungen.land) app.setzeLand(stand.einstellungen.land);
        wendeSchriftAn(stand.einstellungen.schrift);
        dateiStatus.textContent = t.standGeladen;
      } catch {
        dateiStatus.textContent = t.standUngueltig;
      } finally {
        dateiWahl.value = '';
      }
    },
  });
  const laden = knopf(t.standLaden, () => dateiWahl.click(), 'knopf-zweit');
  const iphoneHinweis = istApfelGeraet() && !laeuftAlsApp() ? el('p', { klasse: 'klein', text: t.iphoneInfo }) : null;

  wurzel.append(...[
    ...kopf(t, t.einstellungenTitel, nav, 'einstellungen'),
    daten?.gespeichert ? el('p', { klasse: 'hinweis gut', role: 'status', text: daten.gespeichert }) : null,
    el('section', { klasse: 'karte notfall' },
      el('h2', { text: t.notfallTitel }),
      el('p', { text: t.notfallText })),
    arztHinweisKarte(t),
    el('section', { klasse: 'karte' },
      el('h2', { text: t.spielHilfeTitel }),
      t.spielHilfe.map((satz) => el('p', { text: satz }))),
    el('section', { klasse: 'karte' },
      el('h2', { text: t.schriftEtikett }),
      schrift),
    el('section', { klasse: 'karte' },
      el('h2', { text: t.landEtikett }),
      el('p', { klasse: 'klein', text: t.landInfo }),
      land),
    el('section', { klasse: 'karte' },
      el('h2', { text: t.standEtikett }),
      el('p', { text: app.speicher.dauerhaft ? t.standInfo : t.standInfoAus }),
      el('p', { klasse: 'klein', text: t.offlineInfo }),
      el('p', { klasse: 'klein', text: t.browserInfo }),
      iphoneHinweis,
      el('div', { klasse: 'knopf-reihe' }, sichern, laden),
      dateiWahl,
      dateiStatus,
      loeschenKnopf,
      rueckfrage),
    springen(app, nav, t, daten?.springen),
    ueberDasSpiel(app, t),
    fusszeile(t, nav),
  ].filter(Boolean));
}

// Daten, Hinweis «inoffiziell», fehlende Fachprüfung, Quellen und Kontakt.
// Der Kontakt erscheint erst, wenn in texte.json eine E-Mail-Adresse eingetragen ist.
function ueberDasSpiel(app, t) {
  const absatz = (etikett, ...inhalt) => el('p', {}, el('strong', { text: `${etikett}: ` }), ...inhalt);
  const adresse = t.ueberKontaktAdresse?.trim();
  const fakten = app.inhalte.fakten ?? [];
  return el('section', { klasse: 'karte' },
    el('h2', { text: t.ueberEtikett }),
    absatz(t.ueberZweckEtikett, el('span', { text: t.ueberZweck })),
    absatz(t.ueberDatenEtikett, el('span', { text: t.ueberDaten })),
    el('a', { klasse: 'link-zeile', href: t.ueberGithubAdresse, target: '_blank', rel: 'noopener noreferrer', text: t.ueberGithubLink }),
    absatz(t.ueberFachEtikett, el('span', { text: t.ueberFach })),
    absatz(t.ueberInoffiziellEtikett, el('span', { text: t.ueberInoffiziell })),
    el('details', { klasse: 'eintrag' },
      el('summary', { text: fuelle(t.quellenTitel, { anzahl: fakten.length }) }),
      el('ul', { klasse: 'quellen-liste' }, fakten.map((fakt) => el('li', {},
        el('span', { text: `${fakt.aussage} ` }),
        el('a', { href: fakt.quelle, target: '_blank', rel: 'noopener noreferrer', text: fuelle(t.quelleStand, { datum: fakt.geprueft }) }),
        // Gesundheitsangaben haben eine zweite, unabhängige Quelle (E-019).
        fakt.quelle2 ? el('span', { text: ' · ' }) : null,
        fakt.quelle2 ? el('a', { href: fakt.quelle2, target: '_blank', rel: 'noopener noreferrer', text: t.quelleZweite }) : null)))),
    adresse
      ? absatz(t.ueberKontaktEtikett, el('span', { text: `${t.ueberKontakt} ` }), el('a', { href: `mailto:${adresse}`, text: adresse }))
      : null);
}

// Zu einem späteren Besuch springen, zum Beispiel nach einem Gerätewechsel.
// Vor jedem Sprung kommt eine Rückfrage. Der letzte Sprung lässt sich rückgängig machen.
function springen(app, nav, t, offen = false) {
  const { auftraege, regeln } = app.inhalte;
  const status = sprungStatus(app.stand, auftraege);
  const hatZiele = status.some((s) => s.status === 'ziel');
  const vorher = app.speicher.vorSprung();
  const zusatz = { erledigt: t.besuchErledigt, dran: t.besuchDran, offen: t.besuchKommt };

  const frage = el('p', {});
  const ja = knopf(t.sprungJa, null, 'knopf-warn');
  let aktion = null;
  ja.addEventListener('click', () => aktion?.());
  const rueckfrage = el('div', {
    klasse: 'rueckfrage', hidden: true, 'aria-live': 'polite',
    // Escape bricht ab, nie bestätigen.
    onkeydown: (e) => { if (e.key === 'Escape') rueckfrage.hidden = true; },
  },
    frage,
    el('div', { klasse: 'knopf-reihe' },
      knopf(t.sprungNein, () => { rueckfrage.hidden = true; }, 'knopf-zweit'), ja));

  // Die Rückfrage erscheint direkt beim Knopf, der sie ausgelöst hat. So sieht man sie auch am Handy.
  function frageNach(ort, text, jaText, wennJa) {
    ort.append(rueckfrage);
    frage.textContent = text;
    ja.textContent = jaText;
    aktion = wennJa;
    rueckfrage.hidden = false;
    // Fokus auf «Nein»: Ein versehentliches Enter springt nicht.
    rueckfrage.querySelector('button')?.focus();
  }

  const liste = el('ol', { klasse: 'sprung-liste' }, status.map(({ id, status: art }, stelle) => {
    const auftrag = auftraege[stelle];
    const name = fuelle(t.sprungZiel, { nr: stelle + 1, gast: auftrag.gast, thema: auftrag.thema });
    if (art !== 'ziel') return el('li', {}, el('span', { klasse: 'sprung-fertig', text: `${name} (${zusatz[art]})` }));
    const eintrag = el('li', {});
    eintrag.append(knopf(name, () => frageNach(eintrag, fuelle(t.sprungFrage, { gast: auftrag.gast }), t.sprungJa, () => {
      app.speicher.merkeVorSprung(app.stand);
      app.setze(springeZuAuftrag(app.stand, id, auftraege, regeln));
      nav.zu('cafe', { gruss: fuelle(t.sprungGemacht, { gast: auftrag.gast }) });
    }), 'knopf-zweit sprung-knopf'));
    return eintrag;
  }));

  const zurueckOrt = el('div', { klasse: 'sprung-zurueck' });
  const zurueck = vorher ? knopf(t.sprungZurueck, () => frageNach(zurueckOrt, t.sprungZurueckFrage, t.sprungZurueckJa, () => {
    app.speicher.vergissVorSprung();
    app.setze(pruefeLauf(vorher, auftraege));
    nav.zu('cafe', { gruss: t.sprungZurueckGemacht });
  }), 'knopf-zweit') : null;
  if (zurueck) zurueckOrt.append(zurueck);

  const auswahl = hatZiele
    ? el('details', { klasse: 'eintrag sprung-auf', open: offen }, el('summary', { text: t.sprungWaehlen }), liste)
    : el('p', { klasse: 'klein', text: t.sprungNichts });
  const karte = el('section', { klasse: 'karte', id: 'springen' },
    el('h2', { text: t.sprungEtikett }),
    el('p', { text: t.sprungInfo }),
    auswahl,
    zurueck ? zurueckOrt : null);
  if (offen) {
    requestAnimationFrame(() => {
      karte.scrollIntoView({ block: 'start' });
      (auswahl.querySelector('summary') ?? auswahl).focus?.({ preventScroll: true });
    });
  }
  return karte;
}
