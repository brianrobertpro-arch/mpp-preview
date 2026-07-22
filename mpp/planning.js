/* ═══════════════════════════════════════════════════════════════════════════
   MPP — Diagramme « Journée type » (section-4)

   CENTRAGE des rayons sur les créneaux — SANS toucher au design ni aux
   animations d'entrée.

   Le BOUT de chaque rayon doit tomber EXACTEMENT sur le CENTRE du bloc créneau
   (image + horaire + description), pas à côté. On fixe donc l'extrémité (x2,y2)
   de chaque rayon sur le centre de sa carte (appariement déterministe par
   classe planning-rN ↔ planning-cN ; centre mesuré par getBBox, exact dans le
   navigateur). La longueur/angle du rayon s'ajuste en conséquence.

   Pourquoi bouger le rayon et non la carte : l'animation CSS « fadeUp » anime
   `transform` avec fill `forwards`, donc elle écrase tout transform posé sur la
   carte (état final translateY(0)) — les cartes restent à leur position
   statique. Le rayon n'ayant pas d'animation sur `transform`, on maîtrise son
   extrémité de façon fiable. (Le décalage du diagramme sous le badge MENU est
   géré séparément dans planning.css.)
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  // ⚠ Ne PAS sortir si le diagramme n'existe pas encore : il est construit par
  // le script d'origine. Un `return` au chargement tuait définitivement l'IIFE
  // et aucune relance n'était jamais enregistrée.
  let svg = null;
  const trouver = () => {
    const sec = document.querySelector('.section-4');
    if (!sec) return null;
    return [...sec.querySelectorAll('svg')].find((s) => s.querySelector('circle') && s.querySelectorAll('line').length > 1) || null;
  };

  const appliquer = () => {
    try {
      svg = svg && svg.isConnected ? svg : trouver();
      return svg ? poser() : false;
    } catch (e) { console.error('[mpp-planning]', e); return false; }
  };

  const boite = (e) => { try { return e.getBBox(); } catch { return null; } };

  const numRayon = (l) => {
    const m = (l.getAttribute('class') || '').match(/planning-r(\d+)/);
    return m ? m[1] : null;
  };
  const centreBloc = (carte) => {
    const b = boite(carte);                // getBBox : ignore les transforms
    return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
  };

  const poser = () => {
    const lignes = [...svg.querySelectorAll('line')];
    if (lignes.length < 2) return false;

    // Chaque rayon se TERMINE au centre du bloc de sa carte.
    //
    // Pourquoi bouger le bout du rayon (et non la carte) : l'animation CSS
    // d'entrée « fadeUp » anime `transform` avec `forwards`, donc elle ÉCRASE
    // tout transform qu'on poserait sur la carte (elle finit à translateY(0)).
    // Les cartes restent donc à leur position statique. Le rayon, lui, n'a pas
    // d'animation sur `transform` : on peut fixer librement son extrémité.
    //
    // Appariement DÉTERMINISTE par classe : planning-rN ↔ planning-cN. Le
    // centre est mesuré par getBBox (bloc image + horaire + description),
    // insensible aux transforms → exact dans le navigateur.
    let faits = 0;
    lignes.forEach((l) => {
      const n = numRayon(l);
      const carte = n ? svg.querySelector('.planning-c' + n) : null;
      const c = carte ? centreBloc(carte) : null;
      if (!c) return;
      l.removeAttribute('transform');                // pas de rotation résiduelle
      l.setAttribute('x2', c.x.toFixed(1));
      l.setAttribute('y2', c.y.toFixed(1));
      faits++;
    });

    if (!faits) return false;
    svg.dataset.mppCentres = (faits === lignes.length) ? 'ok' : 'partiel';
    return svg.dataset.mppCentres === 'ok';
  };

  // Le diagramme peut être (re)construit APRÈS ce script : on teste l'état réel
  // (tous les rayons sont-ils centrés sur leur carte ?) et on ré-applique tant
  // que ce n'est pas le cas.
  const dejaFait = () => {
    if (!svg || !svg.isConnected) return false;
    return svg.dataset.mppCentres === 'ok';
  };

  appliquer();
  let n = 0;
  const iv = setInterval(() => {
    if (!dejaFait()) appliquer();
    if (++n > 100) clearInterval(iv);                    // ~10 s puis on cesse
  }, 100);
  new MutationObserver(() => { if (!dejaFait()) appliquer(); })
    .observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', appliquer, { once: true });
})();
