/* ═══════════════════════════════════════════════════════════════════════════
   MPP — REFONTE DU FOOTER · écran du téléphone (étape 2)

   L'écran alterne AUTOMATIQUEMENT entre une vue « Instagram » et une vue
   « Facebook » (toutes les ~5 s, fondu doux). Chaque vue = un habillage minimal
   iOS (logo + nom du réseau) + une image de contenu tirée de data.json
   (footer.phone.instagram[] / footer.phone.facebook[], remplaçables par Brian).

   Derrière l'écran, les images DÉRIVENT en continu : mouvement fluide, pseudo-
   aléatoire (somme de sinus), type Ken Burns — MÊME esprit que le hero mais
   AUTONOME (boucle rAF, jamais liée au scroll). prefers-reduced-motion : figé.

   Expose window.mppPhone = { show, lock, unlock, current } — utilisé à l'étape 3
   pour la synchro / le verrouillage au survol des boutons réseaux.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
 // Les scripts mpp/*.js sont placés AVANT la section footer dans le HTML
 // (export Webflow) : on attend le DOM complet pour que .footer-scene existe.
 const init = () => {
  const scene = document.querySelector('.footer-scene');
  const contenu = scene && scene.querySelector('.footer-phone__content');
  if (!contenu) return;

  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RESEAUX = ['instagram', 'facebook'];
  const NOMS = {
    instagram: { nom: 'mes_premierspas', sous: 'Mes Premiers Pas' },
    facebook:  { nom: 'Mes Premiers Pas', sous: 'Crèche associative' },
  };
  // Logos réseaux (habillage écran) — traits simples, colorés par le CSS.
  const LOGO = {
    instagram:
      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">' +
      '<rect x="3" y="3" width="18" height="18" rx="5.5"/>' +
      '<circle cx="12" cy="12" r="4.2"/>' +
      '<circle cx="17.3" cy="6.7" r="1.2" fill="#fff" stroke="none"/></svg>',
    facebook:
      '<svg viewBox="0 0 24 24" fill="#fff"><path d="M15.4 8.4h-2V6.9c0-.6.4-.8.7-.8h1.3V3.6l-1.9-.1c-2.1 0-3.1 1.3-3.1 3.1v1.8H8.6v2.6h1.8V21h2.9v-7h2l.4-2.6z"/></svg>',
  };
  const ACTIONS = {
    instagram:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 8.6c0 4.6-8.8 9.4-8.8 9.4s-8.8-4.8-8.8-9.4A4.3 4.3 0 0 1 12 6.9a4.3 4.3 0 0 1 8.8 1.7Z"/></svg>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-11.9 7.8L3 21l1.7-6.1A8.5 8.5 0 1 1 21 11.5Z"/></svg>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>' +
      '<span class="spacer"></span><span class="fp-tag">@mes_premierspas</span>',
    facebook:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v9H4v-9h3Zm0 0 3.5-6.5c.8 0 1.5.7 1.5 1.5V8h5.2c.9 0 1.6.9 1.4 1.8l-1.3 6c-.2.7-.8 1.2-1.5 1.2H7"/></svg>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-11.9 7.8L3 21l1.7-6.1A8.5 8.5 0 1 1 21 11.5Z"/></svg>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 8-8"/><path d="M4 12h8V4"/></svg>' +
      '<span class="spacer"></span><span class="fp-tag">Mes Premiers Pas</span>',
  };

  // Construit une vue réseau (header + média + actions).
  const construire = (reseau) => {
    const v = document.createElement('div');
    v.className = 'fp-view fp-view--' + reseau;
    v.dataset.reseau = reseau;
    const meta = NOMS[reseau];
    v.innerHTML =
      '<div class="fp-view__header"><span class="fp-logo">' + LOGO[reseau] + '</span>' +
      '<span><span class="fp-name">' + meta.nom + '</span><br><span class="fp-sub">' + meta.sous + '</span></span></div>' +
      '<div class="fp-view__media"><img class="fp-img" alt="" decoding="async"></div>' +
      '<div class="fp-view__actions">' + ACTIONS[reseau] + '</div>';
    return v;
  };

  const etat = {
    images: { instagram: [], facebook: [] },
    idx: { instagram: 0, facebook: 0 },
    vues: {},
    actif: 'instagram',
    verrou: null,       // réseau verrouillé (hover) ou null
    timer: null,
  };

  const imgDe = (reseau) => etat.vues[reseau].querySelector('.fp-img');

  // Avance l'image d'un réseau (cycle dans son tableau) et l'assigne.
  const avancerImage = (reseau, premier) => {
    const liste = etat.images[reseau];
    if (!liste.length) return;
    if (!premier) etat.idx[reseau] = (etat.idx[reseau] + 1) % liste.length;
    const el = imgDe(reseau);
    const url = liste[etat.idx[reseau]];
    if (el.getAttribute('src') !== url) el.src = url;
  };

  // Affiche un réseau (fondu). Avance son image quand il (re)devient actif.
  const montrer = (reseau, sansAvancer) => {
    if (!etat.vues[reseau]) return;
    if (!sansAvancer && reseau !== etat.actif) avancerImage(reseau);
    RESEAUX.forEach((r) => etat.vues[r].classList.toggle('is-active', r === reseau));
    etat.actif = reseau;
    if (window.mppButtons && window.mppButtons.sync) window.mppButtons.sync(reseau);
  };

  const tick = () => {
    if (etat.verrou) return;                       // survol : on ne change pas
    montrer(etat.actif === 'instagram' ? 'facebook' : 'instagram');
  };
  const relancer = () => {
    clearInterval(etat.timer);
    if (!reduit) etat.timer = setInterval(tick, 5000);
  };

  // ─── Dérive Ken Burns autonome (rAF) ────────────────────────────────────
  const phases = new WeakMap();
  const semer = (el) => phases.set(el, {
    ax: Math.random() * 6.28, bx: Math.random() * 6.28,
    ay: Math.random() * 6.28, by: Math.random() * 6.28, s: Math.random() * 6.28,
  });
  const driver = (now) => {
    const t = now / 1000;
    RESEAUX.forEach((r) => {
      const el = imgDe(r);
      const p = phases.get(el);
      if (!p) return;
      // somme de sinus lents → dérive fluide, pseudo-aléatoire, toutes directions
      const dx = Math.sin(t * 0.061 + p.ax) * 3.2 + Math.sin(t * 0.027 + p.bx) * 2.0;
      const dy = Math.cos(t * 0.052 + p.ay) * 3.2 + Math.sin(t * 0.019 + p.by) * 2.0;
      const sc = 1.14 + Math.sin(t * 0.037 + p.s) * 0.035;
      el.style.transform = 'translate(' + dx.toFixed(2) + '%,' + dy.toFixed(2) + '%) scale(' + sc.toFixed(3) + ')';
    });
    requestAnimationFrame(driver);
  };

  // ─── API publique (étape 3) ─────────────────────────────────────────────
  window.mppPhone = {
    current: () => etat.actif,
    show: (reseau) => { if (RESEAUX.includes(reseau)) { montrer(reseau); relancer(); } },
    lock: (reseau) => {                            // verrouille sur survol
      if (!RESEAUX.includes(reseau)) return;
      etat.verrou = reseau;
      montrer(reseau);
    },
    unlock: () => { etat.verrou = null; relancer(); },  // reprise de l'alternance
  };

  // ─── Démarrage ──────────────────────────────────────────────────────────
  fetch('mpp/data.json')
    .then((r) => r.json())
    .then((d) => {
      const ph = (d && d.footer && d.footer.phone) || {};
      RESEAUX.forEach((r) => {
        etat.images[r] = Array.isArray(ph[r]) ? ph[r].filter(Boolean) : [];
        const v = construire(r);
        etat.vues[r] = v;
        contenu.appendChild(v);
        semer(v.querySelector('.fp-img'));
        avancerImage(r, true);                     // première image
      });
      // ── Boutons réseaux synchronisés + verrouillage au survol (étape 3) ──
      const boutons = {};
      scene.querySelectorAll('.footer-social .fsoc').forEach((b) => {
        const net = b.dataset.net;
        if (!RESEAUX.includes(net)) return;
        boutons[net] = b;
        // Survol / focus = verrou sur ce réseau ; sortie = reprise de l'alternance.
        b.addEventListener('mouseenter', () => window.mppPhone.lock(net));
        b.addEventListener('mouseleave', () => window.mppPhone.unlock());
        b.addEventListener('focus', () => window.mppPhone.lock(net));
        b.addEventListener('blur', () => window.mppPhone.unlock());
      });
      window.mppButtons = {
        sync: (net) => RESEAUX.forEach((r) =>
          boutons[r] && boutons[r].classList.toggle('is-active', r === net)),
      };

      // ── Coordonnées CONTACT depuis data.json (étape 5) ──
      const c = (d && d.footer && d.footer.contact) || {};
      const ul = scene.querySelector('.footer-contact__list');
      if (ul && !ul.children.length) {
        const tel = (n) => 'tel:+33' + String(n).replace(/\D/g, '').replace(/^0/, '');
        const lignes = [];
        if (c.email) {
          const href = c.emailHref || ('mailto:' + c.email);
          const ext = c.emailHref ? ' target="_blank" rel="noopener"' : '';
          lignes.push('<a href="' + href + '"' + ext + '>' + c.email + '</a>');
        }
        if (c.telVers) lignes.push('<span class="fc-label">Vers :</span><a href="' + tel(c.telVers) + '">' + c.telVers + '</a>');
        if (c.telValleiry) lignes.push('<span class="fc-label">Valleiry (siège social) :</span><a href="' + tel(c.telValleiry) + '">' + c.telValleiry + '</a>');
        ul.innerHTML = lignes.map((h) => '<li class="fc-line">' + h + '</li>').join('');
      }

      montrer('instagram', true);                  // vue initiale
      window.mppButtons.sync(etat.actif);          // pastille initiale
      if (!reduit) { requestAnimationFrame(driver); relancer(); }

      // ── Chorégraphie d'entrée : une seule timeline (téléphone → CONTACT →
      //    cascade des coordonnées), déclenchée à l'entrée dans le viewport.
      scene.classList.add('anim-ready');
      const lancer = () => scene.classList.add('is-in');
      if (reduit || !('IntersectionObserver' in window)) {
        lancer();
      } else {
        const io = new IntersectionObserver((ents) => {
          ents.forEach((e) => { if (e.isIntersecting) { lancer(); io.disconnect(); } });
        }, { threshold: 0.25 });
        io.observe(scene);
      }
    })
    .catch((e) => console.error('[mpp-footer]', e));
 };

 if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', init, { once: true });
 } else {
   init();
 }
})();
