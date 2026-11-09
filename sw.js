// خدمة العمل بلا إنترنت: تخزّن ملفات اللعبة وتفتحها من الذاكرة
// عند تعديل أي ملف ارفع رقم الإصدار هنا ليصل التحديث للاعبين
const VERSION = 'v7';
const CACHE = 'nomor-alnashit-' + VERSION;
const FONTS = 'nomor-alnashit-fonts';
const CORE = [
  './', 'index.html', 'style.css', 'game.js', 'sound.js', 'install.js', 'manifest.webmanifest',
  'parts/base.png', 'parts/tail.png', 'parts/arm.png', 'parts/legL.png', 'parts/legR.png',
  'bg/bath.jpg',
  'icons/logo.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('nomor-alnashit-') && k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // الخط من Google: يُحفظ عند أول اتصال ويُستخدم بعدها بلا إنترنت
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // ملفات اللعبة: من الذاكرة فورًا، وتتحدّث في الخلفية للزيارة التالية
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
  }));
});
