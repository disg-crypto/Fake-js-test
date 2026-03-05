/* =====================================================
   ui.js — Settings, Store, Emote Wheel, Char Filter
   Jujutsu Shenanigans Fake APK
===================================================== */

/* ── Settings ─────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  quality:     'medium',
  screenShake: true,
  fxIntensity: 100,
  musicVol:    50,
  sfxVol:      75,
  damageNums:  true,
  shiftLock:   true,
  autoSprint:  true,
};

window.GAME_SETTINGS = Object.assign({}, DEFAULT_SETTINGS);

(function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('jjs_settings') || '{}');
    Object.assign(window.GAME_SETTINGS, saved);
  } catch (_) {}
})();

function saveSettings() {
  try { localStorage.setItem('jjs_settings', JSON.stringify(window.GAME_SETTINGS)); } catch (_) {}
}

/* ── Owned items (store) ──────────────────────────── */
let ownedItems = new Set();
(function loadOwned() {
  try {
    const arr = JSON.parse(localStorage.getItem('jjs_owned') || '[]');
    ownedItems = new Set(arr);
  } catch (_) {}
})();

function saveOwned() {
  try { localStorage.setItem('jjs_owned', JSON.stringify([...ownedItems])); } catch (_) {}
}

function isOwned(id) { return ownedItems.has(id); }

function purchase(id) {
  ownedItems.add(id);
  saveOwned();
}

/* ── Store data ───────────────────────────────────── */
const STORE = {
  featured: [
    { id:'ea_vessel_skin',   icon:'🔥', name:'Cursed Vessel Skin',   desc:'Alternate skin for Vessel.', price:399, tab:'featured' },
    { id:'ea_gojo_skin',     icon:'🔵', name:'Blindfold Gojo Skin',   desc:'Classic Gojo look.',         price:499, tab:'featured' },
    { id:'sukuna_bundle',    icon:'👹', name:'Sukuna King Bundle',    desc:'Skin + Title + Emote.',       price:999, tab:'featured' },
    { id:'ea_domain_bg',     icon:'⛩️', name:'Domain Expansion BG',  desc:'Animated select screen BG.', price:299, tab:'featured' },
  ],
  passes: [
    { id:'pass_ea',        icon:'⭐', name:'Early Access Pass',    desc:'Unlock all EA characters.',       price:799, tab:'passes' },
    { id:'pass_2x',        icon:'⚡', name:'2× XP Boost',          desc:'Double XP for 30 days.',          price:399, tab:'passes' },
    { id:'pass_vip',       icon:'👑', name:'VIP Lobby',            desc:'VIP badge + exclusive aura.',     price:599, tab:'passes' },
    { id:'pass_op_access', icon:'🌟', name:'OP Character Pass',    desc:'Unlock all OP-tier fighters.',    price:1299,tab:'passes' },
  ],
  emotes: [
    { id:'emote_domain_taunt', icon:'🌀', name:'Domain Taunt',   desc:'Flex your domain expansion.', price:149, tab:'emotes' },
    { id:'emote_sukuna_finger',icon:'☝️', name:'Finger Guns',    desc:'The Sukuna signature pose.',  price:149, tab:'emotes' },
    { id:'emote_victory_bow',  icon:'🙇', name:'Victory Bow',    desc:'Classy post-match bow.',      price:99,  tab:'emotes' },
    { id:'emote_spin',         icon:'💫', name:'Jujutsu Spin',   desc:'Spinning cursed energy.',     price:99,  tab:'emotes' },
  ],
  bundles: [
    { id:'bundle_starter', icon:'📦', name:'Starter Pack',    desc:'EA Pass + 2 emotes + skin.',     price:999,  tab:'bundles' },
    { id:'bundle_cursed',  icon:'🎁', name:'Cursed Bundle',   desc:'3 skins + OP Pass.',             price:1799, tab:'bundles' },
    { id:'bundle_boss',    icon:'💀', name:'Boss Bundle',     desc:'All boss skins + Domain BG.',    price:1299, tab:'bundles' },
  ],
};

