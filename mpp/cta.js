/* ═══════════════════════════════════════════════════════════════════════════
   MPP — CTA « Nos différentes crèches »
   Rend le bloc réellement cliquable (il ne l'était pas), répare la flèche qui
   se rendait en 0×0, et fait défiler vers la section des crèches.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  const cta = document.querySelector('.hero-section.main .div-footer-hero');
  const cible = document.querySelector('.cc-section');
  if (!cta || !cible) return;

  // ─── Flèche : elle est en loading=lazy SANS dimensions dans le HTML
  // d'origine, donc rendue en 0×0 — invisible. Même piège que le logo. ──────
  const fleche = cta.querySelector('img');
  if (fleche) {
    fleche.loading = 'eager';
    if (!fleche.complete) { const s = fleche.getAttribute('src'); fleche.setAttribute('src', s); }
  }

  // ─── Accessibilité : c'est un div, on lui donne un vrai rôle de bouton ────
  cta.setAttribute('role', 'button');
  cta.setAttribute('tabindex', '0');
  cta.setAttribute('aria-label', 'Aller à nos différentes crèches');

  const aller = () => {
    // Lenis pilote le scroll : passer par lui garde le défilement lissé.
    if (window.lenis && typeof window.lenis.scrollTo === 'function') {
      window.lenis.scrollTo(cible, { offset: -20 });
    } else {
      const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      cible.scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: 'start' });
    }
  };

  cta.addEventListener('click', aller);
  cta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aller(); }
  });
})();
