// رِفق — السياحة والرحلات في العُلا: scroll-driven 3D.
// Same engine as the Hajj page, a different place:
//   1) Jabal AlFil (Elephant Rock): visitors around the rock, and the group with its zone;
//   2) the AlUla map: the Old Town, Dadan, Ikmah, Elephant Rock, Hegra and Maraya at their
//      real relative positions (OpenStreetMap coordinates, km from the Old Town).
// Floating phones / screens / logo carry the product story on top. No pricing on this page.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const css = getComputedStyle(document.documentElement);
const tok = (n) => css.getPropertyValue('--' + n).trim();
const params = new URLSearchParams(location.search);
const STILL = params.has('still');
const REDUCED = STILL || matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, f) => a + (b - a) * f;
const smooth = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const win = (p, a, b) => smooth(clamp((p - a) / (b - a), 0, 1));
const FONT = '"IBM Plex Sans Arabic", system-ui, sans-serif';

/* ================================================================== */
/* Page UI (works without WebGL)                                        */
/* ================================================================== */
const sections = $$('.sec');
const N = sections.length;
const rail = $('.rail');
sections.forEach((s) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<i></i><span>${s.dataset.title}</span>`;
  b.setAttribute('aria-label', s.dataset.title);
  b.addEventListener('click', () => go(stopsOf(sections.indexOf(s))[0]));
  rail.appendChild(b);
});
const railBtns = $$('button', rail);

$$('.tbl td:not(:first-child)').forEach((td) => {
  const t = td.textContent.trim();
  if (t.startsWith('✓')) td.innerHTML = `<span class="yes"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg><span class="sr">نعم</span>${t.slice(1).trim()}</span>`;
  else if (t === '—') td.innerHTML = '<span class="no" aria-label="لا">—</span>';
  else td.innerHTML = `<span class="note">${t}</span>`;
});

const io = new IntersectionObserver(
  (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
  { rootMargin: '0px 0px -6% 0px' },
);
$$('.rv').forEach((el) => (REDUCED ? el.classList.add('in') : io.observe(el)));

// scroll → continuous section index t, plus per-section progress p (for the scrubbed stories)
let A = [];
function measure() {
  const vh = innerHeight;
  A = sections.map((s) => {
    const top = s.getBoundingClientRect().top + scrollY;
    const h = s.offsetHeight;
    return { top, h, hs: top - 0.25 * vh, he: top + h - 0.75 * vh, steps: +(s.dataset.steps || 1), span: Math.max(1, h - vh) };
  });
}
function scrollT(y) {
  for (let i = 0; i < N; i++) {
    const a = A[i];
    if (y <= a.he || i === N - 1) {
      if (y >= a.hs || i === 0) return i;
      const pr = A[i - 1];
      return i - 1 + clamp((y - pr.he) / Math.max(1, a.hs - pr.he), 0, 1);
    }
  }
  return N - 1;
}
const secP = (i, y) => clamp((y - A[i].top) / A[i].span, 0, 1);
function stopsOf(i) {
  const a = A[i];
  if (a.steps <= 1) return [i === 0 ? 0 : a.top];
  return Array.from({ length: a.steps }, (_, k) => a.top + (a.span * k) / (a.steps - 1));
}
const allStops = () => sections.flatMap((_, i) => stopsOf(i));
function go(y) {
  window.scrollTo({ top: Math.round(y), behavior: REDUCED ? 'auto' : 'smooth' });
}
function step(dir) {
  const y = scrollY;
  const st = allStops();
  if (dir > 0) go(st.find((s) => s > y + 8) ?? st[st.length - 1]);
  else go([...st].reverse().find((s) => s < y - 8) ?? 0);
}
$('#next').addEventListener('click', () => step(1));
$('#prev').addEventListener('click', () => step(-1));
$('#fs').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
});
addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'summary') return;
  const next = ['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'Enter'];
  const prev = ['ArrowUp', 'ArrowLeft', 'PageUp'];
  if (next.includes(e.key) && !e.shiftKey) { e.preventDefault(); step(1); }
  else if (prev.includes(e.key) || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); step(-1); }
  else if (e.key === 'Home') { e.preventDefault(); go(0); }
  else if (e.key === 'End') { e.preventDefault(); go(allStops().pop()); }
  else if (e.key === 'f' || e.key === 'F') $('#fs').click();
});

measure();
addEventListener('resize', measure);
addEventListener('load', measure);

const bar = $('.progress i');
const countEl = $('#count');
let tTarget = 0;
let tCur = 0;
let lastActive = -1;
const pTarget = new Float32Array(N);
const pCur = new Float32Array(N);
function updateUI() {
  const y = scrollY;
  tTarget = scrollT(y);
  for (let i = 0; i < N; i++) pTarget[i] = secP(i, y);
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.width = (100 * clamp(y / Math.max(1, max), 0, 1)).toFixed(2) + '%';
  const active = Math.round(tTarget);
  if (active !== lastActive) {
    railBtns.forEach((b, i) => b.classList.toggle('on', i === active));
    countEl.textContent = `${active + 1} / ${N}`;
    lastActive = active;
  }
}
addEventListener('scroll', updateUI, { passive: true });
updateUI();

// story captions that follow the scrubbed progress
const SOS_T = { out: 0.1, sos: 0.35, sent: 0.45, way: 0.62, done: 0.9 };
const sosSteps = $$('#sos-steps li');
const DAY_TEXT = [
  'أزقّة ضيقة، وأسهل مكان يتفرّق فيه الناس',
  'موقعان متجاوران، وتنقّل بينهما',
  'وقت حر للتصوير، ثم تجمّع في موعد محدد',
  'أبعد محطة، ومساحة مفتوحة واسعة',
  'تجمّع المساء وعودة الحافلات',
];
const NSTOP = DAY_TEXT.length;
const dayChips = $$('#day-chips > div');
const dayText = $('#day-text');
let lastDay = -2;
function storyUI(pSos, pDays) {
  sosSteps.forEach((li) => li.classList.toggle('on', pSos >= SOS_T[li.dataset.k]));
  const d = pDays <= 0.001 ? -1 : Math.min(NSTOP - 1, Math.floor(pDays * NSTOP - 1e-6));
  if (d !== lastDay) {
    dayChips.forEach((c, i) => c.classList.toggle('on', i === d));
    dayText.textContent = d < 0 ? 'المجموعة على الخريطة من أول محطة إلى آخرها.' : DAY_TEXT[d];
    lastDay = d;
  }
}
const IDX = Object.fromEntries(sections.map((s, i) => [s.id, i]));
// step lists that follow their section's progress (principles, bus)
const nearLists = $$('.steps.near').map((ol) => ({ items: $$('li', ol), sec: sections.indexOf(ol.closest('.sec')) }));
function nearUI() {
  nearLists.forEach(({ items, sec }) => {
    const k = Math.round(pTarget[sec] * (items.length - 1));
    items.forEach((li, i) => li.classList.toggle('on', i === k));
  });
}
addEventListener('scroll', nearUI, { passive: true });
nearUI();
const SITE = document.body.dataset.mode === 'site';

/* ================================================================== */
/* Canvas drawings                                                      */
/* ================================================================== */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.direction = 'rtl';
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const font = (w, s) => `${w} ${s}px ${FONT}`;
function rr(g, x, y, w, h, r, fill, stroke) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
}
function txt(g, s, x, y, f, color, align = 'right') {
  g.font = f;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillText(s, x, y);
  return g.measureText(s).width;
}
function pill(g, s, xRight, y, f, bg, fg) {
  g.font = f;
  const w = g.measureText(s).width + 28;
  rr(g, xRight - w, y - 18, w, 36, 18, bg);
  txt(g, s, xRight - w / 2, y + 1, f, fg, 'center');
  return w;
}
function wordmarkTex() {
  return canvasTex(1024, 1024, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    txt(g, 'رِفق', W / 2, H / 2 + 40, font(700, 400), '#ffffff', 'center');
  });
}
/* Tourism app screens — drawn here, so no Hajj screenshot appears on this page */
const PW = 480, PH = 1038;
const AR_D = '٠١٢٣٤٥٦٧٨٩';
const ar = (s) => String(s).replace(/\d/g, (d) => AR_D[d]);
const TOUR_NAV = ['الرئيسية', 'رحلتي', 'هويتي', 'الخريطة', 'المزيد'];
const GUIDE_NAV = ['المجموعة', 'الخريطة', 'الحضور', 'البرنامج', 'المزيد'];
const STOP_NAMES = ['البلدة القديمة', 'دادان وعِكمة', 'جبل الفيل', 'الحِجر', 'مرايا'];
const STOP_TIMES = ['08:30', '10:30', '13:00', '15:00', '19:00'];
function screenBase(g, title, sub) {
  g.fillStyle = tok('lav-50');
  g.fillRect(0, 0, PW, PH);
  txt(g, title, 452, 74, font(700, 30), tok('ink'));
  if (sub) txt(g, sub, 452, 114, font(500, 17), tok('slate'));
}
function navBar(g, items, active) {
  g.fillStyle = tok('white');
  g.fillRect(0, 942, PW, 96);
  g.fillStyle = tok('lav-100');
  g.fillRect(0, 942, PW, 2);
  const stp = PW / items.length;
  items.forEach((s, i) => {
    const x = PW - stp / 2 - i * stp;
    const on = i === active;
    rr(g, x - 26, 958, 52, 32, 16, on ? tok('primary') : tok('lav-50'));
    g.fillStyle = on ? tok('white') : tok('slate');
    g.beginPath();
    g.arc(x, 974, 5, 0, Math.PI * 2);
    g.fill();
    txt(g, s, x, 1010, font(on ? 700 : 500, 15), on ? tok('primary') : tok('slate'), 'center');
  });
}
const card = (g, y, h, line = 'lav-100') => rr(g, 24, y, 432, h, 24, tok('white'), tok(line));
const CHIP = { ok: ['success-50', 'success'], out: ['warning-50', 'warning-ink'], sos: ['danger-50', 'danger-ink'], info: ['lav-100', 'primary-dark'] };
function chipL(g, s, xLeft, y, kind, size = 15) {
  g.font = font(700, size);
  const w = g.measureText(s).width + 28;
  return pill(g, s, xLeft + w, y, font(700, size), tok(CHIP[kind][0]), tok(CHIP[kind][1]));
}
function avatar(g, x, y, r, letter) {
  g.fillStyle = tok('lav-100');
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  txt(g, letter, x, y + 2, font(700, r * 0.9), tok('primary'), 'center');
}
function tHome() {
  return canvasTex(PW, PH, (g) => {
    screenBase(g, 'أهلاً بك في العُلا', ar('مجموعة 07 · جولة يوم كامل'));
    rr(g, 24, 146, 432, 128, 24, tok('success-50'));
    g.fillStyle = tok('success');
    g.beginPath();
    g.arc(424, 192, 10, 0, Math.PI * 2);
    g.fill();
    txt(g, 'أنت في أمان', 400, 192, font(700, 27), tok('success'));
    txt(g, ar('داخل نطاق مجموعتك · آخر تحديث قبل 12 ثانية'), 432, 240, font(500, 16.5), tok('ink-2'));
    card(g, 296, 236);
    txt(g, 'المحطة التالية', 432, 336, font(600, 17), tok('slate'));
    txt(g, 'جبل الفيل', 432, 384, font(700, 34), tok('primary-dark'));
    txt(g, ar('التجمّع عند الحافلة 2'), 432, 432, font(500, 18), tok('ink-2'));
    pill(g, ar('13:00 · بعد 25 دقيقة'), 432, 486, font(700, 17), tok('lav-100'), tok('primary-dark'));
    card(g, 554, 116);
    avatar(g, 412, 612, 30, 'خ');
    txt(g, 'مرشدك: خالد', 364, 596, font(700, 21), tok('ink'));
    txt(g, 'تواصل معه من التطبيق', 364, 632, font(500, 16), tok('slate'));
    rr(g, 24, 694, 432, 92, 26, tok('danger-ink'));
    txt(g, 'استغاثة', 240, 740, font(700, 30), tok('white'), 'center');
    txt(g, 'ضغطة واحدة تصل للمرشد وغرفة العمليات', 240, 822, font(500, 16), tok('slate'), 'center');
    navBar(g, TOUR_NAV, 0);
  });
}
function tTrip() {
  return canvasTex(PW, PH, (g) => {
    screenBase(g, 'رحلتي اليوم', ar('جولة العُلا · 5 محطات'));
    const x = 424, y0 = 200, dy = 148;
    rr(g, 24, y0 + 2 * dy - 54, 432, 120, 22, tok('white'), tok('lav-100'));
    g.fillStyle = tok('lav-100');
    g.fillRect(x - 2, y0, 4, dy * 4);
    g.fillStyle = tok('success');
    g.fillRect(x - 2, y0, 4, dy * 2);
    STOP_NAMES.forEach((n, i) => {
      const y = y0 + i * dy;
      const st = i < 2 ? 'done' : i === 2 ? 'now' : 'next';
      g.beginPath();
      g.arc(x, y, 15, 0, Math.PI * 2);
      g.fillStyle = st === 'done' ? tok('success') : st === 'now' ? tok('primary') : tok('white');
      g.fill();
      if (st === 'next') { g.strokeStyle = tok('lav-100'); g.lineWidth = 3; g.stroke(); }
      if (st === 'done') {
        g.strokeStyle = tok('white');
        g.lineWidth = 3.5;
        g.beginPath();
        g.moveTo(x - 6, y);
        g.lineTo(x - 1.5, y + 5);
        g.lineTo(x + 7, y - 5);
        g.stroke();
      }
      txt(g, n, 390, y - 10, font(700, 23), st === 'next' ? tok('ink-2') : tok('ink'));
      const meta = st === 'done' ? 'تمّت' : st === 'now' ? 'التجمّع عند الحافلة 2' : 'التحرك ' + STOP_TIMES[i];
      txt(g, ar(meta), 390, y + 26, font(500, 16), tok('slate'));
      txt(g, ar(STOP_TIMES[i]), 48, y - 10, font(700, 18), st === 'now' ? tok('primary') : tok('slate'), 'left');
      if (st === 'now') chipL(g, 'الآن', 44, y + 26, 'info');
    });
    navBar(g, TOUR_NAV, 1);
  });
}
function tId() {
  return canvasTex(PW, PH, (g) => {
    screenBase(g, 'هويتي الرقمية', 'اعرضها عند صعود الحافلة');
    card(g, 146, 700);
    const gr = g.createLinearGradient(456, 146, 24, 274);
    gr.addColorStop(0, tok('primary'));
    gr.addColorStop(1, tok('sky-600'));
    g.beginPath();
    g.roundRect(24, 146, 432, 128, [24, 24, 0, 0]);
    g.fillStyle = gr;
    g.fill();
    txt(g, 'رِفق', 424, 194, font(700, 34), tok('white'));
    txt(g, 'هوية السائح', 424, 238, font(500, 18), tok('white'));
    txt(g, 'جولة العُلا', 56, 210, font(600, 18), tok('white'), 'left');
    txt(g, 'سارة أحمد', 240, 326, font(700, 30), tok('ink'), 'center');
    txt(g, ar('مجموعة 07 · مقعد 14 · الحافلة 2'), 240, 368, font(500, 18), tok('slate'), 'center');
    // a decorative code (not a real one)
    const n = 25, q = 10, x0 = 240 - (n * q) / 2, y0 = 404;
    const finder = (i, j) => (i < 8 && j < 8) || (i >= n - 8 && j < 8) || (i < 8 && j >= n - 8);
    g.fillStyle = tok('ink');
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (!finder(i, j) && hash2(i * 7 + 3, j * 13 + 5) > 0.5) g.fillRect(x0 + i * q, y0 + j * q, q, q);
    }
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([i, j]) => {
      const x = x0 + i * q, y = y0 + j * q;
      g.fillStyle = tok('ink');
      g.fillRect(x, y, 7 * q, 7 * q);
      g.fillStyle = tok('white');
      g.fillRect(x + q, y + q, 5 * q, 5 * q);
      g.fillStyle = tok('ink');
      g.fillRect(x + 2 * q, y + 2 * q, 3 * q, 3 * q);
    });
    txt(g, 'صالحة اليوم', 240, 700, font(700, 18), tok('success'), 'center');
    rr(g, 64, 740, 352, 64, 20, tok('lav-50'));
    txt(g, 'المرشد يمسحها عند باب الحافلة', 240, 772, font(600, 17), tok('primary-dark'), 'center');
    navBar(g, TOUR_NAV, 2);
  });
}
function tAttend() {
  return canvasTex(PW, PH, (g) => {
    screenBase(g, ar('الحافلة 2'), ar('مجموعة 07 · التحرك إلى جبل الفيل'));
    card(g, 146, 176);
    txt(g, 'صعدوا', 432, 186, font(600, 18), tok('slate'));
    txt(g, ar('48 من 50'), 432, 240, font(700, 44), tok('primary'));
    rr(g, 48, 290, 384, 12, 6, tok('lav-100'));
    rr(g, 48 + 384 * 0.04, 290, 384 * 0.96, 12, 6, tok('primary'));
    txt(g, 'التحرك بعد', 123, 186, font(600, 16), tok('slate'), 'center');
    rr(g, 48, 212, 150, 52, 18, tok('primary-dark'));
    txt(g, ar('04:12'), 123, 239, font(700, 28), tok('white'), 'center');
    [['سارة أحمد', 'صعدت', 'ok'], ['نورة سالم', 'صعدت', 'ok'], ['فهد علي', 'لم يصل · 120 م', 'out'], ['ليلى حسن', 'تحتاج مرافقاً', 'info'], ['عمر يوسف', 'لم يصل · 300 م', 'out']].forEach(([n, s, k], i) => {
      const y = 342 + i * 84;
      card(g, y, 72);
      avatar(g, 416, y + 36, 20, n[0]);
      txt(g, n, 384, y + 36, font(700, 19), tok('ink'));
      chipL(g, ar(s), 44, y + 36, k);
    });
    rr(g, 24, 778, 432, 74, 22, tok('primary'));
    txt(g, 'مسح الباركود', 240, 815, font(700, 22), tok('white'), 'center');
    navBar(g, GUIDE_NAV, 2);
  });
}
function tProgram() {
  return canvasTex(PW, PH, (g) => {
    screenBase(g, 'برنامج اليوم', ar('مجموعة 07 · 50 سائحاً · المرشد خالد'));
    const meet = ['البوابة الرئيسية', 'موقف الزوار', 'الحافلة 2', 'مركز الزوار', 'المدخل الرئيسي'];
    STOP_NAMES.forEach((n, i) => {
      const y = 146 + i * 118;
      const st = i < 2 ? 'done' : i === 2 ? 'now' : 'next';
      card(g, y, 104, st === 'now' ? 'primary' : 'lav-100');
      txt(g, n, 432, y + 36, font(700, 22), tok('ink'));
      txt(g, ar('التجمّع: ' + meet[i]), 432, y + 72, font(500, 16), tok('slate'));
      txt(g, ar(STOP_TIMES[i]), 48, y + 36, font(700, 19), st === 'now' ? tok('primary') : tok('slate'), 'left');
      chipL(g, st === 'done' ? 'تمّت' : st === 'now' ? 'الآن' : 'التالي', 44, y + 72, st === 'done' ? 'ok' : 'info');
    });
    rr(g, 24, 760, 432, 74, 22, tok('primary'));
    txt(g, 'إرسال تنبيه للمجموعة', 240, 797, font(700, 21), tok('white'), 'center');
    navBar(g, GUIDE_NAV, 3);
  });
}
// operations room (wide): a live map of AlUla next to today's trips
const opsMap = (kx, kz) => [295 + (kx - 1.0) * 24, 426 + (kz + 9.0) * 24];
function tOps() {
  return canvasTex(1400, 771, (g, W, H) => {
    g.fillStyle = tok('lav-50');
    g.fillRect(0, 0, W, H);
    g.fillStyle = tok('white');
    g.fillRect(0, 0, W, 84);
    const tw = txt(g, 'غرفة العمليات · العُلا', 1368, 44, font(700, 30), tok('ink'));
    txt(g, ar('اليوم · 12 رحلة نشطة'), 1368 - tw - 26, 46, font(500, 18), tok('slate'));
    chipL(g, 'مباشر', 32, 44, 'ok', 16);
    // map panel
    rr(g, 30, 108, 530, 636, 24, tok('white'), tok('lav-100'));
    g.save();
    g.beginPath();
    g.roundRect(31, 109, 528, 634, 23);
    g.clip();
    g.globalAlpha = 0.22;
    g.fillStyle = tok('sand');
    g.fillRect(30, 108, 530, 636);
    g.globalAlpha = 0.55;
    for (let y = 110; y < 744; y += 3) for (let x = 32; x < 560; x += 3) {
      const kx = (x - 295) / 24 + 1.0, kz = (y - 426) / 24 - 9.0;
      if (terrainH(kx, kz) > 0.7) g.fillRect(x, y, 3, 3);
    }
    g.globalAlpha = 1;
    const poly = (pts, color, w, dash) => {
      g.strokeStyle = color;
      g.lineWidth = w;
      g.lineJoin = g.lineCap = 'round';
      g.setLineDash(dash || []);
      g.beginPath();
      pts.forEach(([x, z], i) => { const [px, py] = opsMap(x, z); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
      g.stroke();
      g.setLineDash([]);
    };
    ROADS.forEach((r) => poly(r, tok('white'), 6));
    LEGS.forEach((l, i) => poly(l, tok('primary'), 4, i < 2 ? null : [10, 8]));
    [AU.town, AU.dadan, AU.ikmah, AU.elephant, AU.hegra, AU.maraya].forEach((k) => {
      const [x, y] = opsMap(...k);
      g.beginPath();
      g.arc(x, y, 8, 0, Math.PI * 2);
      g.fillStyle = tok('white');
      g.fill();
      g.strokeStyle = tok('primary');
      g.lineWidth = 3;
      g.stroke();
    });
    [['مجموعة 07', AU.elephant, 'danger', 1], ['مجموعة 03', [4.4, -18.0], 'sky-600', -1], ['مجموعة 11', [0.15, 0.25], 'sky-600', 1], ['مجموعة 05', [-2.6, -10.3], 'sky-600', -1], ['مجموعة 09', [0.2, -3.6], 'warning', 1]].forEach(([n0, k, c, side]) => {
      let n = n0;
      const [x, y] = opsMap(k[0] + 0.25, k[1] - 0.25);
      g.beginPath();
      g.arc(x, y, 11, 0, Math.PI * 2);
      g.fillStyle = tok(c);
      g.fill();
      g.strokeStyle = tok('white');
      g.lineWidth = 3;
      g.stroke();
      g.font = font(700, 14);
      n = ar(n);
      const w = g.measureText(n).width + 18;
      const lx = side > 0 ? x + 18 : x - 18 - w;
      rr(g, lx, y - 14, w, 28, 12, tok('white'), tok('lav-100'));
      txt(g, n, lx + w / 2, y + 1, font(700, 14), tok('ink'), 'center');
    });
    g.restore();
    // today in numbers
    [['رحلات اليوم', '12', 'primary'], ['سائحون', '486', 'primary'], ['مرشدون', '18', 'primary'], ['تنبيهات نشطة', '1', 'danger-ink']].forEach(([k, v, c], i) => {
      const x1 = 1370 - i * 196;
      rr(g, x1 - 182, 108, 182, 128, 22, tok('white'), tok('lav-100'));
      txt(g, k, x1 - 18, 142, font(600, 17), tok('slate'));
      txt(g, ar(v), x1 - 18, 196, font(700, 44), tok(c));
    });
    // trips now
    rr(g, 590, 256, 780, 488, 24, tok('white'), tok('lav-100'));
    txt(g, 'الرحلات الآن', 1346, 294, font(700, 21), tok('ink'));
    [['مجموعة 07', 'جبل الفيل', 'استغاثة · المرشد في الطريق', 'sos'], ['مجموعة 09', 'دادان', 'سائح خارج النطاق', 'out'], ['مجموعة 03', 'الحِجر', 'داخل النطاق', 'ok'], ['مجموعة 05', 'في الطريق إلى مرايا', 'في الطريق', 'info'], ['مجموعة 11', 'البلدة القديمة', 'داخل النطاق', 'ok']].forEach(([n, p, s, k], i) => {
      const y = 350 + i * 78;
      g.fillStyle = tok('lav-50');
      g.fillRect(614, y - 39, 732, 2);
      txt(g, ar(n), 1346, y, font(700, 20), tok('ink'));
      txt(g, p, 1196, y, font(500, 18), tok('ink-2'));
      chipL(g, ar(s), 614, y, k, 16);
    });
  });
}
// the Hajj emergency screenshot names a place in the Haram: show Elephant Rock instead
function patchEmergency(img) {
  return canvasTex(img.width, img.height, (g) => {
    g.drawImage(img, 0, 0);
    g.fillStyle = tok('white');
    g.fillRect(150, 471, 268, 25);
    txt(g, 'أرسل البلاغ مع الموقع · جبل الفيل', 415, 484, font(500, 17), tok('ink'));
  });
}
/* ================================================================== */
/* Value noise for the AlUla terrain                                     */
/* ================================================================== */
function hash2(i, j) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  const i = Math.floor(x), j = Math.floor(y);
  const fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let s = 0, amp = 0.5, f = 1;
  for (let o = 0; o < 5; o++) { s += amp * vnoise(x * f, y * f); f *= 2.03; amp *= 0.5; }
  return s;
}
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}

// km from AlUla Old Town (x = east, z = south), from OpenStreetMap
const AU = {
  town: [0, 0], dadan: [0.07, -3.4], ikmah: [-1.01, -6.64],
  elephant: [6.82, -7.07], hegra: [4.67, -18.38], maraya: [-4.75, -13.04],
};
// main roads (schematic): up the valley to Hegra, and out to each site
const ROADS = [
  [[0.9, 4.2], [0.6, 2.4], [0.3, 1.2], [0, 0], [0.05, -1.7], [0.07, -3.4], [-0.4, -5.0], [-1.01, -6.64], [-0.7, -9.0], [1.2, -12.2], [3.1, -15.2], [4.3, -17.6], [4.67, -18.38]],
  [[-0.19, -4.3], [2.5, -4.9], [5.0, -6.3], [6.82, -7.07]],
  [[6.82, -7.07], [6.5, -10.3], [5.6, -14.0], [4.67, -18.38]],
  [[-0.7, -9.0], [-2.4, -10.5], [-4.0, -12.1], [-4.75, -13.04]],
];
// the AlUla valley floor (the oasis and the town)
const VALLEY = [[1.2, 5.0], [0.5, 2.0], [0, 0], [0.0, -3.4], [-0.7, -6.6], [-0.6, -9.0], [1.2, -12.2], [3.1, -15.2]];
// open ground: [x, z, radius]
const FLAT = [[0.4, 1.0, 1.5], [6.82, -7.07, 1.1], [4.3, -17.6, 2.6], [-4.75, -13.04, 0.5], [0.07, -3.4, 0.45], [-1.01, -6.64, 0.45], [-6.0, 2.3, 1.7]];
// the day's tour: hotel → Old Town → Dadan & Ikmah → Elephant Rock → Hegra → Maraya
const LEGS = [
  [[0.7, 2.6], [0.45, 1.6], [0.2, 0.7], [0.0, 0.08]],
  [[0.0, 0.08], [0.05, -1.7], [0.07, -3.4], [-0.4, -5.0], [-0.95, -6.5]],
  [[-0.95, -6.5], [-0.4, -5.0], [-0.19, -4.3], [2.5, -4.9], [5.0, -6.3], [6.45, -6.95]],
  [[6.45, -6.95], [6.5, -10.3], [5.6, -14.0], [4.8, -17.9]],
  [[4.8, -17.9], [4.3, -17.6], [3.1, -15.2], [1.2, -12.2], [-0.7, -9.0], [-2.4, -10.5], [-4.0, -12.1], [-4.6, -12.85]],
];
const polyDist = (kx, kz, pts) => {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(kx, kz, ...pts[i], ...pts[i + 1]));
  return d;
};
const roadDist = (kx, kz) => Math.min(...ROADS.map((r) => polyDist(kx, kz, r)));
function terrainH(kx, kz) {
  let d = Math.min(roadDist(kx, kz) - 0.22, polyDist(kx, kz, VALLEY) - 0.75);
  for (const [x, z, r] of FLAT) d = Math.min(d, Math.hypot(kx - x, kz - z) - r);
  const mask = smooth(clamp(d / 0.5, 0, 1));
  // sandstone massifs: flat tops and steep sides
  const n = fbm(kx * 0.22 + 5.3, kz * 0.22 + 1.7);
  const mesa = smooth(clamp((n - 0.47) / 0.045, 0, 1));
  const h = mask * (mesa * (1.15 + 0.7 * fbm(kx * 0.7 + 2.2, kz * 0.7 + 8.1)) + 0.05 * fbm(kx * 2.1, kz * 2.1));
  const edge = Math.min(kx + 12, 14 - kx, kz + 22.5, 4.5 - kz);
  return h * smooth(clamp(edge / 1.6, 0, 1));
}

/* ================================================================== */
/* 3D                                                                   */
/* ================================================================== */
async function start() {
  const canvas = $('#gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.body.classList.add('no-gl');
    return;
  }
  const LOW = innerWidth < 820 || (navigator.hardwareConcurrency || 8) <= 4;
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  try {
    await Promise.all(['400', '500', '600', '700'].map((w) => document.fonts.load(`${w} 24px "IBM Plex Sans Arabic"`, 'رفق 0123')));
  } catch (e) { /* system font fallback */ }

  const ASSETS = JSON.parse($('#assets').textContent);
  const loader = new THREE.TextureLoader();
  const tex = {};
  await Promise.all(Object.entries(ASSETS).map(async ([k, url]) => {
    const t = await loader.loadAsync(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    tex[k] = t;
  }));
  tex['t-home'] = tHome();
  tex['t-trip'] = tTrip();
  tex['t-id'] = tId();
  tex['t-attend'] = tAttend();
  tex['t-program'] = tProgram();
  tex['t-ops'] = tOps();
  tex.emergency = patchEmergency(tex.emergency.image);

  // live screens: small animations painted over the real app screenshots
  const LIVE = {};
  const paint = (L, tm) => { L.g.drawImage(L.base, 0, 0); L.draw(L.g, tm); L.t.needsUpdate = true; };
  const liveTex = (key, draw) => {
    const base = tex[key].image;
    const c = document.createElement('canvas');
    c.width = base.width;
    c.height = base.height;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    LIVE[key] = { base, g: c.getContext('2d'), t, draw };
    tex[key] = t;
    paint(LIVE[key], 1.3);
  };
  const ring = (g, x, y, r0, r1, k, color, w) => {
    g.globalAlpha = (1 - k) * 0.9;
    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    g.arc(x, y, lerp(r0, r1, k), 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  };
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const arD = (str) => str.replace(/\d/g, (d) => AR[d]);
  const pad2 = (n) => String(n).padStart(2, '0');
  liveTex('sos', (g, tm) => {
    for (const ph of [0, 0.5]) ring(g, 240, 268, 112, 205, (tm * 0.7 + ph) % 1, '#ffffff', 5);
    ring(g, 433, 703, 8, 22, (tm * 1.2) % 1, '#ffffff', 3);
  });
  liveTex('map', (g, tm) => ring(g, 253, 517, 20, 46, (tm * 0.6) % 1, tok('primary'), 4));
  liveTex('sup-map', (g, tm) => {
    ring(g, 253, 270, 16, 40, (tm * 0.9) % 1, tok('danger'), 4);
    ring(g, 244, 489, 18, 42, (tm * 0.6 + 0.3) % 1, tok('primary'), 4);
  });
  liveTex('t-home', (g, tm) => ring(g, 424, 192, 10, 28, (tm * 0.8) % 1, tok('success'), 3));
  liveTex('t-attend', (g, tm) => {
    const left = Math.max(0, 4 * 60 + 12 - Math.floor(tm));
    rr(g, 48, 212, 150, 52, 18, tok('primary-dark'));
    txt(g, ar(`${pad2(Math.floor(left / 60))}:${pad2(left % 60)}`), 123, 239, font(700, 28), tok('white'), 'center');
  });
  liveTex('t-ops', (g, tm) => {
    const [x, y] = opsMap(AU.elephant[0] + 0.25, AU.elephant[1] - 0.25);
    for (const ph of [0, 0.5]) ring(g, x, y, 12, 34, (tm * 0.8 + ph) % 1, tok('danger'), 4);
  });
  let lastLive = 0;

  const C = (n) => new THREE.Color(tok(n));
  const mixC = (a, b, f) => {
    const ca = C(a).getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
    const cb = C(b).getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
    return new THREE.Color().setRGB(lerp(ca.r, cb.r, f), lerp(ca.g, cb.g, f), lerp(ca.b, cb.b, f), THREE.SRGBColorSpace);
  };
  const SAND_L = mixC('white', 'sand', 0.45);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C('lav-50'), 90, 330);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 480);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  scene.add(new THREE.HemisphereLight(C('white'), C('lav-100'), 1.2));
  const sun = new THREE.DirectionalLight(C('white'), 2.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 260;
  scene.add(sun, sun.target);
  const SUN_DIR = new THREE.Vector3(-0.42, 0.8, 0.43).normalize();

  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: typeof c === 'string' ? C(c) : c, roughness: 0.8, metalness: 0, ...o });
  const shell = new THREE.MeshPhysicalMaterial({ color: C('white'), roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const m4 = new THREE.Matrix4();
  const qq = new THREE.Quaternion();
  const one = V(1, 1, 1);

  function roundedMat({ size, radius, color = 'white', textured = false }) {
    return new THREE.ShaderMaterial({
      uniforms: {
        texA: { value: null }, texB: { value: null }, mixv: { value: 0 }, useTex: { value: textured ? 1 : 0 },
        color: { value: C(color) }, size: { value: new THREE.Vector2(...size) }, radius: { value: radius }, opacity: { value: 1 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform sampler2D texA; uniform sampler2D texB; uniform float mixv; uniform float useTex;
        uniform vec3 color; uniform vec2 size; uniform float radius; uniform float opacity;
        varying vec2 vUv;
        float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        void main(){
          vec2 p = (vUv - 0.5) * size;
          float d = sdRound(p, size * 0.5, radius);
          float aa = fwidth(d);
          float a = 1.0 - smoothstep(-aa, aa, d);
          if (a <= 0.0) discard;
          vec3 c = color;
          if (useTex > 0.5) c = mix(texture2D(texA, vUv).rgb, texture2D(texB, vUv).rgb, mixv);
          float sheen = smoothstep(0.35, 0.0, abs(vUv.x * 0.8 - vUv.y + 0.25)) * 0.05 * useTex;
          gl_FragColor = vec4(c + sheen, a * opacity);
          #include <colorspace_fragment>
        }`,
      transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
  }
  const ringMat = (c) => new THREE.MeshBasicMaterial({ color: C(c), transparent: true, depthWrite: false, toneMapped: false });
  const pulses = []; // { mesh, period, phase, grow }

  /* ---------------------------------------------------------------- */
  /* Stage 1 — Jabal AlFil, Elephant Rock (1 unit = 4 m)                 */
  /* ---------------------------------------------------------------- */
  const U = 0.25;
  const HAR = new THREE.Group();
  scene.add(HAR);
  const SAND_G = mixC('white', 'sand', 0.5);
  const ROCK_D = mixC('sand', 'warning', 0.45).lerp(C('ink'), 0.14), ROCK_L = mixC('sand', 'warning', 0.12);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), std(SAND_G, { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  HAR.add(ground);

  // faceted sandstone: a displaced icosphere with horizontal strata (cap flattens mesa tops)
  function rockGeo(detail, amp, sx, sy, sz, sd, cap = 9) {
    const geo = new THREE.IcosahedronGeometry(1, detail);
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const v = V(), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = fbm(v.x * 1.6 + sd, v.z * 1.6 + v.y * 1.1 + sd * 0.7) - 0.5 + (fbm(v.x * 5 + sd, v.y * 5 - v.z * 3) - 0.5) * 0.35;
      v.multiplyScalar(1 + n * amp + Math.sin(v.y * 10 + sd) * 0.022);
      v.y = Math.min(v.y, cap);
      p.setXYZ(i, v.x * sx, v.y * sy, v.z * sz);
      const k = clamp(v.y * 0.5 + 0.5, 0, 1);
      c.copy(ROCK_D).lerp(ROCK_L, clamp(smooth(k) * 0.9 + (Math.sin(v.y * 22 + sd) > 0.6 ? 0.12 : 0), 0, 1));
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  }
  // Elephant Rock (~52 m): the head and back, the haunch on the sand, the trunk down to the ground
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const RK = new THREE.Group();
  RK.position.x = -3.4;
  HAR.add(RK);
  const piece = (detail, amp, s, pos, rot, sd, cap) => {
    const m = new THREE.Mesh(rockGeo(detail, amp, ...s, sd, cap), rockMat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.castShadow = m.receiveShadow = true;
    RK.add(m);
    return m;
  };
  piece(10, 0.2, [7.2, 5.4, 5.0], [1.6, 8.4, 0], [0, 0, 0.06], 1.3);
  piece(9, 0.24, [6.2, 5.8, 4.9], [7.6, 4.4, 0.3], [0, 0.18, -0.05], 4.1);
  piece(7, 0.16, [1.6, 4.6, 1.9], [-4.7, 4.0, 0.1], [0, 0, -0.1], 7.7);
  piece(5, 0.3, [2.4, 1.0, 2.2], [-4.9, 0.3, 0.2], [0, 0.4, 0], 9.2);
  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2, r = 9 + rnd() * 6, s = 0.5 + rnd() * 1.3;
    piece(2, 0.35, [s, s * 0.6, s * 0.9], [3 + Math.cos(a) * r * 1.2, s * 0.2, Math.sin(a) * r * 0.7], [0, rnd() * 3, 0], 10 + i);
  }
  const rockTop = new THREE.Object3D();
  rockTop.position.set(1.6, 14.2, 0);
  RK.add(rockTop);

  // the lounge: sunken seating circles on the sand, each with a fire bowl
  const pitRim = std(mixC('sand', 'white', 0.35), { roughness: 0.9 });
  const pitIn = std(mixC('sand', 'ink', 0.18), { roughness: 1 });
  const bowlM = std('ink', { roughness: 0.6 });
  [[-12, 10], [-7, 13.5], [-1.5, 15], [4.5, 15], [10, 13.5], [14.5, 10]].forEach(([x, z]) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.24, 8, 40), pitRim);
    rim.rotation.x = -Math.PI / 2;
    rim.scale.z = 0.45;
    rim.position.y = 0.04;
    rim.receiveShadow = rim.castShadow = true;
    const inner = new THREE.Mesh(new THREE.CircleGeometry(1.15, 40), pitIn);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.02;
    const fire = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.22, 16), bowlM);
    fire.position.y = 0.11;
    fire.castShadow = true;
    g.add(rim, inner, fire);
    HAR.add(g);
  });
  // the visitor pavilion
  const pav = new THREE.Mesh(new RoundedBoxGeometry(10, 1.8, 4, 3, 0.25), std('white', { roughness: 0.6 }));
  pav.position.set(-27, 0.9, -17);
  pav.rotation.y = 0.6;
  pav.castShadow = pav.receiveShadow = true;
  HAR.add(pav);

  // AlUla's sandstone massifs around the plain (fade into the haze)
  const hillMat = std(ROCK_L, { roughness: 1, flatShading: true });
  const hills = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rnd() * 0.3;
    const r = 75 + rnd() * 140;
    const w = 10 + rnd() * 22, h = 9 + rnd() * 20;
    const hill = new THREE.Mesh(rockGeo(3, 0.3, w, h, w * (0.6 + rnd() * 0.6), 20 + i, 0.5), hillMat);
    hill.position.set(Math.cos(a) * r, -h * 0.2, Math.sin(a) * r);
    hill.rotation.y = rnd() * 3;
    hill.castShadow = true;
    HAR.add(hill);
    hills.push(hill);
  }

  // visitors strolling around the rock (GPU-animated, both directions)
  const CN = LOW ? 260 : 480;
  const SPEED = 2.5; // visual speed-up
  const crowdGeo = mergeGeometries([
    new THREE.CapsuleGeometry(0.06, 0.2, 2, 6).translate(0, 0.17, 0),
    new THREE.SphereGeometry(0.046, 8, 6).translate(0, 0.37, 0),
  ]);
  const orbit = new Float32Array(CN * 4);
  for (let i = 0; i < CN; i++) {
    const r = 13 + 33 * Math.pow(rnd(), 1.2);
    const v = (0.5 + rnd() * 0.5) * U * SPEED;
    orbit.set([r, rnd() * Math.PI * 2, ((rnd() < 0.5 ? -1 : 1) * v) / r, 0], i * 4);
  }
  crowdGeo.setAttribute('aOrbit', new THREE.InstancedBufferAttribute(orbit, 4));
  const crowdTime = { value: 0 };
  const crowdMat = new THREE.MeshLambertMaterial();
  crowdMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = crowdTime;
    sh.vertexShader = 'attribute vec4 aOrbit;\nuniform float uTime;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      'vec3 transformed = vec3(position);\nfloat ang = aOrbit.y + uTime * aOrbit.z;\ntransformed += vec3(cos(ang) * aOrbit.x, abs(sin(uTime * 5.0 + aOrbit.y * 37.0)) * 0.014, -sin(ang) * aOrbit.x);',
    );
  };
  crowdMat.customProgramCacheKey = () => 'rifq-crowd';
  const crowd = new THREE.InstancedMesh(crowdGeo, crowdMat, CN);
  const cCols = [C('white'), C('white'), C('white'), C('lav-100'), C('sky'), C('sand'), C('ink'), C('slate')];
  for (let i = 0; i < CN; i++) crowd.setColorAt(i, cCols[Math.floor(rnd() * cCols.length)]);
  crowd.frustumCulled = false;
  HAR.add(crowd);

  // the group (مجموعة 07) walking together around the rock, with its zone following it
  const RG = 24;
  const OMEGA = (1.0 * U * SPEED) / RG;
  const TH0 = -1.6;
  const grp = new THREE.Object3D();
  HAR.add(grp);
  const MEM = [];
  for (let i = 0; i < 13; i++) {
    const a = rnd() * Math.PI * 2, r = 0.35 + Math.sqrt(rnd()) * 1.05;
    MEM.push({ a: Math.cos(a) * r, b: Math.sin(a) * r, ph: rnd() * 6 });
  }
  const DRIFT = 4, SUP = 9;
  MEM[DRIFT].a = 0.7; MEM[DRIFT].b = -0.5;
  MEM[SUP].a = -0.55; MEM[SUP].b = 0.65;
  const memMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 20, 14), new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.8 }), MEM.length);
  memMesh.castShadow = true;
  memMesh.frustumCulled = false;
  grp.add(memMesh);
  const memRings = MEM.map((m, i) => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.28, 40), ringMat(i === SUP ? 'primary' : 'success'));
    r.rotation.x = -Math.PI / 2;
    grp.add(r);
    const p = { mesh: r, period: 2.4, phase: i * 0.37, grow: 1.4 };
    pulses.push(p);
    return p;
  });
  const fence = new THREE.Group();
  grp.add(fence);
  const FR = 2.25, FD = 44;
  const dashM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.035, 0.06), std('primary', { roughness: 0.5 }), FD);
  for (let i = 0; i < FD; i++) {
    const a = (i / FD) * Math.PI * 2;
    m4.compose(V(Math.cos(a) * FR, 0.07, Math.sin(a) * FR), qq.setFromAxisAngle(V(0, 1, 0), -a + Math.PI / 2), one);
    dashM.setMatrixAt(i, m4);
  }
  fence.add(dashM);
  const fenceFill = new THREE.Mesh(new THREE.CircleGeometry(FR, 64), new THREE.MeshBasicMaterial({ color: C('primary'), transparent: true, opacity: 0.09, depthWrite: false }));
  fenceFill.rotation.x = -Math.PI / 2;
  fenceFill.position.y = 0.06;
  fence.add(fenceFill);
  const gAnchor = new THREE.Object3D();
  gAnchor.position.set(0, 0.9, 0);
  grp.add(gAnchor);
  const driftAnchor = new THREE.Object3D();
  const supAnchor = new THREE.Object3D();
  grp.add(driftAnchor, supAnchor);
  /* ---------------------------------------------------------------- */
  /* Stage 2 — the AlUla map (2.5 units per km)                         */
  /* ---------------------------------------------------------------- */
  const KS = 2.5, KC = [1, -9];
  const ML = (kx, kz, y = 0) => V((kx - KC[0]) * KS, y, (kz - KC[1]) * KS);
  const MAP0 = ML(...AU.elephant).negate(); // the map's Elephant Rock sits exactly on the real one
  const MW = (kx, kz, y = 0) => ML(kx, kz, y).add(MAP0);
  const hAt = (kx, kz) => terrainH(kx, kz);
  const MAPG = new THREE.Group();
  MAPG.position.copy(MAP0);
  scene.add(MAPG);
  const mapBase = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), std('lav-50', { roughness: 1 }));
  mapBase.rotation.x = -Math.PI / 2;
  mapBase.position.y = -0.03;
  mapBase.receiveShadow = true;
  MAPG.add(mapBase);
  const SX = LOW ? 180 : 270, SZ = LOW ? 185 : 285;
  const terrGeo = new THREE.PlaneGeometry(65, 67.5, SX, SZ);
  terrGeo.rotateX(-Math.PI / 2);
  const tp = terrGeo.attributes.position;
  const tcol = new Float32Array(tp.count * 3);
  const cEdge = C('lav-50'), cLow = mixC('white', 'sand', 0.32), cMid = mixC('white', 'sand', 0.8), cHigh = mixC('sand', 'warning', 0.1);
  const tc = new THREE.Color();
  for (let i = 0; i < tp.count; i++) {
    const kx = tp.getX(i) / KS + KC[0], kz = tp.getZ(i) / KS + KC[1];
    const h = hAt(kx, kz);
    tp.setY(i, h);
    tc.copy(cLow).lerp(cMid, smooth(clamp((h - 0.08) / 0.5, 0, 1))).lerp(cHigh, smooth(clamp((h - 1.2) / 1.2, 0, 1)));
    tc.lerp(cEdge, 1 - smooth(clamp(Math.min(kx + 12, 14 - kx, kz + 22.5, 4.5 - kz) / 2.2, 0, 1)));
    tcol.set([tc.r, tc.g, tc.b], i * 3);
  }
  terrGeo.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  terrGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(terrGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  terrain.receiveShadow = terrain.castShadow = true;
  MAPG.add(terrain);
  // roads
  const roadMat = std('white', { roughness: 0.5 });
  ROADS.forEach((r) => {
    const cv = new THREE.CatmullRomCurve3(r.map(([x, z]) => ML(x, z, 0.035)), false, 'centripetal');
    MAPG.add(new THREE.Mesh(new THREE.TubeGeometry(cv, r.length * 30, 0.04, 6, false), roadMat));
  });
  // the oasis: palms along the valley floor (a muted green)
  const palms = [];
  for (let i = 0; i < 6000 && palms.length < (LOW ? 450 : 900); i++) {
    const kx = -1.2 + rnd() * 3.0, kz = -3.6 + rnd() * 8.0;
    if (polyDist(kx, kz, VALLEY) > 0.6 || hAt(kx, kz) > 0.04 || roadDist(kx, kz) < 0.07 || Math.hypot(kx, kz * 0.6) < 0.3) continue;
    palms.push([kx, kz, 0.7 + rnd() * 0.6]);
  }
  const palmGeo = mergeGeometries([
    new THREE.CylinderGeometry(0.006, 0.009, 0.08, 4).translate(0, 0.04, 0),
    new THREE.SphereGeometry(0.045, 6, 4).scale(1, 0.45, 1).translate(0, 0.085, 0),
  ]);
  const palmM = new THREE.InstancedMesh(palmGeo, std(mixC('success', 'sand', 0.42), { roughness: 0.8 }), palms.length);
  palms.forEach(([kx, kz, s], i) => {
    m4.compose(ML(kx, kz, 0), qq.identity(), V(s, s, s));
    palmM.setMatrixAt(i, m4);
  });
  palmM.castShadow = true;
  MAPG.add(palmM);
  // the Old Town (mud brick) on its hill, and the modern town to the south
  const MUD = mixC('sand', 'warning', 0.2);
  const houses = [];
  for (let i = 0; i < (LOW ? 150 : 260); i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.28;
    houses.push([Math.cos(a) * r * 0.75, Math.sin(a) * r * 1.25, 0.03 + rnd() * 0.035, 0.02 + rnd() * 0.035, MUD]);
  }
  for (let i = 0; i < 4000 && houses.length < (LOW ? 330 : 560); i++) {
    const kx = -0.6 + rnd() * 2.2, kz = 0.6 + rnd() * 3.8;
    if (polyDist(kx, kz, VALLEY) > 0.7 || hAt(kx, kz) > 0.04 || roadDist(kx, kz) < 0.06) continue;
    houses.push([kx, kz, 0.04 + rnd() * 0.05, 0.02 + rnd() * 0.05, rnd() < 0.5 ? C('white') : C('lav-50')]);
  }
  const houseM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('white', { roughness: 0.8 }), houses.length);
  houses.forEach(([kx, kz, w, h, c], i) => {
    m4.compose(ML(kx, kz, h / 2), qq.setFromAxisAngle(V(0, 1, 0), rnd() * 0.4), V(w, h, w * (0.7 + rnd() * 0.6)));
    houseM.setMatrixAt(i, m4);
    houseM.setColorAt(i, c);
  });
  houseM.castShadow = houseM.receiveShadow = true;
  MAPG.add(houseM);
  const fort = new THREE.Group();
  fort.position.copy(ML(0.02, -0.02, 0));
  const fortHill = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.09, 10), std(MUD, { roughness: 1, flatShading: true }));
  fortHill.position.y = 0.045;
  const fortTower = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), std(mixC('sand', 'warning', 0.3)));
  fortTower.position.y = 0.11;
  fortHill.castShadow = fortTower.castShadow = true;
  fort.add(fortHill, fortTower);
  MAPG.add(fort);
  // isolated sandstone outcrops: Hegra's carved tombs, and the open plain around Elephant Rock
  const outMat = std(mixC('sand', 'warning', 0.3), { roughness: 1, flatShading: true });
  const doorMat = std(mixC('sand', 'ink', 0.35), { roughness: 1 });
  const outcrop = (kx, kz, s, facades) => {
    const g = new THREE.Group();
    g.position.copy(ML(kx, kz, 0));
    g.rotation.y = hash2(Math.round(kx * 10), Math.round(kz * 10)) * 0.8 - 0.4;
    const m = new THREE.Mesh(rockGeo(2, 0.35, s, s * 0.8, s * 0.75, kx * 3 + kz, 0.55), outMat);
    m.position.y = s * 0.2;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    for (let k = 0; k < facades; k++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(s * 0.22, s * 0.3, 0.006), doorMat);
      d.position.set((k - (facades - 1) / 2) * s * 0.36, s * 0.3, s * 0.78);
      g.add(d);
    }
    MAPG.add(g);
  };
  [[4.0, -18.9, 0.55, 2], [5.4, -17.3, 0.4, 1], [5.6, -18.8, 0.35, 1], [3.3, -17.4, 0.45, 1], [4.5, -19.8, 0.5, 2], [3.6, -19.9, 0.3, 0], [6.1, -17.9, 0.3, 0], [2.9, -18.5, 0.35, 1], [5.2, -16.3, 0.32, 1]].forEach((o) => outcrop(...o));
  [[6.1, -8.0, 0.3, 0], [7.9, -7.7, 0.35, 0], [7.6, -6.1, 0.28, 0], [8.3, -6.9, 0.22, 0], [7.5, -8.6, 0.3, 0]].forEach((o) => outcrop(...o));
  // Maraya: the mirrored hall in Ashar valley
  const maraya = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.24), new THREE.MeshPhysicalMaterial({ color: C('white'), metalness: 1, roughness: 0.06, envMapIntensity: 1.3 }));
  maraya.position.copy(ML(...AU.maraya, hAt(...AU.maraya) + 0.06));
  maraya.rotation.y = 0.5;
  maraya.castShadow = true;
  MAPG.add(maraya);
  const placeAnchor = (k, y) => {
    const o = new THREE.Object3D();
    o.position.copy(ML(...k, hAt(...k) + y));
    MAPG.add(o);
    return o;
  };
  // the stops of the day, marked on the ground
  [AU.town, AU.dadan, AU.ikmah, AU.elephant, AU.hegra, AU.maraya].forEach((k, i) => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.27, 40), ringMat('primary'));
    r.rotation.x = -Math.PI / 2;
    r.position.copy(ML(...k, hAt(...k) + 0.03));
    MAPG.add(r);
    pulses.push({ mesh: r, period: 3.2, phase: i * 0.5, grow: 0.6 });
  });

  // the group's day, leg by leg
  const STOPS = LEGS.map((pts, i) => {
    const d = {};
    d.curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => ML(x, z, 0.1 + i * 0.022)), false, 'centripetal');
    d.geo = new THREE.TubeGeometry(d.curve, 220, 0.075, 8, false);
    d.mesh = new THREE.Mesh(d.geo, std('primary', { roughness: 0.4, emissive: C('primary'), emissiveIntensity: 0.3 }));
    d.count = d.geo.index.count;
    MAPG.add(d.mesh);
    return d;
  });
  const token = new THREE.Group();
  const tokBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshPhysicalMaterial({ color: C('sky-600'), roughness: 0.25, clearcoat: 1 }));
  tokBall.position.y = 0.22;
  tokBall.castShadow = true;
  const tokRing = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.36, 40), ringMat('success'));
  tokRing.rotation.x = -Math.PI / 2;
  tokRing.position.y = 0.05;
  pulses.push({ mesh: tokRing, period: 2.4, phase: 0, grow: 1.6 });
  token.add(tokBall, tokRing);
  const tokAnchor = new THREE.Object3D();
  tokAnchor.position.y = 0.55;
  token.add(tokAnchor);
  MAPG.add(token);

  // compass and a 1 km scale bar
  const compass = new THREE.Group();
  compass.position.copy(ML(-6.4, 1.5, hAt(-6.4, 1.5) + 0.25));
  compass.scale.setScalar(1.8);
  const cDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 40), std('white', { roughness: 0.5 }));
  const cArrow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.75, 3).rotateX(-Math.PI / 2).scale(1, 0.25, 1), std('primary', { roughness: 0.4 }));
  cArrow.position.set(0, 0.05, -0.08);
  compass.add(cDisc, cArrow);
  MAPG.add(compass);
  const northAnchor = new THREE.Object3D();
  northAnchor.position.set(0, 0.1, -0.75);
  compass.add(northAnchor);
  const scaleBar = new THREE.Group();
  scaleBar.position.copy(ML(-5.8, 3.2, hAt(-5.8, 3.2) + 0.25));
  const sbM = std('ink', { roughness: 0.5 });
  const sb = new THREE.Mesh(new THREE.BoxGeometry(KS, 0.03, 0.06), sbM);
  scaleBar.add(sb);
  [-KS / 2, KS / 2].forEach((x) => { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.22), sbM); tk.position.x = x; scaleBar.add(tk); });
  const scaleAnchor = new THREE.Object3D();
  scaleAnchor.position.set(0, 0.12, -0.15);
  scaleBar.add(scaleAnchor);
  MAPG.add(scaleBar);
  const mapMats = new Set();
  MAPG.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { if (!m.transparent) mapMats.add(m); }); });
  const harFade = [ground.material, hillMat];
  ground.material.polygonOffset = true;
  ground.material.polygonOffsetFactor = 2;
  ground.material.polygonOffsetUnits = 2;

  /* ---------------------------------------------------------------- */
  /* Floating actors                                                    */
  /* ---------------------------------------------------------------- */
  function makePhone() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(1, 2.08, 0.11, 6, 0.14), shell);
    body.castShadow = true;
    const bez = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.03), roundedMat({ size: [0.95, 2.03], radius: 0.12, color: 'ink' }));
    bez.position.z = 0.0555;
    const scrMat = roundedMat({ size: [0.9, 1.946], radius: 0.1, textured: true });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.946), scrMat);
    scr.position.z = 0.0565;
    const bump = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.34, 0.05, 3, 0.08), std('lav-100', { roughness: 0.4 }));
    bump.position.set(0.24, 0.78, -0.07);
    g.add(body, bez, scr, bump);
    const btn = std('lav-100', { roughness: 0.35, metalness: 0.2 });
    [[-0.506, 0.58, 0.2], [-0.506, 0.3, 0.15], [-0.506, 0.1, 0.15], [0.506, 0.38, 0.3]].forEach(([x, y, h]) => {
      const b = new THREE.Mesh(new RoundedBoxGeometry(0.03, h, 0.05, 2, 0.012), btn);
      b.position.set(x, y, 0);
      g.add(b);
    });
    const island = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.07), roundedMat({ size: [0.26, 0.07], radius: 0.035, color: 'ink' }));
    island.position.set(0, 0.925, 0.0575);
    g.add(island);
    return { obj: g, screen: scrMat };
  }
  function makePanel(k, w) {
    const img = tex[k].image;
    const h = (w * img.height) / img.width;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(w + 0.34, h + 0.34, 0.16, 6, 0.2), shell);
    body.castShadow = true;
    const m = roundedMat({ size: [w, h], radius: 0.12, textured: true });
    m.uniforms.texA.value = m.uniforms.texB.value = tex[k];
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    scr.position.z = 0.081;
    g.add(body, scr);
    g.userData.h = h;
    return g;
  }
  function makeLogo() {
    const g = new THREE.Group();
    const geo = new RoundedBoxGeometry(3, 3, 0.7, 8, 0.62);
    const pa = geo.attributes.position;
    const cols = new Float32Array(pa.count * 3);
    for (let i = 0; i < pa.count; i++) {
      const f = clamp(((pa.getX(i) + 1.5) / 3 + (1.5 - pa.getY(i)) / 3) / 2, 0, 1);
      const c = mixC('primary', 'sky-600', f);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const body = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.25, envMapIntensity: 0.45 }));
    body.castShadow = true;
    const wm = wordmarkTex();
    const front = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), new THREE.MeshBasicMaterial({ map: wm, transparent: true, toneMapped: false, depthWrite: false }));
    front.position.z = 0.352;
    const back = front.clone();
    back.rotation.y = Math.PI;
    back.position.z = -0.352;
    g.add(body, front, back);
    return g;
  }
  function makePyramid() {
    const g = new THREE.Group();
    const tiers = [
      { name: 'المدير', sub: 'إدارة المنشأة كاملة · المشرفون · الصلاحيات · التقارير', w: 2.9, d: 2.2, h: 0.75, y: 3.15, x: 0, c: 'primary-dark' },
      { name: 'المشرف', sub: 'مسؤول عن رحلاته وعن المرشدين ومنسّقي النقل فيها', w: 4.4, d: 2.8, h: 0.75, y: 2.15, x: 0, c: 'primary' },
      { name: 'منسّق النقل', sub: 'الحافلات والتفقد والتحرك', w: 2.75, d: 3.2, h: 0.75, y: 1.15, x: 1.5, c: 'sky-600' },
      { name: 'المرشد', sub: 'يقود المجموعة ويشرح المواقع', w: 2.75, d: 3.2, h: 0.75, y: 1.15, x: -1.5, c: 'sky-600' },
      { name: 'السائح', sub: 'رحلته · هويته · تنبيهاته', w: 6.9, d: 3.8, h: 0.55, y: 0.2, x: 0, c: 'lav-100' },
    ];
    g.userData.tiers = tiers.map((t) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(t.w, t.h, t.d, 5, 0.2), new THREE.MeshPhysicalMaterial({ color: C(t.c), roughness: 0.35, clearcoat: 0.6 }));
      m.position.set(t.x, t.y, 0);
      m.castShadow = m.receiveShadow = true;
      m.userData = t;
      g.add(m);
      return m;
    });
    return g;
  }
  function makeServer() {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const slab = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.52, 1.6, 4, 0.14), new THREE.MeshPhysicalMaterial({ color: C(i === 1 ? 'lav-100' : 'white'), roughness: 0.35, clearcoat: 0.6 }));
      slab.position.y = i * 0.6;
      slab.castShadow = true;
      g.add(slab);
      for (let k = 0; k < 3; k++) {
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), new THREE.MeshBasicMaterial({ color: C(k === 0 ? 'success' : 'sky'), toneMapped: false }));
        led.position.set(0.8 - k * 0.2, i * 0.6, 0.81);
        g.add(led);
      }
    }
    return g;
  }
  const phones = [makePhone(), makePhone(), makePhone(), makePhone()];
  const monitor = makePanel('t-ops', 6.4);
  const logo = makeLogo();
  const pyramid = makePyramid();
  const server = makeServer();

  /* ---------------------------------------------------------------- */
  /* Story dioramas: before/after, the four principles, the bus         */
  /* ---------------------------------------------------------------- */
  const WHY0 = MW(-3.5, -1.0, 8), PRIN0 = MW(6.5, -3.0, 8), BUS0 = MW(5.0, -15.5, 6);
  const ball = (r, c) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshPhysicalMaterial({ color: C(c), roughness: 0.3, clearcoat: 0.8 }));
    m.castShadow = true;
    return m;
  };
  const plate = (w, d, c) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, 0.4, d, 4, 0.16), new THREE.MeshPhysicalMaterial({ color: C(c), roughness: 0.55, clearcoat: 0.25 }));
    m.position.y = -0.2;
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const dashRing = (R, n, c) => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.035, 0.06), std(c, { roughness: 0.5 }), n);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      m4.compose(V(Math.cos(a) * R, 0.04, Math.sin(a) * R), qq.setFromAxisAngle(V(0, 1, 0), -a + Math.PI / 2), one);
      m.setMatrixAt(i, m4);
    }
    return m;
  };
  const zoneFill = (R) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshBasicMaterial({ color: C('primary'), transparent: true, opacity: 0.08, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.02;
    return m;
  };
  const flatRing = (r0, r1, c) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 40), ringMat(c));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.03;
    return m;
  };
  const anchorAt = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };

  // before / after
  const why = new THREE.Group();
  why.position.copy(WHY0);
  scene.add(why);
  const before = new THREE.Group(), after = new THREE.Group();
  before.position.x = 4.3;
  after.position.x = -4.3;
  why.add(before, after);
  before.add(plate(7.6, 5.4, 'lav-100'));
  after.add(plate(7.6, 5.4, 'white'));
  const lost = [];
  for (let i = 0; i < 13; i++) {
    const m = ball(0.16, 'slate');
    const x = (rnd() - 0.5) * 6.4, z = (rnd() - 0.5) * 4.4;
    m.position.set(x, 0.16, z);
    before.add(m);
    lost.push({ m, x, z, ph: rnd() * 6 });
  }
  const bubbles = [];
  const bubGeo = new RoundedBoxGeometry(0.95, 0.55, 0.12, 3, 0.12);
  const bubMat = new THREE.MeshPhysicalMaterial({ color: C('white'), roughness: 0.3, clearcoat: 0.6 });
  const dotGeo = new THREE.SphereGeometry(0.05, 10, 8);
  const dotMat = std('slate');
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Group();
    const body = new THREE.Mesh(bubGeo, bubMat);
    body.castShadow = true;
    b.add(body);
    for (let k = -1; k <= 1; k++) { const d = new THREE.Mesh(dotGeo, dotMat); d.position.set(k * 0.18, 0, 0.07); b.add(d); }
    b.position.set(-2.8 + rnd() * 3.4, 1.4 + rnd() * 1.7, -1.8 + rnd() * 1.4);
    b.rotation.set((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.4);
    b.userData = { ph: rnd() * 6, y: b.position.y };
    before.add(b);
    bubbles.push(b);
  }
  const callers = [];
  [[1.9, 1.6, 0.4], [2.7, 2.5, -0.8], [1.2, 3.0, -1.5]].forEach(([x, y, z]) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const ph = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.66, 0.06, 3, 0.07), std('ink', { roughness: 0.35 }));
    ph.castShadow = true;
    const rg = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.022, 8, 40), ringMat('warning'));
    pulses.push({ mesh: rg, period: 1.1, phase: rnd(), grow: 0.8 });
    g.add(ph, rg);
    before.add(g);
    callers.push(g);
  });
  const caller = ball(0.2, 'primary');
  caller.position.set(-0.8, 0.2, 1.8);
  before.add(caller);
  const waves = [0, 1, 2].map((k) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.35 + k * 0.22, 0.025, 6, 24, Math.PI / 2), ringMat('primary'));
    w.position.set(-0.8, 0.32, 1.8);
    w.rotation.z = -Math.PI / 4;
    before.add(w);
    return w;
  });
  after.add(dashRing(2.1, 44, 'primary'), zoneFill(2.1));
  for (let i = 0; i < 11; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 1.6;
    const m = ball(0.16, i === 0 ? 'primary' : 'sky-600');
    m.position.set(Math.cos(a) * r, 0.16, Math.sin(a) * r);
    after.add(m);
    const rg = flatRing(0.21, 0.29, i === 0 ? 'primary' : 'success');
    rg.position.x = m.position.x;
    rg.position.z = m.position.z;
    after.add(rg);
    pulses.push({ mesh: rg, period: 2.4, phase: rnd() * 2.4, grow: 1.3 });
  }
  const whyA = {
    bubbles: anchorAt(before, -1.1, 3.6, -1.1),
    phones: anchorAt(before, 2.5, 3.7, -0.8),
    calling: anchorAt(before, -0.8, 0.75, 1.8),
    zone: anchorAt(after, 0, 0.4, -2.1),
    beforeEdge: anchorAt(before, 0, 0.05, 2.75),
    afterEdge: anchorAt(after, 0, 0.05, 2.75),
  };

  // the four principles
  const prin = new THREE.Group();
  prin.position.copy(PRIN0);
  scene.add(prin);
  prin.add(plate(15, 8.6, 'white'));
  const pathCurve = new THREE.CatmullRomCurve3([V(-6.6, 0.02, 2.8), V(-3.8, 0.02, 1.4), V(-1.0, 0.02, 1.9), V(1.6, 0.02, 0.9), V(3.8, 0.02, -0.9), V(6.4, 0.02, -2.9)]);
  const pathMesh = new THREE.Mesh(new THREE.TubeGeometry(pathCurve, 140, 0.32, 8, false), std('lav-100', { roughness: 0.8 }));
  pathMesh.scale.y = 0.08;
  prin.add(pathMesh);
  const prP = ball(0.22, 'sky-600');
  prin.add(prP);
  const prRing = flatRing(0.28, 0.38, 'success');
  prin.add(prRing);
  const prPulse = { mesh: prRing, period: 2.4, phase: 0, grow: 1.3 };
  pulses.push(prPulse);
  const pings = Array.from({ length: 8 }, (_, i) => 0.06 + i * 0.062).map((u) => {
    const g = new THREE.Group();
    const q = pathCurve.getPointAt(u);
    g.position.set(q.x, 0.04, q.z);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 20), std('primary', { roughness: 0.4 }));
    const r = flatRing(0.16, 0.22, 'primary');
    g.add(d, r);
    prin.add(g);
    return { g, u, r };
  });
  const FC = V(2.0, 0, 1.6), FRAD = 2.0;
  const fenceP = new THREE.Group();
  fenceP.position.copy(FC);
  fenceP.add(dashRing(FRAD, 44, 'primary'), dashRing(FRAD + 0.55, 56, 'sky'), zoneFill(FRAD));
  prin.add(fenceP);
  const uAtDist = (dist) => {
    for (let u = 0.4; u <= 1; u += 0.002) { const q = pathCurve.getPointAt(u); if (Math.hypot(q.x - FC.x, q.z - FC.z) >= dist) return u; }
    return 0.95;
  };
  const U1 = uAtDist(FRAD + 0.28), U2 = uAtDist(FRAD + 1.2);
  const reading = (u, withDot) => {
    const g = new THREE.Group();
    const q = pathCurve.getPointAt(u);
    g.position.set(q.x, 0, q.z);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ color: C('sky'), transparent: true, opacity: 0.2, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.025;
    g.add(halo);
    if (withDot) { const d = ball(0.14, 'slate'); d.position.y = 0.14; g.add(d); }
    prin.add(g);
    return g;
  };
  const read1 = reading(U1, true), read2 = reading(U2, false);
  const bars = new THREE.Group();
  const q2 = pathCurve.getPointAt(U2);
  bars.position.set(q2.x - 0.9, 1.3, q2.z);
  [0.16, 0.3, 0.44, 0.58].forEach((h, i) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.13, h, 0.13, 2, 0.04), std(i === 0 ? 'warning' : 'lav-100', { roughness: 0.4 }));
    b.position.set(i * 0.2, h / 2, 0);
    bars.add(b);
  });
  prin.add(bars);
  const prA = {
    walker: anchorAt(prP, 0, 0.55, 0),
    r1: anchorAt(read1, 0, 0.45, 0),
    r2: anchorAt(read2, 0, 0.55, 0),
    margin: anchorAt(fenceP, 0, 0.1, FRAD + 0.55),
    bars: anchorAt(bars, 0.3, 0.75, 0),
  };

  // boarding the bus
  const bus = new THREE.Group();
  bus.position.copy(BUS0);
  scene.add(bus);
  bus.add(plate(16, 7.4, 'lav-100'));
  const curb = new THREE.Mesh(new RoundedBoxGeometry(16, 0.16, 2.0, 2, 0.06), std('white', { roughness: 0.6 }));
  curb.position.set(0, 0.08, 2.6);
  curb.receiveShadow = true;
  bus.add(curb);
  for (let x = -7; x <= 7; x += 1.4) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.08), std('white'));
    d.position.set(x, 0.01, -2.5);
    bus.add(d);
  }
  const coach = new THREE.Group();
  coach.position.set(-1.2, 0, 0.1);
  bus.add(coach);
  const cBody = new THREE.Mesh(new RoundedBoxGeometry(7.4, 2.3, 2.5, 4, 0.35), new THREE.MeshPhysicalMaterial({ color: C('white'), roughness: 0.3, clearcoat: 0.7 }));
  cBody.position.y = 1.6;
  const cWin = new THREE.Mesh(new RoundedBoxGeometry(6.2, 0.75, 2.52, 2, 0.12), std('ink', { roughness: 0.15, metalness: 0.3 }));
  cWin.position.set(-0.4, 2.05, 0);
  const cStripe = new THREE.Mesh(new THREE.BoxGeometry(7.42, 0.16, 2.52), std('sky-600', { roughness: 0.4 }));
  cStripe.position.y = 1.12;
  const cDoor = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.65, 0.04), std('lav-100', { roughness: 0.4 }));
  cDoor.position.set(2.7, 1.3, 1.27);
  const cShield = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 2.2), std('ink', { roughness: 0.15, metalness: 0.3 }));
  cShield.position.set(3.71, 1.8, 0);
  coach.add(cBody, cWin, cStripe, cDoor, cShield);
  cBody.castShadow = true;
  [[-2.5, -1.2], [-2.5, 1.2], [2.3, -1.2], [2.3, 1.2]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 20), std('ink', { roughness: 0.7 }));
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.45, z);
    coach.add(w);
  });
  const muf = ball(0.22, 'primary');
  muf.position.set(0.9, 0.38, 2.3);
  bus.add(muf);
  const scan = flatRing(0.3, 0.4, 'success');
  scan.position.set(1.5, 0.18, 2.25);
  bus.add(scan);
  const queue = Array.from({ length: 8 }, (_, k) => {
    const g = new THREE.Group();
    const m = ball(0.17, 'sky-600');
    m.position.y = 0.33;
    g.add(m);
    if (k === 4) { const r = flatRing(0.24, 0.32, 'primary'); r.position.y = 0.18; g.add(r); }
    bus.add(g);
    return g;
  });
  const missG = new THREE.Group();
  bus.add(missG);
  const missing = [[-6.7, 2.5], [-7.1, 0.4]].map(([x, z]) => {
    const m = ball(0.17, 'sky-600');
    m.position.set(x, 0.17, z);
    const r = flatRing(0.22, 0.3, 'success');
    r.position.set(x, 0.03, z);
    pulses.push({ mesh: r, period: 2.4, phase: rnd() * 2, grow: 1.3 });
    missG.add(m, r);
    return m;
  });
  const busA = {
    count: anchorAt(bus, 1.5, 3.4, 1.3),
    muf: anchorAt(muf, 0, 0.45, 0),
    door: anchorAt(bus, 1.5, 0.4, 2.0),
    miss: anchorAt(missG, -6.9, 1.0, 1.5),
  };

  // dotted arcs (data flowing between things)
  const arcs = [];
  function makeArc(n, color, size) {
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: C(color), toneMapped: false }), n);
    mesh.frustumCulled = false;
    scene.add(mesh);
    const a = { mesh, n, size, from: V(), to: V(), lift: 1, grow: 1, vis: 0 };
    arcs.push(a);
    return a;
  }
  const bez = (a, c, b, u, out) => out.set(
    (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x,
    (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y,
    (1 - u) * (1 - u) * a.z + 2 * (1 - u) * u * c.z + u * u * b.z,
  );
  const arcTmp = V(), arcC = V();
  function drawArc(a, time) {
    a.mesh.visible = a.vis > 0.01;
    if (!a.mesh.visible) return;
    arcC.copy(a.from).add(a.to).multiplyScalar(0.5);
    arcC.y += a.lift;
    const head = (time * 0.55) % 1;
    for (let k = 0; k < a.n; k++) {
      const u = k / (a.n - 1);
      let s = u <= a.grow ? a.size * a.vis : 0;
      const dd = u - head;
      s *= 1 + 1.4 * Math.exp(-(dd * dd) / 0.003);
      bez(a.from, arcC, a.to, u, arcTmp);
      m4.compose(arcTmp, qq.identity(), V(s, s, s));
      a.mesh.setMatrixAt(k, m4);
    }
    a.mesh.instanceMatrix.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- */
  /* Shots and keyframes                                                */
  /* ---------------------------------------------------------------- */
  const arr = (v) => [v.x, v.y, v.z];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const NS = arr(MW(2.5, -6.5, 9));
  const RS = arr(MW(-3.0, -9.0, 7));
  const PS = arr(MW(4.0, -11.0, 9));
  const FS = arr(MW(-1.0, -13.0, 6.5));
  const OS = arr(MW(-2.5, -16.5, 9.5));
  const PR = arr(MW(2.0, -19.5, 11));
  const DT = arr(MW(0.6, -7.8, 0));

  // frame 'g' = coordinates relative to the moving group: [outward, up, forward]
  const SH = (pos, tgt, fov, fog, o = {}) => ({ pos: V(...pos), tgt: V(...tgt), fov, fog, ...o, pos2: o.pos2 && V(...o.pos2), tgt2: o.tgt2 && V(...o.tgt2) });
  const SHOTS = [];
  SHOTS[IDX.hero] = SH([-27, 14, 50], [-1, 5.5, 3], 36, [120, 380]);
  SHOTS[IDX.group] = SH([12, 5.5, -3], [-3, 2.8, 0.8], 38, [70, 280], { frame: 'g' });
  SHOTS[IDX.sos] = SH([13, 13, -9], [1.4, 1.2, -0.6], 38, [70, 280], { frame: 'g', pos2: [12.5, 12, -12], tgt2: [2.0, 1.4, -1.4] });
  SHOTS[IDX.days] = SH(add(DT, [0, 70, 46]), DT, 38, [80, 260], { pos2: add(DT, [-3, 68, 48]), tgt2: add(DT, [0.6, 0, -0.4]), follow: 0.12 });
  const W0 = arr(WHY0), P0 = arr(PRIN0), B0 = arr(BUS0);
  SHOTS[IDX.why] = SH(add(W0, [2.6, 9, 21]), add(W0, [2.6, 0.9, 0]), 36, [20, 120], { pos2: add(W0, [-2.6, 8.5, 20]), tgt2: add(W0, [-2.6, 0.9, 0]) });
  SHOTS[IDX.principles] = SH(add(P0, [0.4, 11.5, 21]), add(P0, [0.4, 0.5, 0.2]), 36, [20, 120], { pos2: add(P0, [0.8, 10, 19]), tgt2: add(P0, [0.6, 1.2, 0.6]) });
  SHOTS[IDX.bus] = SH(add(B0, [0.3, 8, 22]), add(B0, [0.3, 1.3, 0.6]), 36, [20, 120], { pos2: add(B0, [-1.4, 8, 22]), tgt2: add(B0, [-1.4, 1.3, 0.6]) });
  SHOTS[IDX.how] = SH(add(NS, [0, 1.2, 24]), NS, 38, [26, 120]);
  SHOTS[IDX.roles] = SH(add(RS, [0, 3.7, 16]), add(RS, [0, 1.7, 0]), 38, [22, 110]);
  SHOTS[IDX.tourist] = SH(add(PS, [0, 0.5, 16.5]), PS, 36, [18, 100]);
  SHOTS[IDX.guide] = SH(add(FS, [0, 4, 16]), add(FS, [0, -0.6, 0]), 38, [26, 130]);
  SHOTS[IDX.ops] = SH(add(OS, [0, 0.8, 15.5]), OS, 36, [18, 110]);
  SHOTS[IDX.register] = SH(add(PR, [-0.5, 1.0, 18.5]), add(PR, [-0.5, -0.3, 0]), 36, [22, 120]);

  // debug: ?cam=i:px,py,pz,tx,ty,tz overrides one shot (used while tuning)
  if (params.get('cam')) {
    const [ci, rest] = params.get('cam').split(':');
    const v = rest.split(',').map(Number);
    Object.assign(SHOTS[+ci], { pos: V(v[0], v[1], v[2]), tgt: V(v[3], v[4], v[5]), pos2: null, tgt2: null });
  }

  const P = (p, s, o = {}) => ({ p, s, ...o });
  const KEYS = {
    P1: {
      [IDX.sos]: P([1.6, 2.8, -4.6], 0.85, { frame: 'g', scr: 'emergency', pin: 0.46 }),
      [IDX.why]: P(add(W0, [-7.6, 2.6, -0.4]), 1.1, { yaw: 0.25, scr: 'sup-map' }),
      [IDX.how]: P(add(NS, [-4.4, 1.9, -0.6]), 0.95, { yaw: 0.2, scr: 'sup-map' }),
      [IDX.tourist]: P(add(PS, [-3.35, 0, -0.4]), 1.45, { yaw: 0.3, scr: 't-id' }),
      [IDX.guide]: P(add(FS, [3.3, 0, -0.4]), 1.35, { yaw: -0.3, scr: 'sup-map' }),
      [IDX.register]: P(add(PR, [1.2, -1.9, 1.0]), 0.8, { yaw: -0.05, scr: 'sup-map' }),
    },
    P2: {
      [IDX.principles]: P(add(P0, [0.2, 2.8, 3.8]), 1.5, { scr: 't-home', pin: 0.84 }),
      [IDX.how]: P(add(NS, [4.4, 0, 0]), 1.1, { yaw: -0.25, scr: 't-home' }),
      [IDX.tourist]: P(add(PS, [3.35, 0, -0.4]), 1.45, { yaw: -0.3, scr: 't-home' }),
      [IDX.guide]: P(add(FS, [-3.3, 0, -0.4]), 1.35, { yaw: 0.3, scr: 't-program' }),
      [IDX.register]: P(add(PR, [3.6, -1.9, 1.0]), 0.8, { yaw: -0.15, scr: 't-home' }),
    },
    P3: {
      [IDX.sos]: P([4.4, 2.3, -2.2], 0.85, { frame: 'g', scr: 'sos', pin: 0.34 }),
      [IDX.tourist]: P(add(PS, [-1.15, -0.15, 0.5]), 1.45, { yaw: 0.1, scr: 'sos' }),
      [IDX.guide]: P(add(FS, [1.1, -0.15, 0.5]), 1.35, { yaw: -0.1, scr: 'emergency' }),
    },
    P4: {
      [IDX.tourist]: P(add(PS, [1.15, -0.15, 0.5]), 1.45, { yaw: -0.1, scr: 't-trip' }),
      [IDX.guide]: P(add(FS, [-1.1, -0.15, 0.5]), 1.35, { yaw: 0.1, scr: 't-attend' }),
      [IDX.bus]: P(add(B0, [-3.6, 4.4, 0.8]), 1.15, { scr: 't-attend', pin: 0.7 }),
    },
    MON: {
      [IDX.sos]: P([-1.0, 3.6, 2.4], 0.3, { frame: 'g', pin: 0.44 }),
      [IDX.principles]: P(add(P0, [-2.6, 3.9, -2.6]), 0.3, { yaw: 0.15, pin: 0.52 }),
      [IDX.how]: P(add(NS, [-4.4, -2.3, 0.8]), 0.36, { yaw: 0.2 }),
      [IDX.ops]: P(OS, 1, { yaw: -0.08 }),
      [IDX.register]: P(add(PR, [-1.2, -1.95, 1.0]), 0.27, { yaw: 0.05 }),
    },
    LOGO: {
      [IDX.how]: P(NS, 0.72),
      [IDX.register]: P(add(PR, [0, 1.3, -0.6]), 0.85),
    },
    PYR: { [IDX.roles]: P(RS, 1, { yaw: -0.4, face: false }) },
    SRV: { [IDX.register]: P(add(PR, [-3.6, -2.45, 1.0]), 0.62, { yaw: 0.2 }) },
  };
  const OBJ = {
    P1: phones[0].obj, P2: phones[1].obj, P3: phones[2].obj, P4: phones[3].obj,
    MON: monitor, LOGO: logo, PYR: pyramid, SRV: server,
  };
  const SCREEN = { P1: phones[0].screen, P2: phones[1].screen, P3: phones[2].screen, P4: phones[3].screen };
  const actors = Object.entries(KEYS).map(([name, keys], idx) => {
    const obj = OBJ[name];
    obj.rotation.order = 'YXZ';
    scene.add(obj);
    const res = {};
    for (const [i, k] of Object.entries(keys)) res[i] = { ...k, i: +i, pv: V(...k.p) };
    return { name, obj, keys: res, screen: SCREEN[name], seed: idx * 1.7 };
  });
  function nearestKey(keys, i, other) {
    if (keys[i]) return { k: keys[i], hidden: false };
    if (keys[other]) return { k: keys[other], hidden: true };
    let best = null, bd = 1e9;
    for (const k of Object.values(keys)) {
      const d = Math.abs(k.i - i);
      if (d < bd) { bd = d; best = k; }
    }
    return best ? { k: best, hidden: true } : null;
  }

  /* ---------------------------------------------------------------- */
  /* Labels                                                             */
  /* ---------------------------------------------------------------- */
  const layer = $('#labels');
  const labels = [];
  function label(html, anchor, offset, secs, cls = '', o = {}) {
    const el = document.createElement('div');
    el.className = 'lbl ' + cls;
    el.innerHTML = `<div>${html}</div>`;
    layer.appendChild(el);
    const L = { el, anchor, offset: V(...offset), secs, shown: false, w: 0, html, ...o };
    labels.push(L);
    return L;
  }
  const setHTML = (L, html) => { if (L.html !== html) { L.html = html; L.el.firstChild.innerHTML = html; L.w = 0; } };
  label('<b>جبل الفيل</b><span>العُلا</span>', rockTop, [0, 0, 0], [IDX.hero], 'place');
  label('<b>مجموعة 07</b><em class="st ok">داخل النطاق</em>', gAnchor, [0, 0.9, 0], [IDX.group]);
  label('<b><i class="dot" style="background:var(--primary)"></i>المرشد</b>', supAnchor, [0, 0.5, 0], [IDX.sos]);
  const driftL = label('', driftAnchor, [0, 0.5, 0], [IDX.sos], '', { pmin: 0.08 });
  label('<b>جوال المرشد</b>', phones[0].obj, [0, 1.2, 0], [IDX.sos], '', { pmin: 0.5 });
  label('<b>غرفة العمليات</b>', monitor, [0, 2.2, 0], [IDX.sos], '', { pmin: 0.5 });
  [['البلدة القديمة', AU.town, 0.4, 1], ['دادان', AU.dadan, 0.4, 2], ['عِكمة', AU.ikmah, 0.4, 2], ['جبل الفيل', AU.elephant, 0.45, 3], ['الحِجر', AU.hegra, 0.55, 4], ['مرايا', AU.maraya, 0.5, 5]].forEach(([n, k, y, s]) =>
    label(`<span class="num">${s}</span><b>${n}</b>`, placeAnchor(k, y), [0, 0, 0], [IDX.days], 'place'));
  const tokL = label('', tokAnchor, [0, 0, 0], [IDX.days]);
  label('<b>الشمال</b>', northAnchor, [0, 0, 0], [IDX.days], 'place');
  label('<b>1 كم</b>', scaleAnchor, [0, 0, 0], [IDX.days], 'place desk');
  label('<b>جوال السائح</b><span>الموقع · SOS · الباركود</span>', phones[1].obj, [0, 1.2, 0], [IDX.how]);
  label('<b>سحابة رِفق</b><span>قاعدة بيانات · منطق التنبيهات · صلاحيات · إشعارات فورية</span>', logo, [0, 1.75, 0], [IDX.how], 'grad');
  label('<b>فريق الرحلة</b><span>مشرف · مرشد · منسّق نقل</span>', phones[0].obj, [0, 1.2, 0], [IDX.how]);
  label('<b>غرفة العمليات</b><span>كل الرحلات · المنشأة</span>', monitor, [0, -2.25, 0], [IDX.how], 'under');
  const encA = new THREE.Object3D();
  scene.add(encA);
  label('<b>مشفّر</b>', encA, [0, 0.2, 0], [IDX.how]);
  pyramid.userData.tiers.forEach((m) => {
    const t = m.userData;
    label(`<b>${t.name}</b><span>${t.sub}</span>`, m, [0, 0, t.d / 2 + 0.05], [IDX.roles], 'flat' + (t.c === 'lav-100' ? '' : ' grad'));
  });
  [[phones[1], 'الرئيسية · أنت في أمان'], [phones[3], 'رحلتي محطة بمحطة'], [phones[2], 'زر الاستغاثة'], [phones[0], 'هويتي الرقمية']].forEach(([ph, n]) => label(`<b>${n}</b>`, ph.obj, [0, -1.15, 0], [IDX.tourist], 'under desk'));
  [[phones[0], 'خريطة المرشد'], [phones[2], 'الحالات الطارئة'], [phones[3], 'الحافلة والحضور'], [phones[1], 'برنامج الرحلة']].forEach(([ph, n]) => label(`<b>${n}</b>`, ph.obj, [0, -1.15, 0], [IDX.guide], 'under desk'));
  label('<b>تطبيق السائح</b>', phones[1].obj, [0, -1.15, 0], [IDX.register], 'under desk');
  label('<b>تطبيق المرشد</b>', phones[0].obj, [0, -1.15, 0], [IDX.register], 'under desk');
  label('<b>غرفة العمليات</b>', monitor, [0, -2.1, 0], [IDX.register], 'under desk');
  label('<b>السيرفرات وقاعدة البيانات</b>', server, [0, -0.4, 0], [IDX.register], 'under desk');
  label('<b>رِفق · تقنية تعتني بكم</b><span>منظومة واحدة لكل منشأتك</span>', logo, [0, 1.85, 0], [IDX.register], 'grad');

  // story dioramas
  const pr = { a: 0, b: 0, c: 0, d: 0 };
  let busQ = 0;
  label('<b>بدون رِفق</b>', whyA.beforeEdge, [0, 0, 0], [IDX.why], 'under');
  label('<b>مع رِفق</b>', whyA.afterEdge, [0, 0, 0], [IDX.why], 'under grad');
  label('<b>مجموعات الواتساب</b><span>رسائل كثيرة، ولا موقع</span>', whyA.bubbles, [0, 0, 0], [IDX.why]);
  label('<b>«وينك؟»</b><span>اتصالات متكررة وخطوط مشغولة</span>', whyA.phones, [0, 0, 0], [IDX.why]);
  label('<b>النداء بالأسماء</b><span>يؤخر التحرك</span>', whyA.calling, [0, 0, 0], [IDX.why]);
  label('<b>كل المجموعات على خريطة واحدة</b><em class="st ok">داخل النطاق</em>', whyA.zone, [0, 0, 0], [IDX.why]);
  label('<b>كل 10 أمتار</b><span>أو كل 45 ثانية كحد أقصى</span>', prA.walker, [0, 0, 0], [IDX.principles], '', { fn: () => pr.a });
  label('<b>قراءة أولى</b><span>داخل الهامش — لا تنبيه</span>', prA.r1, [0, 0, 0], [IDX.principles], '', { fn: () => pr.b });
  label('<b>قراءة ثانية</b><em class="st out">خارج النطاق</em>', prA.r2, [0, 0, 0], [IDX.principles], '', { fn: () => pr.b });
  label('<b>هامش يتكيّف مع دقة GPS</b>', prA.margin, [0, 0, 0], [IDX.principles], 'place', { fn: () => pr.b });
  label('<b>شبكة ضعيفة</b><span>الاستغاثة تُرسل حتى بدون موقع</span>', prA.bars, [0, 0, 0], [IDX.principles], '', { fn: () => pr.c });
  label('<b>وصلت الاستغاثة</b>', monitor, [0, 2.2, 0], [IDX.principles], '', { fn: () => pr.c });
  label('<b>خط كبير · أزرار بارتفاع 54</b><span>عربي بالكامل</span>', phones[1].obj, [0, -1.15, 0], [IDX.principles], 'under', { fn: () => pr.d });
  const busL = label('', busA.count, [0, 0, 0], [IDX.bus], 'grad');
  label('<b>منسّق النقل</b><span>يمسح الباركود عند الباب</span>', muf, [0, -0.3, 0], [IDX.bus], 'under');
  label('<b>يحتاج مرافقاً</b><span>تنبيه للمرشد عند التحرك</span>', queue[4], [0, 0.85, 0], [IDX.bus], '', { fn: () => clamp(1 - Math.abs(busQ - 4) / 1.1, 0, 1) });
  label('<b>لم يصل بعد</b><span>بالاسم والمسافة</span>', busA.miss, [0, 0, 0], [IDX.bus], '', { fn: () => win(pCur[IDX.bus], 0.72, 0.85) });

  // arcs: the SOS signal and the network
  const arcSup = makeArc(34, 'danger', 0.06);
  const arcOps = makeArc(46, 'danger', 0.06);
  const arcNet = [makeArc(30, 'primary', 0.07), makeArc(30, 'primary', 0.07), makeArc(30, 'primary', 0.07)];
  const arcPr = makeArc(36, 'danger', 0.055);
  const arcMiss = [makeArc(30, 'primary', 0.04), makeArc(30, 'primary', 0.04)];

  /* ---------------------------------------------------------------- */
  /* Layout                                                             */
  /* ---------------------------------------------------------------- */
  let W = 0, H = 0, distK = 1;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  function layout() {
    W = innerWidth;
    H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const stacked = W <= 820;
    let aw, ah, sx = 0, sy = 0;
    if (stacked) {
      aw = W; ah = H * 0.46;
      sy = H / 2 - (H * 0.09 + ah / 2);
    } else {
      const cap = $('.cap');
      const left = cap ? cap.getBoundingClientRect().left : W * 0.6;
      aw = Math.max(left - 20, W * 0.4); ah = H;
      sx = W / 2 - aw / 2;
    }
    camera.setViewOffset(W, H, sx, sy, W, H);
    distK = clamp(Math.max(1.0 / (aw / H), (stacked ? 0.85 : 1) / (ah / H)), 0.85, 2.6);
    camera.updateProjectionMatrix();
    labels.forEach((L) => (L.w = 0));
  }
  layout();
  addEventListener('resize', layout);
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ---------------------------------------------------------------- */
  /* Frame                                                              */
  /* ---------------------------------------------------------------- */
  const timer = new THREE.Timer();
  const camPos = V(), camTgt = V(), tmp = V(), tmp2 = V(), tA = V(), tB = V();
  const shotCache = new Map();
  const eA = new THREE.Euler(0, 0, 0, 'YXZ');
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const weight = (t, s, w) => clamp(1 - Math.abs(t - s) / w, 0, 1);
  const gW = (local, out) => out.copy(grp.localToWorld(tmp2.set(local.x, local.y, -local.z)));
  const colOf = { ok: C('sky-600'), out: C('warning'), sos: C('danger'), done: C('sky-600'), sup: C('primary') };
  const ringOf = { ok: C('success'), out: C('warning'), sos: C('danger'), done: C('success') };
  let time = 0, stillT = -1, stillN = 0;
  // adaptive quality: lighten the load on devices that can't keep up
  const perf = { n: 0, sum: 0, level: 0 };
  function adapt(dt) {
    if (STILL || perf.level >= 2) return;
    perf.n++;
    if (perf.n < 40) return;
    perf.sum += dt;
    if (perf.n < 160) return;
    const avg = perf.sum / 120;
    perf.n = 0;
    perf.sum = 0;
    if (perf.level === 0 && avg > 1 / 34) {
      perf.level = 1;
      renderer.setPixelRatio(1);
      layout();
      crowd.count = Math.floor(CN * 0.55);
    } else if (perf.level === 1 && avg > 1 / 26) {
      perf.level = 2;
      renderer.shadowMap.enabled = false;
      scene.traverse((o) => o.material && [].concat(o.material).forEach((m) => (m.needsUpdate = true)));
    }
  }

  function shotAt(i) {
    if (shotCache.has(i)) return shotCache.get(i);
    const s = SHOTS[i];
    const f = smooth(pCur[i]);
    const pos = V().copy(s.pos), tgt = V().copy(s.tgt);
    if (s.pos2) { pos.lerp(s.pos2, f); tgt.lerp(s.tgt2, f); }
    if (s.frame === 'g') { gW(pos, pos); gW(tgt, tgt); }
    if (s.follow) { token.getWorldPosition(tmp); tgt.lerp(tmp, s.follow); }
    const r = { pos, tgt, fov: s.fov, fog: s.fog };
    shotCache.set(i, r);
    return r;
  }
  function keyWorld(k, out) {
    if (k.frame === 'g') return gW(k.pv, out);
    return out.copy(k.pv);
  }
  function keyRot(k, pos, out) {
    let yaw = k.yaw || 0, pitch = k.pitch || 0;
    if (k.face !== false) {
      const cam = shotAt(k.i).pos;
      const d = tmp.copy(cam).sub(pos);
      yaw += Math.atan2(d.x, d.z);
      pitch += -Math.atan2(d.y, Math.hypot(d.x, d.z));
    }
    return out.setFromEuler(eA.set(pitch, yaw, k.roll || 0, 'YXZ'));
  }

  function frame(ts) {
    timer.update(ts);
    const dt = Math.min(timer.getDelta(), 0.05);
    if (STILL) {
      const key = tTarget * 1000 + pTarget.reduce((x, y) => x + y, 0);
      if (key === stillT && stillN > 2) { requestAnimationFrame(frame); return; }
      if (key !== stillT) { stillT = key; stillN = 0; }
      stillN++;
    }
    time = STILL ? 1.3 : time + dt;
    adapt(dt);
    const k = STILL ? 1 : 1 - Math.exp(-dt * 4);
    tCur += (tTarget - tCur) * k;
    for (let i = 0; i < N; i++) pCur[i] += (pTarget[i] - pCur[i]) * k;
    if (Math.abs(tTarget - tCur) < 1e-4) tCur = tTarget;
    const t = tCur;
    shotCache.clear();
    const pS = pCur[IDX.sos], pD = pCur[IDX.days];
    storyUI(pS, pD);

    // one world, two scales: Elephant Rock (1 unit = 4 m) shrinks 100× into the AlUla map (1 unit = 400 m)
    const zf = smooth(clamp(t - IDX.sos, 0, 1));
    const sH = Math.pow(0.01, zf);
    HAR.scale.setScalar(sH);
    HAR.position.y = 0.04 * (1 - sH);
    const mapA = smooth(clamp((0.12 - sH) / 0.09, 0, 1));
    const harA = smooth(clamp((sH - 0.03) / 0.07, 0, 1));
    MAPG.visible = mapA > 0.005;
    for (const m of mapMats) { m.transparent = mapA < 0.999; m.opacity = mapA; }
    for (const m of harFade) { m.transparent = harA < 0.999; m.opacity = harA; }
    ground.visible = harA > 0.005;
    hills.forEach((h) => (h.visible = harA > 0.005));
    crowd.visible = grp.visible = sH > 0.025;

    // the moving group
    const th = TH0 + OMEGA * time;
    grp.position.set(RG * Math.cos(th), 0, -RG * Math.sin(th));
    grp.rotation.y = th;
    HAR.updateMatrixWorld(true);
    crowdTime.value = time;

    // SOS story: one visitor drifts away, presses SOS, the guide arrives
    const drift = win(pS, 0.02, 0.22);
    const walk = win(pS, 0.6, 0.88);
    const dState = pS < SOS_T.out ? 'ok' : pS < SOS_T.sos ? 'out' : pS < SOS_T.done ? 'sos' : 'done';
    const dA = MEM[DRIFT].a + drift * 3.0, dB = MEM[DRIFT].b - drift * 2.0;
    MEM.forEach((m, i) => {
      let a = m.a, b = m.b;
      if (i === DRIFT) { a = dA; b = dB; }
      else if (i === SUP) { a = lerp(m.a, dA - 0.38, walk); b = lerp(m.b, dB + 0.3, walk); }
      else if (!REDUCED) { a += Math.sin(time * 0.7 + m.ph) * 0.06; b += Math.cos(time * 0.6 + m.ph) * 0.06; }
      m4.makeTranslation(a, 0.2, -b);
      memMesh.setMatrixAt(i, m4);
      memMesh.setColorAt(i, i === SUP ? colOf.sup : i === DRIFT ? colOf[dState] : colOf.ok);
      memRings[i].mesh.position.set(a, 0.07, -b);
      if (i === DRIFT) {
        memRings[i].mesh.material.color.copy(ringOf[dState]);
        memRings[i].period = dState === 'sos' ? 0.75 : dState === 'out' ? 1.6 : 2.4;
      }
    });
    memMesh.instanceMatrix.needsUpdate = true;
    memMesh.instanceColor.needsUpdate = true;
    driftAnchor.position.set(dA, 0.2, -dB);
    supAnchor.position.set(lerp(MEM[SUP].a, dA - 0.38, walk), 0.2, -lerp(MEM[SUP].b, dB + 0.3, walk));
    setHTML(driftL, {
      ok: '',
      out: '<b><i class="dot" style="background:var(--warning)"></i>خارج النطاق</b><span>بعد قراءتين متتاليتين</span>',
      sos: walk > 0.02 ? '<b><i class="dot" style="background:var(--danger)"></i>استغاثة</b><em class="st info">المرشد في الطريق</em>' : '<b><i class="dot" style="background:var(--danger)"></i>استغاثة · SOS</b><em class="st sos">أُرسل · استُلم</em>',
      done: '<b><i class="dot" style="background:var(--success)"></i>تم الوصول</b>',
    }[dState]);

    // camera
    const i0 = Math.min(Math.floor(t), N - 1);
    const i1 = Math.min(i0 + 1, N - 1);
    const f = smooth(clamp(t - i0, 0, 1));
    const Sa = shotAt(i0), Sb = shotAt(i1);
    if (i0 === IDX.sos && i1 === IDX.days) {
      // one continuous zoom-out: the group → Elephant Rock → AlUla
      const dA = Sa.pos.distanceTo(Sa.tgt) / sH;
      const dB = Sb.pos.distanceTo(Sb.tgt);
      const dir = tA.copy(Sa.pos).sub(Sa.tgt).normalize().lerp(tB.copy(Sb.pos).sub(Sb.tgt).normalize(), smooth(clamp(f * 1.7, 0, 1))).normalize();
      camTgt.lerpVectors(Sa.tgt, Sb.tgt, smooth(clamp((f - 0.3) / 0.7, 0, 1)));
      camPos.copy(camTgt).addScaledVector(dir, Math.exp(lerp(Math.log(dA), Math.log(dB), f)));
    } else {
      camPos.lerpVectors(Sa.pos, Sb.pos, f);
      camTgt.lerpVectors(Sa.tgt, Sb.tgt, f);
      camPos.y += Math.min(Sa.pos.distanceTo(Sb.pos) * 0.18, 26) * Math.sin(Math.PI * f);
    }
    camPos.sub(camTgt).multiplyScalar(distK).add(camTgt);
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    const pd = camPos.distanceTo(camTgt) * 0.02;
    camPos.x += pointer.x * pd;
    camPos.y -= pointer.y * pd * 0.6;
    camera.position.copy(camPos);
    camera.fov = lerp(Sa.fov, Sb.fov, f);
    camera.lookAt(camTgt);
    camera.updateProjectionMatrix();
    scene.fog.near = lerp(Sa.fog[0], Sb.fog[0], f) * distK;
    scene.fog.far = lerp(Sa.fog[1], Sb.fog[1], f) * distK;

    // sun + shadow box follow the focus
    const camDist = camPos.distanceTo(camTgt);
    const half = clamp(camDist * 0.7, 10, 95);
    const sc = sun.shadow.camera;
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
    sc.updateProjectionMatrix();
    sun.target.position.copy(camTgt).setY(0);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 120);

    // actors
    for (const a of actors) {
      const na = nearestKey(a.keys, i0, i1);
      const nb = nearestKey(a.keys, i1, i0);
      if (!na || !nb) { a.obj.visible = false; continue; }
      const scA = na.hidden ? 0 : na.k.s * (na.k.pin != null ? win(pCur[i0], na.k.pin, na.k.pin + 0.08) : 1);
      const scB = nb.hidden ? 0 : nb.k.s * (nb.k.pin != null ? win(pCur[i1], nb.k.pin, nb.k.pin + 0.08) : 1);
      const s = lerp(scA, scB, f);
      if (s < 0.002) { a.obj.visible = false; continue; }
      a.obj.visible = true;
      keyWorld(na.k, tA);
      keyWorld(nb.k, tB);
      a.obj.position.lerpVectors(tA, tB, f);
      keyRot(na.k, tA, qa);
      keyRot(nb.k, tB, qb);
      a.obj.quaternion.slerpQuaternions(qa, qb, f);
      a.obj.scale.setScalar(s);
      if (!REDUCED) {
        a.obj.position.y += Math.sin(time * 0.8 + a.seed) * 0.06 * s;
        eA.setFromQuaternion(a.obj.quaternion, 'YXZ');
        eA.y += Math.sin(time * 0.4 + a.seed) * 0.03;
        a.obj.quaternion.setFromEuler(eA);
      }
      if (a.screen) {
        const u = a.screen.uniforms;
        u.texA.value = tex[na.k.scr];
        u.texB.value = tex[nb.k.scr];
        u.mixv.value = na.k.scr === nb.k.scr ? 0 : clamp((f - 0.3) / 0.4, 0, 1);
        a.scr = [na.k.scr, nb.k.scr];
      }
    }
    if (!REDUCED && time - lastLive > 1 / 15) {
      lastLive = time;
      const used = new Set();
      for (const a of actors) if (a.obj.visible && a.scr) a.scr.forEach((k) => used.add(k));
      used.forEach((k) => LIVE[k] && paint(LIVE[k], time));
    }
    if (logo.visible && !REDUCED) logo.rotation.y += Math.sin(time * 0.6) * 0.05;

    // pulses (map language)
    for (const r of pulses) {
      const kk = REDUCED ? 0.35 : ((time + r.phase) % r.period) / r.period;
      r.mesh.scale.setScalar(1 + kk * r.grow);
      r.mesh.material.opacity = 0.85 * (1 - kk);
    }

    // the day's stops: each leg draws in as the group travels
    const dP = pD * NSTOP;
    STOPS.forEach((d, i) => {
      const prog = clamp(dP - i, 0, 1);
      const show = weight(t, IDX.days, 0.75) > 0 && prog > 0;
      d.mesh.visible = show;
      if (show) d.geo.setDrawRange(0, Math.floor((d.count * prog) / 3) * 3);
    });
    const di = Math.min(NSTOP - 1, Math.floor(dP));
    STOPS[di].curve.getPointAt(clamp(dP - di, 0, 1), token.position);
    token.position.y -= 0.1 + di * 0.022;
    const sn = pD <= 0.001 ? 0 : Math.min(NSTOP, Math.floor(dP - 1e-6) + 1);
    setHTML(tokL, (sn ? `<span class="num">${sn}</span>` : '') + '<b>مجموعة 07</b>');
    token.visible = weight(t, IDX.days, 0.75) > 0;
    compass.visible = scaleBar.visible = weight(t, IDX.days, 0.8) > 0;

    // arcs
    const wSos = weight(t, IDX.sos, 0.7);
    const grow = win(pS, 0.42, 0.52);
    const fade = 1 - win(pS, 0.86, 0.95);
    gW(tmp.set(dA, 0.3, dB), arcSup.from);
    arcOps.from.copy(arcSup.from);
    phones[0].obj.getWorldPosition(arcSup.to);
    monitor.getWorldPosition(arcOps.to);
    arcSup.lift = 2.2; arcOps.lift = 3.5;
    arcSup.grow = arcOps.grow = grow;
    arcSup.vis = arcOps.vis = wSos * (grow > 0 ? 1 : 0) * fade;
    const wNet = smooth(weight(t, IDX.how, 0.85));
    const nodes = [phones[1].obj, logo, phones[0].obj, monitor];
    [[0, 1], [1, 2], [1, 3]].forEach(([a, b], j) => {
      nodes[a].getWorldPosition(arcNet[j].from);
      nodes[b].getWorldPosition(arcNet[j].to);
      arcNet[j].lift = 0.8;
      arcNet[j].grow = 1;
      arcNet[j].vis = wNet;
    });
    encA.position.copy(arcNet[0].from).lerp(arcNet[0].to, 0.5).add(tmp.set(0, 0.6, 0));
    // story dioramas
    const wWhy = smooth(weight(t, IDX.why, 0.85)), wPr = smooth(weight(t, IDX.principles, 0.85)), wBus = smooth(weight(t, IDX.bus, 0.85));
    [[why, wWhy], [prin, wPr], [bus, wBus]].forEach(([g, w]) => { g.visible = w > 0.01; g.scale.setScalar(Math.max(w, 0.001)); });
    if (why.visible) {
      lost.forEach((o) => { o.m.position.x = o.x + Math.sin(time * 0.5 + o.ph) * 0.25; o.m.position.z = o.z + Math.cos(time * 0.4 + o.ph) * 0.25; });
      bubbles.forEach((b) => (b.position.y = b.userData.y + (REDUCED ? 0 : Math.sin(time * 1.6 + b.userData.ph) * 0.12)));
      callers.forEach((c, i) => (c.rotation.z = REDUCED ? 0 : Math.sin(time * 28 + i) * 0.09));
      waves.forEach((w, k) => (w.material.opacity = REDUCED ? 0.6 : 0.15 + 0.85 * Math.max(0, Math.sin(time * 4 - k * 0.9))));
    }
    arcPr.vis = 0;
    if (prin.visible) {
      const pp = pCur[IDX.principles];
      const vis = (k) => smooth(clamp(1 - Math.abs(pp - k / 3) / 0.24, 0, 1));
      pr.a = vis(0); pr.b = vis(1); pr.c = vis(2); pr.d = vis(3);
      const uw = REDUCED ? 0.42 : 0.04 + 0.5 * ((time * 0.05) % 1);
      const go = smooth(clamp((pp - 0.12) / 0.2, 0, 1));
      pathCurve.getPointAt(lerp(uw, U2, go), prP.position);
      prP.position.y = 0.22;
      prRing.position.set(prP.position.x, 0.03, prP.position.z);
      const st = pp < 0.17 ? 'ok' : pp < 0.5 ? 'out' : pp < 0.84 ? 'sos' : 'ok';
      prP.material.color.copy(colOf[st]);
      prRing.material.color.copy(ringOf[st]);
      prPulse.period = st === 'sos' ? 0.75 : st === 'out' ? 1.6 : 2.4;
      pings.forEach((pg) => {
        const passed = uw >= pg.u || go > 0.5;
        pg.g.scale.setScalar(passed ? 1 : 0.001);
        const k = clamp((uw - pg.u) / 0.06, 0, 1);
        pg.r.visible = pr.a > 0.05 && uw >= pg.u && k < 1;
        pg.r.scale.setScalar(1 + k * 2.2);
        pg.r.material.opacity = (1 - k) * 0.9 * pr.a;
      });
      fenceP.scale.setScalar(Math.max(0.001, smooth(clamp((pp - 0.1) / 0.15, 0, 1))));
      read1.scale.setScalar(Math.max(0.001, pr.b));
      read2.scale.setScalar(Math.max(0.001, smooth(clamp((pp - 0.2) / 0.1, 0, 1))));
      bars.scale.setScalar(Math.max(0.001, pr.c));
      prP.getWorldPosition(arcPr.from);
      monitor.getWorldPosition(arcPr.to);
      arcPr.lift = 2.4;
      arcPr.grow = 1;
      arcPr.vis = pr.c * wPr;
    }
    arcMiss.forEach((a) => (a.vis = 0));
    if (bus.visible) {
      const pb = pCur[IDX.bus];
      busQ = pb * 8;
      let atDoor = false;
      queue.forEach((g, k) => {
        const sk = k - busQ;
        if (sk >= 0) { g.visible = true; g.position.set(2.0 + sk * 0.5, 0, 2.6); g.scale.setScalar(1); if (sk < 0.3) atDoor = true; }
        else if (sk > -1) { const fq = -sk; g.visible = true; g.position.set(1.5, 0, lerp(2.25, 1.1, fq)); g.scale.setScalar(Math.max(0.001, 1 - fq)); atDoor = true; }
        else g.visible = false;
      });
      scan.visible = atDoor;
      setHTML(busL, `<b>صعدوا ${40 + Math.min(8, Math.round(busQ))} من 50</b>`);
      const mv = win(pb, 0.7, 0.85);
      missG.scale.setScalar(Math.max(0.001, mv));
      missing.forEach((m, j) => {
        m.getWorldPosition(arcMiss[j].from);
        busA.door.getWorldPosition(arcMiss[j].to);
        arcMiss[j].lift = 1.4;
        arcMiss[j].grow = 1;
        arcMiss[j].vis = mv * wBus;
      });
    }
    arcs.forEach((a) => drawArc(a, REDUCED ? 0.4 : time));

    renderer.render(scene, camera);

    // labels
    for (const L of labels) {
      let w = 0;
      for (const s of L.secs) {
        let ws = weight(t, s, 0.32);
        if (L.pmin != null) ws *= win(pCur[s], L.pmin, L.pmin + 0.05);
        if (L.fn) ws *= L.fn();
        w = Math.max(w, ws);
      }
      if (w <= 0.02 || !L.html || !L.anchor.visible || (L.anchor.parent && !L.anchor.parent.visible)) {
        if (L.shown) { L.el.style.opacity = '0'; L.shown = false; }
        continue;
      }
      L.anchor.updateWorldMatrix(true, false);
      tmp.copy(L.offset).applyMatrix4(L.anchor.matrixWorld).project(camera);
      if (tmp.z > 1) { L.el.style.opacity = '0'; L.shown = false; continue; }
      if (!L.w) L.w = L.el.firstChild.offsetWidth || 120;
      const x = clamp((tmp.x * 0.5 + 0.5) * W, L.w / 2 + 8, W - L.w / 2 - 8);
      const y = (-tmp.y * 0.5 + 0.5) * H;
      L.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      L.el.style.opacity = smooth(w).toFixed(3);
      L.shown = true;
    }
    requestAnimationFrame(frame);
  }
  measure();
  updateUI();
  tCur = tTarget;
  pCur.set(pTarget);
  requestAnimationFrame(() => {
    canvas.classList.add('ready');
    document.documentElement.classList.add('ready');
    frame(performance.now());
  });
}

start().catch((e) => {
  console.error(e);
  document.body.classList.add('no-gl');
}).finally(() => {
  if (document.body.classList.contains('no-gl')) document.documentElement.classList.add('ready');
});
setTimeout(() => document.documentElement.classList.add('ready'), 9000);
