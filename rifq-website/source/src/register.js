// رِفق — organisation registration. Writes one document to Firestore `registrations`
// (project rift-8fcd8). Add ?dry to test the form without writing anything.
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore/lite';

// Public web config (not a secret; access is controlled by Firestore rules) — same as the Rifq web app.
const FIREBASE = {
  apiKey: 'AIzaSyByGv-P1sKlc5MuF9Jh5pi6thHA6yrqU1k',
  authDomain: 'rift-8fcd8.firebaseapp.com',
  projectId: 'rift-8fcd8',
  storageBucket: 'rift-8fcd8.firebasestorage.app',
  messagingSenderId: '149586140109',
  appId: '1:149586140109:web:41365c389379722bf8c284',
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const DRY = params.has('dry');
const AR = '٠١٢٣٤٥٦٧٨٩';
const toLatin = (s) => String(s || '').replace(/[٠-٩]/g, (d) => AR.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const digits = (s) => toLatin(s).replace(/\D/g, '');

let sector = params.get('sector') === 'tourism' ? 'tourism' : 'hajj';
const COPY = {
  hajj: { lic: 'رقم ترخيص وزارة الحج والعمرة', app: 'تطبيق الحاج', field: 'تطبيق الفريق الميداني', back: 'hajj.html' },
  tourism: { lic: 'رقم ترخيص وزارة السياحة', app: 'تطبيق السائح', field: 'تطبيق المرشد', back: 'alula.html' },
};
function setSector(s) {
  sector = s;
  $$('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sector === s)));
  $$('[data-for]').forEach((sec) => {
    const on = sec.dataset.for === s;
    sec.hidden = !on;
    $$('input,select,textarea', sec).forEach((el) => (el.disabled = !on));
  });
  $('#eLicLab').textContent = COPY[s].lic;
  $('#platApp').textContent = COPY[s].app;
  $('#platField').textContent = COPY[s].field;
  $('#explore').href = COPY[s].back;
  $('#back').href = COPY[s].back;
  history.replaceState(null, '', `?sector=${s}${DRY ? '&dry' : ''}`);
}
$$('.seg button').forEach((b) => b.addEventListener('click', () => setSector(b.dataset.sector)));
setSector(sector);

// ---------- validation ----------
function fieldOf(el) { return el.closest('.f'); }
function mark(el, bad) {
  const f = fieldOf(el);
  if (!f) return;
  f.classList.toggle('bad', bad);
  const err = $('.err', f);
  if (err) {
    if (!err.id) err.id = 'err-' + Math.random().toString(36).slice(2, 8);
    const ctl = el.matches('input,select,textarea') ? el : $('input', el);
    if (ctl) {
      if (bad) ctl.setAttribute('aria-describedby', err.id);
      else ctl.removeAttribute('aria-describedby');
      ctl.setAttribute('aria-invalid', String(bad));
    }
  }
}
const RULES = {
  eName: (v) => v.trim().length >= 2,
  eType: (v) => !!v,
  eNum: (v) => /^\d{10}$/.test(digits(v)),
  eCity: (v) => !!v,
  cName: (v) => v.trim().length >= 3,
  cTitle: (v) => v.trim().length >= 2,
  cPhone: (v) => /^05\d{8}$/.test(normPhone(v)),
  cEmail: (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()),
  hCount: (v) => +digits(v) >= 1,
  hSeason: (v) => !!v,
  tCount: (v) => +digits(v) >= 1,
};
function normPhone(v) {
  let d = digits(v);
  if (d.startsWith('966')) d = '0' + d.slice(3);
  if (d.length === 9 && d.startsWith('5')) d = '0' + d;
  return d;
}
function checkOne(el) {
  if (el.disabled) return true;
  const rule = RULES[el.id];
  const ok = rule ? rule(el.value) : true;
  mark(el, !ok);
  return ok;
}
function checkGroup(g) {
  if ($('input', g).disabled) return true;
  const ok = $$('input:checked', g).length > 0;
  mark(g, !ok);
  return ok;
}
Object.keys(RULES).forEach((id) => {
  const el = $('#' + id);
  el.addEventListener('blur', () => el.value && checkOne(el));
  el.addEventListener('input', () => fieldOf(el).classList.contains('bad') && checkOne(el));
});
$$('[data-req]').forEach((g) => g.addEventListener('change', () => checkGroup(g)));
$('#consent').addEventListener('change', (e) => mark(e.target, !e.target.checked));

// ---------- submit ----------
const num = (id) => {
  const el = $('#' + id);
  if (el.disabled || el.value === '') return null;
  return Math.max(0, Math.floor(+digits(el.value)));
};
const val = (id) => {
  const el = $('#' + id);
  return el.disabled ? '' : el.value.trim();
};
const picked = (id) => $$(`#${id} input:checked`).map((i) => i.value);

function payload() {
  const ops = sector === 'hajj'
    ? { services: picked('hSvc'), expected: num('hCount'), groups: num('hGroups'), staff: num('hStaff'), season: val('hSeason') }
    : { activities: picked('tAct'), destinations: picked('tDest'), expected: num('tCount'), trips: num('tTrips'), guides: num('tGuides'), startMonth: val('tStart') || null };
  return {
    sector,
    entity: { name: val('eName'), type: val('eType'), unifiedNumber: digits(val('eNum')), license: val('eLic'), city: val('eCity'), address: val('eAddr') },
    contact: { name: val('cName'), title: val('cTitle'), phone: normPhone(val('cPhone')), email: val('cEmail').toLowerCase() },
    ops,
    platforms: picked('plat'),
    notes: val('notes'),
    consent: true,
    status: 'new',
    source: 'website',
    createdAt: Date.now(),
  };
}

let db = null;
function getDb() {
  if (!db) db = getFirestore(initializeApp(FIREBASE));
  return db;
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

$('#reg').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fail = $('#fail');
  fail.classList.remove('on');
  let ok = true;
  Object.keys(RULES).forEach((id) => { if (!checkOne($('#' + id))) ok = false; });
  $$('[data-req]').forEach((g) => { if (!checkGroup(g)) ok = false; });
  const consent = $('#consent');
  mark(consent, !consent.checked);
  if (!consent.checked) ok = false;
  if (!ok) {
    const first = $('.f.bad input, .f.bad select, .f.bad textarea');
    if (first) first.focus();
    fail.textContent = 'راجع الحقول المظللة بالأحمر ثم أعد الإرسال.';
    fail.classList.add('on');
    return;
  }
  const btn = $('#send');
  btn.disabled = true;
  btn.textContent = 'جارٍ الإرسال…';
  try {
    const data = payload();
    let id = 'TEST-ONLY';
    if (DRY) console.info('dry payload', JSON.stringify(data));
    if (!DRY) {
      const ref = await withTimeout(addDoc(collection(getDb(), 'registrations'), data), 15000);
      id = ref.id;
    }
    $('#ref').textContent = 'رقم المرجع: ' + id.slice(0, 8).toUpperCase();
    $('#reg').hidden = true;
    const done = $('#done');
    done.classList.add('on');
    done.focus();
    scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error(err);
    const code = (err && err.code) || err.message;
    fail.textContent = code === 'timeout' || code === 'unavailable'
      ? 'تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة.'
      : code === 'permission-denied'
        ? 'تعذّر حفظ التسجيل حاليًا. حاول لاحقًا أو تواصل مع فريق رِفق.'
        : 'حدث خطأ غير متوقع. أعد المحاولة.';
    fail.classList.add('on');
  } finally {
    btn.disabled = false;
    btn.textContent = 'إرسال التسجيل';
  }
});
