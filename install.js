// نافذة التثبيت: تظهر فقط عندما يسمح المتصفح بتثبيت اللعبة
(() => {
  const box = document.getElementById('install'), btn = document.getElementById('install-btn');
  let ev = null;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const hide = () => { box.hidden = true; };
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    if (standalone) return;
    ev = e; box.hidden = false;
  });
  btn.addEventListener('click', async () => {
    if (!ev) return hide();
    ev.prompt();
    try { await ev.userChoice; } catch {}
    ev = null; hide();
  });
  box.addEventListener('click', e => { if (e.target === box) hide(); });
  window.addEventListener('appinstalled', hide);
})();

// العمل بلا إنترنت
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
