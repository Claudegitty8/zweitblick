// Kleine Helfer, aus denen alle Ansichten gebaut sind.

export function el(tag, eigenschaften = {}, ...kinder) {
  const knoten = document.createElement(tag);
  for (const [name, wert] of Object.entries(eigenschaften)) {
    if (wert == null || wert === false) continue;
    if (name === 'klasse') knoten.className = wert;
    else if (name === 'text') knoten.textContent = wert;
    else if (name.startsWith('on')) knoten.addEventListener(name.slice(2), wert);
    else knoten.setAttribute(name, wert === true ? '' : wert);
  }
  knoten.append(...kinder.flat().filter((kind) => kind != null && kind !== false));
  return knoten;
}

// Ersetzt Platzhalter wie {anzahl} in einem Text.
export function fuelle(text, werte) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (_, name) => String(werte[name] ?? ''));
}

export function knopf(text, beiKlick, klasse = 'knopf') {
  return el('button', { type: 'button', klasse, text, onclick: beiKlick });
}

// Lupe, die Übungs-KI: eine Lupe mit zwei Augen. Froh, wenn etwas gelungen ist.
export function lupeFigur(name, froh = false) {
  return el('div', { klasse: froh ? 'lupe froh' : 'lupe', role: 'img', 'aria-label': name },
    el('span', { klasse: 'lupe-glas' }, el('span', { klasse: 'auge' }), el('span', { klasse: 'auge' })),
    el('span', { klasse: 'lupe-griff' }));
}

// Meisterschaftsanzeige: gefüllte und leere Punkte, mit Text für Vorlesehilfen.
export function punkte(erfolge, noetig, beschriftung) {
  const reihe = el('span', { klasse: 'punkte', role: 'img', 'aria-label': fuelle(beschriftung, { erfolge, noetig }) });
  for (let i = 0; i < noetig; i += 1) {
    reihe.append(el('span', { klasse: i < erfolge ? 'punkt voll' : 'punkt' }));
  }
  return reihe;
}

// Fusszeile mit Version und den Links zu Impressum und Datenschutz.
// Von jeder Hauptseite aus ein Klick, von jeder anderen Seite aus höchstens zwei.
export function fusszeile(t, nav) {
  return el('footer', { klasse: 'fuss' },
    el('p', { text: t.fuss }),
    el('nav', { klasse: 'fuss-links', 'aria-label': t.rechtName },
      knopf(t.fussImpressum, () => nav.zu('impressum'), 'knopf-leise'),
      knopf(t.fussDatenschutz, () => nav.zu('datenschutz'), 'knopf-leise')));
}

// Gesundheitshinweis: Claudes Antworten nur für das Gespräch mit Ärztin oder Arzt.
// Überall dieselbe Karte, damit er gleich aussieht und gleich heisst.
export function arztHinweisKarte(t) {
  return el('section', { klasse: 'karte arzt-hinweis', role: 'note', 'aria-label': t.arztHinweisTitel },
    el('h2', { text: t.arztHinweisTitel }),
    el('ul', { klasse: 'arzt-hinweis-liste' }, (t.arztHinweis ?? []).map((satz) => el('li', { text: satz }))));
}

// Kopfleiste für Unteransichten: Der Knopf nennt immer sein Ziel.
export function leiste(t, nav, titel) {
  return el('nav', { klasse: 'leiste', 'aria-label': t.leisteName },
    knopf(t.zurueck, () => nav.zu('cafe'), 'knopf-leise zurueck'),
    el('h1', { klasse: 'leiste-titel', text: titel }));
}

// Hauptnavigation für die vier festen Bereiche. Die aktuelle Seite ist markiert.
export function hauptnavigation(t, nav, aktuell) {
  const bereiche = [['cafe', t.navCafe], ['spickzettel', t.navSpickzettel], ['lexikon', t.navLexikon], ['einstellungen', t.navHilfe]];
  return el('nav', { klasse: 'hauptnav', 'aria-label': t.navName },
    bereiche.map(([ziel, name]) => el('button', {
      type: 'button',
      klasse: ziel === aktuell ? 'hauptnav-knopf aktuell' : 'hauptnav-knopf',
      'aria-current': ziel === aktuell ? 'page' : null,
      text: name,
      onclick: () => nav.zu(ziel),
    })));
}