/* ── Emotes ────────────────────────────────────────── */
const EMOTE_LIST = [
  { id:'wave',         icon:'👋', name:'WAVE',     free:true  },
  { id:'bow',          icon:'🙇', name:'BOW',      free:true  },
  { id:'laugh',        icon:'😂', name:'LAUGH',    free:true  },
  { id:'point',        icon:'👉', name:'POINT',    free:true  },
  { id:'spin',         icon:'💫', name:'SPIN',     store:'emote_spin'          },
  { id:'victory',      icon:'🏆', name:'VICTORY',  free:true  },
  { id:'domain_taunt', icon:'🌀', name:'DOMAIN',   store:'emote_domain_taunt'  },
  { id:'finger_guns',  icon:'☝️', name:'FINGER',   store:'emote_sukuna_finger' },
];

window.EMOTE_LIST = EMOTE_LIST;

/* ── Robux display (demo) ─────────────────────────── */
let robuxBalance = 0;

/* ══════════════════════════════════════════════════
   SETTINGS MODAL
══════════════════════════════════════════════════ */
(function initSettings() {
  const modal   = document.getElementById('modal-settings');
  const openBtns = [
    document.getElementById('btn-open-settings'),
    document.getElementById('btn-hud-settings'),
  ];
  const closeBtn = document.getElementById('settings-close');

  function openSettings() { modal.classList.remove('hidden'); }
  function closeSettings() { modal.classList.add('hidden'); }

  openBtns.forEach(b => b && b.addEventListener('click', openSettings));
  closeBtn && closeBtn.addEventListener('click', closeSettings);
  modal && modal.addEventListener('click', e => { if (e.target === modal) closeSettings(); });

  /* Quality buttons */
  const qualGroup = document.getElementById('sg-quality');
  if (qualGroup) {
    qualGroup.querySelectorAll('.sg-btn').forEach(btn => {
      if (btn.dataset.val === window.GAME_SETTINGS.quality) btn.classList.add('active');
      btn.addEventListener('click', () => {
        qualGroup.querySelectorAll('.sg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.GAME_SETTINGS.quality = btn.dataset.val;
        saveSettings();
      });
    });
  }

  /* Toggle switches */
  function wireToggle(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.GAME_SETTINGS[key]) el.classList.add('active');
    else el.classList.remove('active');
    el.addEventListener('click', () => {
      window.GAME_SETTINGS[key] = !window.GAME_SETTINGS[key];
      el.classList.toggle('active', window.GAME_SETTINGS[key]);
      saveSettings();
    });
  }
  wireToggle('sg-shake',     'screenShake');
  wireToggle('sg-damnums',   'damageNums');
  wireToggle('sg-shiftlock', 'shiftLock');
  wireToggle('sg-autosprint','autoSprint');

  /* Sliders */
  function wireSlider(id, valId, key) {
    const sl = document.getElementById(id);
    const vl = document.getElementById(valId);
    if (!sl) return;
    sl.value = window.GAME_SETTINGS[key];
    if (vl) vl.textContent = sl.value + '%';
    sl.addEventListener('input', () => {
      window.GAME_SETTINGS[key] = parseInt(sl.value);
      if (vl) vl.textContent = sl.value + '%';
      saveSettings();
    });
  }
  wireSlider('sg-fx',    'sg-fx-val',    'fxIntensity');
  wireSlider('sg-music', 'sg-music-val', 'musicVol');
  wireSlider('sg-sfx',   'sg-sfx-val',   'sfxVol');

  /* Reset */
  const resetBtn = document.getElementById('sg-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      Object.assign(window.GAME_SETTINGS, DEFAULT_SETTINGS);
      saveSettings();
      // re-apply UI
      const qBtns = qualGroup && qualGroup.querySelectorAll('.sg-btn');
      qBtns && qBtns.forEach(b => b.classList.toggle('active', b.dataset.val === window.GAME_SETTINGS.quality));
      ['sg-shake','sg-damnums','sg-shiftlock','sg-autosprint'].forEach(tid => {
        const key = { 'sg-shake':'screenShake','sg-damnums':'damageNums','sg-shiftlock':'shiftLock','sg-autosprint':'autoSprint' }[tid];
        const el = document.getElementById(tid);
        if (el) el.classList.toggle('active', window.GAME_SETTINGS[key]);
      });
      const fxSl = document.getElementById('sg-fx');
      if (fxSl) { fxSl.value = window.GAME_SETTINGS.fxIntensity; document.getElementById('sg-fx-val').textContent = fxSl.value + '%'; }
      const muSl = document.getElementById('sg-music');
      if (muSl) { muSl.value = window.GAME_SETTINGS.musicVol; document.getElementById('sg-music-val').textContent = muSl.value + '%'; }
      const sfSl = document.getElementById('sg-sfx');
      if (sfSl) { sfSl.value = window.GAME_SETTINGS.sfxVol; document.getElementById('sg-sfx-val').textContent = sfSl.value + '%'; }
    });
  }
})();

