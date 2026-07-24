/* ═══════════════════════════════════════════════════════════════════════════
   MPP — SCROLL LISSÉ (Lenis)
   Donne au scroll le ressenti « lourd » / glissé validé par Brian.

   Lenis en mode natif : il anime window.scrollTo, donc window.scrollY et
   l'événement 'scroll' restent valides — les scripts existants (retrait de la
   navbar, parallaxe du hero) continuent de fonctionner sans changement.

   ATTENTION — ne JAMAIS ré-émettre un événement 'scroll' natif depuis
   lenis.on('scroll') : Lenis écoute lui-même les scrolls natifs pour se
   synchroniser, ce qui provoquait une RÉCURSION INFINIE (dépassement de pile à
   chaque scroll, toute la chaîne de scroll cassée). Les modules qui doivent
   suivre le scroll s'abonnent directement à window.lenis.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  if (typeof Lenis === 'undefined') return;
  // Respecte la préférence système : pas de scroll lissé si mouvement réduit.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const lenis = new Lenis({
    // « lourdeur » : plus lerp est bas, plus le scroll glisse longtemps.
    // 0.10 = défaut Lenis ; 0.065 = nettement plus lourd, sans devenir mou.
    lerp: 0.065,
    wheelMultiplier: 0.9,   // molette un peu plus posée
    smoothWheel: true,
    touchMultiplier: 1.4,   // le tactile reste réactif (mobile)
  });
  window.lenis = lenis;

  function raf(t) {
    lenis.raf(t);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Garde ScrollTrigger (carrousel, animations d'origine) synchro avec Lenis.
  // GSAP/ScrollTrigger chargent après ce script (fin de body) : on repolle
  // jusqu'à ce qu'il apparaisse, sans jamais tourner indéfiniment si la page
  // ne charge pas GSAP du tout.
  const brancherScrollTrigger = () => {
    if (!window.ScrollTrigger) return false;
    lenis.on('scroll', window.ScrollTrigger.update);
    return true;
  };
  if (!brancherScrollTrigger()) {
    const iv = setInterval(() => { if (brancherScrollTrigger()) clearInterval(iv); }, 50);
    setTimeout(() => clearInterval(iv), 8000);
  }
})();
