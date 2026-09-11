/* ============================================================
   DENTIXCY — SCRIPT
   Scroll reveals · 3D tilt · Nav state · Smooth interactions
   ============================================================ */

'use strict';

/* ── UTILITY ──────────────────────────────────────────────── */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const lerp  = (a, b, t) => a + (b - a) * t;

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

/* ── 1. NAV SCROLL STATE ──────────────────────────────────── */
(function initNav() {
  const nav       = document.getElementById('nav');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (!nav) return;

  // Scroll shadow
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      // Prevent body scroll when menu is open
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }
})();

/* ── 2. SCROLL REVEAL ─────────────────────────────────────── */
(function initReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  // Immediately visible if reduced motion
  if (prefersReducedMotion) {
    revealEls.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach(el => observer.observe(el));
})();

/* ── 3. CARD STAGGER REVEAL ───────────────────────────────── */
(function initCardReveal() {
  const cards = document.querySelectorAll('.card, .testimonial-card, .why__feature, .process__step');
  if (!cards.length || prefersReducedMotion) return;

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(28px)';
    card.style.transition = 'opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)';
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Small delay per sibling index for stagger
          const siblings = [...entry.target.parentElement.children];
          const idx = siblings.indexOf(entry.target);
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }, idx * 80);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
  );

  cards.forEach(card => observer.observe(card));
})();

