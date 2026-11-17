// Impressum und Datenschutz. Die Angaben zum Betreiber stehen in spiel/inhalte/betreiber.json,
// alle Texte in spiel/inhalte/de/texte.json. Hier wird nur angezeigt.
import { el, leiste, fusszeile } from './bausteine.js';

// Name, Adresse und E-Mail des Betreibers. Fehlt etwas, steht dort «Noch nicht eingetragen».
function betreiberAngaben(app) {
  const t = app.inhalte.texte.app;
  const b = app.inhalte.betreiber ?? {};
  const leer = !['name', 'strasse', 'email'].some((feld) => typeof b[feld] === 'string' && b[feld].trim());
  if (b.testumgebung === true && leer) return el('p', { klasse: 'hinweis', text: t.impressumTest });
  const oderFehlt = (wert) => (typeof wert === 'string' && wert.trim() ? wert.trim() : t.impressumFehlt);
  const adresse = [b.strasse, b.ort, b.land].filter((teil) => typeof teil === 'string' && teil.trim()).join(', ');
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  // Die Adresse steht als Text da und ist zugleich ein Link. So geht sie auch dort, wo Links nicht funktionieren.
  const emailKnoten = email ? el('a', { href: `mailto:${email}`, text: email }) : el('span', { text: t.impressumFehlt });
  return el('dl', {},
    el('dt', { text: t.impressumName }), el('dd', { text: oderFehlt(b.name) }),
    el('dt', { text: t.impressumAdresse }), el('dd', { text: adresse && b.strasse?.trim() ? adresse : t.impressumFehlt }),
    el('dt', { text: t.impressumEmail }), el('dd', {}, emailKnoten));
}

export function zeigeImpressum(wurzel, app, nav) {
  const t = app.inhalte.texte.app;
  wurzel.append(
    leiste(t, nav, t.impressumTitel),
    el('section', { klasse: 'karte recht' },
      el('p', { text: t.impressumPrivat }),
      betreiberAngaben(app)),
    el('section', { klasse: 'karte recht' },
      el('p', { text: t.impressumUnabhaengig }),
      el('p', { text: t.impressumGesundheit }),
      el('p', { text: t.impressumLizenz }),
      el('a', { klasse: 'link-zeile', href: t.impressumQuellcodeAdresse, target: '_blank', rel: 'noopener noreferrer', text: t.impressumQuellcode })),
    fusszeile(t, nav),
  );
}

export function zeigeDatenschutz(wurzel, app, nav) {
  const t = app.inhalte.texte.app;
  wurzel.append(
    leiste(t, nav, t.datenschutzTitel),
    el('section', { klasse: 'karte recht' },
      el('h2', { text: t.datenschutzVerantwortlich }),
      betreiberAngaben(app)),
    ...(t.datenschutzAbschnitte ?? []).map((abschnitt) => el('section', { klasse: 'karte recht' },
      el('h2', { text: abschnitt.titel }),
      abschnitt.saetze.map((satz) => el('p', { text: satz })))),
    el('a', { klasse: 'link-zeile', href: t.ueberGithubAdresse, target: '_blank', rel: 'noopener noreferrer', text: t.ueberGithubLink }),
    el('p', { klasse: 'klein', text: t.datenschutzStand }),
    fusszeile(t, nav),
  );
}
