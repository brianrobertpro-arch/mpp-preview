/* ═══════════════════════════════════════════════════════════════════════════
   MPP — ICÔNES AQUARELLE

   Remplace les icônes actuelles (SVG exportés par Webflow) par les aquarelles
   hébergées sur R2, SANS toucher au HTML : tout est piloté par mpp/data.json,
   clé « icones ». Chaque entrée cible une image par un fragment UNIQUE de son
   URL actuelle (« cle » = préfixe de hash Webflow), donc indépendamment de sa
   position dans la page ou de la structure du DOM.

   FILET DE SÉCURITÉ : si l'aquarelle ne se charge pas (nom de fichier faux,
   réseau indisponible…), l'icône d'origine est restaurée. Aucune image cassée
   ne peut apparaître. Corriger un nom = une ligne dans data.json.

   Le contenu est parfois (re)construit par les scripts Webflow après nous : on
   ré-applique tant que des cibles restent à traiter, puis on cesse.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  let regles = null;      // [{ cle, url, actif }]
  const traites = new WeakSet();

  const XLINK = 'http://www.w3.org/1999/xlink';

  const poser = (el, url, classe) => {
    if (traites.has(el)) return;
    traites.add(el);
    // Deux types de cibles : les <img> HTML (valeurs, footer) ET les <image>
    // SVG du diagramme « journée type » (le diagramme radial référence ses
    // illustrations via href / xlink:href, pas via src).
    const estSvgImage = el.tagName && el.tagName.toLowerCase() === 'image';
    // FILET : on précharge l'aquarelle dans une image détachée. On ne remplace
    // l'icône visible QUE si elle se charge vraiment → aucune image cassée, même
    // pour les icônes en `loading="lazy"` situées plus bas dans la page.
    const sonde = new Image();
    sonde.onload = () => {
      if (estSvgImage) {
        el.setAttribute('href', url);                 // SVG2
        el.setAttributeNS(XLINK, 'href', url);        // SVG 1.1 (xlink)
      } else {
        el.setAttribute('src', url);
        // srcset de Webflow prendrait le pas sur src : on le neutralise.
        if (el.hasAttribute('srcset')) el.removeAttribute('srcset');
      }
      if (classe) el.classList.add(classe);
      el.dataset.mppIcone = 'aquarelle';
    };
    sonde.onerror = () => {
      // Aquarelle indisponible : on garde l'icône d'origine, on marque « traité ».
      el.dataset.mppIcone = 'origine';
    };
    sonde.src = url;
  };

  // Style des icônes aquarelle. Deux volets :
  // 1) TOUTES les icônes remplacées : on retire tout cadre/fond que le CSS
  //    d'origine posait derrière l'image (ombre, coins arrondis, bordure, fond)
  //    — ex. .image-21 { border-radius; box-shadow } de la journée type — pour
  //    que l'illustration détourée se pose à plat sur la section (pas de
  //    vignette). NB : si un PNG a un fond incrusté, seul son détourage à la
  //    source (R2) l'enlève ; ceci ne retire que le cadre ajouté par le CSS.
  // 2) Totems du footer : détourés + un peu plus grands que les anciens stickers.
  const injecterStyle = () => {
    if (document.getElementById('mpp-icones-style')) return;
    const st = document.createElement('style');
    st.id = 'mpp-icones-style';
    st.textContent =
      'img[data-mpp-icone="aquarelle"],image[data-mpp-icone="aquarelle"]{' +
      'background:transparent !important;box-shadow:none !important;' +
      'border:none !important;border-radius:0 !important;}' +
      // Totems du footer : discrets, en décor, DERRIÈRE le contenu.
      // • OPACITÉ réglable via la variable --mpp-totem-opacity (0 = invisible,
      //   1 = plein). Change la valeur ci-dessous pour ajuster leur discrétion.
      // • z-index:0 + pointer-events:none → ils restent en arrière-plan, ne
      //   chevauchent pas la lecture et n'interceptent pas les clics.
      // NB : leur fond blanc est INCRUSTÉ dans le PNG ; seul un détourage à la
      // source (R2) l'enlève — aucune astuce CSS ne le retire de façon fiable.
      ':root{--mpp-totem-opacity:0.55;}' +
      '.mpp-totem{opacity:var(--mpp-totem-opacity) !important;filter:none !important;' +
      'object-fit:contain;transform:scale(1.45);transform-origin:center;' +
      'z-index:0 !important;pointer-events:none !important;}' +
      // Contenu du footer TOUJOURS devant les totems (« Rejoignez-nous »,
      // « Contact », icônes sociales, coordonnées). position+z-index car les
      // totems vivent dans un calque positionné (.photo-deco, z-index:0).
      '.content-footer,.informations-complementaire{position:relative;z-index:2;}';
    (document.head || document.documentElement).appendChild(st);
  };

  // Masque un élément (sticker retiré) sans le supprimer du DOM.
  const masquer = (img) => {
    if (traites.has(img)) return;
    traites.add(img);
    img.style.display = 'none';
    img.dataset.mppIcone = 'masque';
  };

  const appliquer = () => {
    if (!regles) return 0;
    let restants = 0;
    regles.forEach((r) => {
      if (!r.actif) return;
      // Cible les <img> (src) ET les <image> SVG (href et xlink:href).
      const sel =
        `img[src*="${r.cle}"]:not([data-mpp-icone]),` +
        `image[href*="${r.cle}"]:not([data-mpp-icone]),` +
        `image[*|href*="${r.cle}"]:not([data-mpp-icone])`;
      const cibles = document.querySelectorAll(sel);
      if (!cibles.length) restants++;              // pas encore dans le DOM
      cibles.forEach((el) => (r.masquer ? masquer(el) : poser(el, r.url, r.classe)));
    });
    return restants;
  };

  fetch('mpp/data.json')
    .then((r) => r.json())
    .then((d) => {
      const conf = d && d.icones;
      if (!conf || !Array.isArray(conf.remplacements)) return;
      const base = conf.base || '';
      regles = conf.remplacements
        .filter((e) => e && e.cle && (e.fichier || e.masquer))
        .map((e) => ({
          cle: e.cle,
          url: base + (e.fichier || ''),
          masquer: !!e.masquer,
          classe: e.classe || '',
          actif: e.actif !== false,
        }));

      injecterStyle();
      appliquer();
      // Le DOM peut être complété après coup (scripts Webflow, carrousels…) :
      // on ré-applique un court moment, puis on s'arrête.
      let n = 0;
      const iv = setInterval(() => {
        if (appliquer() === 0 || ++n > 60) clearInterval(iv);   // ~12 s max
      }, 200);
      new MutationObserver(() => appliquer())
        .observe(document.body, { childList: true, subtree: true });
    })
    .catch((e) => console.error('[mpp-icones]', e));
})();