/* ── 4. 3D TILT ON [data-tilt] ────────────────────────────── */
(function initTilt() {
  if (prefersReducedMotion) return;

  const MAX_TILT    = 10;   // degrees
  const MAX_LIFT    = 8;    // px translateY
  const PERSPECTIVE = 900;  // px

  const tiltEls = document.querySelectorAll('[data-tilt]');

  tiltEls.forEach(el => {
    let rafId = null;
    let currentRx = 0, currentRy = 0, currentLift = 0;
    let targetRx  = 0, targetRy  = 0, targetLift  = 0;

    const lerps = () => {
      currentRx   = lerp(currentRx,   targetRx,   0.12);
      currentRy   = lerp(currentRy,   targetRy,   0.12);
      currentLift = lerp(currentLift, targetLift, 0.12);

      el.style.transform =
        `perspective(${PERSPECTIVE}px) rotateX(${currentRx}deg) rotateY(${currentRy}deg) translateY(${-currentLift}px)`;

      // Keep lerping until settled
      if (
        Math.abs(currentRx - targetRx) > 0.01 ||
        Math.abs(currentRy - targetRy) > 0.01 ||
        Math.abs(currentLift - targetLift) > 0.01
      ) {
        rafId = requestAnimationFrame(lerps);
      } else {
        el.style.transform =
          `perspective(${PERSPECTIVE}px) rotateX(${targetRx}deg) rotateY(${targetRy}deg) translateY(${-targetLift}px)`;
        rafId = null;
      }
    };

    const onMove = (e) => {
      const rect    = el.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const nx      = (clientX - rect.left) / rect.width  - 0.5; // -0.5 to 0.5
      const ny      = (clientY - rect.top)  / rect.height - 0.5;

      targetRy   =  clamp(nx * MAX_TILT * 2, -MAX_TILT, MAX_TILT);
      targetRx   = -clamp(ny * MAX_TILT * 2, -MAX_TILT, MAX_TILT);
      targetLift = MAX_LIFT;

      // Update mouse position CSS vars for the glow radial-gradient
      el.style.setProperty('--mouse-x', `${((clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty('--mouse-y', `${((clientY - rect.top)  / rect.height) * 100}%`);

      if (!rafId) rafId = requestAnimationFrame(lerps);
    };

    const onLeave = () => {
      targetRx   = 0;
      targetRy   = 0;
      targetLift = 0;
      if (!rafId) rafId = requestAnimationFrame(lerps);
    };

    el.addEventListener('mousemove',  onMove);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('touchmove',  onMove, { passive: true });
    el.addEventListener('touchend',   onLeave);
  });
})();

/* ── 5. HERO ORB PARALLAX ON MOUSE ───────────────────────── */
(function initOrbParallax() {
  if (prefersReducedMotion) return;

  const orbs = document.querySelectorAll('.hero__orb');
  if (!orbs.length) return;

  const depths = [0.025, 0.045, 0.035]; // parallax factor per orb
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  document.addEventListener('mousemove', (e) => {
    targetX = (e.clientX / window.innerWidth  - 0.5) * 2; // -1 to 1
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const tick = () => {
    currentX = lerp(currentX, targetX, 0.06);
    currentY = lerp(currentY, targetY, 0.06);

    orbs.forEach((orb, i) => {
      const d = depths[i] || 0.03;
      const tx = currentX * window.innerWidth  * d;
      const ty = currentY * window.innerHeight * d;

      // Orb 1 has an existing translateX(-50%) from CSS, so we include it
      if (i === 0) {
        orb.style.transform = `translateX(calc(-50% + ${tx}px)) translateY(${ty}px)`;
      } else {
        orb.style.transform = `translateX(${tx}px) translateY(${ty}px)`;
      }
    });

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* ── 6. SMOOTH ANCHOR SCROLL ─────────────────────────────── */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      const navHeight = document.getElementById('nav')?.offsetHeight || 68;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

      window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  });
})();

/* ── 7. FLOATING WA BUTTON — HIDE ON CTA BAND ────────────── */
(function initWaFloat() {
  const waBtn   = document.querySelector('.wa-float');
  const ctaBand = document.querySelector('.cta-band');
  if (!waBtn || !ctaBand) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      waBtn.style.opacity    = entry.isIntersecting ? '0' : '1';
      waBtn.style.pointerEvents = entry.isIntersecting ? 'none' : 'auto';
      waBtn.style.transform  = entry.isIntersecting ? 'scale(0.7)' : '';
    },
    { threshold: 0.4 }
  );

  waBtn.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
  observer.observe(ctaBand);
})();

/* ── 8. HERO HEADLINE CURSOR SPARKLE ─────────────────────── */
(function initSparkle() {
  if (prefersReducedMotion) return;

  const hero = document.querySelector('.hero__inner');
  if (!hero) return;

  const createSparkle = (x, y) => {
    const s = document.createElement('span');
    s.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--teal-400);
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
      transition: transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.6s ease;
    `;
    document.body.appendChild(s);

    // Scatter in random direction
    const angle  = Math.random() * Math.PI * 2;
    const dist   = 20 + Math.random() * 40;
    const tx     = Math.cos(angle) * dist;
    const ty     = Math.sin(angle) * dist;

    requestAnimationFrame(() => {
      s.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`;
      s.style.opacity   = '0';
    });

    setTimeout(() => s.remove(), 700);
  };

  let lastSparkle = 0;
  hero.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastSparkle < 90) return; // throttle
    lastSparkle = now;
    createSparkle(e.clientX, e.clientY);
  }, { passive: true });
})();

/* ── 9. SECTION ACTIVE NAV HIGHLIGHT ─────────────────────── */
(function initActiveNav() {
  const sections  = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav__links a');
  if (!sections.length || !navLinks.length) return;

  const activateLink = (id) => {
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      link.style.color      = href === `#${id}` ? 'var(--teal-600)' : '';
      link.style.background = href === `#${id}` ? 'var(--teal-50)'  : '';
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) activateLink(entry.target.id);
      });
    },
    { rootMargin: '-50% 0px -45% 0px' }
  );

  sections.forEach(sec => observer.observe(sec));
})();

/* ── 10. COUNTER ANIMATION FOR HERO STATS ────────────────── */
(function initCounters() {
  if (prefersReducedMotion) return;

  const stats = document.querySelectorAll('.hero__stat-num');
  if (!stats.length) return;

  const animateCount = (el, target, suffix = '') => {
    const start    = 0;
    const duration = 1800;
    const startTs  = performance.now();

    const step = (ts) => {
      const progress = Math.min((ts - startTs) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      // Preserve inner HTML structure (the .hero__stat-plus span)
      const plus = el.querySelector('.hero__stat-plus');
      if (plus) {
        el.childNodes[0].textContent = current.toLocaleString('en-IN');
      } else {
        el.textContent = current % 1 === 0
          ? current.toLocaleString('en-IN')
          : current.toFixed(1);
        if (suffix) el.textContent += suffix;
      }
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el   = entry.target;
        const text = el.childNodes[0]?.textContent?.trim() || el.textContent;
        const num  = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) animateCount(el, num);
        observer.unobserve(el);
      });
    },
    { threshold: 0.8 }
  );

  stats.forEach(el => observer.observe(el));
})();
