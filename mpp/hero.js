/* ═══════════════════════════════════════════════════════════════════════════
   MPP — HERO (Tâche 1) : applique le fond depuis mpp/data.json, et en LOCAL
   seulement, injecte la barre de choix pour que Brian tranche en direct.

   Ordre de priorité du fond :
     1. localStorage (choix en cours de Brian, dev)
     2. data.json → home.hero.bg   ← c'est ici que se posera le choix retenu
     3. 'beige' (repli)
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  const FONDS = [
    { id: 'beige',   hex: '#e1dccc', nom: 'Beige/sable' },
    { id: 'creme',   hex: '#ebe6d4', nom: 'Crème' },
    { id: 'lime',    hex: '#d9dd7e', nom: 'Lime' },
    { id: 'vanille', hex: '#eeefa2', nom: 'Vanille' },
    { id: 'bleu',    hex: '#8195c2', nom: 'Bleu' },
    { id: 'violet',  hex: '#8985d5', nom: 'Violet' },
    { id: 'orange',  hex: '#e8a248', nom: 'Orange' },
    { id: 'rose',    hex: '#c14c7c', nom: 'Rose' },
  ];
  const CLE = 'mpp-hero-bg';
  const html = document.documentElement;
  const estDev = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);

  const applique = (id) => {
    if (!FONDS.some((f) => f.id === id)) id = 'beige';
    html.setAttribute('data-hero-bg', id);
    return id;
  };

  // Pose une valeur tout de suite (évite un flash) puis affine avec data.json.
  let courant = applique(localStorage.getItem(CLE) || 'beige');
  let defautData = 'beige';

  let defautTexteData = null;
  fetch('mpp/data.json')
    .then((r) => r.json())
    .then((d) => {
      const hero = (d && d.home && d.home.hero) || {};
      defautData = hero.bg || 'beige';
      defautTexteData = hero.text || null;   // absent = paire automatique (AA garanti)
      // le choix dev l'emporte sur la donnée, sinon c'est la donnée qui fait foi
      if (!localStorage.getItem(CLE)) courant = applique(defautData);
      if (!localStorage.getItem(CLE_TXT)) courantTxt = appliqueTexte(defautTexteData);
      majBarre();
    })
    .catch(() => {});

  // ─── Couleur de TEXTE forcée (2e barre) ──────────────────────────────────
  const CLE_TXT = 'mpp-hero-text';
  const ENCRES = [{ id: 'ink', hex: '#1b1b1b', nom: 'Encre' }, { id: 'blanc', hex: '#ffffff', nom: 'Blanc' }];
  const appliqueTexte = (id) => {
    if (!id) { html.removeAttribute('data-hero-text'); return null; }  // ← retour à la paire auto
    html.setAttribute('data-hero-text', id);
    return id;
  };
  let courantTxt = appliqueTexte(localStorage.getItem(CLE_TXT) || null);

  // ─── Contraste réel, mesuré sur le rendu ─────────────────────────────────
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (s) => { const [r, g, b] = s.match(/\d+/g).map(Number);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
  const ratio = () => {
    const hero = document.querySelector('.hero-section.main');
    const h1 = document.querySelector('.mpp-hero-l');
    if (!hero || !h1) return null;
    const a = lum(getComputedStyle(hero).backgroundColor), b = lum(getComputedStyle(h1).color);
    const hi = Math.max(a, b), lo = Math.min(a, b);
    return (hi + 0.05) / (lo + 0.05);
  };

  let barre = null, barreTxt = null, jauge = null;
  const majBarre = () => {
    if (barre) barre.querySelectorAll('.mpp-dev-bar__swatch').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.bg === courant));
    });
    if (barreTxt) barreTxt.querySelectorAll('.mpp-dev-bar__swatch').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.txt === courantTxt));
    });
    if (jauge) {
      const r = ratio();
      if (r) {
        jauge.textContent = r.toFixed(2) + (r >= 4.5 ? ' ✓ AA' : ' ✗ AA');
        jauge.dataset.aa = r >= 4.5 ? 'oui' : 'non';
        jauge.title = 'Contraste texte/fond mesuré. Seuil AA = 4.5';
      }
    }
  };

  // ─── Coupure au milieu des mots (.split-text) ─────────────────────────────
  // Le script d'origine découpe ces paragraphes CARACTÈRE par caractère pour les
  // animer. Chaque caractère devenant une boîte, le navigateur retourne à la
  // ligne au milieu des mots (« accueil/lent », « accompa/gnement »). On
  // regroupe les caractères par MOT : la coupure ne peut plus se faire qu'entre
  // les mots, et l'animation d'origine est préservée (les spans sont conservés).
  const reparerCoupures = () => {
    document.querySelectorAll('.split-text').forEach((bloc) => {
      // On teste l'ÉTAT RÉEL, pas un marqueur : le script d'origine se ré-exécute
      // et reconstruit les caractères, ce qui détruisait les groupes — un
      // marqueur posé une fois empêchait alors de les refaire.
      if (bloc.querySelector('.mpp-mot')) return;
      const enfants = [...bloc.childNodes];
      if (!enfants.some((n) => n.nodeType === 1 && n.textContent.length <= 2)) return;
      let mot = null;
      enfants.forEach((n) => {
        const txt = n.textContent;
        const estEspace = n.nodeType === 3 ? !txt.trim() : (n.tagName !== 'BR' && !txt.trim());
        if (n.nodeName === 'BR' || estEspace) { mot = null; return; }
        if (!mot) {
          mot = document.createElement('span');
          mot.className = 'mpp-mot';
          bloc.insertBefore(mot, n);
        }
        mot.appendChild(n);
      });
    });
  };
  // Le découpage n'a lieu qu'au défilement jusqu'à la section : on surveille le
  // bloc et on regroupe dès qu'il est découpé, plutôt que de deviner le moment.
  reparerCoupures();
  document.querySelectorAll('.split-text').forEach((bloc) => {
    new MutationObserver(() => reparerCoupures()).observe(bloc, { childList: true });
  });

  // ─── Pilule réseaux : révélée tout de suite ───────────────────────────────
  // Le site d'origine la garde en opacity:0 / translateX(-80px) jusqu'à ce que
  // playEntryAnimation() lui pose .visible — via setTimeout(300) PUIS en fin de
  // cascade : elle arrivait donc bien après la navbar. Le retard étant en JS,
  // aucun réglage CSS ne pouvait le corriger : on pose .visible nous-mêmes.
  // Le script d'origine tourne sur DOMContentLoaded (donc APRÈS ce fichier) et
  // RETIRE .visible pour rejouer sa cascade : poser la classe une fois ne suffit
  // pas, elle est reprise juste après. On surveille donc l'attribut et on la
  // remet dès qu'elle saute, plutôt que de courir après son minutage.
  const reseaux = document.querySelector('.hero-section.main .box-reseaux');
  if (reseaux) {
    const reveler = () => reseaux.classList.add('visible');
    reveler();
    new MutationObserver(() => {
      if (!reseaux.classList.contains('visible')) reveler();
    }).observe(reseaux, { attributes: true, attributeFilter: ['class'] });
  }

  // ─── CADRES + PARALLAXE ───────────────────────────────────────────────────
  // Chaque image est enveloppée dans un cadre à overflow:hidden. Le cadre ne
  // bouge pas ; la photo, plus haute que lui, coulisse derrière au scroll.
  const COURSE = 22;   // px de débattement de part et d'autre (AVANT 34 : trop marqué)
  const cadres = [];
  document.querySelectorAll('.mpp-hero-img').forEach((img) => {
    if (img.parentElement && img.parentElement.classList.contains('mpp-hero-cadre')) return;
    const variante = [...img.classList].find((c) => c.startsWith('mpp-hero-img--'));
    const cadre = document.createElement('div');
    cadre.className = 'mpp-hero-cadre';
    if (variante) cadre.classList.add(variante.replace('mpp-hero-img--', 'mpp-hero-cadre--'));
    img.parentElement.insertBefore(cadre, img);
    cadre.appendChild(img);
    cadres.push({ cadre, img });
  });

  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (cadres.length && !reduit) {
    // Position VISÉE : 0 quand le cadre est au centre de la fenêtre, -1 quand il
    // entre par le bas, +1 quand il sort par le haut. Repère centré → le
    // glissement suit vraiment l'endroit où on est sur la page.
    const vise = (cadre) => {
      const h = window.innerHeight;
      const r = cadre.getBoundingClientRect();
      const centreCadre = r.top + r.height / 2;
      const p = (h / 2 - centreCadre) / (h / 2 + r.height / 2);
      return Math.max(-1, Math.min(1, p)) * COURSE;
    };

    // LISSAGE : on interpole vers la cible à chaque frame au lieu de sauter à
    // chaque événement de scroll → mouvement fluide, y compris avec Lenis.
    let boucle = null;
    const tick = () => {
      let bouge = false;
      const h = window.innerHeight;
      for (const c of cadres) {
        const r = c.cadre.getBoundingClientRect();
        if (r.bottom < -150 || r.top > h + 150) continue;   // hors écran : rien à faire
        const cible = vise(c.cadre);
        c.actuel += (cible - c.actuel) * 0.09;              // amortissement
        if (Math.abs(cible - c.actuel) > 0.05) bouge = true;
        c.img.style.setProperty('--par', c.actuel.toFixed(2) + 'px');
      }
      boucle = bouge ? requestAnimationFrame(tick) : null;
    };
    const reveille = () => { if (!boucle) boucle = requestAnimationFrame(tick); };

    cadres.forEach((c) => { c.actuel = vise(c.cadre); c.img.style.setProperty('--par', c.actuel.toFixed(2) + 'px'); });
    window.addEventListener('scroll', reveille, { passive: true });
    window.addEventListener('resize', reveille, { passive: true });
  }

  // ─── Cascade d'arrivée ────────────────────────────────────────────────────
  // L'état de départ est opacity:0 → si on ne déclenche pas, le hero reste vide.
  // On arme donc plusieurs filets : rAF, load, et un délai plafond.
  const anime = () => html.setAttribute('data-hero-anim', 'on');
  if (document.querySelector('.mpp-hero')) {
    requestAnimationFrame(() => requestAnimationFrame(anime));
    window.addEventListener('load', anime, { once: true });
    setTimeout(anime, 1200);   // filet de sécurité
  }

  // ─── Barres de choix des couleurs : RETIRÉES ──────────────────────────────
  // Les couleurs sont tranchées et figées dans mpp/data.json (fond bleu, titres
  // orange). Le code des barres reste plus bas, inerte : pour les rouvrir, il
  // suffit de retirer ce return. Rien ne s'injecte plus dans la page.
  return;

  if (!estDev || !document.querySelector('.hero-section.main')) return;

  // ─── Barre de choix (LOCAL uniquement : absente dès que le site est servi
  //     depuis un autre hôte — c'est l'équivalent du dev-only ici, ce site
  //     statique n'ayant pas d'étape de build). ─────────────────────────────
  barre = document.createElement('div');
  barre.className = 'mpp-dev-bar';
  barre.setAttribute('role', 'group');
  barre.setAttribute('aria-label', 'Choix du fond du hero (dev)');

  const label = document.createElement('span');
  label.className = 'mpp-dev-bar__label';
  label.textContent = 'Fond hero';
  barre.appendChild(label);

  FONDS.forEach((f) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mpp-dev-bar__swatch';
    b.dataset.bg = f.id;
    b.style.background = f.hex;
    b.title = f.nom + ' ' + f.hex;
    b.setAttribute('aria-label', f.nom);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      courant = applique(f.id);
      localStorage.setItem(CLE, courant);
      majBarre();
    });
    barre.appendChild(b);
  });

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'mpp-dev-bar__reset';
  reset.textContent = 'data.json';
  reset.title = 'Oublier mon choix et revenir à la valeur de data.json';
  reset.addEventListener('click', () => {
    localStorage.removeItem(CLE);
    courant = applique(defautData);
    majBarre();
  });
  barre.appendChild(reset);

  // ─── 2e barre : couleur des TEXTES (h1), mêmes couleurs + encre/blanc ─────
  barreTxt = document.createElement('div');
  barreTxt.className = 'mpp-dev-bar';
  barreTxt.setAttribute('role', 'group');
  barreTxt.setAttribute('aria-label', 'Couleur des titres du hero (dev)');

  const labelTxt = document.createElement('span');
  labelTxt.className = 'mpp-dev-bar__label';
  labelTxt.textContent = 'Texte h1';
  barreTxt.appendChild(labelTxt);

  [...FONDS, ...ENCRES].forEach((f) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mpp-dev-bar__swatch';
    b.dataset.txt = f.id;
    b.style.background = f.hex;
    b.title = f.nom + ' ' + f.hex;
    b.setAttribute('aria-label', f.nom);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      courantTxt = appliqueTexte(f.id);
      localStorage.setItem(CLE_TXT, courantTxt);
      majBarre();
    });
    barreTxt.appendChild(b);
  });

  // Retour à la couleur appairée automatiquement au fond (celle garantie AA)
  const autoTxt = document.createElement('button');
  autoTxt.type = 'button';
  autoTxt.className = 'mpp-dev-bar__reset';
  autoTxt.textContent = 'auto';
  autoTxt.title = 'Revenir à la couleur appairée au fond (contraste AA garanti)';
  autoTxt.addEventListener('click', () => {
    localStorage.removeItem(CLE_TXT);
    courantTxt = appliqueTexte(null);
    majBarre();
  });
  barreTxt.appendChild(autoTxt);

  jauge = document.createElement('span');
  jauge.className = 'mpp-dev-bar__ratio';
  barreTxt.appendChild(jauge);

  const pile = document.createElement('div');
  pile.className = 'mpp-dev-stack';
  pile.appendChild(barre);        // fond (en bas)
  pile.appendChild(barreTxt);     // texte (au-dessus)
  document.body.appendChild(pile);
  majBarre();
})();
