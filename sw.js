// خدمة العمل بلا إنترنت: تخزّن ملفات اللعبة وتفتحها من الذاكرة
// عند تعديل أي ملف ارفع رقم الإصدار هنا ليصل التحديث للاعبين
const VERSION = 'v22';
const CACHE = 'nomor-alnashit-' + VERSION;
const FONTS = 'nomor-alnashit-fonts-v2'; // v2: لا تُخزَّن ردود opaque (كانت تُحسب بميغابايتات من مساحة الجهاز)
const CORE = [
  './', 'index.html', 'style.css', 'game.js', 'sound.js', 'install.js', 'manifest.webmanifest',
  'parts/base.png', 'parts/tail.png', 'parts/arm.png', 'parts/legL.png', 'parts/legR.png',
  'bg/bath.jpg',
  'apple/seed.png', 'apple/sprout.png', 'apple/plant.png', 'apple/blossom.png', 'apple/tree.png', 'apple/apple.png',
  'items/shower.png', 'items/can.png', 'items/juice.png', 'items/tissue.png', 'items/paper.png', 'items/glass.png', 'items/faucet.png',
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

// الصور والخطوط ثابتة: تُقرأ من الذاكرة فقط ولا تُطلب من الإنترنت إلا إن لم تكن محفوظة
// (تبديل صورة يحتاج رفع VERSION فيُعاد تنزيلها). ملفات الكود الصغيرة تتحدّث في الخلفية كما كانت
const STATIC = /\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$/i;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // الخط من Google: يُحفظ عند أول اتصال ويُستخدم بعدها من الذاكرة بلا طلبات جديدة
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit && STATIC.test(url.pathname)) return hit;
    // ملفات الكود: من الذاكرة فورًا، وتتحدّث في الخلفية للزيارة التالية
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
  }));
});
