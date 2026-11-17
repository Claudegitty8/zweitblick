// Der Spickzettel: Karten mit den echten Schritten in der Claude-App.
// Jede Karte kommt dazu, sobald die Runde zu ihrem Thema vorbei ist. Druckbar.
import { el, fuelle, knopf, hauptnavigation, arztHinweisKarte, fusszeile } from './bausteine.js';
import { beispielBild } from './bild.js';
import { spickzettel } from '../logik/extras.js';
import { uebenKnopf } from './ueben.js';

export function zeigeSpickzettel(wurzel, app, nav, daten = {}) {
  const { texte, auftraege, regeln } = app.inhalte;
  const t = texte.app;
  const karten = spickzettel(app.stand, auftraege, regeln);
  const gesamt = auftraege.flatMap((a) => a.runden).filter((r) => r.konzept).length;

  const gruppen = auftraege.map((auftrag) => {
    const eigene = karten.filter((karte) => karte.auftrag === auftrag.id);
    if (eigene.length === 0) return null;
    return el('section', { klasse: 'spick-gruppe' },
      el('h2', { text: auftrag.thema }),
      eigene.map(({ konzept }) => {
        const k = texte.konzepte[konzept];
        return el('article', { klasse: 'karte echt spick-karte', 'data-konzept': konzept },
          el('h3', { text: k.name }),
          el('ol', { klasse: 'echt-schritte' }, (k.echt ?? []).map((schritt) => el('li', { text: schritt }))),
          k.bilder?.length ? el('div', { klasse: 'beispiel-bilder klein-bilder' }, k.bilder.map((bild) => beispielBild(bild, t))) : null,
          uebenKnopf(app, nav, konzept, { ziel: 'spickzettel', daten: { konzept }, text: t.uebenZurueckSpick }, 'knopf-zweit nicht-drucken'));
      }));
  }).filter(Boolean);

  wurzel.append(...[
    el('header', { klasse: 'kopf' }, el('h1', { text: t.spickTitel })),
    hauptnavigation(t, nav, 'spickzettel'),
    el('p', { text: t.spickInfo }),
    el('p', { klasse: 'klein', text: t.echtStand }),
    arztHinweisKarte(t),
    karten.length === 0 ? el('section', { klasse: 'karte' }, el('p', { text: t.spickLeer })) : null,
    ...gruppen,
    karten.length > 0 ? knopf(t.spickDrucken, () => globalThis.print?.(), 'knopf-zweit nicht-drucken') : null,
    el('p', { klasse: 'klein', text: fuelle(t.spickOffen, { anzahl: gesamt - karten.length, gesamt }) }),
    el('p', { klasse: 'notruf-zeile', text: t.notrufZeile }),
    fusszeile(t, nav),
  ].filter(Boolean));

  // Zurück aus einer Übung: Die Karte dieses Themas kommt wieder ins Bild, der Knopf bekommt den Fokus.
  if (daten.konzept) {
    const karte = wurzel.querySelector(`[data-konzept="${CSS.escape(daten.konzept)}"]`);
    setTimeout(() => {
      karte?.scrollIntoView({ block: 'start' });
      karte?.querySelector('.ueben-start')?.focus({ preventScroll: true });
    }, 0);
  }
}
