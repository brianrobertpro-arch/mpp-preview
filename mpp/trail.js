/* ═══════════════════════════════════════════════════════════════════════════
   MPP — CHEMIN D'EMPREINTES

   Le tracé est une DONNÉE (mpp/data.json → home.trail.path) : Brian peut
   redessiner la courbe sans toucher au code.

   Quatre pièges déjà rencontrés, traités ici explicitement :
   1. Ne JAMAIS ré-émettre un 'scroll' natif depuis lenis.on('scroll') → Lenis
      écoute lui-même les scrolls natifs : récursion infinie, chaîne de scroll
      cassée, empreintes figées à opacity 0. On s'abonne à window.lenis.
   2. `isolation: isolate` pour le contexte d'empilement, JAMAIS position+z-index
      (qui ré-ancre les éléments positionnés et casse la mise en page).
   3. La longueur d'arc n'est PAS proportionnelle à la hauteur (le tracé
      serpente) → table de correspondance hauteur→arc, sinon la marche sort du
      champ de vision.
   4. Erreurs jamais avalées en silence : un .catch vide masquait une exception
      qui faisait disparaître tout le chemin.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  const html = document.documentElement;
  if (!document.querySelector('.hero-section.main')) return;   // accueil seulement

  fetch('mpp/data.json')
    .then((r) => r.json())
    .then((d) => construire((d && d.home && d.home.trail) || null))
    .catch((e) => console.error('[mpp-trail]', e));

  function construire(cfg) {
    if (!cfg || !cfg.path) return;

    const stepEvery = cfg.stepEvery || 4.2;
    const footScale = cfg.footScale || 3.1;
    const sideOffset = cfg.sideOffset || 1.9;
    const fadeSteps = cfg.fadeSteps || 10;
    const baseOpacity = cfg.baseOpacity == null ? 0 : cfg.baseOpacity;
    const headAnchor = cfg.headAnchor == null ? 0.78 : cfg.headAnchor;
    const autoStepsPerSec = cfg.autoStepsPerSec || 2.2;
    const leadSteps = cfg.leadSteps || 9;
    const catchUp = cfg.catchUp || 2.4;
    const colors = cfg.colors && cfg.colors.length ? cfg.colors : ['#c14c7c'];
    const [, , vbW, vbH] = (cfg.viewBox || '0 0 100 466').split(/\s+/).map(Number);
    const NS = 'http://www.w3.org/2000/svg';

    // ─── SVG de mesure (invisible) : sert à getPointAtLength ────────────────
    const svgMes = document.createElementNS(NS, 'svg');
    svgMes.setAttribute('viewBox', cfg.viewBox || '0 0 100 466');
    svgMes.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    const pathMes = document.createElementNS(NS, 'path');
    pathMes.setAttribute('d', cfg.path);
    svgMes.appendChild(pathMes);
    document.body.appendChild(svgMes);

    const L = pathMes.getTotalLength();
    const n = Math.max(1, Math.floor(L / stepEvery));

    // ─── Blocs de page → une couche chacun (footer exclu) ───────────────────
    // « Équipe pilote » vit dans un DIV.code-embed et non dans une <section> :
    // le filtre doit inclure les deux, sinon cette zone est manquée.
    const wrapper = document.querySelector('.page-wrapper') || document.body;
    const blocs = [...wrapper.children].filter(
      (e) => e.matches('section, div.code-embed') && !e.classList.contains('footer-section')
    );

    const pas = [];
    for (let i = 0; i <= n; i++) {
      const el = document.createElement('span');
      el.className = 'mpp-foot';
      el.style.backgroundColor = colors[i % colors.length];
      pas.push({ el, d: i * stepEvery, cote: i % 2 === 0 ? 1 : -1, op: null, t: null });
    }

    const couches = [];
    const lut = [];          // hauteur de page → longueur d'arc
    let scaleX = 1, scaleY = 1;

    const positionner = () => {
      const W = html.clientWidth;
      if (!W) return false;                       // mise en page pas prête
      const dernier = blocs[blocs.length - 1];
      const H = Math.round(dernier.getBoundingClientRect().bottom + window.scrollY);
      scaleX = W / vbW;
      scaleY = H / vbH;

      // Couches : une par bloc, ancrées sur .page-wrapper (coordonnées de page)
      couches.forEach((c) => c.el.remove());
      couches.length = 0;
      for (const bloc of blocs) {
        const r = bloc.getBoundingClientRect();
        if (r.height < 40) continue;
        bloc.style.isolation = 'isolate';         // ⚠ jamais position/z-index
        const top = Math.round(r.top + window.scrollY);
        const c = document.createElement('div');
        c.className = 'mpp-trail-couche';
        // Le bloc de référence de la couche dépend du bloc parent : s'il est déjà
        // positionné, la couche s'ancre sur LUI (top = 0) ; s'il est `static`,
        // elle s'ancre sur .page-wrapper (top = position de page). Sans cette
        // distinction, le décalage était appliqué deux fois et la couche
        // atterrissait des centaines de pixels plus bas que sa section.
        c.style.top = (getComputedStyle(bloc).position === 'static' ? top : 0) + 'px';
        c.style.height = Math.round(r.height) + 'px';
        bloc.appendChild(c);
        couches.push({ el: c, top, bas: top + r.height });
      }

      // Table hauteur → arc (le tracé serpente : pas de proportionnalité)
      lut.length = 0;
      for (let i = 0; i <= 240; i++) {
        const d = (i / 240) * L;
        lut.push({ y: pathMes.getPointAtLength(d).y * scaleY, d });
      }

      // Placement des empreintes, rangées dans la couche de leur bloc
      const taille = footScale * scaleX;
      for (const s of pas) {
        const p0 = pathMes.getPointAtLength(Math.max(0, s.d - 0.6));
        const p1 = pathMes.getPointAtLength(Math.min(L, s.d + 0.6));
        const dx = (p1.x - p0.x) * scaleX, dy = (p1.y - p0.y) * scaleY;
        const len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * s.cote * sideOffset * scaleX;
        const ny = (dx / len) * s.cote * sideOffset * scaleX;
        const cx = ((p0.x + p1.x) / 2) * scaleX + nx;
        const cy = ((p0.y + p1.y) / 2) * scaleY + ny;
        s.deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        s.el.style.width = taille + 'px';
        s.el.style.height = taille * 1.5 + 'px';
        s.el.style.left = cx + 'px';
        // Repli sur la couche la PLUS PROCHE (et non la dernière) : une empreinte
        // tombant dans un interstice entre deux blocs se retrouvait sinon
        // rattachée au bas de page, très loin de sa position réelle.
        const couche = couches.find((z) => cy >= z.top && cy < z.bas)
          || couches.reduce((best, z) => {
               const d = cy < z.top ? z.top - cy : cy - z.bas;
               return !best || d < best.d ? { z, d } : best;
             }, null)?.z;
        if (!couche) continue;
        if (s.el.parentElement !== couche.el) couche.el.appendChild(s.el);
        s.el.style.top = (cy - couche.top) + 'px';
        s.op = null;                              // force le recalcul
      }

      return true;
    };

    // Position sur le tracé correspondant à une hauteur de page
    const arcPourHauteur = (y) => {
      if (lut.length < 2) return 0;
      if (y <= lut[0].y) return 0;
      if (y >= lut[lut.length - 1].y) return L;
      let lo = 0, hi = lut.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (lut[m].y < y) lo = m; else hi = m; }
      const a = lut[lo], b = lut[hi];
      return a.d + ((y - a.y) / Math.max(1e-6, b.y - a.y)) * (b.d - a.d);
    };

    // ─── Rendu : opacité + échelle selon la position de la marche ───────────
    let head = 0;
    const peindre = () => {
      for (const s of pas) {
        const rel = (head - s.d) / stepEvery;      // nb de pas derrière la tête
        let op = 0, sc = 0.82;
        if (rel >= 0) {
          if (rel <= 1) { const e = rel * rel * (3 - 2 * rel); op = e; sc = 0.82 + 0.18 * e; }
          else if (rel <= fadeSteps) { op = 1; sc = 1; }
          else { op = Math.max(0, 1 - (rel - fadeSteps) / fadeSteps); sc = 1; }
        }
        op = Math.max(baseOpacity, op);
        if (s.op !== op) { s.op = op; s.el.style.opacity = op.toFixed(3); }
        const t = `translate(-50%,-50%) rotate(${s.deg}deg) scale(${sc.toFixed(3)})`;
        if (s.t !== t) { s.t = t; s.el.style.transform = t; }
      }
    };

    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ─── Boucle : marche autonome + rattrapage au scroll ────────────────────
    // Une boucle continue (et non un écouteur de scroll) est ce qui permet de
    // VOIR les pas se poser à l'arrivée, sans que l'utilisateur bouge.
    let dernierT = 0;
    const boucle = (t) => {
      if (!dernierT) dernierT = t;
      const dt = Math.min(0.05, (t - dernierT) / 1000);   // borné (onglet inactif)
      dernierT = t;

      // La tête vise un point du VIEWPORT : sinon elle se cale en haut de l'écran
      // et la traînée reste hors champ. L'avance se résorbe vers le bas de page
      // pour que le dernier pas se pose en fin de parcours.
      const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
      const prog = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      const visee = window.scrollY + window.innerHeight * headAnchor * (1 - 0.55 * prog);
      const cible = arcPourHauteur(visee);
      const plafond = cible + leadSteps * stepEvery;
      const vAuto = autoStepsPerSec * stepEvery;

      if (cible > head + 0.5) {
        head = Math.min(head + Math.max(vAuto, (cible - head) * catchUp) * dt, cible);
      } else if (cible < head - 0.5) {
        // scroll vers le HAUT : la marche revient avec l'utilisateur (sans ça,
        // tout s'effaçait d'un coup en remontant).
        head = Math.max(head - Math.max(vAuto, (head - cible) * catchUp) * dt, cible);
      } else {
        head = Math.min(head + vAuto * dt, plafond);
      }

      peindre();
      requestAnimationFrame(boucle);
    };

    // ─── Démarrage : réessaie tant que la largeur n'est pas disponible ──────
    let pose = false;
    const demarrer = () => {
      if (pose) return;
      if (positionner()) {
        pose = true;
        if (reduit) { head = L; peindre(); }      // tout posé, sans animation
        else { peindre(); requestAnimationFrame(boucle); }
      } else { requestAnimationFrame(demarrer); setTimeout(demarrer, 60); }
    };
    demarrer();
    setTimeout(demarrer, 200);
    window.addEventListener('resize', () => { positionner(); peindre(); }, { passive: true });
    window.addEventListener('load', () => { positionner(); peindre(); }, { once: true });
  }
})();