/* ══════════════════════════════════════════════════
   CHARACTER DROPDOWN PANEL  (slides down from topbar)
══════════════════════════════════════════════════ */
(function initCharDropdown() {
  const panel      = document.getElementById('char-dropdown');
  const navBtn     = document.getElementById('btn-nav-chars');
  const closeBtn   = document.getElementById('btn-chars-close');
  const lobbyBtn   = document.getElementById('lobby-selected-char');

  function openPanel() {
    panel && panel.classList.add('open');
    navBtn && navBtn.classList.add('panel-open');
  }
  function closePanel() {
    panel && panel.classList.remove('open');
    navBtn && navBtn.classList.remove('panel-open');
  }
  function togglePanel() {
    panel && panel.classList.contains('open') ? closePanel() : openPanel();
  }

  navBtn   && navBtn.addEventListener('click', togglePanel);
  closeBtn && closeBtn.addEventListener('click', closePanel);
  lobbyBtn && lobbyBtn.addEventListener('click', openPanel);

  // Close when clicking outside the panel (but not the nav btn)
  document.addEventListener('click', e => {
    if (!panel || !panel.classList.contains('open')) return;
    if (panel.contains(e.target) || (navBtn && navBtn.contains(e.target))) return;
    closePanel();
  });

  window.openCharDropdown  = openPanel;
  window.closeCharDropdown = closePanel;
})();

/* ══════════════════════════════════════════════════
   STORE MODAL
══════════════════════════════════════════════════ */
(function initStore() {
  const modal     = document.getElementById('modal-store');
  const openBtn   = document.getElementById('btn-open-store') ||
                    document.getElementById('btn-nav-store');
  const closeBtn  = document.getElementById('store-close');
  const grid      = document.getElementById('store-grid');
  const robuxDisp = document.getElementById('store-robux-display');
  const robuxMain = document.getElementById('robux-count');

  let activeTab = 'featured';

  function openStore() {
    modal.classList.remove('hidden');
    renderStoreGrid();
  }
  function closeStore() { modal.classList.add('hidden'); }

  openBtn  && openBtn.addEventListener('click', openStore);
  closeBtn && closeBtn.addEventListener('click', closeStore);
  modal    && modal.addEventListener('click', e => { if (e.target === modal) closeStore(); });

  /* Tabs */
  document.querySelectorAll('.store-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderStoreGrid();
    });
  });

  function renderStoreGrid() {
    if (!grid) return;
    const items = STORE[activeTab] || [];
    grid.innerHTML = '';
    if (robuxDisp) robuxDisp.textContent = robuxBalance;
    if (robuxMain) robuxMain.textContent = robuxBalance;

    items.forEach(item => {
      const owned = isOwned(item.id);
      const card = document.createElement('div');
      card.className = 'store-item' + (owned ? ' owned' : '');

      card.innerHTML = `
        <div class="store-item-thumb">${item.icon}</div>
        <div class="store-item-body">
          <div class="store-item-name">${item.name}</div>
          <div class="store-item-desc">${item.desc}</div>
          <div class="store-item-price"><span class="robux-icon">R$</span>${item.price}</div>
          <button class="buy-btn${owned ? ' owned-btn' : ''}" ${owned ? 'disabled' : ''}>
            ${owned ? '✓ OWNED' : 'BUY — DEMO'}
          </button>
        </div>`;

      if (!owned) {
        card.querySelector('.buy-btn').addEventListener('click', e => {
          e.stopPropagation();
          purchase(item.id);
          renderStoreGrid();
        });
      }
      grid.appendChild(card);
    });
  }
})();

/* ══════════════════════════════════════════════════
   EMOTE WHEEL
══════════════════════════════════════════════════ */
window.emoteWheelOpen = false;
window.triggerEmote   = null; // game.js sets this

