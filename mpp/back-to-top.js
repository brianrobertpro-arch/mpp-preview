/* ═══════════════════════════════════════════════════════════════════════════
   MPP — BOUTON « RETOUR EN HAUT »

   Petit rond discret en bas à droite (DA sable/crème translucide + flèche
   colorée). N'apparaît qu'après ~1 écran de scroll, avec un fondu doux. Le
   clic remonte en haut en scroll lissé, compatible Lenis (window.lenis).

   Couleur de l'accent (flèche + focus) pilotée par la custom property CSS
   --mpp-back-to-top, à définir par page (repli #E8A248 si absente).

   Autonome : injecte son style et son bouton, ne dépend d'aucun HTML existant.
   pointer-events actifs UNIQUEMENT quand le bouton est visible.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  const SEUIL = () => window.innerHeight * 0.9;   // ~1 écran de scroll
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const injecterStyle = () => {
    if (document.getElementById('mpp-haut-style')) return;
    const st = document.createElement('style');
    st.id = 'mpp-haut-style';
    st.textContent =
      '.mpp-haut{position:fixed;right:24px;bottom:24px;z-index:9999;' +
      'width:44px;height:44px;display:flex;align-items:center;justify-content:center;' +
      'border:1px solid rgba(232,162,72,.35);border-radius:999px;' +
      'background:rgba(250,246,238,.82);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);' +
      'box-shadow:0 6px 18px rgba(120,100,60,.18);cursor:pointer;padding:0;' +
      // Caché par défaut : transparent, légèrement descendu, non cliquable.
      'opacity:0;transform:translateY(8px);pointer-events:none;' +
      'transition:opacity .35s ease,transform .35s ease,background .2s ease,box-shadow .2s ease;}' +
      '.mpp-haut.visible{opacity:1;transform:translateY(0);pointer-events:auto;}' +
      '.mpp-haut:hover{background:rgba(250,246,238,.96);box-shadow:0 8px 22px rgba(120,100,60,.24);}' +
      '.mpp-haut:focus-visible{outline:2px solid var(--mpp-back-to-top, #E8A248);outline-offset:2px;}' +
      // Icône = fonctionnelle (doit rester lisible) → encre. L'anneau, décoratif,
      // garde la couleur de la page (voir bordure ci-dessus).
      '.mpp-haut svg{width:20px;height:20px;display:block;stroke:var(--mpp-ink, #1b1b1b);}' +
      '@media (max-width:479px){.mpp-haut{right:16px;bottom:16px;}}';
    (document.head || document.documentElement).appendChild(st);
  };

  const creerBouton = () => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mpp-haut';
    btn.setAttribute('aria-label', 'Retour en haut de la page');
    // Flèche vers le haut, trait orange arrondi (cohérent avec les icônes réseaux).
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg>';

    btn.addEventListener('click', () => {
      if (window.lenis && typeof window.lenis.scrollTo === 'function') {
        window.lenis.scrollTo(0);                       // scroll lissé Lenis
      } else {
        window.scrollTo({ top: 0, behavior: reduit ? 'auto' : 'smooth' });
      }
    });
    return btn;
  };

  const init = () => {
    injecterStyle();
    const btn = creerBouton();
    document.body.appendChild(btn);

    const majVisibilite = () => {
      const y = window.lenis ? window.lenis.scroll : window.scrollY;
      btn.classList.toggle('visible', y > SEUIL());
    };

    // Lenis (mode natif) laisse window.scrollY et l'événement 'scroll' valides.
    window.addEventListener('scroll', majVisibilite, { passive: true });
    window.addEventListener('resize', majVisibilite, { passive: true });
    majVisibilite();
  };

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
