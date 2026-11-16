/* ==========================================================
   CORRISPON-DANZA, Mostra di Arte Postale — logica del sito
   JavaScript puro, nessuna libreria esterna.
   ========================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    corpo: document.body,
    impaginato: document.querySelector('.impaginato'),
    rubrica: $('rubrica'), elenco: $('elenco'), cerca: $('cerca'), nessuno: $('nessuno'),
    menu: $('bottone-menu'), velo: $('velo'),
    nome: $('nome-artista'), contatore: $('contatore'),
    palco: $('palco'), cornice: document.querySelector('.cornice'), foglio: $('foglio'),
    cartFronte: $('cart-fronte'), cartRetro: $('cart-retro'),
    imgFronte: $('img-fronte'), imgRetro: $('img-retro'),
    prec: $('prec'), succ: $('succ'),
    scena: $('scena'), busta: $('busta'), lettera: $('lettera'),
    letteraFronte: $('lettera-fronte'), letteraRetro: $('lettera-retro'),
    linguetta: $('linguetta'), linguettaDietro: $('linguetta-dietro'), bustaNome: $('busta-nome'),
    lb: $('lightbox'), lbArea: $('lb-area'), lbImg: $('lb-img'), lbTitolo: $('lb-titolo'),
    lbChiudi: $('lb-chiudi'), lbPrec: $('lb-prec'), lbSucc: $('lb-succ')
  };

  // "?movimento=1" nell'indirizzo forza la transizione completa anche se il
  // dispositivo chiede di ridurre le animazioni (utile per le prove).
  var FORZA_MOVIMENTO = /[?&]movimento=1\b/.test(location.search);
  var MOVIMENTO_RIDOTTO = FORZA_MOVIMENTO ? { matches: false } : window.matchMedia('(prefers-reduced-motion: reduce)');
  var MOBILE = window.matchMedia('(max-width: 820px)');
  var SIZES = '(max-width: 820px) 92vw, 40vw';
  var MINI = 640;
  var EASE = 'cubic-bezier(.45,.05,.25,1)';

  var artisti = [];
  var indice = -1;        // artista mostrato
  var voci = [];          // elementi <a> della rubrica

  // ---------- utilità ----------
  function normalizza(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  function nomeCompleto(a) { return (a.nome ? a.nome + ' ' : '') + a.cognome; }
  function circolare(i) { var n = artisti.length; return ((i % n) + n) % n; }
  function durataCss(nome, predefinita) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
    var n = parseFloat(v);
    if (isNaN(n)) return predefinita;
    return /ms$/.test(v) ? n : (/s$/.test(v) ? n * 1000 : n);
  }
  function larghezzaMini(lato) {
    var k = MINI / Math.max(lato.w, lato.h);
    return k >= 1 ? lato.w : Math.round(lato.w * k);
  }
  function srcset(lato) { return lato.mini + ' ' + larghezzaMini(lato) + 'w, ' + lato.src + ' ' + lato.w + 'w'; }
  function attendiImmagine(img, massimo) {
    return new Promise(function (ok) {
      if (img.complete && img.naturalWidth) return ok();
      var fatto = false;
      var fine = function () { if (!fatto) { fatto = true; ok(); } };
      img.addEventListener('load', fine, { once: true });
      img.addEventListener('error', fine, { once: true });
      setTimeout(fine, massimo);
    });
  }

  // ==========================================================
  //  RUBRICA
  // ==========================================================
  function costruisciRubrica() {
    var frag = document.createDocumentFragment();
    var ultima = '';
    artisti.forEach(function (a, i) {
      var iniziale = normalizza(a.cognome).charAt(0).toUpperCase();
      if (iniziale !== ultima) {
        ultima = iniziale;
        var li0 = document.createElement('li');
        li0.className = 'iniziale'; li0.textContent = iniziale; li0.setAttribute('aria-hidden', 'true');
        li0.dataset.iniziale = iniziale;
        frag.appendChild(li0);
      }
      var li = document.createElement('li');
      li.dataset.iniziale = iniziale;
      var link = document.createElement('a');
      link.className = 'voce'; link.href = '#' + a.id; link.dataset.i = i;
      var img = document.createElement('img');
      img.src = a.icona; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      img.width = 34; img.height = 48;
      var testo = document.createElement('span');
      testo.className = 'voce-nome';
      var b = document.createElement('b'); b.textContent = a.cognome;
      testo.appendChild(b);
      if (a.nome) testo.appendChild(document.createTextNode(' ' + a.nome));
      link.appendChild(img); link.appendChild(testo);
      link.addEventListener('click', function (e) {
        e.preventDefault();
        chiudiMenu();
        richiedi(i, 'dissolvenza', 0);
      });
      li.appendChild(link);
      frag.appendChild(li);
      voci.push(link);
    });
    el.elenco.appendChild(frag);
  }

  el.cerca.addEventListener('input', function () {
    var q = normalizza(el.cerca.value.trim());
    var visibili = {};
    var conta = 0;
    voci.forEach(function (v) {
      var a = artisti[+v.dataset.i];
      var ok = !q || normalizza(a.cognome + ' ' + a.nome + ' ' + a.nome + ' ' + a.cognome + ' ' + (a.alias || '')).indexOf(q) >= 0;
      v.parentNode.hidden = !ok;
      if (ok) { visibili[v.parentNode.dataset.iniziale] = true; conta++; }
    });
    Array.prototype.forEach.call(el.elenco.querySelectorAll('.iniziale'), function (li) {
      li.hidden = !visibili[li.dataset.iniziale];
    });
    el.nessuno.hidden = conta > 0;
  });
  el.cerca.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var primo = voci.filter(function (v) { return !v.parentNode.hidden; })[0];
      if (primo) primo.click();
    }
  });

  // ---------- menu a tendina (smartphone) ----------
  function apriMenu() {
    el.rubrica.classList.add('aperta');
    el.velo.hidden = false;
    el.menu.setAttribute('aria-expanded', 'true');
    el.menu.setAttribute('aria-label', "Chiudi l'elenco degli artisti");
    var att = voci[indice];
    if (att) setTimeout(function () { att.scrollIntoView({ block: 'center' }); }, 30);
  }
  function chiudiMenu() {
    if (!el.rubrica.classList.contains('aperta')) return;
    el.rubrica.classList.remove('aperta');
    el.velo.hidden = true;
    el.menu.setAttribute('aria-expanded', 'false');
    el.menu.setAttribute('aria-label', "Apri l'elenco degli artisti");
  }
  el.menu.addEventListener('click', function () {
    if (el.rubrica.classList.contains('aperta')) chiudiMenu(); else apriMenu();
  });
  el.velo.addEventListener('click', chiudiMenu);

  // ==========================================================
  //  MOSTRA UN ARTISTA (senza animazione)
  // ==========================================================
  function impostaLato(img, figura, lato, a, nomeLato) {
    figura.style.setProperty('--r', (lato.w / lato.h).toFixed(4));
    img.width = lato.w; img.height = lato.h;
    img.sizes = SIZES;
    img.srcset = srcset(lato);
    img.src = lato.mini;
    img.alt = nomeLato + ' della cartolina di ' + nomeCompleto(a);
    figura.querySelector('.cartolina-carta').setAttribute('aria-label',
      'Apri a schermo intero il ' + nomeLato.toLowerCase() + ' della cartolina di ' + nomeCompleto(a));
  }

  function scriviNome(a) {
    el.nome.textContent = nomeCompleto(a);
    if (a.alias) {
      var s = document.createElement('span');
      s.className = 'alias'; s.textContent = a.alias;
      el.nome.appendChild(s);
    }
  }

  function mostra(i) {
    var a = artisti[i];
    indice = i;
    impostaLato(el.imgFronte, el.cartFronte, a.fronte, a, 'Fronte');
    impostaLato(el.imgRetro, el.cartRetro, a.retro, a, 'Retro');
    el.foglio.style.setProperty('--somma', (a.fronte.w / a.fronte.h + a.retro.w / a.retro.h).toFixed(4));
    scriviNome(a);
    el.contatore.textContent = (i + 1) + ' / ' + artisti.length;
    el.contatore.parentNode.setAttribute('aria-label', 'Opera ' + (i + 1) + ' di ' + artisti.length);

    var p = artisti[circolare(i - 1)], s = artisti[circolare(i + 1)];
    el.prec.setAttribute('aria-label', 'Opera precedente: ' + nomeCompleto(p));
    el.succ.setAttribute('aria-label', 'Opera successiva: ' + nomeCompleto(s));

    voci.forEach(function (v, k) {
      if (k === i) v.setAttribute('aria-current', 'true'); else v.removeAttribute('aria-current');
    });
    var voce = voci[i];
    if (voce && !MOBILE.matches) {
      var r = voce.getBoundingClientRect(), c = el.elenco.getBoundingClientRect();
      if (r.top < c.top || r.bottom > c.bottom) voce.scrollIntoView({ block: 'nearest' });
    }

    var hash = '#' + a.id;
    if (location.hash !== hash) {
      try { history.replaceState(null, '', hash); } catch (e) { location.hash = hash; }
    }
    precarica(circolare(i + 1));
    precarica(circolare(i - 1));
  }

  var precaricati = {};
  function precarica(i) {
    var a = artisti[i];
    if (!a || precaricati[a.id]) return;
    precaricati[a.id] = true;
    [a.fronte, a.retro].forEach(function (lato) {
      var im = new Image();
      im.decoding = 'async';
      im.sizes = SIZES; im.srcset = srcset(lato); im.src = lato.mini;
      var mini = new Image(); mini.src = lato.mini;   // usata anche nella busta
    });
  }

  // ==========================================================
  //  MOTORE DELLE TRANSIZIONI
  //  Solo transform e opacity (Web Animations API).
  // ==========================================================
  var inCorso = false;
  var richiesta = null;
  var fretta = false;          // true = completa subito l'animazione in corso
  var traccia = [];

  function anima(nodo, fotogrammi, opzioni) {
    var D = opzioni.D || 1;
    var a = nodo.animate(fotogrammi, {
      duration: Math.max(1, (opzioni.durata || 0) * D),
      delay: (opzioni.ritardo || 0) * D,
      easing: opzioni.easing || EASE,
      fill: 'both'
    });
    traccia.push(a);
    if (fretta) a.finish();
    return a.finished.catch(function () {});
  }
  function pulisci() {
    traccia.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    traccia = [];
    el.scena.classList.remove('attiva');
    el.foglio.style.transformOrigin = '';
  }

  // Chiede di passare all'artista i. modo: 'lettera' | 'dissolvenza'; dir: +1 avanti, -1 indietro
  function richiedi(i, modo, dir) {
    richiesta = { i: i, modo: modo, dir: dir };
    if (inCorso) {
      fretta = true;
      traccia.forEach(function (a) { try { a.finish(); } catch (e) {} });
    }
    ciclo();
  }
  function passo(dir) {
    // la destinazione si calcola dall'ultima richiesta, così più tocchi rapidi avanzano di più opere
    var base = richiesta ? richiesta.i : (inCorso && destinazione >= 0 ? destinazione : indice);
    richiedi(circolare(base + dir), 'lettera', dir);
  }
  var destinazione = -1;

  function ciclo() {
    if (inCorso) return;
    inCorso = true;
    (function prossimo() {
      if (!richiesta) { inCorso = false; destinazione = -1; return; }
      var r = richiesta; richiesta = null; fretta = false;
      destinazione = r.i;
      esegui(r).catch(function (e) { console.error(e); mostra(r.i); })
        .then(function () { pulisci(); prossimo(); });
    })();
  }

  function esegui(r) {
    if (r.i === indice) return Promise.resolve();
    var modo = r.modo;
    if (MOVIMENTO_RIDOTTO.matches || typeof el.foglio.animate !== 'function') modo = 'ridotto';
    if (modo === 'lettera') return transizioneLettera(r.i, r.dir || 1);
    return dissolvenza(r.i, modo === 'ridotto' ? 180 : durataCss('--durata-dissolvenza', 250));
  }

  function dissolvenza(i, durata) {
    if (typeof el.foglio.animate !== 'function') { mostra(i); return Promise.resolve(); }
    var mezza = { durata: durata / 2, easing: 'ease-in-out' };
    return Promise.all([
      anima(el.foglio, [{ opacity: 1 }, { opacity: 0 }], mezza),
      anima(el.nome, [{ opacity: 1 }, { opacity: 0 }], mezza)
    ]).then(function () {
      mostra(i);
      if (MOBILE.matches) window.scrollTo(0, 0);
      return fretta ? null : attendiImmagine(el.imgFronte, 350);
    }).then(function () {
      return Promise.all([
        anima(el.foglio, [{ opacity: 0 }, { opacity: 1 }], mezza),
        anima(el.nome, [{ opacity: 0 }, { opacity: 1 }], mezza)
      ]);
    });
  }

  // ---------- la transizione "a lettera" ----------
  function preparaBusta(a) {
    el.letteraFronte.src = a.fronte.mini;
    el.letteraRetro.src = a.retro.mini;
    el.bustaNome.textContent = nomeCompleto(a);
  }

  function posizionaScena() {
    // la scena copre la parte visibile dell'area centrale
    var c = el.cornice.getBoundingClientRect();
    var alto = document.getElementById('fascia').getBoundingClientRect().bottom;
    var basso = window.innerHeight;
    if (MOBILE.matches) {
      alto = Math.max(alto, document.querySelector('.intestazione-artista').getBoundingClientRect().bottom);
      basso -= 80;
    }
    var top = Math.max(c.top, alto), bottom = Math.min(c.bottom, basso);
    if (bottom - top < 200) { top = alto; bottom = basso; }
    var s = el.scena.style;
    s.left = c.left + 'px'; s.width = c.width + 'px';
    s.top = top + 'px'; s.height = (bottom - top) + 'px';
    el.scena.classList.add('attiva');
    // il foglio si rimpicciolisce verso il centro della busta
    var f = el.foglio.getBoundingClientRect();
    var cx = c.left + c.width / 2 - f.left, cy = (top + bottom) / 2 - f.top;
    el.foglio.style.transformOrigin = cx + 'px ' + cy + 'px';
  }

  function transizioneLettera(i, dir) {
    var D = durataCss('--durata-lettera', 1000);
    var vecchio = artisti[indice], nuovo = artisti[i];
    var fuori = (el.scena.getBoundingClientRect().width || window.innerWidth) * 0.5 + window.innerWidth * 0.6;
    var o = function (durata, ritardo, easing) { return { D: D, durata: durata, ritardo: ritardo || 0, easing: easing }; };

    posizionaScena();
    preparaBusta(vecchio);
    fuori = el.scena.getBoundingClientRect().width / 2 + el.busta.offsetWidth;

    var LETTERA_FUORI = 'translateY(-78%) scale(1)';
    var LETTERA_DENTRO = 'translateY(6%) scale(.94,.58)';
    var LINGUETTA_APERTA = 'perspective(800px) rotateX(180deg)';
    var LINGUETTA_CHIUSA = 'perspective(800px) rotateX(0deg)';

    // stato iniziale
    anima(el.linguetta, [{ opacity: 0, transform: LINGUETTA_APERTA }, { opacity: 0, transform: LINGUETTA_APERTA }], o(.001));
    anima(el.linguettaDietro, [{ opacity: 1 }, { opacity: 1 }], o(.001));

    // 1. il foglio si riduce e si piega dentro la busta
    var fase1 = Promise.all([
      anima(el.foglio, [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(.55, .45)', opacity: .55, offset: .55 },
        { transform: 'scale(.3, .2)', opacity: 0 }
      ], o(.28, 0, 'ease-in')),
      anima(el.nome, [{ opacity: 1 }, { opacity: 0 }], o(.3, 0, 'ease-in')),
      anima(el.busta, [
        { transform: 'translateY(10%) scale(.88)', opacity: 0 },
        { transform: 'translateY(0) scale(1)', opacity: 1 }
      ], o(.16)),
      anima(el.lettera, [
        { transform: 'translateY(-78%) scale(1.25)', opacity: 0 },
        { transform: LETTERA_FUORI, opacity: 1, offset: .35 },
        { transform: LETTERA_DENTRO, opacity: 1 }
      ], o(.32, .05))
    ]);

    return fase1.then(function () {
      // 2. la linguetta si chiude
      anima(el.linguettaDietro, [{ opacity: 0 }, { opacity: 0 }], o(.001));
      return anima(el.linguetta, [
        { opacity: 1, transform: LINGUETTA_APERTA },
        { opacity: 1, transform: LINGUETTA_CHIUSA }
      ], o(.11, 0, 'ease-in-out'));
    }).then(function () {
      // 3. la busta chiusa viene spedita fuori dallo schermo
      return anima(el.busta, [
        { transform: 'translateX(0) rotate(0deg)', opacity: 1 },
        { transform: 'translateX(' + (dir * fuori) + 'px) translateY(-4%) rotate(' + (dir * 14) + 'deg)', opacity: 1 }
      ], o(.14, 0, 'cubic-bezier(.5,0,.85,.4)'));
    }).then(function () {
      // cambio di contenuto mentre la busta è fuori scena
      mostra(i);
      preparaBusta(nuovo);
      if (MOBILE.matches) window.scrollTo(0, 0);
      // il nome cambia con una dissolvenza coordinata
      anima(el.nome, [{ opacity: 0 }, { opacity: 1 }], o(.26, .02, 'ease-out'));
      // 4. arriva la nuova busta dal lato opposto
      return anima(el.busta, [
        { transform: 'translateX(' + (-dir * fuori) + 'px) translateY(-4%) rotate(' + (-dir * 14) + 'deg)', opacity: 1 },
        { transform: 'translateX(0) rotate(0deg)', opacity: 1 }
      ], o(.14, 0, 'cubic-bezier(.15,.6,.5,1)'));
    }).then(function () {
      // 5. la linguetta si apre
      return anima(el.linguetta, [
        { opacity: 1, transform: LINGUETTA_CHIUSA },
        { opacity: 1, transform: LINGUETTA_APERTA }
      ], o(.08, 0, 'ease-in-out'));
    }).then(function () {
      anima(el.linguetta, [{ opacity: 0, transform: LINGUETTA_APERTA }, { opacity: 0, transform: LINGUETTA_APERTA }], o(.001));
      anima(el.linguettaDietro, [{ opacity: 1 }, { opacity: 1 }], o(.001));
      return fretta ? null : attendiImmagine(el.imgFronte, 500);
    }).then(function () {
      // 6. il foglio scivola fuori e si ingrandisce fino alla posizione normale
      return Promise.all([
        anima(el.lettera, [
          { transform: LETTERA_DENTRO, opacity: 1 },
          { transform: LETTERA_FUORI, opacity: 1, offset: .7 },
          { transform: 'translateY(-78%) scale(1.15)', opacity: 0 }
        ], o(.16, 0, 'ease-out')),
        anima(el.busta, [{ opacity: 1 }, { opacity: 0 }], o(.08, .1)),
        anima(el.foglio, [
          { transform: 'scale(.3, .2)', opacity: 0 },
          { transform: 'scale(.6, .5)', opacity: 1, offset: .35 },
          { transform: 'scale(1)', opacity: 1 }
        ], o(.16, .04, 'cubic-bezier(.2,.7,.3,1)'))
      ]);
    });
  }

  // ---------- frecce, tastiera, swipe ----------
  el.prec.addEventListener('click', function () { passo(-1); });
  el.succ.addEventListener('click', function () { passo(1); });

  var tocco = null;
  el.palco.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { tocco = null; return; }
    tocco = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  el.palco.addEventListener('touchend', function (e) {
    if (!tocco) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - tocco.x, dy = t.clientY - tocco.y, dt = Date.now() - tocco.t;
    tocco = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6 && dt < 900) {
      passo(dx < 0 ? 1 : -1);   // trascinare verso sinistra = opera successiva
    }
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (!el.lb.hidden) return tastieraLightbox(e);
    if (e.key === 'Escape') { chiudiMenu(); return; }
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); passo(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); passo(-1); }
  });

  // ---------- link diretti ----------
  function indiceDaHash() {
    var id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!id) return -1;
    for (var k = 0; k < artisti.length; k++) if (artisti[k].id === id) return k;
    return -1;
  }
  window.addEventListener('hashchange', function () {
    var i = indiceDaHash();
    if (i >= 0 && i !== indice && i !== destinazione) richiedi(i, 'dissolvenza', 0);
  });

  // ==========================================================
  //  SCHERMO INTERO CON ZOOM
  // ==========================================================
  var lb = { lato: 'fronte', s: 1, x: 0, y: 0, bw: 0, bh: 0, W: 0, H: 0, prima: null };
  var puntatori = new Map();
  var pinch = null, trascina = null, ultimoTap = null, timerChiudi = null;

  function apriLightbox(lato) {
    lb.lato = lato;
    lb.prima = document.activeElement;
    el.lb.hidden = false;
    el.corpo.classList.add('lb-aperta');
    el.impaginato.setAttribute('inert', '');
    el.impaginato.setAttribute('aria-hidden', 'true');
    caricaLatoLightbox();
    el.lbChiudi.focus({ preventScroll: true });
  }
  function chiudiLightbox() {
    el.lb.hidden = true;
    el.corpo.classList.remove('lb-aperta');
    el.impaginato.removeAttribute('inert');
    el.impaginato.removeAttribute('aria-hidden');
    puntatori.clear(); pinch = trascina = null;
    if (lb.prima && lb.prima.focus) lb.prima.focus({ preventScroll: true });
  }
  function caricaLatoLightbox() {
    var a = artisti[indice], dati = a[lb.lato];
    var nomeLato = lb.lato === 'fronte' ? 'Fronte' : 'Retro';
    el.lbTitolo.textContent = nomeLato + ' · ' + nomeCompleto(a);
    el.lbImg.alt = nomeLato + ' della cartolina di ' + nomeCompleto(a);
    el.lbImg.src = dati.mini;                 // subito la versione leggera...
    var grande = new Image();                 // ...poi quella ad alta risoluzione
    grande.onload = function () { if (artisti[indice][lb.lato] === dati) el.lbImg.src = dati.src; };
    grande.src = dati.src;
    var altro = lb.lato === 'fronte' ? 'retro' : 'fronte';
    el.lbPrec.setAttribute('aria-label', 'Mostra il ' + altro);
    el.lbSucc.setAttribute('aria-label', 'Mostra il ' + altro);
    impaginaLightbox(dati);
  }
  function impaginaLightbox(dati) {
    dati = dati || artisti[indice][lb.lato];
    var r = el.lbArea.getBoundingClientRect();
    lb.W = r.width; lb.H = r.height;
    var mob = MOBILE.matches;
    var mx = mob ? 12 : 84, sopra = 56, sotto = mob ? 100 : 40;
    var maxW = lb.W - 2 * mx, maxH = lb.H - sopra - sotto;
    var rap = dati.w / dati.h;
    lb.bw = Math.min(maxW, maxH * rap); lb.bh = lb.bw / rap;
    lb.cy = sopra + maxH / 2;
    el.lbImg.style.width = lb.bw + 'px';
    el.lbImg.style.height = lb.bh + 'px';
    centra();
  }
  function centra() {
    lb.s = 1; lb.x = (lb.W - lb.bw) / 2; lb.y = lb.cy - lb.bh / 2;
    applica();
  }
  function vincola() {
    if (lb.s <= 1.001) { centra(); return; }
    var w = lb.bw * lb.s, h = lb.bh * lb.s;
    lb.x = w <= lb.W ? (lb.W - w) / 2 : Math.min(0, Math.max(lb.W - w, lb.x));
    lb.y = h <= lb.H ? (lb.H - h) / 2 : Math.min(0, Math.max(lb.H - h, lb.y));
  }
  function applica(morbido) {
    el.lbImg.style.transition = morbido ? 'transform .25s ease' : 'none';
    el.lbImg.style.transform = 'translate(' + lb.x + 'px,' + lb.y + 'px) scale(' + lb.s + ')';
    el.lbArea.classList.toggle('zoom', lb.s > 1.01);
  }
  function zoomIn(px, py, ns, morbido) {
    ns = Math.max(1, Math.min(6, ns));
    lb.x = px - (px - lb.x) * (ns / lb.s);
    lb.y = py - (py - lb.y) * (ns / lb.s);
    lb.s = ns;
    vincola(); applica(morbido);
  }
  function puntoArea(e) {
    var r = el.lbArea.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function sullImmagine(p) {
    return p.x >= lb.x && p.x <= lb.x + lb.bw * lb.s && p.y >= lb.y && p.y <= lb.y + lb.bh * lb.s;
  }
  function cambiaLato() {
    lb.lato = lb.lato === 'fronte' ? 'retro' : 'fronte';
    caricaLatoLightbox();
  }

  el.lbArea.addEventListener('pointerdown', function (e) {
    el.lbArea.setPointerCapture(e.pointerId);
    var p = puntoArea(e);
    puntatori.set(e.pointerId, p);
    if (puntatori.size === 2) {
      var v = Array.from(puntatori.values());
      var m = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
      pinch = { d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1, s: lb.s, ix: (m.x - lb.x) / lb.s, iy: (m.y - lb.y) / lb.s };
      trascina = null;
    } else if (puntatori.size === 1) {
      trascina = { x: p.x, y: p.y, ox: lb.x, oy: lb.y, t: Date.now(), mosso: false };
      if (lb.s > 1.01) el.lbArea.classList.add('trascina');
    }
  });
  el.lbArea.addEventListener('pointermove', function (e) {
    if (!puntatori.has(e.pointerId)) return;
    var p = puntoArea(e);
    puntatori.set(e.pointerId, p);
    if (pinch && puntatori.size >= 2) {
      var v = Array.from(puntatori.values());
      var d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
      var m = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
      lb.s = Math.max(1, Math.min(6, pinch.s * d / pinch.d));
      lb.x = m.x - pinch.ix * lb.s; lb.y = m.y - pinch.iy * lb.s;
      vincola(); applica();
    } else if (trascina) {
      var dx = p.x - trascina.x, dy = p.y - trascina.y;
      if (Math.abs(dx) + Math.abs(dy) > 8) trascina.mosso = true;
      if (lb.s > 1.01) { lb.x = trascina.ox + dx; lb.y = trascina.oy + dy; vincola(); applica(); }
    }
  });
  function finePuntatore(e) {
    if (!puntatori.has(e.pointerId)) return;
    var p = puntoArea(e);
    puntatori.delete(e.pointerId);
    el.lbArea.classList.remove('trascina');
    if (pinch) { if (puntatori.size < 2) pinch = null; trascina = null; ultimoTap = null; return; }
    if (!trascina) return;
    var tap = !trascina.mosso && Date.now() - trascina.t < 350;
    var lontano = !trascina.mosso && lb.s <= 1.01 && Math.abs(p.x - trascina.x) > 60;
    trascina = null;
    if (!tap || e.type === 'pointercancel' || lontano) return;
    // doppio tocco / doppio clic = ingrandisci o torna normale
    var ora = Date.now();
    if (ultimoTap && ora - ultimoTap.t < 320 && Math.hypot(p.x - ultimoTap.x, p.y - ultimoTap.y) < 40) {
      clearTimeout(timerChiudi);
      ultimoTap = null;
      if (lb.s > 1.01) { lb.s = 1; centra(); applica(true); }
      else zoomIn(p.x, p.y, 2.6, true);
      return;
    }
    ultimoTap = { t: ora, x: p.x, y: p.y };
    // un tocco sullo sfondo (fuori dall'immagine) chiude
    if (!sullImmagine(p) && lb.s <= 1.01) {
      clearTimeout(timerChiudi);
      timerChiudi = setTimeout(function () { if (!el.lb.hidden) chiudiLightbox(); }, 330);
    }
  }
  el.lbArea.addEventListener('pointerup', finePuntatore);
  el.lbArea.addEventListener('pointercancel', finePuntatore);
  el.lbArea.addEventListener('wheel', function (e) {
    e.preventDefault();
    var p = puntoArea(e);
    var delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
    zoomIn(p.x, p.y, lb.s * Math.exp(-delta * 0.0018));
  }, { passive: false });

  el.lbChiudi.addEventListener('click', chiudiLightbox);
  el.lbPrec.addEventListener('click', cambiaLato);
  el.lbSucc.addEventListener('click', cambiaLato);

  function tastieraLightbox(e) {
    if (e.key === 'Escape') { e.preventDefault(); chiudiLightbox(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); cambiaLato(); }
    else if (e.key === '+' || e.key === '=') zoomIn(lb.W / 2, lb.H / 2, lb.s * 1.4, true);
    else if (e.key === '-') zoomIn(lb.W / 2, lb.H / 2, lb.s / 1.4, true);
    else if (e.key === 'Tab') {   // il focus resta dentro la finestra
      var f = [el.lbChiudi, el.lbPrec, el.lbSucc];
      var k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('.cartolina-carta'), function (b) {
    b.addEventListener('click', function () { if (!inCorso) apriLightbox(b.dataset.lato); });
  });

  window.addEventListener('resize', function () {
    if (!el.lb.hidden) impaginaLightbox();
    if (!MOBILE.matches) chiudiMenu();
  });

  // ==========================================================
  //  AVVIO
  // ==========================================================
  fetch('artisti.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (dati) {
      artisti = dati;
      if (!artisti.length) { el.nome.textContent = 'Nessuna opera disponibile'; return; }
      costruisciRubrica();
      var i = indiceDaHash();
      mostra(i >= 0 ? i : 0);
    })
    .catch(function () {
      el.nome.textContent = 'Impossibile caricare l’elenco delle opere.';
    });
})();
