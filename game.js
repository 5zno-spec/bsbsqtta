const $ = s => document.querySelector(s);
const KEY = 'tiger-day-v1';
const clamp = v => Math.max(0, Math.min(100, v));
const fresh = () => ({
  hunger: 70, hygiene: 70, energy: 70, veg: 0,
  plots: [0, 1, 2].map(() => ({ s: 0, t: 0 })), // s: 0 فارغ، 1 مزروع، 2 ينمو، 3 جاهز
  dirt: [], sleeping: false
});

let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { S = fresh(); }
let mode = S.sleeping ? 'sleep' : 'eat';
const GROW_MS = 15000;

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
const room = () => clamp(100 - S.dirt.length * 12);

function say(t) { $('#msg').textContent = t; }
function anim(c) {
  const t = $('#tiger');
  t.classList.remove('hop', 'chew', 'wiggle'); void t.offsetWidth; t.classList.add(c);
  setTimeout(() => t.classList.remove(c), 950);
}
const hop = () => anim('hop');
function fx(txt, cls, x, y) {
  const e = document.createElement('div');
  e.className = cls; e.textContent = txt;
  if (x != null) { e.style.left = x + '%'; e.style.top = y + '%'; }
  $('#fx').appendChild(e); setTimeout(() => e.remove(), 1300);
}
function eat() {
  const t = $('#tiger');
  t.classList.remove('eating'); void t.offsetWidth; t.classList.add('eating');
  setTimeout(() => anim('chew'), 600);
  setTimeout(() => hearts(3), 1500);
  setTimeout(() => t.classList.remove('eating'), 2100);
}
function hearts(n = 3) {
  for (let i = 0; i < n; i++) setTimeout(() => fx('❤️', 'heart', 38 + Math.random() * 24, 22 + Math.random() * 12), i * 120);
}
let decorKey = '';
function paintDecor() {
  if (mode === decorKey) return; decorKey = mode;
  const r = (a, b) => (a + Math.random() * (b - a)).toFixed(1);
  let h = '';
  if (mode === 'farm') h = '<span class="sun">☀️</span><span class="cloud" style="top:6%;animation-duration:40s">☁️</span><span class="cloud" style="top:18%;animation-duration:55s;animation-delay:-25s">☁️</span><span class="bfly">🦋</span>';
  if (mode === 'bath') {
    for (let i = 0; i < 9; i++) h += `<span class="bub" style="left:${r(4, 92)}%;font-size:${r(16, 30)}px;animation-delay:-${r(0, 6)}s;animation-duration:${r(5, 8)}s">🫧</span>`;
    for (let i = 0; i < 7; i++) h += `<span class="drop" style="left:${r(30, 70)}%;animation-delay:-${r(0, 1)}s">💧</span>`;
    h += '<span style="top:1%;left:46%;font-size:2rem">🚿</span>';
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

function setMode(m) {
  if (S.sleeping && m !== 'sleep') { S.sleeping = false; say('استيقظ النمر'); }
  mode = m;
  document.querySelectorAll('.nav button').forEach(b =>
    b.setAttribute('aria-current', b.dataset.mode === m));
  render();
  if (m === 'farm') say(farmHint());
}

function render() {
  const stage = $('#stage'), layer = $('#layer'), panel = $('#panel');
  stage.dataset.mode = mode;
  stage.classList.toggle('night', S.sleeping);
  paintDecor();
  layer.innerHTML = ''; panel.innerHTML = '';
  if (mode !== 'farm') { $('#plots').innerHTML = ''; $('#bubbles').innerHTML = ''; }

  if (mode === 'farm') {
    paintPlots();
    const b = document.createElement('button');
    b.className = 'act seed'; b.disabled = !S.plots.some(p => p.s === 0);
    b.innerHTML = '<em>🌰</em>بذرة';
    b.onclick = () => plantSeed();
    panel.appendChild(b);
    const c = document.createElement('p');
    c.className = 'hint'; c.textContent = `🥕 ${S.veg}`;
    panel.appendChild(c);
    ensureBubbles();
  }
  if (mode === 'eat') {
    const b = document.createElement('button');
    b.className = 'act'; b.disabled = S.veg < 1;
    b.textContent = `أطعمه جزرة (عندك ${S.veg})`;
    b.onclick = feed; panel.appendChild(b);
    if (S.veg < 1) say('لا يوجد طعام. اذهب إلى المزرعة واحصد جزرًا.');
  }
  if (mode === 'bath') {
    const b = document.createElement('button');
    b.className = 'act'; b.textContent = 'افرك بالصابون';
    b.onclick = scrub; panel.appendChild(b);
  }
  if (mode === 'clean') {
    S.dirt.forEach((d, i) => {
      const e = document.createElement('button');
      e.className = 'dirt'; e.textContent = '💩';
      e.setAttribute('aria-label', 'بقعة وسخ');
      e.style.left = d.x + '%'; e.style.top = d.y + '%';
      e.onclick = () => { fx('✨', 'poof', d.x, d.y); S.dirt.splice(i, 1); hop(); save(); paintStats(); render(); say(S.dirt.length ? 'أحسنت، تابع.' : 'البيت نظيف!'); };
      layer.appendChild(e);
    });
    const h = document.createElement('p');
    h.className = 'hint';
    h.textContent = S.dirt.length ? `المس البقع لإزالتها (${S.dirt.length})` : 'البيت نظيف الآن.';
    panel.appendChild(h);
  }
  if (mode === 'sleep') {
    const b = document.createElement('button');
    b.className = 'act';
    b.textContent = S.sleeping ? 'أيقظه' : 'أطفئ الضوء ونام';
    b.onclick = () => {
      S.sleeping = !S.sleeping;
      say(S.sleeping ? 'نام النمر…' : 'استيقظ النمر');
      save(); render();
    };
    panel.appendChild(b);
    if (S.sleeping) {
      const z = document.createElement('div'); z.className = 'zzz'; z.textContent = 'Zzz';
      layer.appendChild(z);
    }
  }
}

// ---------- المزرعة ----------
// حالة الحفرة: 0 فارغة، 1 بذرة على الأرض تحتاج ماء، 2 نبتة تنمو، 3 جزرة جاهزة
const PLOT_X = [11, 26, 41]; // موضع الحفر على الأرض (% من عرض المشهد)
const needWater = () => S.plots.some(p => p.s === 1);

function farmHint() {
  if (S.plots.some(p => p.s === 3)) return 'الجزر جاهز! المس الجزرة لتحصدها.';
  if (needWater()) return 'اضغط على الرشاش 🚿 داخل الفقاعات لتسقي البذرة.';
  if (S.plots.some(p => p.s === 2)) return 'النبتة تنمو… انتظر قليلًا.';
  return 'اضغط على البذرة 🌰 لتزرعها في الأرض.';
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
    em.textContent = ['', '🌰', prog < 0.5 ? '🌱' : '🌿', '🥕'][p.s];
    em.style.fontSize = ['1.5rem', '1.5rem', (1.9 + prog * 0.8).toFixed(2) + 'rem', '2.7rem'][p.s];
    lab.textContent = ['', 'تحتاج ماء', Math.ceil(ms / 1000) + 'ث', 'احصد!'][p.s];
    el.setAttribute('aria-label', ['حفرة فارغة', 'بذرة تحتاج ماء', 'نبتة تنمو', 'جزرة جاهزة للحصاد'][p.s]);
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
  b.setAttribute('aria-label', kind === 'water' ? 'رشاش ماء' : 'صابونة');
  b.style.left = (4 + Math.random() * 42).toFixed(1) + '%';
  b.style.animationDuration = (6 + Math.random() * 2.5).toFixed(1) + 's';
  b.innerHTML = `<i>${kind === 'water' ? '🚿' : '🧼'}</i>`;
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
  const kind = b.dataset.kind; b.remove(); fx('🫧', 'poof', x, y);
  if (kind !== 'water') { say('هذه صابونة للاستحمام. اختر الرشاش 🚿'); return; }
  const i = S.plots.findIndex(p => p.s === 1);
  if (i < 0) { say('لا توجد بذرة تحتاج إلى سقي.'); return; }
  water(i);
}

function water(i) {
  const p = S.plots[i], w = document.createElement('div');
  w.className = 'water'; w.style.left = PLOT_X[i] + '%'; w.style.top = '66%';
  w.innerHTML = '<span>🚿</span><b style="left:-4px">💧</b><b style="left:12px;animation-delay:.15s">💧</b><b style="left:28px;animation-delay:.3s">💧</b>';
  $('#fx').appendChild(w); setTimeout(() => w.remove(), 1500);
  p.s = 2; p.t = Date.now() + GROW_MS;
  if (!needWater()) $('#bubbles').innerHTML = '';
  say('سقيت البذرة فصارت نبتة! انتظر لتنمو.');
  save(); render();
}

function plantSeed() {
  const i = S.plots.findIndex(p => p.s === 0);
  if (i < 0) { say('كل الأرض مزروعة. اسقِ البذور أو احصد الجزر.'); return; }
  S.plots[i] = { s: 1, t: 0 };
  say('وقعت البذرة على الأرض. اضغط على الرشاش 🚿 داخل الفقاعات لتسقيها.');
  save(); render();
  setTimeout(ensureBubbles, 600);
}

function plotAction(i) {
  const p = S.plots[i];
  if (p.s === 0) { plantSeed(); return; }
  if (p.s === 1) { say('تحتاج ماء. اضغط على الرشاش 🚿 داخل الفقاعات.'); ensureBubbles(); return; }
  if (p.s === 2) { say('ما زالت تنمو.'); return; }
  p.s = 0; S.veg++; hop(); fx('✨', 'poof', PLOT_X[i], 78);
  say('حصدت جزرة!'); save(); render();
}

function feed() {
  if (S.veg < 1) return;
  S.veg--; S.hunger = clamp(S.hunger + 30);
  fx('🥕', 'fly'); eat();
  say(S.hunger >= 100 ? 'شبع النمر تمامًا!' : 'ممم، لذيذة!');
  save(); paintStats(); render();
}

function scrub() {
  S.hygiene = clamp(S.hygiene + 8); anim('wiggle');
  for (let i = 0; i < 4; i++) fx('🫧', 'foam', 25 + Math.random() * 50, 30 + Math.random() * 30);
  say(S.hygiene >= 100 ? 'النمر نظيف ولامع!' : 'استمر في الفرك.');
  save(); paintStats();
}

function tick() {
  const sl = S.sleeping;
  if (!sl && mode !== 'farm' && Math.random() < 0.1) hop();
  S.hunger = clamp(S.hunger - (sl ? 0.1 : 0.35));
  S.hygiene = clamp(S.hygiene - (sl ? 0.05 : 0.2));
  S.energy = clamp(S.energy + (sl ? 2 : -0.2));
  let redraw = false;

  if (sl && S.energy >= 100) { S.sleeping = false; say('صباح الخير! النمر مليء بالطاقة.'); redraw = true; }
  if (!sl && Math.random() < 0.08 && S.dirt.length < 8) {
    S.dirt.push({ x: 8 + Math.random() * 84, y: 20 + Math.random() * 55 });
    if (mode === 'clean') redraw = true;
  }
  S.plots.forEach(p => { if (p.s === 2 && Date.now() >= p.t) { p.s = 3; if (mode === 'farm') say('الجزر جاهز! المس الجزرة لتحصدها.'); } });
  if (mode === 'farm') { paintPlots(); ensureBubbles(); }

  save(); paintStats();
  if (redraw) render();
}

document.querySelectorAll('.nav button').forEach(b => b.onclick = () => setMode(b.dataset.mode));
$('#stage').addEventListener('pointermove', e => {
  const r = $('#stage').getBoundingClientRect();
  $('#tiger').style.setProperty('--tilt', (((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(1) + 'deg');
});
$('#tiger').addEventListener('click', () => { hop(); hearts(2); });
setMode(mode);
paintStats();
setInterval(tick, 1000);
