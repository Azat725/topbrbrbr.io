/* TOP Academy — интерактивная брошюра программ.
   Маршруты: #/ — выбор программы, #/<программа> — лента модулей, #/<программа>/<модуль> — открыт модуль. */
(function () {
  'use strict';

  var LIB = window.MODULE_LIBRARY || {};
  var ICONS = window.ICONS || {};
  var EASE = 'cubic-bezier(.2, .8, .2, 1)';
  var EASE_IN_OUT = 'cubic-bezier(.65, 0, .35, 1)';
  var EASE_ACCEL = 'cubic-bezier(.4, 0, .2, 1)';

  var app = document.getElementById('app');
  var modal = document.getElementById('modal');
  var dialog = modal.querySelector('.modal__dialog');
  var backdrop = modal.querySelector('.modal__backdrop');
  var closeBtn = modal.querySelector('.modal__close');
  var scroller = modal.querySelector('.modal__scroll');
  var content = modal.querySelector('.modal__content');
  var modalNav = modal.querySelector('.modal__nav');
  var wipe = document.querySelector('.wipe');
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  var mqSheet = window.matchMedia('(max-width: 639px)');
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canAnimate = typeof Element.prototype.animate === 'function';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  var state = { screen: null, route: null, spyUpdate: null, setActiveYear: null, spyLock: 0, wipeAnim: null, cameFromHome: false };

  /* ---------- Данные ---------- */

  var PROGRAMS = (window.PROGRAMS || []).map(normalizeProgram);

  function normalizeProgram(p) {
    var flat = [];
    var years = p.years.map(function (y, yi) {
      var modules = y.modules.map(function (entry, mi) {
        var base = entry.use ? LIB[entry.use] : null;
        if (entry.use && !base) console.warn('Нет модуля в MODULE_LIBRARY:', entry.use);
        var m = Object.assign({ learn: [], tools: [], works: [] }, base || {}, entry);
        m.id = entry.id || entry.use;
        m.year = yi + 1;
        m.num = mi + 1;
        m.y = y;
        m.hours = entry.hours || y.hours || '';
        m.chip = m.tag || '';
        m.index = flat.length;
        flat.push(m);
        return m;
      });
      return Object.assign({}, y, { n: yi + 1, modules: modules });
    });
    return Object.assign({}, p, { years: years, flat: flat });
  }

  function findProgram(id) {
    for (var i = 0; i < PROGRAMS.length; i++) if (PROGRAMS[i].id === id) return PROGRAMS[i];
    return null;
  }

  /* ---------- Утилиты ---------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(name) {
    return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.info) + '</svg>';
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function yearVars(y) { return '--yc:' + y.color + ';--yi:' + y.ink + ';--yb:' + y.bg; }
  function reduced() { return mqReduce.matches || !canAnimate; }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function stickyOffset() {
    var bar = app.querySelector('.topbar');
    var nav = app.querySelector('.yearnav');
    return (bar ? bar.offsetHeight : 0) + (nav ? nav.offsetHeight : 0);
  }
  function inViewport(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > stickyOffset() && r.top < window.innerHeight;
  }
  function findCard(id) {
    return id ? app.querySelector('.card[data-module="' + id + '"]') : null;
  }

  var LOGO = '<img src="assets/logo-white-crop.png" alt="Компьютерная Академия TOP" width="1502" height="1210"';

  /* ---------- Тема ---------- */

  function applyTheme(p) {
    var s = document.body.style;
    document.body.setAttribute('data-theme', p ? p.id : 'home');
    var vars = {
      '--primary': p && p.theme.primary,
      '--primary-dark': p && p.theme.primaryDark,
      '--accent': p && p.theme.accent,
      '--accent-ink': p && p.theme.accentInk,
      '--accent-bg': p && p.theme.accentBg
    };
    Object.keys(vars).forEach(function (k) {
      if (vars[k]) s.setProperty(k, vars[k]); else s.removeProperty(k);
    });
    if (themeMeta) themeMeta.setAttribute('content', p ? p.theme.primary : '#14182B');
    document.title = p
      ? p.name + ' · ' + p.duration + ' — Компьютерная Академия TOP'
      : 'Программы обучения — Компьютерная Академия TOP';
  }

  /* ---------- Экран выбора программы ---------- */

  function renderHome() {
    applyTheme(null);
    var cards = PROGRAMS.map(function (p, i) {
      var path = p.years.map(function (y) {
        return '<span style="--yc:' + y.color + '">' + y.n + '</span><i></i>';
      }).join('') + '<span class="is-final">' + icon(p.finale.icon) + '</span>';
      var count = p.flat.length;
      return (
        '<a class="pcard" href="#/' + p.id + '" data-program="' + p.id + '" ' +
          'style="--c1:' + p.theme.gradient[0] + ';--c2:' + p.theme.gradient[1] + ';--c-shadow:' + p.theme.primary + ';--d:' + (120 + i * 90) + 'ms">' +
          '<span class="pcard__emblem" aria-hidden="true">' + icon(p.emblem) + '</span>' +
          '<span class="pcard__top">' +
            '<span class="badge badge--solid">' + esc(p.code) + '</span>' +
            '<span class="badge">' + icon('users') + esc(p.age) + '</span>' +
          '</span>' +
          '<h2 class="pcard__name">' + esc(p.name) + '</h2>' +
          '<p class="pcard__dur">' + esc(p.duration) + ' · ' + count + ' ' + plural(count, 'модуль', 'модуля', 'модулей') + '</p>' +
          '<p class="pcard__tagline">' + esc(p.tagline) + '</p>' +
          '<span class="pcard__path" aria-hidden="true">' + path + '</span>' +
          '<span class="pcard__cta">Смотреть программу<span class="pcard__arrow">' + icon('arrowRight') + '</span></span>' +
        '</a>'
      );
    }).join('');

    app.innerHTML =
      '<div class="screen screen--home">' +
        '<header class="home-hero">' +
          '<div class="container">' +
            LOGO + ' class="home-hero__logo">' +
            '<div class="home-hero__content">' +
              '<p class="eyebrow">Компьютерная Академия TOP</p>' +
              '<h1>Программы обучения для детей и подростков</h1>' +
              '<p class="home-hero__lead">Выберите программу — покажем, какие модули ждут ребёнка в каждом году обучения и что он создаст своими руками.</p>' +
            '</div>' +
          '</div>' +
        '</header>' +
        '<main class="container">' +
          '<nav class="programs" aria-label="Программы обучения">' + cards + '</nav>' +
          '<p class="home-note">' + icon('info') + 'Нажмите на программу, чтобы посмотреть модули по годам</p>' +
        '</main>' +
        '<footer class="home-footer"><div class="container">© Компьютерная Академия TOP</div></footer>' +
      '</div>';

    state.screen = 'home';
    state.spyUpdate = null;
    window.scrollTo(0, 0);
  }

  /* ---------- Страница программы ---------- */

  function cardHTML(p, m) {
    return (
      '<a class="card" href="#/' + p.id + '/' + m.id + '" data-module="' + m.id + '">' +
        '<span class="card__icon" aria-hidden="true">' + icon(m.icon) + '</span>' +
        '<span class="card__num" aria-hidden="true">' + pad(m.num) + '</span>' +
        '<div class="card__body">' +
          '<h3 class="card__title">' + esc(m.title) + '</h3>' +
          '<p class="card__text">' + esc(m.short) + '</p>' +
        '</div>' +
        '<span class="card__chip">' + esc(m.chip) + '</span>' +
        '<span class="card__more" aria-hidden="true">' + icon('arrowRight') + '</span>' +
      '</a>'
    );
  }

  function finaleHTML(p) {
    var f = p.finale;
    if (f.type === 'skills') {
      return (
        '<div class="skills">' +
          '<h2>' + esc(f.title) + '</h2>' +
          '<ul class="skills__grid">' + f.items.map(function (it) {
            return '<li class="skill"><span class="skill__icon">' + icon(it.icon) + '</span>' +
              '<div><h3>' + esc(it.title) + '</h3><p>' + esc(it.text) + '</p></div></li>';
          }).join('') + '</ul>' +
        '</div>'
      );
    }
    return (
      '<div class="diploma">' +
        '<span class="diploma__icon" aria-hidden="true">' + icon(f.icon) + '</span>' +
        '<div><h2>' + esc(f.title) + '</h2><p>' + esc(f.text) + '</p></div>' +
      '</div>'
    );
  }

  function renderProgram(p) {
    applyTheme(p);
    var finaleLabel = p.finale.type === 'diploma' ? 'Диплом' : 'Итоги';

    var chips = p.years.map(function (y) {
      return '<button class="ychip" type="button" data-target="year-' + y.n + '" style="' + yearVars(y) + '">' +
        '<span class="ychip__n">' + y.n + '</span>' + y.n + ' год</button>';
    }).join('') +
      '<button class="ychip ychip--final" type="button" data-target="year-final" style="--yc:var(--accent)">' +
        '<span class="ychip__n">' + icon(p.finale.icon) + '</span>' + finaleLabel + '</button>';

    var years = p.years.map(function (y) {
      return (
        '<section class="year" id="year-' + y.n + '" data-spy="year-' + y.n + '" style="' + yearVars(y) + '" aria-labelledby="year-' + y.n + '-title">' +
          '<div class="marker" aria-hidden="true">' + y.n + '</div>' +
          '<div class="year__main">' +
            '<div class="year__head">' +
              '<div><p class="year__eyebrow">' + y.n + ' год</p>' +
              '<h2 class="year__title" id="year-' + y.n + '-title">' + esc(y.title) + '</h2></div>' +
              '<p class="year__meta">' + esc(y.meta) + '</p>' +
            '</div>' +
            '<ol class="grid">' + y.modules.map(function (m, i) {
              return '<li class="reveal" style="--d:' + (i * 60) + 'ms">' + cardHTML(p, m) + '</li>';
            }).join('') + '</ol>' +
          '</div>' +
        '</section>'
      );
    }).join('');

    var facts = p.facts.map(function (f) {
      return '<li class="fact"><span class="fact__icon">' + icon(f.icon) + '</span>' +
        '<span><span class="fact__value">' + esc(f.value) + '</span><span class="fact__label">' + esc(f.label) + '</span></span></li>';
    }).join('');

    var adv = p.advantages.map(function (a, i) {
      return '<li class="adv__item reveal" style="--d:' + (i * 60) + 'ms"><span class="adv__icon">' + icon(a.icon) + '</span>' +
        '<div><h3>' + esc(a.title) + '</h3><p>' + esc(a.text) + '</p></div></li>';
    }).join('');

    app.innerHTML =
      '<div class="screen screen--program">' +
        '<header class="topbar">' +
          '<div class="container topbar__inner">' +
            '<a class="back" href="#/" data-back>' + icon('arrowLeft') +
              '<span class="back__long">Все программы</span><span class="back__short">Программы</span></a>' +
            LOGO + ' class="topbar__logo">' +
          '</div>' +
        '</header>' +
        '<section class="hero">' +
          '<div class="container">' +
            '<p class="eyebrow">Программа обучения · ' + esc(p.code) + '</p>' +
            '<h1>' + esc(p.name) + '</h1>' +
            '<p class="hero__sub">' + esc(p.subtitle) + '</p>' +
            '<ul class="facts">' + facts + '</ul>' +
          '</div>' +
        '</section>' +
        '<nav class="yearnav" aria-label="Годы обучения">' +
          '<div class="container yearnav__inner"><span class="yearnav__label">Год обучения:</span>' + chips + '</div>' +
        '</nav>' +
        '<main class="timeline container">' +
          years +
          '<section class="finale" id="year-final" data-spy="year-final">' +
            '<div class="marker" aria-hidden="true">' + icon(p.finale.icon) + '</div>' +
            '<div class="reveal">' + finaleHTML(p) + '</div>' +
          '</section>' +
        '</main>' +
        '<section class="adv">' +
          '<div class="container">' +
            '<h2 class="section-title">Преимущества</h2>' +
            '<ul class="adv__grid">' + adv + '</ul>' +
          '</div>' +
        '</section>' +
        '<footer class="footer">' +
          '<div class="container footer__inner">' +
            '<div class="footer__brand">' + LOGO + ' loading="lazy">' +
              '<span>Компьютерная Академия TOP<br>' + esc(p.name) + ' · ' + esc(p.duration) + '</span></div>' +
            '<a class="back" href="#/" data-back>' + icon('arrowLeft') + '<span>К выбору программы</span></a>' +
          '</div>' +
        '</footer>' +
      '</div>';

    state.screen = p.id;
    window.scrollTo(0, 0);
    setupReveal();
    setupSpy();
  }

  /* Появление карточек при прокрутке */
  var revealIO = null;
  function setupReveal() {
    if (revealIO) revealIO.disconnect();
    var els = app.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduced()) {
      Array.prototype.forEach.call(els, function (el) { el.classList.add('is-in'); });
      return;
    }
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          revealIO.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(els, function (el) { revealIO.observe(el); });
  }

  /* Подсветка текущего года в липкой панели */
  function setupSpy() {
    var sections = Array.prototype.slice.call(app.querySelectorAll('[data-spy]'));
    var chips = Array.prototype.slice.call(app.querySelectorAll('.ychip'));
    var navInner = app.querySelector('.yearnav__inner');
    var current = null;

    function setActive(id) {
      if (id === current) return;
      current = id;
      chips.forEach(function (c) {
        var on = c.getAttribute('data-target') === id;
        c.classList.toggle('is-active', on);
        if (on) {
          c.setAttribute('aria-current', 'true');
          var left = c.offsetLeft - (navInner.clientWidth - c.offsetWidth) / 2;
          navInner.scrollTo({ left: Math.max(0, left), behavior: reduced() ? 'auto' : 'smooth' });
        } else {
          c.removeAttribute('aria-current');
        }
      });
    }

    state.setActiveYear = setActive;
    state.spyUpdate = function () {
      if (performance.now() < state.spyLock) return;
      var line = stickyOffset() + window.innerHeight * 0.3;
      var active = sections[0];
      sections.forEach(function (s) { if (s.getBoundingClientRect().top <= line) active = s; });
      setActive(active.getAttribute('data-spy'));
    };
    state.spyUpdate();
  }

  var spyTicking = false;
  window.addEventListener('scroll', function () {
    if (spyTicking || !state.spyUpdate) return;
    spyTicking = true;
    requestAnimationFrame(function () {
      spyTicking = false;
      if (state.spyUpdate) state.spyUpdate();
    });
  }, { passive: true });

  function scrollToYear(id) {
    var el = document.getElementById(id);
    if (!el) return;
    state.spyLock = performance.now() + 900;
    if (state.setActiveYear) state.setActiveYear(id);
    el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- Переход к программе: круговая заливка цветом ---------- */

  function goToProgram(p, x, y, el) {
    if (reduced() || state.wipeAnim) {
      location.hash = '#/' + p.id;
      return;
    }
    if (!x && !y) {
      var r = el.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 20;
    wipe.style.background = 'linear-gradient(160deg, ' + p.theme.primary + ', ' + p.theme.primaryDark + ')';
    wipe.style.visibility = 'visible';
    var a = wipe.animate(
      [{ clipPath: 'circle(0px at ' + x + 'px ' + y + 'px)' }, { clipPath: 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)' }],
      { duration: 560, easing: EASE_IN_OUT, fill: 'forwards' }
    );
    state.wipeAnim = a;
    a.onfinish = function () { location.hash = '#/' + p.id; };
  }

  function finishWipe() {
    var a = state.wipeAnim;
    if (!a || a.playState === 'running') return;
    state.wipeAnim = null;
    var out = wipe.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
    out.onfinish = function () {
      a.cancel();
      out.cancel();
      wipe.style.visibility = 'hidden';
    };
  }

  /* ---------- Мини-окно модуля ---------- */

  var ms = { open: false, closing: false, program: null, module: null, pushed: false, anims: [], returnFocus: null };

  function track(a) { ms.anims.push(a); return a; }
  function stopAnims() {
    ms.anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* уже завершена */ } });
    ms.anims = [];
  }

  function tag(ic, text) { return '<span class="m-tag">' + icon(ic) + esc(text) + '</span>'; }

  function renderWorks(m) {
    if (!m.works || !m.works.length) return '';
    var items = m.works.map(function (w) {
      var cap = '<span class="work__cap">' + esc(w.title || '') + (w.author ? '<small>' + esc(w.author) + '</small>' : '') + '</span>';
      if (w.type === 'video') {
        return '<li><div class="work"><video src="' + esc(w.src) + '" controls preload="metadata" playsinline></video>' + cap + '</div></li>';
      }
      if (w.type === 'link') {
        return '<li><a class="work" href="' + esc(w.src) + '" target="_blank" rel="noopener"><span class="work__link">' + icon('link') + '</span>' + cap + '</a></li>';
      }
      return '<li><a class="work" href="' + esc(w.src) + '" target="_blank" rel="noopener">' +
        '<img src="' + esc(w.thumb || w.src) + '" alt="' + esc(w.title || 'Работа студента') + '" loading="lazy">' + cap + '</a></li>';
    }).join('');
    return '<section class="m-anim m-section"><h3>' + icon('image') + 'Работы студентов</h3><ul class="m-works">' + items + '</ul></section>';
  }

  function modalHTML(p, m) {
    var learn = m.learn.map(function (t) {
      return '<li><span class="tick">' + icon('check') + '</span><span>' + esc(t) + '</span></li>';
    }).join('');
    var tools = m.tools.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    return (
      '<header class="m-head">' +
        '<span class="m-head__bg" aria-hidden="true">' + icon(m.icon) + '</span>' +
        '<div class="m-anim m-head__icon" aria-hidden="true">' + icon(m.icon) + '</div>' +
        '<p class="m-anim m-eyebrow">' + m.year + ' год · модуль ' + pad(m.num) + '</p>' +
        '<h2 class="m-anim m-title" id="modal-title">' + esc(m.title) + '</h2>' +
        '<p class="m-anim m-short">' + esc(m.short) + '</p>' +
        (m.hours ? '<div class="m-anim m-tags">' + tag('clock', m.hours) + '</div>' : '') +
      '</header>' +
      '<div class="m-body">' +
        (m.about ? '<section class="m-anim m-section"><h3>' + icon('book') + 'О модуле</h3><p class="m-about">' + esc(m.about) + '</p></section>' : '') +
        (learn ? '<section class="m-anim m-section"><h3>' + icon('check') + 'Что изучают</h3><ul class="m-learn">' + learn + '</ul></section>' : '') +
        (tools ? '<section class="m-anim m-section"><h3>' + icon('wrench') + 'Инструменты</h3><ul class="m-tools">' + tools + '</ul></section>' : '') +
        (m.project ? '<section class="m-anim m-section"><div class="m-project"><span class="m-project__icon">' + icon('trophy') + '</span>' +
          '<div><b>Итоговый проект</b><p>' + esc(m.project) + '</p></div></div></section>' : '') +
        renderWorks(m) +
      '</div>'
    );
  }

  function navHTML(p, m) {
    function btn(mod, dir) {
      if (!mod) return '';
      var next = dir === 'next';
      return '<button type="button" class="mnav mnav--' + dir + '" data-go="' + mod.id + '">' +
        '<span class="mnav__arrow">' + icon(next ? 'chevronRight' : 'chevronLeft') + '</span>' +
        '<span class="mnav__text"><span class="mnav__label">' + (next ? 'Следующий' : 'Предыдущий') + '</span>' +
        '<span class="mnav__title">' + esc(mod.title) + '</span></span></button>';
    }
    return btn(p.flat[m.index - 1], 'prev') + btn(p.flat[m.index + 1], 'next');
  }

  function fillModal(p, m) {
    var y = m.y;
    dialog.style.setProperty('--yc', y.color);
    dialog.style.setProperty('--yi', y.ink);
    dialog.style.setProperty('--yb', y.bg);
    content.innerHTML = modalHTML(p, m);
    modalNav.innerHTML = navHTML(p, m);
    modalNav.hidden = !modalNav.innerHTML;
    scroller.scrollTop = 0;
  }

  function staggerIn(delay) {
    var items = content.querySelectorAll('.m-anim');
    Array.prototype.forEach.call(items, function (el, i) {
      track(el.animate(
        [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: delay + Math.min(i, 8) * 45, easing: EASE, fill: 'backwards' }
      ));
    });
  }

  function setLocked(on) {
    document.documentElement.classList.toggle('is-locked', on);
    if (on) app.setAttribute('inert', ''); else app.removeAttribute('inert');
  }

  function openModal(p, m, pushed) {
    stopAnims();
    ms.open = true;
    ms.closing = false;
    ms.program = p;
    ms.module = m;
    ms.pushed = pushed;
    ms.returnFocus = document.activeElement;

    fillModal(p, m);
    dialog.style.transform = '';
    backdrop.style.opacity = '';
    modal.hidden = false;
    setLocked(true);
    dialog.focus({ preventScroll: true });

    if (reduced()) return;

    track(backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' }));
    var card = findCard(m.id);

    if (mqSheet.matches) {
      // Телефон: шторка выезжает снизу
      track(dialog.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 460, easing: EASE }));
      staggerIn(160);
    } else if (inViewport(card)) {
      // ПК/планшет: окно «вырастает» из карточки (FLIP)
      var from = card.getBoundingClientRect();
      var to = dialog.getBoundingClientRect();
      var sx = from.width / to.width;
      var sy = from.height / to.height;
      var dur = 480;
      track(dialog.animate([
        {
          transform: 'translate(' + (from.left - to.left) + 'px, ' + (from.top - to.top) + 'px) scale(' + sx + ', ' + sy + ')',
          borderRadius: (18 / sx) + 'px / ' + (18 / sy) + 'px',
          backgroundColor: m.y.bg,
          boxShadow: '0 0 0 rgba(0,0,0,0)'
        },
        { transform: 'none', borderRadius: '24px', backgroundColor: '#fff' }
      ], { duration: dur, easing: EASE }));
      [scroller, closeBtn, modalNav].forEach(function (el) {
        track(el.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], { duration: dur }));
      });
      staggerIn(200);
    } else {
      track(dialog.animate(
        [{ opacity: 0, transform: 'translateY(24px) scale(.96)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, easing: EASE }
      ));
      staggerIn(120);
    }
  }

  function finishClose() {
    modal.hidden = true;
    stopAnims();
    dialog.style.transform = '';
    backdrop.style.opacity = '';
    setLocked(false);
    var card = ms.module && findCard(ms.module.id);
    var focusTarget = card || ms.returnFocus;
    ms.open = false;
    ms.closing = false;
    ms.module = null;
    if (focusTarget && typeof focusTarget.focus === 'function' && document.contains(focusTarget)) {
      focusTarget.focus({ preventScroll: true });
    }
  }

  function closeModal(instant) {
    if (!ms.open || ms.closing) return;
    ms.closing = true;
    if (instant || reduced()) { finishClose(); return; }

    var card = findCard(ms.module.id);
    var current = dialog.style.transform || 'translateY(0)';
    var bdFrom = backdrop.style.opacity || '1';
    stopAnims();
    dialog.style.transform = '';
    backdrop.style.opacity = '';

    var main;
    if (mqSheet.matches) {
      main = dialog.animate([{ transform: current }, { transform: 'translateY(100%)' }], { duration: 320, easing: EASE_ACCEL, fill: 'forwards' });
      track(backdrop.animate([{ opacity: bdFrom }, { opacity: 0 }], { duration: 320, fill: 'forwards' }));
    } else if (inViewport(card)) {
      // окно «складывается» обратно в карточку
      var to = card.getBoundingClientRect();
      var from = dialog.getBoundingClientRect();
      var sx = to.width / from.width;
      var sy = to.height / from.height;
      var dur = 400;
      main = dialog.animate([
        { transform: 'none', borderRadius: '24px', backgroundColor: '#fff' },
        {
          transform: 'translate(' + (to.left - from.left) + 'px, ' + (to.top - from.top) + 'px) scale(' + sx + ', ' + sy + ')',
          borderRadius: (18 / sx) + 'px / ' + (18 / sy) + 'px',
          backgroundColor: ms.module.y.bg,
          boxShadow: '0 0 0 rgba(0,0,0,0)'
        }
      ], { duration: dur, easing: EASE_ACCEL, fill: 'forwards' });
      [scroller, closeBtn, modalNav].forEach(function (el) {
        track(el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.3 }, { opacity: 0 }], { duration: dur, fill: 'forwards' }));
      });
      track(backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease-in', fill: 'forwards' }));
    } else {
      main = dialog.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px) scale(.96)' }], { duration: 240, easing: EASE_ACCEL, fill: 'forwards' });
      track(backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' }));
    }
    track(main);
    main.onfinish = finishClose;
  }

  function swapModal(p, m, dir) {
    stopAnims();
    ms.module = m;
    // карточку за окном держим в поле зрения, чтобы окно закрылось «в неё»
    var card = findCard(m.id);
    if (card && !inViewport(card)) card.scrollIntoView({ block: 'center' });
    if (state.spyUpdate) state.spyUpdate();

    if (reduced()) { fillModal(p, m); return; }
    var out = content.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (-dir * 28) + 'px)' }],
      { duration: 150, easing: 'ease-in', fill: 'forwards' }
    );
    track(out);
    out.onfinish = function () {
      if (ms.module !== m) return;
      fillModal(p, m);
      out.cancel();
      track(content.animate(
        [{ opacity: 0, transform: 'translateX(' + (dir * 28) + 'px)' }, { opacity: 1, transform: 'none' }],
        { duration: 320, easing: EASE }
      ));
    };
  }

  function requestClose() {
    if (!ms.open || ms.closing) return;
    if (ms.pushed) history.back();
    else location.replace('#/' + ms.program.id);
  }

  function goModule(id) {
    if (ms.open) location.replace('#/' + ms.program.id + '/' + id);
  }

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { requestClose(); return; }
    var go = e.target.closest('[data-go]');
    if (go) goModule(go.getAttribute('data-go'));
  });

  document.addEventListener('keydown', function (e) {
    if (!ms.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      requestClose();
    } else if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(
        dialog.querySelectorAll('a[href], button:not([disabled]), video, [tabindex]:not([tabindex="-1"])'),
        function (el) { return el.offsetParent !== null; }
      );
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.target.closest('video')) {
      var target = ms.program.flat[ms.module.index + (e.key === 'ArrowRight' ? 1 : -1)];
      if (target) goModule(target.id);
    }
  });

  /* Свайп вниз закрывает шторку на телефоне */
  var drag = null;
  dialog.addEventListener('touchstart', function (e) {
    if (!mqSheet.matches || !ms.open || ms.closing || e.target.closest('.modal__nav')) return;
    var t = e.touches[0];
    drag = { y0: t.clientY, dy: 0, active: false, lastY: t.clientY, lastT: performance.now(), v: 0 };
  }, { passive: true });

  dialog.addEventListener('touchmove', function (e) {
    if (!drag) return;
    var y = e.touches[0].clientY;
    var dy = y - drag.y0;
    var atTop = scroller.scrollTop <= 0 || !scroller.contains(e.target);
    if (!drag.active) {
      if (dy > 6 && atTop) {
        drag.active = true;
        drag.y0 = y;
        stopAnims();
      } else if (Math.abs(dy) > 6) {
        drag = null;
      }
      return;
    }
    e.preventDefault();
    var now = performance.now();
    drag.v = (y - drag.lastY) / Math.max(1, now - drag.lastT);
    drag.lastY = y;
    drag.lastT = now;
    drag.dy = Math.max(0, dy);
    dialog.style.transform = 'translateY(' + drag.dy + 'px)';
    backdrop.style.opacity = String(1 - Math.min(drag.dy / dialog.offsetHeight, 1) * 0.85);
  }, { passive: false });

  function endDrag() {
    if (!drag) return;
    var d = drag;
    drag = null;
    if (!d.active) return;
    if (d.dy > Math.min(140, dialog.offsetHeight * 0.25) || d.v > 0.6) {
      requestClose();
    } else {
      var fromT = dialog.style.transform, fromO = backdrop.style.opacity || '1';
      dialog.style.transform = '';
      backdrop.style.opacity = '';
      track(dialog.animate([{ transform: fromT }, { transform: 'translateY(0)' }], { duration: 300, easing: EASE }));
      track(backdrop.animate([{ opacity: fromO }, { opacity: 1 }], { duration: 300 }));
    }
  }
  dialog.addEventListener('touchend', endDrag);
  dialog.addEventListener('touchcancel', endDrag);

  mqSheet.addEventListener && mqSheet.addEventListener('change', function () {
    dialog.style.transform = '';
    backdrop.style.opacity = '';
  });

  /* ---------- Клики по странице ---------- */

  app.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var pcard = e.target.closest('[data-program]');
    if (pcard) {
      e.preventDefault();
      goToProgram(findProgram(pcard.getAttribute('data-program')), e.clientX, e.clientY, pcard);
      return;
    }

    var chip = e.target.closest('[data-target]');
    if (chip) {
      scrollToYear(chip.getAttribute('data-target'));
      return;
    }

    var back = e.target.closest('[data-back]');
    if (back && state.cameFromHome) {
      // вернулись бы на ту же страницу выбора — просто шаг назад по истории
      e.preventDefault();
      history.back();
    }
  });

  /* ---------- Роутер ---------- */

  function parseHash() {
    var parts = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/').filter(Boolean);
    return { pid: parts[0] || null, mid: parts[1] || null };
  }

  function router() {
    var r = parseHash();
    var prev = state.route;
    state.route = r;

    var p = r.pid ? findProgram(r.pid) : null;
    if (r.pid && !p) { location.replace('#/'); return; }

    if (!p) {
      if (ms.open) closeModal(true);
      if (state.screen !== 'home') renderHome();
      finishWipe();
      return;
    }

    var m = null;
    if (r.mid) {
      m = p.flat.filter(function (x) { return x.id === r.mid; })[0] || null;
      if (!m) { location.replace('#/' + p.id); return; }
    }

    var fresh = state.screen !== p.id;
    if (fresh) {
      if (ms.open) closeModal(true);
      state.cameFromHome = !!prev && !prev.pid;
      renderProgram(p);
    }
    finishWipe();

    if (m) {
      if (ms.open && ms.program === p && !ms.closing) {
        if (ms.module !== m) swapModal(p, m, m.index > ms.module.index ? 1 : -1);
      } else {
        if (ms.open) closeModal(true);
        var pushed = !fresh && !!prev && prev.pid === p.id && !prev.mid;
        if (!pushed) {
          // прямая ссылка на модуль: прокручиваем страницу к его году
          var card = findCard(m.id);
          var section = card && card.closest('.year');
          if (section) section.scrollIntoView({ block: 'start' });
        }
        openModal(p, m, pushed);
      }
    } else if (ms.open) {
      closeModal();
    }
  }

  window.addEventListener('hashchange', router);
  router();
})();
