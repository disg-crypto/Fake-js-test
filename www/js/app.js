/* ═══════════════════════════════════════════
   app.js – Bootstrap & tab navigation
   ═══════════════════════════════════════════ */

/* ── Tab navigation ── */
function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const panels  = document.querySelectorAll('.tab-panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      buttons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => { p.classList.remove('active'); p.hidden = true; });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = document.getElementById(`tab-${target}`);
      panel.classList.add('active');
      panel.hidden = false;
    });
  });
}

/* ── Toast ── */
let toastTimer = null;
window.showToast = function(msg, duration = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
};

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  TechniqueModule.init();
  TimerModule.init();
  BeltModule.init();

  console.log('🥋 Jiu-Jitsu Shenanigans — OSS!');
});
