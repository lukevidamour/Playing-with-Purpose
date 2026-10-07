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
