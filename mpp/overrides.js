/* ═══════════════════════════════════════════════════════════════════════════
   MPP — NAVBAR : badge MENU ⇄ navbar (3 états, 2 transitions).
   Chargé en fin de body ; le JS de la nav d'origine tourne sur DOMContentLoaded
   (donc APRÈS) → on attend qu'il ait construit le lien-logo avant de brancher.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  const html = document.documentElement;
  const isMobile = () => window.matchMedia('(max-width: 820px)').matches;

  // À CHAQUE chargement, sur TOUTE page (pas de mémorisation) : navbar DÉPLOYÉE.
  // Le badge n'apparaît qu'au premier scroll, quand la barre se replie.
  // Sur mobile la navbar est display:none : « déployée » n'y veut rien dire, et
  // 'open' y ouvrirait le menu plein écran → on y démarre sur le badge.
  if (!html.hasAttribute('data-nav')) {
    html.setAttribute('data-nav', isMobile() ? 'closed' : 'open');
  }

  const setup = () => {
    const nav = document.querySelector('.navbar-2');
    // Le logo est ciblé par son IMAGE, jamais par sa position : le script d'origine
    // ne l'enveloppe dans son <a> qu'au DOMContentLoaded (donc après ce fichier).
    // Un `.navbar-gauche a` attraperait « Acceuil » et le casserait.
    const img = document.querySelector('.navbar-2 img.image-4');
    const logoLink = img && img.closest('a');
    if (!nav || !logoLink) return false;   // pas encore enveloppé → on repolle

    // Le logo d'origine a de grosses marges TRANSPARENTES (dessin 964x752 dans un
    // canvas 1536x1024, marges inégales : 115 en haut / 157 en bas). Résultat : le
    // dessin ne débordait jamais de la pilule et paraissait décentré vers le haut.
    // On utilise la version détourée. srcset/sizes doivent sauter, sinon le
    // navigateur re-sélectionne l'image d'origine et annule le détourage.
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.setAttribute('src', 'mpp/logo-trim.png');
    // Navbar hors écran à l'arrivée → l'image lazy ne se chargerait jamais.
    img.loading = 'eager';
    if (!nav.id) nav.id = 'mpp-navbar';

    // ─── Badge MENU (le logo devient bouton) ────────────────────────────────
    let badge = document.querySelector('.mpp-menu-badge');
    if (!badge) {
      badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'mpp-menu-badge';
      badge.setAttribute('aria-controls', nav.id);
      badge.innerHTML =
        '<img class="mpp-menu-badge__feet" src="mpp/empreintes.png" alt="">' +
        '<span class="mpp-menu-badge__label">MENU</span>';
      document.body.appendChild(badge);
    }

    const mobileMenu = () => document.querySelector('.mobile-menu');
    const isOpen = () => html.getAttribute('data-nav') === 'open';

    const open = () => {
      html.setAttribute('data-nav', 'open');
      badge.setAttribute('aria-expanded', 'true');
      badge.setAttribute('aria-label', 'Fermer le menu');
      if (isMobile()) {
        const mm = mobileMenu();
        if (mm) { mm.classList.add('open'); document.body.style.overflow = 'hidden'; }
      } else {
        // le focus part dans la navbar
        const first = nav.querySelector('.navbar-gauche .link');
        if (first) first.focus({ preventScroll: true });
      }
    };

    const close = (refocus = true) => {
      html.setAttribute('data-nav', 'closed');
      badge.setAttribute('aria-expanded', 'false');
      badge.setAttribute('aria-label', 'Ouvrir le menu');
      const mm = mobileMenu();
      if (mm) { mm.classList.remove('open'); document.body.style.overflow = ''; }
      const dd = document.querySelector('.custom-dropdown-panel');
      if (dd) dd.classList.remove('open');
      if (refocus) badge.focus({ preventScroll: true });
    };

    // reflète l'état RÉEL (la navbar démarre déployée sur desktop)
    badge.setAttribute('aria-expanded', String(isOpen()));
    badge.setAttribute('aria-label', isOpen() ? 'Fermer le menu' : 'Ouvrir le menu');
    badge.addEventListener('click', () => (isOpen() ? close() : open()));

    // ─── FERMETURE : flèche ↑ + « Fermer », À GAUCHE DU LOGO, sans fond ─────
    // Le logo, lui, garde son rôle d'origine (lien vers l'accueil) : on n'y touche pas.
    if (!document.querySelector('.mpp-nav-close')) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'mpp-nav-close';
      closeBtn.setAttribute('aria-label', 'Fermer le menu');
      closeBtn.setAttribute('aria-controls', nav.id);
      closeBtn.innerHTML =
        '<svg class="mpp-nav-close__arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="M12 19V5M12 5l-6.5 6.5M12 5l6.5 6.5"/></svg>' +
        '<span class="mpp-nav-close__label">Fermer</span>';
      closeBtn.addEventListener('click', () => close());
      // inséré juste avant le logo → « Fermer », puis le logo, puis les liens
      logoLink.parentElement.insertBefore(closeBtn, logoLink);
    }

    // ─── Placement de la flèche « Fermer » selon le breakpoint ──────────────
    // Sous 991px la navbar est display:none (CSS Webflow d'origine) : le bouton
    // y serait invisible. On le sort dans <body>, le CSS le fixe en haut à droite.
    const mq = window.matchMedia('(max-width: 820px)');
    const placeClose = () => {
      const btn = document.querySelector('.mpp-nav-close');
      if (!btn) return;
      if (mq.matches) {
        if (btn.parentElement !== document.body) document.body.appendChild(btn);
      } else if (btn.parentElement === document.body) {
        logoLink.parentElement.insertBefore(btn, logoLink);   // retour dans la pilule
      }
    };
    // `change` de matchMedia ne s'est pas avéré fiable ici → on double avec resize
    // (placeClose est idempotent : il ne touche au DOM que si le parent est faux).
    mq.addEventListener('change', placeClose);
    window.addEventListener('resize', placeClose, { passive: true });
    placeClose();

    // ─── Échap ferme ────────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(); });

    // ─── Scroll vers le bas → referme (reprise de ta demande précédente) ────
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > lastY && y > 60 && isOpen() && !isMobile()) close(false);
      lastY = y;
    }, { passive: true });

    // ─── Neutralise l'ancienne logique (.hidden / firstScroll) ─────────────
    // nos règles html[data-nav] sont en !important → elles font foi.
    nav.classList.add('loaded');
    nav.classList.remove('hidden');

    // mobile : un clic sur un lien du menu referme
    document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('.mobile-menu a')) close(false);
    });

    return true;
  };

  if (!setup()) {
    const iv = setInterval(() => { if (setup()) clearInterval(iv); }, 40);
    setTimeout(() => clearInterval(iv), 5000);
  }
})();
