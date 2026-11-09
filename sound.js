// أصوات اللعبة: تُصنع بالكود (Web Audio) فلا تحتاج ملفات ولا إنترنت
const SFX = (() => {
  const KEY = 'tiger-sound';
  let ctx = null, master = null, on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch {}

  function ac() {
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ctx = new A();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  // نغمة: تردد، مدة، نوع الموجة، شدة، تأخير، تردد نهائي (انزلاق)
  function tone(f, d, type = 'sine', v = 0.3, at = 0, to = null) {
    const c = ac(); if (!on || !c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.03);
  }

  // ضجيج مفلتر: للرذاذ والقرمشة والهواء
  let nbuf = null;
  function noise(d, ftype, f, v = 0.25, at = 0, to = null, q = 1) {
    const c = ac(); if (!on || !c) return;
    if (!nbuf) {
      nbuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const a = nbuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    }
    const t = c.currentTime + at, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = nbuf; s.loop = true; fl.type = ftype; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.02, d / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + d + 0.03);
  }

  const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };
  let lastScrub = 0;

  const api = {
    get on() { return on; },
    set(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {} if (on) { ac(); api.tap(); } },
    unlock() { ac(); },

    tap() { tone(720, 0.06, 'triangle', 0.18, 0, 560); },
    nav() { tone(520, 0.07, 'triangle', 0.2); tone(780, 0.09, 'triangle', 0.18, 0.05); },
    no() { tone(190, 0.14, 'square', 0.12, 0, 150); },
    // زراعة
    seed() { tone(170, 0.14, 'sine', 0.4, 0, 60); noise(0.1, 'lowpass', 700, 0.15); },
    pop() { tone(480, 0.09, 'sine', 0.3, 0, 1100); },
    water() {
      noise(0.75, 'bandpass', 1400, 0.22, 0, 2600, 0.8);
      [0.1, 0.3, 0.46, 0.62].forEach((a, i) => tone(900 + i * 140, 0.08, 'sine', 0.13, a, 1500));
    },
    harvest() { tone(N.C5, 0.14, 'triangle', 0.3); tone(N.G5, 0.2, 'triangle', 0.3, 0.1); tone(190, 0.1, 'sine', 0.3, 0, 90); },
    // أكل
    crunch(at = 0) {
      [0, 0.15, 0.3].forEach(a => { noise(0.05, 'highpass', 1800, 0.35, at + a); tone(150, 0.06, 'square', 0.1, at + a, 90); });
    },
    yum() { tone(392, 0.12, 'triangle', 0.22); tone(523.25, 0.18, 'triangle', 0.22, 0.1); },
    // مدح
    praise() { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, 0.16, 'triangle', 0.22, i * 0.07)); },
    // استحمام
    scrub() {
      const n = performance.now(); if (n - lastScrub < 90) return; lastScrub = n;
      noise(0.16, 'bandpass', 2400, 0.12, 0, 1400, 1.2);
      [0, 0.05, 0.1].forEach(a => tone(500 + Math.random() * 500, 0.07, 'sine', 0.14, a, 1400));
    },
    // تنظيف
    grab() { noise(0.14, 'bandpass', 500, 0.18, 0, 1600, 1); tone(420, 0.08, 'triangle', 0.15, 0, 760); },
    // سلة القمامة: تفتح ثم يدخل ثم تُغلق ثم بريق (متزامنة مع حركة toBin)
    bin() {
      tone(260, 0.16, 'triangle', 0.2, 0.18, 380);            // فتح الغطاء
      noise(0.42, 'bandpass', 450, 0.22, 0.38, 1900, 0.9);   // طيران القمامة
      tone(130, 0.14, 'sine', 0.35, 0.82, 70);                // سقوطها
      noise(0.08, 'lowpass', 600, 0.25, 0.9);                 // إغلاق الغطاء
    },
    done() { [N.C5, N.E5, N.G5, N.C6, N.E6].forEach((f, i) => tone(f, 0.22, 'triangle', 0.22, i * 0.09)); },
    // نوم
    sleep() { [N.G5, N.E5, N.D5, N.C5].forEach((f, i) => tone(f / 2, 0.55, 'sine', 0.2, i * 0.32)); },
    wake() { [N.C5, N.E5, N.G5].forEach((f, i) => tone(f, 0.3, 'triangle', 0.22, i * 0.12)); },
    // القفز عند الضغط على بطن النمر
    boing() { tone(260, 0.34, 'sine', 0.3, 0, 640); tone(640, 0.3, 'sine', 0.26, 0.17, 240); }
  };
  return api;
})();
// المتصفح يمنع الصوت قبل أول لمسة: نفتحه عند أول ضغطة
addEventListener('pointerdown', () => SFX.unlock(), { once: true, capture: true });
