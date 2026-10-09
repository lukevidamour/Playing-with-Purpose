/* Playing with Purpose — interaction and motion.
   Everything essential works without this file: navigation is plain links, session
   summaries are native <details>, the spread links to the larger image, and all motion
   below is decoration over content that is already in place. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var header = document.querySelector('[data-header]');
  var headerH = function () { return header ? header.offsetHeight : 0; };

  /* ---------- Smooth scroll (wheel and trackpad only; native on touch and for reduced motion) ---------- */
  var lenis = null;
  if (!reduce && finePointer && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true, syncTouch: false });
  }
  var scrollToTarget = function (target) {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    window.setTimeout(function () { target.focus({ preventScroll: true }); }, lenis ? 1400 : 600);
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented || a.hasAttribute('data-lightbox')) return;
    var url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
    var target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    if (history.pushState) history.pushState(null, '', url.hash);
    scrollToTarget(target);
  });

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-menu]');
  var menuOpen = false;
  if (toggle && menu) {
    var label = toggle.querySelector('.site-nav__toggle-label');
    var desktop = window.matchMedia('(min-width: 900px)');
    var setOpen = function (open, returnFocus) {
      menuOpen = open;
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Close' : 'Menu';
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      if (lenis) { open ? lenis.stop() : lenis.start(); }
      if (open) { var first = menu.querySelector('a'); if (first) window.setTimeout(function () { first.focus(); }, 60); }
      else if (returnFocus) toggle.focus();
    };
    toggle.addEventListener('click', function () { setOpen(!menuOpen, true); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (!menuOpen) return;
      if (e.key === 'Escape') { setOpen(false, true); return; }
      if (e.key !== 'Tab') return;
      var items = [toggle].concat(Array.prototype.slice.call(menu.querySelectorAll('a, button')));
      var firstItem = items[0], lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus(); }
      else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
    });
    var onBreakpoint = function () { if (desktop.matches && menuOpen) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
  }

  /* ---------- Scroll-linked: header state, hero depth, parallax ---------- */
  var syncHeader = function (y) {
    if (!header) return;
    var moved = y > 40 || header.hasAttribute('data-solid');
    header.classList.toggle('is-solid', moved);
    header.classList.toggle('is-compact', moved);
  };

  var hero = document.querySelector('[data-hero]');
  var heroMedia = document.querySelector('[data-hero-media]');
  var heroInner = document.querySelector('[data-hero-inner]');
  var layers = Array.prototype.map.call(document.querySelectorAll('[data-parallax]'), function (el) {
    return { el: el, img: el.querySelector('img'), speed: parseFloat(el.getAttribute('data-parallax')) || 0.06 };
  });
  var selfLayers = Array.prototype.map.call(document.querySelectorAll('[data-parallax-self]'), function (el) {
    return { el: el, speed: parseFloat(el.getAttribute('data-parallax-self')) || 0.04 };
  });

  var scene = function (y) {
    var vh = window.innerHeight;
    if (hero && heroMedia && heroInner) {
      var h = hero.offsetHeight || vh;
      if (y < h) {
        var p = y / h;
        heroMedia.style.transform = 'translate3d(0,' + (y * 0.28).toFixed(1) + 'px,0) scale(' + (1 + p * 0.06).toFixed(4) + ')';
        heroInner.style.transform = 'translate3d(0,' + (-y * 0.1).toFixed(1) + 'px,0)';
        heroInner.style.opacity = clamp(1 - p * 1.3, 0, 1).toFixed(3);
      }
    }
    layers.forEach(function (l) {
      if (!l.img) return;
      var r = l.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      l.img.style.setProperty('--py', (-p * l.speed * r.height * 0.6).toFixed(1) + 'px');
    });
    selfLayers.forEach(function (l) {
      var r = l.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      l.el.style.transform = 'translate3d(0,' + (p * l.speed * 500).toFixed(1) + 'px,0)';
    });
  };

  var lastScene = -1;
  var onScroll = function (y) {
    syncHeader(y);
    if (!reduce && y !== lastScene) { scene(y); lastScene = y; }
  };
  if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
  else window.addEventListener('scroll', function () { window.requestAnimationFrame(function () { onScroll(window.scrollY); }); }, { passive: true });
  window.addEventListener('resize', function () { lastScene = -1; onScroll(window.scrollY); });
  onScroll(window.scrollY);

  /* ---------- Hero film: landscape screens only, started after the page has loaded ----------
     Phones keep the portrait cover image. Reduced motion and Save-Data keep the still frame. The film pauses
     when the hero is off screen, and the pause button stops it for good. */
  var heroVideo = document.querySelector('[data-hero-video]');
  var heroPause = document.querySelector('[data-hero-pause]');
  if (hero && heroVideo && heroVideo.canPlayType) {
    var landscape = window.matchMedia('(min-width: 768px) and (orientation: landscape)');
    var saveData = navigator.connection && navigator.connection.saveData;
    var filmStarted = false, filmReady = false, filmInView = true, filmPaused = false;
    var filmSrc = function () {
      var size = window.innerWidth * (window.devicePixelRatio || 1) > 1700 ? '1920' : '1280';
      var av1 = heroVideo.canPlayType('video/mp4; codecs="av01.0.08M.08"') === 'probably';
      return 'assets/video/hero-' + size + (av1 ? '-av1' : '') + '.mp4';
    };
    var filmSync = function () {
      var show = filmReady && landscape.matches;
      hero.classList.toggle('has-video', show);
      if (heroPause) heroPause.hidden = !show;
      if (!filmStarted) return;
      if (filmInView && !filmPaused && landscape.matches) {
        var playing = heroVideo.play();
        if (playing && playing.catch) playing.catch(function () {});
      } else heroVideo.pause();
    };
    var filmStart = function () {
      if (filmStarted || reduce || saveData || !landscape.matches) return;
      filmStarted = true;
      heroVideo.addEventListener('playing', function () { filmReady = true; filmSync(); }, { once: true });
      heroVideo.addEventListener('error', function () { filmReady = false; filmSync(); });
      heroVideo.src = filmSrc();
      filmSync();
    };
    var afterLoad = function () { window.setTimeout(filmStart, 400); };
    if (document.readyState === 'complete') afterLoad(); else window.addEventListener('load', afterLoad);
    if (landscape.addEventListener) landscape.addEventListener('change', function () { filmStart(); filmSync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { filmInView = entries[0].isIntersecting; filmSync(); }).observe(hero);
    }
    if (heroPause) heroPause.addEventListener('click', function () {
      filmPaused = !filmPaused;
      heroPause.classList.toggle('is-paused', filmPaused);
      heroPause.setAttribute('aria-label', filmPaused ? 'Play the background video' : 'Pause the background video');
      filmSync();
    });
  }

  /* ---------- Cursor: the system pointer stays; a faint ring eases behind it ---------- */
  var cursor = null, ring = null;
  var mx = -100, my = -100, rx = -100, ry = -100, cursorOn = false, pendingSample = false;
  if (finePointer && !reduce) {
    cursor = document.createElement('div');
    cursor.className = 'cursor is-hidden';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<div class="cursor__ring"><i></i></div>';
    document.body.appendChild(cursor);
    ring = cursor.querySelector('.cursor__ring');
    var DARK = '.theme-dark, .hero, .who__band, .closing, .site-header, .session-visual';
    var sample = function () {
      pendingSample = false;
      var under = document.elementFromPoint(mx, my);
      cursor.classList.toggle('is-ink', !(under && under.closest(DARK)));
    };
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!cursorOn) { cursorOn = true; rx = mx; ry = my; cursor.classList.remove('is-hidden'); }
      var t = e.target.closest ? e.target.closest('a, button, summary, [data-cursor]') : null;
      cursor.classList.toggle('is-hover', !!t);
      if (!pendingSample) { pendingSample = true; window.requestAnimationFrame(sample); }
    }, { passive: true });
    document.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });
    document.documentElement.addEventListener('mouseleave', function () { cursor.classList.add('is-hidden'); });
    document.documentElement.addEventListener('mouseenter', function () { if (cursorOn) cursor.classList.remove('is-hidden'); });
  }

  /* ---------- One frame loop drives smooth scroll and the cursor ring ---------- */
  var ease = 0.16;
  var frame = function (time) {
    if (lenis) lenis.raf(time);
    if (cursorOn) {
      rx += (mx - rx) * ease; ry += (my - ry) * ease;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    }
    window.requestAnimationFrame(frame);
  };
  if (lenis || cursor) window.requestAnimationFrame(frame);

  /* ---------- Session index ---------- */
  var list = document.querySelector('.session-list');
  if (list) {
    var items = Array.prototype.slice.call(list.querySelectorAll('.session'));
    var details = items.map(function (item) { return item.querySelector('details'); });
    var visuals = Array.prototype.slice.call(document.querySelectorAll('[data-visual]'));
    var visualNum = document.querySelector('[data-visual-num]');
    var visualTheme = document.querySelector('[data-visual-theme]');
    var toggleAll = document.querySelector('[data-sessions-toggle]');
    var current = null;
    var themeOf = function (item) { var el = item.querySelector('.session__theme'); return el ? el.lastChild.textContent.trim() : ''; };
    var activate = function (item) {
      var id = item.getAttribute('data-session');
      if (id === current) return;
      current = id;
      items.forEach(function (i) { i.classList.toggle('is-active', i === item); });
      visuals.forEach(function (img) { img.classList.toggle('is-active', img.getAttribute('data-visual') === id); });
      if (visualNum) visualNum.textContent = id;
      if (visualTheme) visualTheme.textContent = themeOf(item);
    };
    var syncToggleAll = function () {
      if (!toggleAll) return;
      var allOpen = details.every(function (d) { return d.open; });
      toggleAll.textContent = allOpen ? 'Close all summaries' : 'Open all summaries';
      toggleAll.setAttribute('aria-expanded', String(allOpen));
    };
    items.forEach(function (item, index) {
      item.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') activate(item); });
      item.querySelector('summary').addEventListener('focus', function () { activate(item); });
      details[index].addEventListener('toggle', function () { if (details[index].open) activate(item); syncToggleAll(); if (lenis) lenis.resize(); });
    });
    activate(items[0]);
    if (toggleAll) {
      syncToggleAll();
      toggleAll.addEventListener('click', function () {
        var open = !details.every(function (d) { return d.open; });
        details.forEach(function (d) { d.open = open; });
        syncToggleAll();
      });
    }
  }

  /* ---------- The course book: click to open it at the Session 1 spread ----------
     The cover turns about the spine, three real pages riffle over and the book settles open at
     Session 1. Each page is four hinged strips, so it bends as it turns; shading follows the angle.
     Pages at rest are flat images under the moving ones, swapped in as each page lands. */
  var bookBtn = document.querySelector('[data-book]');
  // The animation is an enhancement: it runs only where 3D transforms are supported, and otherwise the
  // book stays the still cover, with "Look inside Session 1" opening the spread full size.
  var book3d = window.CSS && CSS.supports && CSS.supports('transform-style', 'preserve-3d') && CSS.supports('perspective', '1px');
  if (bookBtn && book3d && 'IntersectionObserver' in window && window.Promise) (function () {
    var fig = bookBtn.closest('.book-mockup');
    var q = function (s) { return bookBtn.querySelector(s); };
    var stage = q('[data-book-3d]'), cover = q('[data-book-cover]'), right = q('[data-book-right]'), left = q('[data-book-left]');
    var glow = q('[data-book-glow]'), shadow = q('[data-book-shadow-closed]');
    var fallbackLink = document.querySelector('.book [data-lightbox]');
    var castR = right.firstElementChild, castL = left.firstElementChild;
    var hint = fig.querySelector('[data-book-hint]'), status = fig.querySelector('[data-book-status]');
    // Book pages (PDF page numbers) as [front, back] of each turning leaf: the title page, contents and
    // Session 1 opener pass by, and the book lands open at pages 7 and 8. Page 3 carries the signature, so it's skipped.
    var LEAVES = [[1, 2], [4, 5], [6, 7]], BASE = 8, STRIPS = 4, BEND = 13, TEASE = 14;
    var COVER_AT = 120, COVER_FOR = 1250, LEAF_AT = 660, LEAF_GAP = 200, LEAF_FOR = 1050;
    var D = LEAF_AT + LEAF_GAP * (LEAVES.length - 1) + LEAF_FOR;
    var t = 0, dir = -1, tease = 0, hover = false, running = false, last = 0, broken = false;
    var leaves = [], loading = null, bw = 0, openScale = 1, size = 640, shownR = 0, shownL = 0;
    var RAD = Math.PI / 180;
    // cubic-bezier easing, as in CSS: a slow lift, a quick pass over the top and a long, soft landing.
    var bezier = function (x1, y1, x2, y2) {
      var at = function (a, b, u) { return ((1 - 3 * b + 3 * a) * u + (3 * b - 6 * a)) * u * u + 3 * a * u; };
      return function (x) {
        if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
        var u = x;
        for (var n = 0; n < 6; n++) {
          var dx = at(x1, x2, u) - x, slope = (3 * (1 - 3 * x2 + 3 * x1) * u + 2 * (3 * x2 - 6 * x1)) * u + 3 * x1;
          if (Math.abs(dx) < 1e-4 || !slope) break;
          u = clamp(u - dx / slope, 0, 1);
        }
        return at(y1, y2, u);
      };
    };
    var easeCover = bezier(.6, 0, .22, 1), easePage = bezier(.5, 0, .24, 1);
    var phase = function (from, length) { return clamp((t - from) / length, 0, 1); };
    var src = function (n) { return 'assets/img/book-page-0' + n + '-' + size + '.webp'; };
    var bg = function (n) { return 'url("' + src(n) + '")'; };

    function measure() {
      bw = bookBtn.offsetWidth;
      openScale = Math.min(1, (document.documentElement.clientWidth - 32) / (bw * 2 + 16));
      stage.style.setProperty('--pw', bw + 'px');
    }

    function build() {
      if (loading) return loading;
      size = bw * (window.devicePixelRatio || 1) > 660 ? 960 : 640;
      leaves = LEAVES.map(function (pair) {
        var leaf = document.createElement('span'), segs = [], parent = null;
        leaf.className = 'book3d__leaf';
        for (var k = 0; k < STRIPS; k++) {
          var seg = k ? document.createElement('span') : leaf;
          if (k) { seg.className = 'book3d__seg'; parent.appendChild(seg); }
          seg.innerHTML = '<span class="book3d__face book3d__face--front"></span><span class="book3d__face book3d__face--back"></span>';
          seg.firstChild.style.backgroundImage = bg(pair[0]);
          seg.firstChild.style.backgroundPosition = 'calc(var(--pw) * ' + (-k / STRIPS) + ') 0';
          seg.lastChild.style.backgroundImage = bg(pair[1]);
          seg.lastChild.style.backgroundPosition = 'calc(var(--pw) * ' + ((k + 1 - STRIPS) / STRIPS) + ') 0';
          segs.push(seg); parent = seg;
        }
        stage.appendChild(leaf);
        return { el: leaf, segs: segs };
      });
      var pages = [BASE];
      LEAVES.forEach(function (pair) { pages.push(pair[0], pair[1]); });
      // If any page fails to load, the book falls back to the still cover and the full-size spread.
      loading = Promise.all(pages.map(function (n) {
        var img = new Image();
        img.src = src(n);
        return img.decode ? img.decode() : Promise.resolve();
      })).catch(function () {
        broken = true; hover = false;
        hint.textContent = 'Look inside';
        bookBtn.setAttribute('aria-label', 'Look inside the course book');
      });
      return loading;
    }

    function render() {
      var opened = easeCover(phase(COVER_AT, COVER_FOR));
      var lift = Math.sin(Math.PI * t / D);
      stage.style.transform = 'translate3d(' + (bw / 2 * opened).toFixed(2) + 'px,' + (-12 * lift).toFixed(2) + 'px,0) scale(' + (1 + (openScale - 1) * opened).toFixed(4) + ')';
      glow.style.opacity = (lift * lift * .55).toFixed(3);

      // Degrees each part has turned: 0 is lying on the right, 180 on the left.
      var coverTurn = 180 * opened + TEASE * tease * (1 - opened);
      var onRight = coverTurn > .05 && coverTurn < 90 ? Math.sin(coverTurn * RAD) : 0, onLeft = 0;
      cover.style.transform = coverTurn ? 'rotateY(' + (-coverTurn).toFixed(2) + 'deg)' : '';
      cover.style.zIndex = coverTurn < 90 ? 40 : 20;
      cover.style.setProperty('--shade', (.38 * Math.sin(coverTurn * RAD)).toFixed(3));
      // The shadow follows the cover's footprint: nothing on the left until the cover comes down there.
      shadow.style.left = (-100 * Math.max(0, -Math.cos(coverTurn * RAD))).toFixed(2) + '%';

      var topR = BASE, topL = 0;
      for (var i = LEAVES.length - 1; i >= 0; i--) {
        var p = phase(LEAF_AT + LEAF_GAP * i, LEAF_FOR), leaf = leaves[i];
        if (p <= 0) topR = LEAVES[i][0];
        if (p >= 1 && !topL) topL = LEAVES[i][1];
        if (!leaf) continue;
        var flying = p > 0 && p < 1;
        leaf.el.style.visibility = flying ? 'visible' : 'hidden';
        if (!flying) continue;
        // The free edge leads as the page lifts and trails as it settles.
        // Bend eases in and out too, so the edge lifts away and settles without a snap.
        var turn = 180 * easePage(p), bend = BEND * Math.sin(2 * Math.PI * p) * Math.sin(Math.PI * p);
        // Shade at each hinge from the angle of the strips either side; each strip fades between its two hinges.
        var shadeAt = function (j) {
          var a = j === 0 ? turn : j === STRIPS ? turn + bend * (STRIPS - 1) : turn + bend * (j - .5);
          return (.3 * Math.sin(clamp(a, 0, 180) * RAD)).toFixed(3);
        };
        for (var k = 0; k < STRIPS; k++) {
          var seg = leaf.segs[k];
          seg.style.transform = 'rotateY(' + (-(k ? bend : turn)).toFixed(2) + 'deg)';
          seg.style.setProperty('--s0', shadeAt(k));
          seg.style.setProperty('--s1', shadeAt(k + 1));
        }
        var mid = turn + bend * (STRIPS - 1) / 2;
        leaf.el.style.zIndex = mid < 90 ? 39 - i : 22 + i;
        if (mid < 90) onRight = Math.max(onRight, Math.sin(mid * RAD));
        else onLeft = Math.max(onLeft, Math.sin(mid * RAD));
      }
      if (topR !== shownR) { right.style.backgroundImage = bg(topR); shownR = topR; }
      if (topL !== shownL) { left.style.backgroundImage = topL ? bg(topL) : ''; left.style.visibility = topL ? 'visible' : 'hidden'; shownL = topL; }
      castR.style.opacity = (onRight * .45).toFixed(3);
      castL.style.opacity = (onLeft * .45).toFixed(3);
      if (!topL && coverTurn >= 179.9) cover.style.setProperty('--shade', (onLeft * .35).toFixed(3));
    }

    function tick() {
      var now = performance.now(), dt = Math.min(50, now - last);
      last = now;
      t = clamp(t + dir * dt * (dir > 0 ? 1 : 1.35), 0, D);
      var aim = hover && dir < 0 && t === 0 ? 1 : 0;
      tease += (aim - tease) * .12;
      if (Math.abs(aim - tease) < .002) tease = aim;
      render();
      if ((dir > 0 ? t < D : t > 0) || tease !== aim) requestAnimationFrame(tick);
      else running = false;
    }
    function run() {
      if (running) return;
      running = true; last = performance.now();
      requestAnimationFrame(tick);
    }

    function fallBack() {
      broken = true; running = false; t = 0; dir = -1; tease = 0;
      [stage, cover, shadow, glow, right, left].forEach(function (el) { el.removeAttribute('style'); });
      leaves.forEach(function (leaf) { leaf.el.style.visibility = 'hidden'; });
      fig.classList.remove('is-open');
      bookBtn.setAttribute('aria-expanded', 'false');
      bookBtn.setAttribute('aria-label', 'Look inside the course book');
      hint.textContent = 'Look inside';
      if (fallbackLink) fallbackLink.click();
    }
    var safely = function (fn) { return function () { try { return fn.apply(this, arguments); } catch (err) { fallBack(); } }; };
    render = safely(render);
    tick = safely(tick);

    function setOpen(open) {
      dir = open ? 1 : -1;
      fig.classList.toggle('is-open', open);
      bookBtn.setAttribute('aria-expanded', String(open));
      bookBtn.setAttribute('aria-label', open ? 'Close the course book' : 'Open the course book to look inside');
      hint.textContent = open ? 'Close the book' : 'Open the book';
      status.textContent = open ? 'The book is open at Session 1, on the opening discussion and Biblical truth pages.' : 'The book is closed.';
      if (reduce) {
        t = open ? D : 0; render();
        if (stage.animate) stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240 });
        return;
      }
      // Start once the pages are decoded (they're normally fetched well before the book is in view).
      Promise.race([build(), new Promise(function (r) { window.setTimeout(r, 1500); })]).then(function () {
        if (broken) fallBack(); else run();
      });
    }

    bookBtn.addEventListener('click', function () {
      if (broken) { if (fallbackLink) fallbackLink.click(); return; }
      measure(); build(); setOpen(dir < 0);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dir > 0) setOpen(false); });
    if (finePointer && !reduce) {
      // A gentle hint on hover: the cover lifts a little at its edge.
      bookBtn.addEventListener('mouseenter', function () { if (broken) return; hover = true; build(); run(); });
      bookBtn.addEventListener('mouseleave', function () { hover = false; run(); });
    }
    window.addEventListener('resize', function () { measure(); render(); });
    var near = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { measure(); build(); near.disconnect(); }
    }, { rootMargin: '800px 0px' });
    near.observe(bookBtn);
    measure();
    fig.classList.add('is-ready');
  })();

  /* ---------- Spread lightbox ---------- */
  var dialog = document.querySelector('[data-lightbox-dialog]');
  if (dialog && typeof dialog.showModal === 'function') {
    var lbImg = dialog.querySelector('[data-lightbox-img]');
    var lbCaption = dialog.querySelector('[data-lightbox-caption]');
    var lbClose = dialog.querySelector('[data-lightbox-close]');
    var opener = null;
    Array.prototype.forEach.call(document.querySelectorAll('[data-lightbox]'), function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        opener = link;
        lbImg.src = link.getAttribute('data-lightbox');
        lbImg.alt = link.getAttribute('data-lightbox-alt') || '';
        lbCaption.textContent = link.getAttribute('data-lightbox-caption') || '';
        dialog.showModal();
        document.body.classList.add('menu-open');
        if (lenis) lenis.stop();
        if (cursor) cursor.classList.add('is-hidden');   // the dialog sits in the top layer, above the ring
        lbClose.focus();
      });
    });
    lbClose.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog || e.target.classList.contains('lightbox__inner')) dialog.close(); });
    dialog.addEventListener('close', function () {
      document.body.classList.remove('menu-open');
      if (lenis) lenis.start();
      if (cursorOn) cursor.classList.remove('is-hidden');
      if (opener) opener.focus();
    });
  }

  /* ---------- Copy email address ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (button) {
    var status = document.getElementById(button.getAttribute('aria-describedby') || '');
    var original = button.textContent;
    button.hidden = false;
    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy');
      var done = function (ok) {
        button.textContent = ok ? 'Copied' : original;
        if (status) status.textContent = ok ? 'Email address copied to your clipboard.' : 'Copying is not available here. Please select the address above.';
        window.setTimeout(function () { button.textContent = original; if (status) status.textContent = ''; }, 2600);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        var field = document.createElement('textarea');
        field.value = text; field.setAttribute('readonly', ''); field.style.position = 'fixed'; field.style.opacity = '0';
        document.body.appendChild(field); field.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        document.body.removeChild(field);
        done(ok);
      }
    });
  });

  /* ---------- Quotes read themselves, a word at a time ---------- */
  var readEls = document.querySelectorAll('[data-read]');
  if (readEls.length && 'IntersectionObserver' in window && !reduce) {
    Array.prototype.forEach.call(readEls, function (el) {
      var n = 0;
      var wrap = function (node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 1) { wrap(child); return; }
          if (child.nodeType !== 3) return;
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            w.className = 'w'; w.textContent = part; w.style.setProperty('--w', n++);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        });
      };
      wrap(el);
      // About five words a second, a comfortable reading pace; long quotes speed up to finish in about 3.4 seconds.
      el.style.setProperty('--step', Math.min(190, 3400 / Math.max(n, 1)).toFixed(0) + 'ms');
    });
    root.classList.add('read-ready');
    var readIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-read'); readIO.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.6 });
    Array.prototype.forEach.call(readEls, function (el) { readIO.observe(el); });
  }

  /* ---------- Reveals: once, with a gentle stagger for lists ---------- */
  var revealEls = document.querySelectorAll('[data-reveal], [data-reveal-group]');
  if (revealEls.length && 'IntersectionObserver' in window && !reduce) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-reveal-group]'), function (g) {
      Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i); });
    });
    root.classList.add('reveal-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    Array.prototype.forEach.call(revealEls, function (el) { io.observe(el); });
  }
})();
