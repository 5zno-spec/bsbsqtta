const $ = s => document.querySelector(s);
const KEY = 'tiger-day-v1';
const clamp = v => Math.max(0, Math.min(100, v));
const fresh = () => ({
  hunger: 70, hygiene: 70, energy: 70, veg: 0, toilet: 25, lather: 0, brush: 0, routine: null,
  plots: [0, 1, 2].map(() => ({ s: 0, t: 0 })), // s: 0 فارغ، 1 مزروع، 2 ينمو، 3 جاهز
  dirt: [], sleeping: false
});

let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { S = fresh(); }
S.toilet = S.toilet ?? 25; S.lather = S.lather ?? 0; S.work = S.work ?? 0; // حقول جديدة لحفظ قديم
S.brush = S.brush ?? 0; S.routine = S.routine ?? null;
// تسلسل العناية: المرحاض ← الصابون ← الماء ← الفرشاة ← الطعام (routine: soap | rinse | brush | food | null)
const routineBusy = () => S.routine === 'soap' || S.routine === 'rinse' || S.routine === 'brush';
// تسلسل اليوم: الاستيقاظ ← حمام بتفاصيله (مرحاض، صابون، ماء، فرشاة) ← طعام ← حمام ينظف نفسه ← تنظيف البيت ← زرع ← حمام ← طعام ← حمام ← تنظيف البيت ← نوم
// S.step رقم الخطوة الحالية. بعد إنجازها يفكّر النمر في التالية أينما كان اللاعب، وبعد النوم يبدأ يوم جديد من الاستيقاظ
const DAY = ['bath', 'food', 'bath', 'clean', 'farm', 'bath', 'food', 'bath', 'clean', 'sleep'];
if (S.step == null) S.step = S.sleeping ? DAY.length - 1 : S.routine === 'food' ? 1 : 0;
else if (S.dayV !== 2) S.step = [0, 1, 3, 4, 5, 6, 8, 9][S.step] ?? 0; // حفظ بالتسلسل القديم (٨ خطوات)
S.dayV = 2;
const step = () => DAY[S.step] || DAY[0];
function done(kind) {
  if (step() !== kind) return;
  if ((kind === 'food' || kind === 'bath') && S.routine === 'food') S.routine = null;
  S.step = Math.min(S.step + 1, DAY.length - 1); save(); think();
}
let mode = S.sleeping ? 'sleep' : 'eat';
const GROW_MS = 15000;
const APPLES_PER_TREE = 3; // كم تفاحة تعطي الشجرة عند القطف
// صور مراحل نمو التفاحة (مجلد apple): بذرة ← فسيلة ← نبتة ← شجرة مزهرة ← شجرة مثمرة
const pic = n => `<img class="ico" src="apple/${n}.png" alt="" draggable="false">`;
const APPLE = pic('apple'), SEED = pic('seed');
// صور الأدوات (مجلد items): الدش للحمام، الدورق لسقي الزرع، والعلبة والمنديل من قمامة البيت
const item = n => `<img class="ico" src="items/${n}.png" alt="" draggable="false">`;
const SHOWER = item('shower'), CAN = item('can'), TISSUE = item('tissue'), JUICE = item('juice'), FAUCET = item('faucet');
// الدش: يظهر خيار الدش في الحمام بعد هذا العدد من أعمال الزرع والتنظيف (زرع، سقي، قطف، رمي قمامة)
const SHOWER_AFTER = 4;
const needShower = () => (S.work || 0) >= SHOWER_AFTER;
let showering = false;
const PAPER = item('paper'), GLASS = item('glass');
const STAGES = ['', 'seed', 'sprout', 'tree'];                    // بحسب حالة الحفرة s
const growStage = prog => prog < 1 / 3 ? 'sprout' : prog < 2 / 3 ? 'plant' : 'blossom'; // أثناء النمو (s = 2)

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
const room = () => clamp(100 - S.dirt.length * 12);

// عند الاستيقاظ أول ما يريده النمر هو الحمام (حتى تكتمل نظافته)
function wakeUp() { S.wakeBath = S.hygiene < 100; S.toilet = 100; S.sleepReady = false; S.step = 0; }

function say(t) { $('#msg').textContent = t; }