(function initEmoteWheel() {
  const wheel   = document.getElementById('emote-wheel');
  const slotsEl = document.getElementById('ew-slots');
  const openBtns = [
    document.getElementById('btn-hud-emote'),
    document.getElementById('t-emote'),
  ];

  function buildWheel() {
    if (!slotsEl) return;
    slotsEl.innerHTML = '';
    const N = EMOTE_LIST.length;
    const R = 90; // orbit radius in px
    EMOTE_LIST.forEach((emote, i) => {
      const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
      const x = 88 + R * Math.cos(angle) - 32; // center 120px, slot 64px → offset 32
      const y = 88 + R * Math.sin(angle) - 32;
      const unlocked = emote.free || (emote.store && isOwned(emote.store));
      const slot = document.createElement('div');
      slot.className = 'ew-slot' + (unlocked ? '' : ' locked');
      slot.style.left = x + 'px';
      slot.style.top  = y + 'px';
      slot.innerHTML  = `<span class="ew-slot-icon">${emote.icon}</span><span class="ew-slot-name">${emote.name}</span>`;
      if (unlocked) {
        slot.addEventListener('click', () => {
          closeWheel();
          if (typeof window.triggerEmote === 'function') window.triggerEmote(emote);
        });
      }
      slotsEl.appendChild(slot);
    });
  }

  function openWheel() {
    if (!wheel) return;
    buildWheel();
    wheel.classList.remove('hidden');
    window.emoteWheelOpen = true;
  }
  function closeWheel() {
    if (!wheel) return;
    wheel.classList.add('hidden');
    window.emoteWheelOpen = false;
  }
  window.openEmoteWheel  = openWheel;
  window.closeEmoteWheel = closeWheel;

  openBtns.forEach(b => b && b.addEventListener('click', () => {
    window.emoteWheelOpen ? closeWheel() : openWheel();
  }));

  /* Close on backdrop click */
  wheel && wheel.querySelector('.ew-backdrop') &&
    wheel.querySelector('.ew-backdrop').addEventListener('click', closeWheel);
})();

/* ══════════════════════════════════════════════════
   CHARACTER INFO PANEL  (called from game.js selectChar)
══════════════════════════════════════════════════ */
window.updateCharInfoPanel = function(id) {
  if (typeof CHARACTERS === 'undefined') return;
  const char = CHARACTERS.find(c => c.id === id);
  const cipContent = document.getElementById('cip-content');
  const cipHolder  = document.querySelector('.cip-placeholder');
  if (!char || !cipContent) return;

  if (cipHolder) cipHolder.style.display = 'none';
  cipContent.classList.remove('hidden');

  // Update lobby badge
  const lobbyIcon = document.getElementById('lobby-char-icon');
  const lobbyName = document.getElementById('lobby-char-name');
  if (lobbyIcon) lobbyIcon.textContent = char.icon;
  if (lobbyName) lobbyName.textContent = char.name;

  document.getElementById('cip-icon').textContent = char.icon;
  document.getElementById('cip-name').textContent = char.name;
  document.getElementById('cip-sub').textContent  = char.subName || '';
  document.getElementById('cip-hp').textContent   = 'HP ' + char.hp;
  document.getElementById('cip-desc').textContent = char.desc || '';

  document.getElementById('cip-moves').innerHTML = (char.moves || []).map(m =>
    `<div class="cip-move-row">
       <span class="cip-move-name">${m.name}</span>
       <span class="cip-move-dmg">${m.damage} DMG</span>
     </div>`).join('');

  const specEl = document.getElementById('cip-special');
  specEl.innerHTML = char.special
    ? `<div class="cip-move-row"><span class="cip-move-name">${char.special.name}</span><span class="cip-move-dmg">${char.special.damage} DMG</span></div>`
    : '';

  const awEl = document.getElementById('cip-awaken');
  awEl.innerHTML = char.awakening
    ? (char.awakening.moves || []).map(m =>
        `<div class="cip-move-row"><span class="cip-move-name">${m.name}</span><span class="cip-move-dmg">${m.damage} DMG</span></div>`
      ).join('')
    : '';
};

/* ── Character Filter Tabs ─────────────────────── */
(function initCharFilterTabs() {
  const tabs = document.querySelectorAll('.char-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Call game.js buildCharSelect with filter (set global first)
      window.currentCharFilter = tab.dataset.filter;
      if (typeof buildCharSelect === 'function') buildCharSelect();
    });
  });
  window.currentCharFilter = 'all';
})();

/* ══════════════════════════════════════════════════
   ESC key — close any open modal/wheel
══════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.code !== 'Escape') return;
  ['modal-settings','modal-store'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hidden')) el.classList.add('hidden');
  });
  if (window.emoteWheelOpen && typeof window.closeEmoteWheel === 'function') window.closeEmoteWheel();
});
