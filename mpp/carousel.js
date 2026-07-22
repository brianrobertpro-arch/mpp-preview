/* ═══════════════════════════════════════════════════════════════════════════
   MPP — Flèches du carrousel crèches
   Elles affichaient les CARACTÈRES typographiques « ‹ » et « › » : un glyphe
   posé sur une ligne de base, donc jamais centré optiquement dans le cercle —
   d'où l'impression d'ovale, alors que le bouton est parfaitement carré.
   On y pose le même chevron SVG que le carrousel équipe pilote (référence
   choisie par Brian) : tracé géométrique, centré au pixel.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  const CHEVRON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M9 18l6-6-6-6"></path></svg>';

  const poser = () => {
    const fleches = [...document.querySelectorAll('.cc-section .c3d-arrow')];
    if (!fleches.length) return false;
    fleches.forEach((b) => {
      if (b.querySelector('svg')) return;                 // déjà posé
      // libellé accessible : le glyphe disparaît, il faut nommer le bouton
      if (!b.getAttribute('aria-label')) {
        b.setAttribute('aria-label',
          b.classList.contains('prev') ? 'Crèche précédente' : 'Crèche suivante');
      }
      b.innerHTML = CHEVRON;
    });
    return true;
  };

  if (!poser()) {
    let n = 0;
    const iv = setInterval(() => { if (poser() || ++n > 50) clearInterval(iv); }, 100);
  }
  // le carrousel peut se re-rendre : on repose le chevron s'il disparaît
  new MutationObserver(() => poser()).observe(document.body, { childList: true, subtree: true });
})();