// المهمة المطلوبة من اللاعب الآن: صورة فقط في فقاعة تفكير فوق رأس النمر
// العنصر الثالث في كل مهمة: محدّد CSS للعنصر المطلوب الضغط عليه (تشير إليه اليد إن تأخر اللاعب)، أو null إن لم يكن هناك ما يُضغط
const NAV = m => `.nav button[data-mode="${m}"]`, ACT = k => `.act[data-act="${k}"]`;
function task() {
  if (S.sleeping) return null;
  const st = step();
  // النوم: يحتاج المرحاض أولًا (في أي شاشة)، ثم إطفاء الضوء في غرفة النوم
  if (st === 'sleep') {
    if (!S.sleepReady) return ['🚽', 'يحتاج المرحاض قبل النوم', mode === 'bath' ? ACT('toilet') : NAV('bath')];
    return mode === 'sleep' ? ['🌙', 'أطفئ الضوء لينام', ACT('sleep')] : ['🌙', 'حان وقت النوم', NAV('sleep')];
  }
  // الطعام بلا تفاح: المطلوب المزرعة (زرع ثم سقي ثم قطف) قبل الأكل
  const noApple = st === 'food' && S.veg < 1;
  const here = noApple ? 'farm' : { bath: 'bath', food: 'eat', clean: 'clean', farm: 'farm' }[st];
  if (mode !== here) { // النمر ليس في مكان الخطوة: يفكّر في الخطوة التالية بدل تكرار ما انتهى
    if (st === 'bath') return ['🛁', 'حان وقت الحمام', NAV('bath')];
    if (noApple) return ['🌱', 'اذهب إلى المزرعة', NAV('farm')];
    if (st === 'food') return [APPLE, 'حان وقت الطعام', NAV('eat')];
    if (st === 'clean') return ['🗑️', 'حان وقت التنظيف', NAV('clean')];
    return [SEED, 'حان وقت الزرع', NAV('farm')];
  }
  if (mode === 'farm') {
    if (S.plots.some(p => p.s === 3)) return [APPLE, 'اقطف التفاح', '#plots .spot[data-s="3"]'];
    if (needWater()) return [CAN, 'اسقِ البذرة', '#bubbles .bubble[data-kind="water"]'];
    if (S.plots.some(p => p.s === 2)) return ['⏳', 'انتظر النبتة تنمو', null];
    return [SEED, 'ازرع البذرة', ACT('seed')];
  }
  if (mode === 'eat') return [APPLE, 'أطعمه تفاحة', ACT('feed')];
  if (mode === 'bath') {
    if (S.routine === 'soap') return ['🧼', 'افرك بالصابون', ACT('soap')];
    if (S.routine === 'rinse') return [FAUCET, 'اشطفه بالماء', ACT('rinse')];
    if (S.routine === 'brush') return ['🪥', 'نظّف أسنانه بالفرشاة', ACT('brush')];
    if (needShower()) return [SHOWER, 'خذ دشًا بعد العمل', ACT('shower')];
    return ['🚽', 'ابدأ بالمرحاض', ACT('toilet')];
  }
  return S.dirt.length ? ['🗑️', 'ارمِ القمامة في السلة', '#layer .dirt'] : ['✨', 'البيت نظيف', null];
}
function think() {
  const el = $('#think'), t = task();
  if (t) { if (el.dataset.k !== t[0]) { el.dataset.k = t[0]; el.innerHTML = t[0]; } el.setAttribute('aria-label', t[1]); }
  el.hidden = !t || showering;
}
function anim(c) {
  const t = $('#tiger');
  t.classList.remove('hop', 'chew', 'wiggle'); void t.offsetWidth; t.classList.add(c);
  setTimeout(() => t.classList.remove(c), c === 'hop' ? 1300 : 950);
}
const hop = () => anim('hop');
function fx(txt, cls, x, y) {
  const e = document.createElement('div');
  e.className = cls; e.innerHTML = txt;
  if (x != null) { e.style.left = x + '%'; e.style.top = y + '%'; }
  $('#fx').appendChild(e); setTimeout(() => e.remove(), 1300);
}
// فقاعة مدح عند إتمام مهمة: كلمة مختلفة كل مرة
const PRAISE = ['أحسنت', 'رائع', 'نشيط', 'عظيم'];
let lastPraise = -1;
function praise() {
  let i; do { i = Math.floor(Math.random() * PRAISE.length); } while (i === lastPraise);
  lastPraise = i;
  const e = document.createElement('div');
  e.className = 'praise'; e.textContent = PRAISE[i]; SFX.praise();
  $('#actor').appendChild(e); setTimeout(() => e.remove(), 1800);
}
function eat() {
  const t = $('#tiger');
  t.classList.remove('eating'); void t.offsetWidth; t.classList.add('eating');
  SFX.crunch(0.6); setTimeout(SFX.yum, 1500);
  setTimeout(() => anim('chew'), 600);
  setTimeout(() => hearts(3), 1500);
  setTimeout(() => t.classList.remove('eating'), 2100);
}
function hearts(n = 3) {
  for (let i = 0; i < n; i++) setTimeout(() => fx('❤️', 'heart', 38 + Math.random() * 24, 22 + Math.random() * 12), i * 120);
}
// ---------- القمامة والسلة ----------
const JUNK = [TISSUE, JUICE, PAPER, GLASS];
const JUNK_NAMES = ['منديل', 'علبة عصير', 'ورقة قديمة', 'زجاجة مكسورة'];
const junk = k => JUNK[k % JUNK.length];
const BIN = '<svg viewBox="0 0 64 76" aria-hidden="true"><g class="lid"><rect x="6" y="8" width="52" height="8" rx="4" fill="#7d909a" stroke="#4d5c64" stroke-width="2"/><rect x="24" y="2" width="16" height="8" rx="3" fill="#7d909a" stroke="#4d5c64" stroke-width="2"/></g><path d="M10 20 H54 L50 70 Q50 74 46 74 H18 Q14 74 14 70 Z" fill="#9fb2ba" stroke="#4d5c64" stroke-width="2" stroke-linejoin="round"/><path d="M24 28 V66 M32 28 V66 M40 28 V66" stroke="#4d5c64" stroke-width="2.5" stroke-linecap="round" opacity=".55"/></svg>';

