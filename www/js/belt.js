/* ═══════════════════════════════════════════
   belt.js – Belt tracker + training log logic
   ═══════════════════════════════════════════ */

const BeltModule = (() => {
  const STORAGE_KEY = 'jjs_belt_state';
  const LOG_KEY     = 'jjs_session_log';

  let state = {
    beltIndex: 0,
    stripes:   0,
  };
  let sessionLog = []; // array of ISO date strings

  /* ── Persistence ── */
  function load() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) state = JSON.parse(s);
      const l = localStorage.getItem(LOG_KEY);
      if (l) sessionLog = JSON.parse(l);
    } catch (_) { /* ignore */ }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(LOG_KEY, JSON.stringify(sessionLog));
  }

  /* ── Render ── */
  function render() {
    const belt = BELTS[state.beltIndex];

    document.getElementById('belt-icon').textContent  = belt.emoji;
    document.getElementById('belt-label').textContent = belt.name;

    // stripes
    const row = document.getElementById('stripes-row');
    row.innerHTML = '';
    for (let i = 0; i < belt.stripes; i++) {
      const div = document.createElement('div');
      div.className = 'stripe' + (i < state.stripes ? ' earned' : '');
      row.appendChild(div);
    }

    renderStats();
    renderLog();
  }

  function renderStats() {
    const total = sessionLog.length;
    const now   = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const week = sessionLog.filter(d => new Date(d) >= weekStart).length;

    // streak
    let streak = 0;
    const sortedDates = [...sessionLog]
      .map(d => new Date(d).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i) // unique days
      .sort((a, b) => new Date(b) - new Date(a));

    const today = new Date().toDateString();
    let checkDay = new Date();
    for (const d of sortedDates) {
      if (d === checkDay.toDateString()) {
        streak++;
        checkDay.setDate(checkDay.getDate() - 1);
      } else {
        break;
      }
    }
    // allow yesterday to still count streak
    if (streak === 0 && sortedDates[0]) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (sortedDates[0] === yesterday.toDateString()) streak = 1;
    }

    document.getElementById('stat-total').textContent  = total;
    document.getElementById('stat-week').textContent   = week;
    document.getElementById('stat-streak').textContent = streak;
  }

  function renderLog() {
    const ul = document.getElementById('session-log-list');
    const recent = [...sessionLog].reverse().slice(0, 20);
    ul.innerHTML = recent.map(d => {
      const date = new Date(d);
      const label = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      const time  = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      return `<li><span class="session-date">${label}</span><span>${time}</span></li>`;
    }).join('');
  }

  /* ── Actions ── */
  function addStripe() {
    const belt = BELTS[state.beltIndex];
    if (state.stripes >= belt.stripes) {
      showToast('Max stripes reached — promote the belt!');
      return;
    }
    state.stripes++;
    save();
    render();
    showToast(`Stripe ${state.stripes} earned! OSS! 🔥`);
  }

  function removeStripe() {
    if (state.stripes <= 0) { showToast('No stripes to remove.'); return; }
    state.stripes--;
    save();
    render();
    showToast('Stripe removed.');
  }

  function promote() {
    if (state.beltIndex >= BELTS.length - 1) {
      showToast('🏆 You are already a Black Belt! Legend!');
      return;
    }
    state.beltIndex++;
    state.stripes = 0;
    save();
    render();
    showToast(`🎉 Promoted to ${BELTS[state.beltIndex].name}! OSS!`);
  }

  function logSession() {
    sessionLog.push(new Date().toISOString());
    save();
    render();
    showToast('✅ Training session logged!');
  }

  /* ── Init ── */
  function init() {
    load();
    render();
    document.getElementById('btn-add-stripe').addEventListener('click', addStripe);
    document.getElementById('btn-remove-stripe').addEventListener('click', removeStripe);
    document.getElementById('btn-promote').addEventListener('click', promote);
    document.getElementById('btn-log-session').addEventListener('click', logSession);
  }

  return { init };
})();