// تفتح سلة قمامة بجانب العنصر ويدخل فيها ثم تُغلق وتختفي
function toBin(d) {
  SFX.bin();
  const fxl = $('#fx'), W = fxl.clientWidth, H = fxl.clientHeight;
  const below = d.y < 55, bx = d.x / 100 * W, by = (d.y + (below ? 15 : -15)) / 100 * H;
  const bin = document.createElement('div');
  bin.className = 'bin'; bin.innerHTML = BIN;
  bin.style.left = bx + 'px'; bin.style.top = by + 'px';
  const it = document.createElement('div');
  it.className = 'junk'; it.innerHTML = junk(d.k);
  it.style.left = d.x / 100 * W + 'px'; it.style.top = d.y / 100 * H + 'px';
  fxl.append(bin, it);
  const lid = bin.querySelector('.lid');
  const T = { fill: 'forwards', easing: 'ease-in-out' };
  bin.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 220, fill: 'forwards', easing: 'cubic-bezier(.3,1.5,.5,1)' });
  lid.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-62deg) translateY(-3px)' }], { delay: 180, duration: 220, ...T });
  const dx = bx - d.x / 100 * W, dy = by - d.y / 100 * H - 26;
  it.animate([
    { transform: 'translate(-50%,-50%) scale(1) rotate(0)', offset: 0 },
    { transform: `translate(calc(-50% + ${dx * .5}px),calc(-50% + ${Math.min(dy, 0) - 40}px)) scale(1.1) rotate(160deg)`, offset: .5 },
    { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.35) rotate(340deg)`, opacity: 0.2, offset: 1 }
  ], { delay: 380, duration: 480, ...T });
  lid.animate([{ transform: 'rotate(-62deg) translateY(-3px)' }, { transform: 'rotate(0)' }], { delay: 900, duration: 200, ...T });
  bin.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.12)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }], { delay: 1150, duration: 260, fill: 'forwards' });
  setTimeout(() => fx('✨', 'poof', d.x, d.y + (below ? 15 : -15)), 1000);
  setTimeout(praise, 950);
  setTimeout(() => { bin.remove(); it.remove(); }, 1450);
}

// القمامة تتوزع على أرضية البيت (تحت خط الأفق عند 62% من المشهد) بتباعد متساوٍ تقريبًا
const FLOOR = { x0: 8, x1: 92, y0: 68, y1: 90 };
function floorSpot(others) {
  const L = $('#layer'), W = L.clientWidth || 360, H = L.clientHeight || 640;
  let best = { x: 50, y: 80 }, bd = -1;
  for (let i = 0; i < 60; i++) {
    const x = FLOOR.x0 + Math.random() * (FLOOR.x1 - FLOOR.x0), y = FLOOR.y0 + Math.random() * (FLOOR.y1 - FLOOR.y0);
    let d = Infinity;
    for (const o of others) d = Math.min(d, Math.hypot((x - o.x) * W / 100, (y - o.y) * H / 100));
    if (d > bd) { bd = d; best = { x, y }; }
  }
  return best;
}
// قمامة محفوظة من نسخة سابقة كانت في الهواء: تنزل إلى الأرض بين الباقي
function layoutDirt() {
  const onFloor = d => d.x >= FLOOR.x0 - 1 && d.x <= FLOOR.x1 + 1 && d.y >= FLOOR.y0 - 1 && d.y <= FLOOR.y1 + 1;
  const placed = S.dirt.filter(onFloor);
  S.dirt.filter(d => !onFloor(d)).forEach(d => { const p = floorSpot(placed); d.x = p.x; d.y = p.y; placed.push(d); });
}

let decorKey = '';
function paintDecor() {
  if (mode === decorKey) return; decorKey = mode;
  const r = (a, b) => (a + Math.random() * (b - a)).toFixed(1);
  let h = '';
  if (mode === 'farm') h = '<span class="sun">☀️</span><span class="cloud" style="top:6%;animation-duration:40s">☁️</span><span class="cloud" style="top:18%;animation-duration:55s;animation-delay:-25s">☁️</span><span class="bfly">🦋</span>';
  if (mode === 'bath') {
    h += `<span style="top:1%;left:44%;font-size:2.8rem">${SHOWER}</span>`;
  }
  if (mode === 'sleep') { h = '<span class="moon">🌙</span>'; for (let i = 0; i < 8; i++) h += `<span class="star" style="left:${r(5, 92)}%;top:${r(4, 50)}%;animation-delay:-${r(0, 2)}s">⭐</span>`; }
  if (mode === 'clean') for (let i = 0; i < 4; i++) h += `<span class="star" style="left:${r(5, 92)}%;top:${r(8, 55)}%;animation-delay:-${r(0, 2)}s">✨</span>`;
  $('#decor').innerHTML = h;
}

function paintStats() {
  const v = { hunger: S.hunger, hygiene: S.hygiene, energy: S.energy, room: room() };
  for (const k in v) {
    const b = $('#b-' + k);
    b.style.width = v[k] + '%';
    b.classList.toggle('low', v[k] < 25);
  }
}

// زر فعل: أيقونة كبيرة فقط، ونصه يظهر في فقاعة سريعة عند الضغط
function setAct(b, icon, label) {
  b.innerHTML = `<em>${icon}</em>`;
  b.dataset.label = label; b.setAttribute('aria-label', label);
}

let tipTimer;
function showTip(btn) {
  const text = btn.dataset.label; if (!text) return;
  let t = $('#tip');
  if (!t) { t = document.createElement('div'); t.id = 'tip'; t.className = 'tip'; document.body.appendChild(t); }
  t.textContent = text; t.classList.remove('on'); void t.offsetWidth;
  const r = btn.getBoundingClientRect();
  t.style.left = '0px'; t.style.bottom = (innerHeight - r.top + 12) + 'px';
  const w = t.offsetWidth, cx = r.left + r.width / 2;
  const x = Math.max(8 + w / 2, Math.min(innerWidth - 8 - w / 2, cx));
  t.style.left = x + 'px'; t.style.setProperty('--tail', (cx - x) + 'px');
  t.classList.add('on');
  clearTimeout(tipTimer); tipTimer = setTimeout(() => t.classList.remove('on'), 900);
}
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.nav button, .act');
  if (b) { showTip(b); if (b.closest('.nav')) SFX.nav(); else SFX.tap(); }
});

function setMode(m) {
  if (S.sleeping && m !== 'sleep') { S.sleeping = false; say('استيقظ النمر'); SFX.wake(); wakeUp(); }
  mode = m;
  document.querySelectorAll('.nav button').forEach(b =>
    b.setAttribute('aria-current', b.dataset.mode === m));
  render();
}

function render() {
  const stage = $('#stage'), layer = $('#layer'), panel = $('#panel');
  stage.dataset.mode = mode;
  stage.classList.toggle('night', S.sleeping);
  paintDecor();
  layer.innerHTML = ''; panel.innerHTML = '';
  if (mode !== 'farm') { $('#plots').innerHTML = ''; $('#bubbles').innerHTML = ''; }
  if (mode !== 'bath') { const a = $('#actor'); a.style.left = ''; a.style.bottom = ''; }

  if (mode === 'farm') {
    paintPlots();
    const b = document.createElement('button');
    b.className = 'act seed'; b.dataset.act = 'seed'; b.disabled = !S.plots.some(p => p.s === 0);
    setAct(b, SEED, 'بذرة');
    b.onclick = () => plantSeed();
    panel.appendChild(b);
    const c = document.createElement('p');
    c.className = 'hint'; c.innerHTML = `${APPLE} ${S.veg}`;
    panel.appendChild(c);
    ensureBubbles();
  }
  if (mode === 'eat') {
    const b = document.createElement('button');
    b.className = 'act'; b.dataset.act = 'feed'; b.disabled = S.veg < 1 || routineBusy();
    setAct(b, APPLE, `أطعمه تفاحة (عندك ${S.veg})`);
    b.onclick = feed; panel.appendChild(b);
  }
  if (mode === 'bath') {
    [['🚽', 'المرحاض', toilet, 'toilet'], ['🧼', 'استحمام بالصابون', soap, 'soap'], [FAUCET, 'غسل بالماء', rinse, 'rinse'], ['🪥', 'غسل بالفرشاة', brushUp, 'brush']].concat(needShower() ? [[SHOWER, 'دش للاستحمام', takeShower, 'shower']] : []).forEach(([ic, lb, fn, key]) => {
      const b = document.createElement('button');
      b.className = 'act'; b.dataset.act = key; setAct(b, ic, lb); b.onclick = fn; panel.appendChild(b);
    });
  }
  if (mode === 'clean') {
    S.dirt.forEach((d, i) => {
      const e = document.createElement('button');
      if (d.k == null) d.k = Math.floor(Math.random() * JUNK.length);
      e.className = 'dirt'; e.innerHTML = junk(d.k);
      e.setAttribute('aria-label', JUNK_NAMES[d.k]);
      e.style.left = d.x + '%'; e.style.top = d.y + '%';
      e.onclick = () => {
        SFX.grab(); toBin(d);
        if (S.dirt.length === 1) setTimeout(SFX.done, 1500);
        work(); S.dirt.splice(i, 1); if (!S.dirt.length) done('clean'); save(); paintStats(); render();
        say(S.dirt.length ? 'أحسنت، تابع.' : 'البيت نظيف!');
      };
      layer.appendChild(e);
    });
    const h = document.createElement('p');
    h.className = 'hint';
    h.textContent = `🗑️ ${S.dirt.length}`;
    panel.appendChild(h);
  }
  if (mode === 'sleep') {
    const b = document.createElement('button');
    b.className = 'act'; b.dataset.act = 'sleep';
    setAct(b, S.sleeping ? '☀️' : '🌙', S.sleeping ? 'أيقظه' : 'أطفئ الضوء ونام');
    b.onclick = () => {
      if (!S.sleeping && !S.sleepReady) {
        S.toilet = Math.max(S.toilet, 85); SFX.no(); say('يحتاج النمر المرحاض قبل النوم 🚽');
        save(); think(); return;
      }
      S.sleeping = !S.sleeping; if (S.sleeping) { SFX.sleep(); S.wakeBath = false; S.sleepReady = false; } else { SFX.wake(); wakeUp(); }
      say(S.sleeping ? 'نام النمر…' : 'استيقظ النمر');
      save(); render();
    };
    panel.appendChild(b);
    if (S.sleeping) {
      const z = document.createElement('div'); z.className = 'zzz'; z.textContent = 'Zzz';
      layer.appendChild(z);
    }
  }
  panel.dataset.n = panel.children.length; // عدد عناصر اللوحة: يضيّق CSS الأزرار لتتسع في العرض
  think();
}

// ---------- المزرعة ----------
// حالة الحفرة: 0 فارغة، 1 بذرة على الأرض تحتاج ماء، 2 تنمو (فسيلة ثم نبتة ثم شجرة مزهرة)، 3 شجرة تفاح جاهزة للقطف
const PLOT_X = [9.5, 24, 38.5]; // موضع الحفر على الأرض (% من عرض المشهد)
const needWater = () => S.plots.some(p => p.s === 1);

function farmHint() {
  if (S.plots.some(p => p.s === 3)) return 'التفاح جاهز! المس الشجرة لتقطف التفاح.';
  if (needWater()) return 'اضغط على الدورق داخل الفقاعات لتسقي البذرة.';
  if (S.plots.some(p => p.s === 2)) return 'الشجرة تنمو… انتظر قليلًا.';
  return 'اضغط على البذرة لتزرعها في الأرض.';
}

function paintPlots() {
  const box = $('#plots');
  if (mode !== 'farm') { box.innerHTML = ''; return; }
  S.plots.forEach((p, i) => {
    let el = box.children[i], isNew = !el;
    if (isNew) {
      el = document.createElement('button');
      el.className = 'spot'; el.style.left = PLOT_X[i] + '%';
      el.innerHTML = '<em></em><span class="mound"></span><small></small>';
      el.onclick = () => plotAction(i);
      box.appendChild(el);
    }
    const em = el.children[0], lab = el.children[2];
    const ms = Math.max(0, p.t - Date.now());
    const prog = p.s === 2 ? 1 - ms / GROW_MS : 0;
    const k = p.s === 2 ? growStage(prog) : STAGES[p.s]; // اسم الصورة المعروضة الآن
    if (k) {
      let img = em.firstChild;
      if (!img) { img = document.createElement('img'); img.alt = ''; img.draggable = false; em.appendChild(img); }
      if (em.dataset.k !== k) { // تغيّرت المرحلة: صورة جديدة بقفزة نمو صغيرة
        em.dataset.k = k; img.src = `apple/${k}.png`;
        if (!isNew) { img.classList.remove('grow'); void img.offsetWidth; img.classList.add('grow'); }
      }
    } else { em.replaceChildren(); delete em.dataset.k; }
    lab.textContent = ['', 'تحتاج ماء', Math.ceil(ms / 1000) + 'ث', 'اقطف!'][p.s];
    el.setAttribute('aria-label', ['حفرة فارغة', 'بذرة تحتاج ماء', 'شجرة تنمو', 'شجرة تفاح جاهزة للقطف'][p.s]);
    if (el.dataset.s !== String(p.s)) {
      el.dataset.s = p.s; em.className = ''; void em.offsetWidth;
      if (!isNew) em.className = ['', 'seed', 'sprout', 'ripe'][p.s];
      else if (p.s === 3) em.className = 'ripe';
    }
  });
}

function spawnBubble(kind) {
  const b = document.createElement('button');
  b.className = 'bubble'; b.dataset.kind = kind;
  b.setAttribute('aria-label', kind === 'water' ? 'دورق ماء' : 'صابونة');
  b.style.left = (4 + Math.random() * 42).toFixed(1) + '%';
  b.style.animationDuration = (6 + Math.random() * 2.5).toFixed(1) + 's';
  b.innerHTML = `<i>${kind === 'water' ? CAN : '🧼'}</i>`;
  b.onclick = () => popBubble(b);
  b.addEventListener('animationend', e => { if (e.target === b) b.remove(); });
  $('#bubbles').appendChild(b);
  setTimeout(() => b.remove(), 10000);
}

function ensureBubbles() {
  const box = $('#bubbles');
  if (mode !== 'farm' || !needWater() || box.children.length >= 3) return;
  if (!box.querySelector('[data-kind=water]')) spawnBubble('water');
  else if (Math.random() < 0.5) spawnBubble('soap');
}

function popBubble(b) {
  const sr = $('#fx').getBoundingClientRect(), r = b.getBoundingClientRect();
  const x = (r.left + r.width / 2 - sr.left) / sr.width * 100;
  const y = (r.top + r.height / 2 - sr.top) / sr.height * 100;
  const kind = b.dataset.kind; b.remove(); fx('🫧', 'poof', x, y); SFX.pop();
  if (kind !== 'water') { say('هذه صابونة للاستحمام. اختر الدورق'); return; }
  const i = S.plots.findIndex(p => p.s === 1);
  if (i < 0) { say('لا توجد بذرة تحتاج إلى سقي.'); return; }
  water(i);
}

function water(i) {
  const p = S.plots[i], w = document.createElement('div');
  w.className = 'water'; w.style.left = PLOT_X[i] + '%'; w.style.top = '66%';
  w.innerHTML = `<span>${CAN}</span>` + '<b style="left:-4px">💧</b><b style="left:12px;animation-delay:.15s">💧</b><b style="left:28px;animation-delay:.3s">💧</b>';
  $('#fx').appendChild(w); setTimeout(() => w.remove(), 1500);
  SFX.water(); p.s = 2; p.t = Date.now() + GROW_MS; work();
  if (!needWater()) $('#bubbles').innerHTML = '';
  say('سقيت البذرة فنبتت! انتظر لتكبر.'); praise();
  save(); render();
}

function plantSeed() {
  const i = S.plots.findIndex(p => p.s === 0);
  if (i < 0) { say('كل الأرض مزروعة. اسقِ البذور أو اقطف التفاح.'); SFX.no(); return; }
  S.plots[i] = { s: 1, t: 0 }; SFX.seed(); work();
  say('وقعت البذرة على الأرض.'); praise();
  save(); render();
  setTimeout(ensureBubbles, 600);
}

function plotAction(i) {
  const p = S.plots[i];
  if (p.s === 0) { plantSeed(); return; }
  if (p.s === 1) { say('تحتاج ماء. اضغط على الدورق داخل الفقاعات.'); ensureBubbles(); return; }
  if (p.s === 2) { say('ما زالت تنمو.'); return; }
  p.s = 0; S.veg += APPLES_PER_TREE; SFX.harvest(); work(); done('farm'); fx('✨', 'poof', PLOT_X[i], 70);
  for (let n = 0; n < APPLES_PER_TREE; n++) setTimeout(() => fx(APPLE, 'apple-up', PLOT_X[i] + (n - 1) * 7, 66), n * 140);
  say('قطفت التفاح من الشجرة!'); praise(); save(); render();
}

// العمل (زرع، سقي، قطف، رمي قمامة) يتعب النمر ويوسّخه قليلًا، وبعد عدّة أعمال يظهر خيار الدش في الحمام
function work() {
  S.work = (S.work || 0) + 1; S.hygiene = clamp(S.hygiene - 2); paintStats();
  if (S.work === SHOWER_AFTER) setTimeout(() => say('تعب النمر من العمل! اذهب إلى الحمام لتغسله بالدش 🚿'), 1300);
}

// الدش: يغسل النمر كله دفعة واحدة، ثم يختفي الخيار حتى يعمل النمر من جديد
function takeShower() {
  if (!needShower()) { SFX.no(); say('النمر لم يتعب بعد من العمل.'); return; }
  S.work = 0; S.hygiene = 100; S.lather = 0; S.wakeBath = false; showering = true;
  const a = $('#actor').getBoundingClientRect(), f = $('#fx').getBoundingClientRect(), r = (x, y) => (x + Math.random() * (y - x)).toFixed(1);
  const sh = document.createElement('div');
  sh.className = 'shower-fx'; sh.style.left = ((a.left + a.width / 2 - f.left) / f.width * 100).toFixed(1) + '%';
  sh.style.top = ((a.top - f.top) / f.height * 100 - 7).toFixed(1) + '%';
  sh.innerHTML = SHOWER + Array.from({ length: 16 }, () => `<i style="left:${r(4, 52)}%;animation-delay:-${r(0, .6)}s;--dx:${r(-14, 6)}px"></i>`).join('');
  $('#fx').appendChild(sh);
  SFX.water(); anim('wiggle'); foam('🫧', 5, 30); setTimeout(() => foam('🫧', 4, 40), 900);
  setTimeout(() => { sh.remove(); showering = false; praise(); think(); }, 2400);
  say('استحم النمر بالدش! صار نظيفًا ولامعًا.');
  save(); paintStats(); render();
}

function feed() {
  if (S.veg < 1) return;
  if (routineBusy()) { SFX.no(); say('اغسله أولًا: صابون ثم ماء ثم فرشاة 🧼🚰🪥'); return; }
  S.routine = null;
  S.veg--; S.hunger = clamp(S.hunger + 30); S.sleepReady = false;
  setTimeout(() => { S.toilet = Math.max(S.toilet, 85); save(); think(); }, 2300); // يحتاج المرحاض بعد الأكل
  fx(APPLE, 'fly'); eat();
  say(S.hunger >= 100 ? 'شبع النمر تمامًا!' : 'ممم، لذيذة!'); setTimeout(praise, 700);
  done('food');
  save(); paintStats(); render();
}

// احتياجات الحمام: الاستحمام بالصابون، ثم الغسل بالماء، والمرحاض
function foam(ch, n, y0 = 30) { for (let i = 0; i < n; i++) fx(ch, 'foam', 25 + Math.random() * 50, y0 + Math.random() * 30); }
function soap() {
  S.lather = clamp(S.lather + 25); S.hygiene = clamp(S.hygiene + 5);
  SFX.scrub(); anim('wiggle'); foam('🫧', 4);
  if (S.hygiene >= 100) S.wakeBath = false;
  if (S.routine === 'soap' && S.lather >= 50) S.routine = 'rinse';
  say(S.lather >= 50 ? 'كثير من الرغوة! اشطفه بالماء 🚰' : 'استمر في الفرك.');
  save(); paintStats(); think();
}
function rinse() {
  SFX.water(); foam('💧', 6, 20);
  if (S.lather <= 0) {
    S.hygiene = clamp(S.hygiene + 2); say('اغسله بالصابون أولًا لينظف أكثر.');
    save(); paintStats(); think(); return;
  }
  const was = S.hygiene;
  S.hygiene = clamp(S.hygiene + S.lather * 0.25); S.lather = 0;
  anim('wiggle');
  if (was < 100 && S.hygiene >= 100) praise();
  if (S.hygiene >= 100) S.wakeBath = false;
  if (S.routine === 'rinse') S.routine = 'brush';
  say(S.routine === 'brush' ? 'تم الشطف! الآن الفرشاة 🪥' : S.hygiene >= 100 ? 'النمر نظيف ولامع!' : 'تم الشطف! كرّر الصابون لينظف أكثر.');
  save(); paintStats(); think();
}
function brushUp() {
  if (S.routine === 'soap' || S.routine === 'rinse') {
    SFX.no(); say(S.routine === 'soap' ? 'ابدأ بالصابون 🧼 ثم الماء 🚰' : 'اشطفه بالماء أولًا 🚰'); return;
  }
  S.brush = clamp(S.brush + 25);
  SFX.scrub(); anim('wiggle'); foam('✨', 4, 25);
  if (S.routine === 'brush' && S.brush >= 50) {
    S.routine = 'food'; S.brush = 0; S.hygiene = clamp(S.hygiene + 5);
    setTimeout(praise, 500); say(DAY[S.step + 1] === 'food' ? 'أسنانه نظيفة! حان وقت الطعام 🍎' : 'أسنانه نظيفة! ✨'); done('bath');
  } else if (S.routine === 'brush') say('استمر في الفرك.');
  else { S.brush = 0; say('أسنان النمر نظيفة.'); }
  save(); paintStats(); think();
}
function toilet() {
  const start = step() === 'bath' && !routineBusy(); // المرحاض يبدأ سلسلة الغسل في خطوة الحمام فقط، فلا يتكرر الغسل بعد الأكل
  if (S.toilet < 30 && S.sleepReady && !start) { SFX.no(); say('لا يحتاج النمر المرحاض الآن.'); return; }
  S.toilet = 0; S.sleepReady = true; SFX.flush(); fx('🚽', 'poof', 50, 60); anim('hop'); setTimeout(praise, 600);
  if (start) { S.routine = 'soap'; S.lather = 0; S.brush = 0; }
  say(start ? 'ارتاح النمر! الآن الصابون 🧼' : 'ارتاح النمر!'); save(); think();
}

function tick() {
  const sl = S.sleeping;
  S.hunger = clamp(S.hunger - (sl ? 0.1 : 0.35));
  S.hygiene = clamp(S.hygiene - (sl ? 0.05 : 0.2));
  S.toilet = clamp(S.toilet + (sl ? 0.08 : 0.25));
  S.energy = clamp(S.energy + (sl ? 2 : -0.2));
  let redraw = false;

  if (sl && S.energy >= 100) { S.sleeping = false; say('صباح الخير! النمر مليء بالطاقة.'); SFX.wake(); wakeUp(); redraw = true; }
  if (!sl && Math.random() < 0.08 && S.dirt.length < 8) {
    const p = floorSpot(S.dirt);
    S.dirt.push({ x: p.x, y: p.y, k: Math.floor(Math.random() * JUNK.length) });
    if (mode === 'clean') redraw = true;
  }
  S.plots.forEach(p => { if (p.s === 2 && Date.now() >= p.t) p.s = 3; });
  // خطوات تنتهي من تلقاء نفسها: البيت نظيف بلا قمامة، أو النمر شبعان
  if (!sl && step() === 'clean' && !S.dirt.length) done('clean');
  if (!sl && step() === 'food' && S.hunger >= 100) done('food');
  if (mode === 'farm') { paintPlots(); ensureBubbles(); }

  save(); paintStats(); think();
  if (redraw) render();
}

document.querySelectorAll('.nav button').forEach(b => {
  const s = b.querySelector('span'); b.dataset.label = s.textContent; b.setAttribute('aria-label', s.textContent);
  b.onclick = () => setMode(b.dataset.mode);
});
$('#stage').addEventListener('pointermove', e => {
  const r = $('#stage').getBoundingClientRect();
  $('#tiger').style.setProperty('--tilt', (((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(1) + 'deg');
});
// في الحمام: صورة الخلفية أكبر من الشاشة، تُسحب بالإصبع أو الفأرة لإظهار بقيتها
let bx = 50, pan = null, dragged = false;
const stageEl = $('#stage');
stageEl.style.setProperty('--bx', bx + '%');
stageEl.addEventListener('pointerdown', e => {
  if (mode !== 'bath' || e.button > 0) return;
  dragged = false; pan = { x: e.clientX, bx };
});
addEventListener('pointermove', e => {
  if (!pan) return;
  const dx = e.clientX - pan.x;
  if (!dragged && Math.abs(dx) < 8) return;
  dragged = true; stageEl.classList.add('panning');
  const W = stageEl.clientWidth, H = stageEl.clientHeight, range = Math.max(1, Math.max(W * 1.5, H * 1.18) - W);
  bx = Math.max(0, Math.min(100, pan.bx - dx / range * 100));
  stageEl.style.setProperty('--bx', bx.toFixed(1) + '%');
});
const endPan = () => { pan = null; stageEl.classList.remove('panning'); };
addEventListener('pointerup', endPan); addEventListener('pointercancel', endPan);
// بعد السحب لا نحسبها ضغطة (لا مشي ولا قفز)
stageEl.addEventListener('click', e => { if (dragged) { e.stopPropagation(); dragged = false; } }, true);

// في الحمام: النمر ثابت في مكانه والخلفية هي التي تتحرك: عند الضغط على أي مكان يمشي النمر (في مكانه) وتنزلق الخلفية نحو ذلك الاتجاه
let walkTimer, bgAnim;
$('#stage').addEventListener('click', e => {
  if (mode !== 'bath' || S.sleeping || e.target.closest('#tiger, button')) return;
  const a = $('#actor'), ar = a.getBoundingClientRect();
  const W = stageEl.clientWidth, H = stageEl.clientHeight, range = Math.max(1, Math.max(W * 1.5, H * 1.18) - W);
  const dxPx = e.clientX - (ar.left + ar.width / 2);
  const from = bx, to = Math.max(0, Math.min(100, from + dxPx / range * 100));
  if (Math.abs(to - from) < 0.2) return; // وصلت الخلفية لحدّها: لا مكان آخر للمشي نحوه
  const dur = Math.min(1100, 350 + Math.abs(dxPx) * 1.5), t0 = performance.now();
  a.classList.add('walk', 'go'); clearTimeout(walkTimer); cancelAnimationFrame(bgAnim);
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), ease = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    bx = from + (to - from) * ease; stageEl.style.setProperty('--bx', bx.toFixed(1) + '%');
    if (k < 1) bgAnim = requestAnimationFrame(step);
  };
  bgAnim = requestAnimationFrame(step);
  walkTimer = setTimeout(() => a.classList.remove('walk', 'go'), dur);
});
// القفز فقط عند الضغط على البطن
$('#tiger').addEventListener('click', e => {
  const r = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  if (x < 0.34 || x > 0.66 || y < 0.48 || y > 0.84) return;
  hop(); hearts(2); SFX.boing();
});
const sndBtn = $('#snd');
const paintSnd = () => { sndBtn.textContent = SFX.on ? '🔊' : '🔇'; sndBtn.setAttribute('aria-pressed', SFX.on); sndBtn.setAttribute('aria-label', SFX.on ? 'إيقاف الصوت' : 'تشغيل الصوت'); };
sndBtn.onclick = () => { SFX.set(!SFX.on); paintSnd(); };
paintSnd();
// ---------- يد تشير إلى المطلوب ----------
// إن لم يستجب اللاعب لمهمة النمر ٧ ثوان تظهر يد بإصبع تشير إلى الزر أو العنصر المطلوب، وتختفي عند أي استجابة
const HINT_MS = 7000;
let hintSince = Date.now(), hintKey = '', handSel = '', handRaf = 0;
const handEl = document.createElement('div'), handIc = document.createElement('span');
handEl.id = 'hand'; handEl.className = 'hand'; handEl.hidden = true; handEl.appendChild(handIc); document.body.appendChild(handEl);
function hideHand() { handSel = ''; handEl.hidden = true; if (handRaf) cancelAnimationFrame(handRaf); handRaf = 0; }
function placeHand() {
  const el = handSel && document.querySelector(handSel), r = el && el.getBoundingClientRect();
  if (!r || !r.width || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) handEl.style.visibility = 'hidden';
  else {
    const down = r.top + r.height / 2 > innerHeight * 0.55; // العنصر في النصف السفلي: اليد فوقه وإصبعها إلى الأسفل
    if (handEl.dataset.d !== String(down)) { handEl.dataset.d = String(down); handEl.classList.toggle('down', down); handIc.textContent = down ? '👇' : '👆'; }
    const x = r.left + r.width / 2, y = down ? r.top + r.height * 0.42 - 44 : r.top + r.height * 0.58;
    handEl.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; handEl.style.visibility = 'visible';
  }
  handRaf = requestAnimationFrame(placeHand);
}
function showHand(sel) {
  handSel = sel; handEl.hidden = false;
  if (!handRaf) handRaf = requestAnimationFrame(placeHand);
}
function hintCheck() {
  const ins = $('#install'), t = S.sleeping || showering || $('#splash') || (ins && !ins.hidden) ? null : task();
  const key = t ? t[0] + '|' + t[1] : '';
  if (key !== hintKey) { hintKey = key; hintSince = Date.now(); hideHand(); return; } // مهمة جديدة: تبدأ المهلة من جديد
  if (t && t[2] && Date.now() - hintSince >= HINT_MS) showHand(t[2]); else hideHand();
}
setInterval(hintCheck, 300);
// الاستجابة = الضغط على زر أو عنصر من عناصر المهام (لا اللعب بالنمر): تُعاد المهلة وتختفي اليد
document.addEventListener('pointerdown', e => {
  if (e.target.closest && e.target.closest('.nav button, .act, .spot, .bubble, .dirt')) { hintSince = Date.now(); hideHand(); }
}, true);

// الواجهة الرئيسية: تُزال بعد اكتمال شريط التقدم (5 ثوان) مع مهلة احتياطية، ثم تبدأ مهلة اليد من جديد
(() => {
  const sp = $('#splash'), bar = sp && sp.querySelector('.splash-bar b');
  if (!sp) return;
  let gone = false;
  const close = () => {
    if (gone) return; gone = true;
    sp.classList.add('out');
    setTimeout(() => { sp.remove(); hintSince = Date.now(); }, 480);
  };
  if (bar) bar.addEventListener('animationend', close);
  setTimeout(close, 5800);
})();

layoutDirt();
setMode(mode);
paintStats();
setInterval(tick, 1000);
