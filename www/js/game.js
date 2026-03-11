/**
 * Jujutsu Shenanigans — Fake JS Test Build
 * Game engine: PVP duels + Boss Fight mode
 * Canvas map rendering with platforms + collision
 */

'use strict';

/* =========================================================
   STATE
   ========================================================= */
const state = {
  selectedCharId: null,
  gameMode: 'pvp',       // 'pvp' | 'boss'
  mapId: 'shinjuku',
  player: null,
  enemy:  null,
  platforms: [],
  running: false,
  frame: null,
  time: 0,               // elapsed seconds (for map animation)
  enrageFlash: 0
};

/* =========================================================
   DOM REFS
   ========================================================= */
const $ = id => document.getElementById(id);

const DOM = {
  screenSelect: $('screen-select'),
  screenGame:   $('screen-game'),
  charGrid:     $('char-grid'),
  bossRoster:   $('boss-roster'),
  bossPreview:  $('boss-preview'),
  btnPlay:      $('btn-play'),

  canvas:        $('game-canvas'),
  playerHpBar:   $('player-hp-bar'),
  playerHpText:  $('player-hp-text'),
  playerUltBar:  $('player-ult-bar'),
  playerName:    $('player-name-label'),
  enemyHpBar:    $('enemy-hp-bar'),
  enemyHpText:   $('enemy-hp-text'),
  enemyName:     $('enemy-name-label'),
  hudEnemy:      $('hud-enemy'),

  bossSection:   $('boss-bar-section'),
  bossHpBar:     $('boss-hp-bar'),
  bossHpText:    $('boss-hp-text'),
  bossNameLabel: $('boss-name-label'),
  bossPhaseLabel:$('boss-phase-label'),

  combatLog:     $('combat-log'),
  awakenBanner:  $('awaken-banner'),
  phaseBanner:   $('phase-banner'),
  enrageFlashEl: $('enrage-flash'),
  mapToast:      $('map-toast'),
  resultOverlay: $('result-overlay'),
  resultText:    $('result-text'),
  resultSub:     $('result-sub'),
  btnRematch:    $('btn-rematch'),
  btnBack:       $('btn-back'),

  moveSlots: [1,2,3,4].map(i => ({
    slot: $(`slot-${i}`),
    name: $(`move-${i}-name`),
    cd:   $(`cd-${i}`)
  })),
  slotR:     $('slot-r'),
  slotAwaken:$('slot-awaken'),
  moveRName: $('move-r-name'),
  cdR:       $('cd-r'),
  cdAwaken:  $('cd-awaken')
};

const ctx = DOM.canvas.getContext('2d');

/* =========================================================
   FIGHTER CLASS
   ========================================================= */
class Fighter {
  constructor(charDef, isPlayer, x, y) {
    this.def      = charDef;
    this.isPlayer = isPlayer;
    this.isBoss   = !!charDef.isBoss;
    this.scale    = charDef.scale || 1;
    this.maxHp    = charDef.hp;
    this.hp       = charDef.hp;
    this.ult      = 0;
    this.x = x; this.y = y;
    this.facing   = isPlayer ? 1 : -1;
    this.vx = 0;  this.vy = 0;
    this.grounded = true;
    this.blocking = false;
    this.dashing  = false;
    this.dashTimer = 0;
    this.stunTimer = 0;
    this.invincible = false;
    // PVP awakening
    this.awakened    = false;
    this.awakenTimer = 0;
    this.awakenUsed  = false;
    // Boss phases
    this.phase = 0;
    // M1 combo
    this.m1Combo = 0;
    this.m1ComboTimer = 0;
    this.m1Cooldown = 0;
    this.cooldowns = [0, 0, 0, 0];
    this.specialCd = 0;
    this.awakenCd  = 0;
    this.color     = charDef.color;
    this.glowColor = charDef.glowColor || (charDef.color + '88');
    this.action    = 'idle';
    this.actionTimer = 0;
    this.hitFlash  = 0;
    // Emote state
    this.emoteIcon  = null;
    this.emoteTimer = 0;
    this.emoteAnim  = 0;
    this.width  = Math.round(44 * this.scale);
    this.height = Math.round(72 * this.scale);
  }

  get currentMoves() {
    if (this.isBoss) return this.def.phases[this.phase].moves;
    return this.awakened ? this.def.awakening.moves : this.def.moves;
  }

  get currentSpecial() {
    if (this.isBoss) return this.def.phases[this.phase].special;
    return this.awakened ? this.def.awakening.special : this.def.special;
  }

  get currentName() {
    if (this.isBoss) return this.def.phases[this.phase].label || this.def.name;
    return this.awakened ? this.def.awakening.name : this.def.name;
  }

  takeDamage(amount) {
    if (this.invincible) return 0;
    let dmg = amount;
    if (this.blocking) dmg = Math.floor(dmg * 0.2);
    // Boss phase 2 damage resistance
    if (this.isBoss && this.def.phases[this.phase].damageResist) {
      dmg = Math.floor(dmg * (1 - this.def.phases[this.phase].damageResist));
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.hitFlash = 8;
    this.addUlt(dmg * 0.3);
    return dmg;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addUlt(amount) {
    this.ult = Math.min(100, this.ult + amount);
  }

  isAlive() { return this.hp > 0; }
}

/* =========================================================
   CHARACTER / BOSS SELECT SCREEN
   ========================================================= */
function buildCharSelect() {
  const filter = window.currentCharFilter || 'all';
  DOM.charGrid.innerHTML = '';
  const filtered = filter === 'all'  ? CHARACTERS :
                   filter === 'free' ? CHARACTERS.filter(c => !c.badge || c.badge === 'free') :
                                       CHARACTERS.filter(c => c.badge === filter);
  filtered.forEach(c => {
    const card = document.createElement('div');
    card.className = 'char-card' + (c.id === state.selectedCharId ? ' selected' : '');
    card.dataset.id = c.id;
    card.innerHTML = `
      ${c.badge ? `<div class="char-badge badge-${(c.badge||'').toLowerCase()}">${c.badge}</div>` : ''}
      <div class="char-icon">${c.icon}</div>
      <div class="char-card-name">${c.name}</div>
      <div class="char-card-sub">${c.subName}</div>
    `;
    card.addEventListener('click', () => selectChar(c.id));
    DOM.charGrid.appendChild(card);
  });

  // Boss roster preview
  DOM.bossRoster.innerHTML = '';
  BOSSES.forEach(b => {
    const card = document.createElement('div');
    card.className = 'boss-card';
    card.innerHTML = `
      <div class="boss-card-icon">${b.icon}</div>
      <div class="boss-card-name">${b.name}</div>
      <div class="boss-card-hp">HP: ${b.hp}</div>
    `;
    DOM.bossRoster.appendChild(card);
  });
}

function selectChar(id) {
  state.selectedCharId = id;
  document.querySelectorAll('.char-card').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });
  DOM.btnPlay.disabled = false;
  DOM.btnPlay.textContent = state.gameMode === 'boss' ? 'CHALLENGE BOSS!' : 'FIGHT!';
  if (typeof window.updateCharInfoPanel === 'function') window.updateCharInfoPanel(id);
}

// Mode buttons
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.gameMode = btn.dataset.mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const isBoss = state.gameMode === 'boss';
    DOM.bossPreview.classList.toggle('hidden', !isBoss);

    if (state.selectedCharId) {
      DOM.btnPlay.textContent = isBoss ? 'CHALLENGE BOSS!' : 'FIGHT!';
    }
    // Auto-select domain map for boss mode
    if (isBoss) selectMap('domain');
  });
});

// Map cards
document.querySelectorAll('.map-card').forEach(card => {
  card.addEventListener('click', () => selectMap(card.dataset.map));
});

function selectMap(id) {
  state.mapId = id;
  document.querySelectorAll('.map-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.map === id);
  });
}

DOM.btnPlay.addEventListener('click', () => {
  if (!state.selectedCharId) return;
  startGame();
});

/* =========================================================
   GAME START
   ========================================================= */
function startGame() {
  resizeCanvas();
  const W = DOM.canvas.width;
  const gnd = groundY();

  const playerDef = CHARACTERS.find(c => c.id === state.selectedCharId);
  let enemyDef;

  if (state.gameMode === 'boss') {
    // Random boss
    enemyDef = BOSSES[Math.floor(Math.random() * BOSSES.length)];
  } else {
    const pool = CHARACTERS.filter(c => c.id !== state.selectedCharId);
    enemyDef = pool[Math.floor(Math.random() * pool.length)];
  }

  state.player    = new Fighter(playerDef, true,  W * 0.22, gnd);
  state.enemy     = new Fighter(enemyDef, false, W * 0.78, gnd);
  state.running   = true;
  state.time      = 0;
  state.enrageFlash = 0;
  state.platforms = getPlatforms(W, DOM.canvas.height);

  // HUD
  DOM.playerName.textContent = playerDef.name;

  const isBoss = state.gameMode === 'boss';
  DOM.bossSection.classList.toggle('hidden', !isBoss);
  DOM.hudEnemy.classList.toggle('hidden', isBoss);

  if (isBoss) {
    DOM.bossNameLabel.textContent = enemyDef.name;
    DOM.bossPhaseLabel.textContent = enemyDef.phases[0].label;
  } else {
    DOM.enemyName.textContent = enemyDef.name;
  }

  updateMoveSlots(state.player);
  buildCharInfoHud(state.player);

  // Screen switch
  DOM.screenSelect.classList.remove('active');
  DOM.screenGame.classList.add('active');
  DOM.resultOverlay.classList.add('hidden');
  DOM.enrageFlashEl.classList.add('hidden');

  // Map name toast
  const mapDef = MAP_DEFS.find(m => m.id === state.mapId);
  if (mapDef) showMapToast(mapDef.emoji + ' ' + mapDef.name);

  AI.reset(state.gameMode === 'boss');
  setupInput();
  lastTime = 0;

  // ── Init 3D renderer and create rigged models ──
  if (typeof Renderer3D !== 'undefined') {
    const gameContainer = DOM.screenGame;
    if (!Renderer3D.initialized) {
      Renderer3D.init(gameContainer);
    }
    Renderer3D.cleanup(); // remove previous fighters
    Renderer3D.createFighter('player', playerDef);
    Renderer3D.createFighter('enemy', enemyDef);
  }

  state.frame = requestAnimationFrame(tick);
}

function groundY() {
  return (DOM.canvas.height || window.innerHeight) - 100;
}

function showMapToast(text) {
  DOM.mapToast.textContent = text;
  DOM.mapToast.classList.remove('hidden');
  setTimeout(() => DOM.mapToast.classList.add('hidden'), 2600);
}

/* =========================================================
   HUD UPDATE
   ========================================================= */
function updateHUD() {
  const p = state.player;
  const e = state.enemy;

  // Player HP
  const pPct = (p.hp / p.maxHp) * 100;
  DOM.playerHpBar.style.width = pPct + '%';
  DOM.playerHpBar.style.background =
    pPct > 50 ? 'var(--hp-green)' :
    pPct > 25 ? 'var(--hp-yellow)' : 'var(--hp-red)';
  DOM.playerHpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;

  // Player ULT
  DOM.playerUltBar.style.width = p.ult + '%';
  DOM.playerUltBar.classList.toggle('full', p.ult >= 100);

  // Enemy HP (PVP) or Boss bar
  if (state.gameMode === 'boss') {
    const ePct = (e.hp / e.maxHp) * 100;
    DOM.bossHpBar.style.width = ePct + '%';
    DOM.bossHpText.textContent = `${Math.ceil(e.hp)} / ${e.maxHp}`;
    DOM.bossPhaseLabel.textContent = e.def.phases[e.phase].label;
  } else {
    const ePct = (e.hp / e.maxHp) * 100;
    DOM.enemyHpBar.style.width = ePct + '%';
    DOM.enemyHpText.textContent = `${Math.ceil(e.hp)} / ${e.maxHp}`;
  }

  // Move cooldowns
  p.cooldowns.forEach((cd, i) => {
    const el = DOM.moveSlots[i];
    el.cd.textContent = cd > 0 ? Math.ceil(cd) + 's' : '';
    el.cd.classList.toggle('active', cd > 0);
    el.slot.classList.toggle('on-cooldown', cd > 0);
  });

  // Special
  DOM.cdR.textContent = p.specialCd > 0 ? Math.ceil(p.specialCd) + 's' : '';
  DOM.cdR.classList.toggle('active', p.specialCd > 0);
  DOM.slotR.classList.toggle('on-cooldown', p.specialCd > 0 || p.ult < 100);

  // Awakening (PVP only)
  const canAwaken = !p.awakenUsed && p.ult >= 100 && !p.awakened;
  DOM.cdAwaken.textContent = canAwaken ? 'READY' : '';
  DOM.cdAwaken.classList.toggle('active', !canAwaken);
  DOM.slotAwaken.classList.toggle('on-cooldown', !canAwaken);

  // In-game character info dropdown
  updateCharInfoHud();
}

function updateMoveSlots(fighter) {
  fighter.currentMoves.forEach((m, i) => {
    if (DOM.moveSlots[i]) DOM.moveSlots[i].name.textContent = m.name;
  });
  DOM.moveRName.textContent = fighter.currentSpecial.name;
}

/* =========================================================
   IN-GAME CHARACTER INFO DROPDOWN
   Shows all moves, damage, types, cooldowns in real-time.
   ========================================================= */
const charInfoHud = document.getElementById('char-info-hud');
const cihToggle   = document.getElementById('cih-toggle');
const cihBody     = document.getElementById('cih-body');
const cihMovesList = document.getElementById('cih-moves-list');
const cihSpecialRow = document.getElementById('cih-special-row');
const cihAwakenInfo = document.getElementById('cih-awaken-info');
const cihCharIcon  = document.getElementById('cih-char-icon');
const cihCharName  = document.getElementById('cih-char-name');

if (cihToggle) {
  cihToggle.addEventListener('click', () => {
    charInfoHud.classList.toggle('open');
  });
}

function buildCharInfoHud(fighter) {
  if (!charInfoHud || !fighter) return;
  charInfoHud.classList.remove('hidden');

  cihCharIcon.textContent = fighter.def.icon;
  cihCharName.textContent = fighter.currentName;

  // Build move rows
  cihMovesList.innerHTML = '';
  fighter.currentMoves.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'cih-move-row';
    row.dataset.idx = i;
    row.innerHTML = `
      <span class="cih-move-key">${i + 1}</span>
      <span class="cih-move-name">${m.name}</span>
      <span class="cih-move-type ${m.type || 'melee'}">${m.type || 'melee'}</span>
      <span class="cih-move-dmg">${m.damage || 0}</span>
      <span class="cih-move-cd" data-cd="${i}">-</span>
    `;
    cihMovesList.appendChild(row);
  });

  // Special
  const sp = fighter.currentSpecial;
  cihSpecialRow.innerHTML = `
    <span class="cih-move-key">R</span>
    <span class="cih-move-name">${sp.name}</span>
    <span class="cih-move-type ${sp.type || 'ultimate'}">${sp.type || 'ultimate'}</span>
    <span class="cih-move-dmg">${sp.damage || 0}</span>
    <span class="cih-move-cd" data-cd="special">-</span>
  `;

  // Awakening info
  if (fighter.def.awakening) {
    cihAwakenInfo.textContent = fighter.def.awakening.name + ' — ' +
      fighter.def.awakening.moves.map(m => m.name).join(', ');
  } else {
    cihAwakenInfo.textContent = 'N/A';
  }
}

function updateCharInfoHud() {
  if (!charInfoHud || !state.player) return;

  const p = state.player;

  // Update cooldown numbers
  p.cooldowns.forEach((cd, i) => {
    const cdEl = cihMovesList.querySelector(`[data-cd="${i}"]`);
    const row = cihMovesList.querySelector(`[data-idx="${i}"]`);
    if (cdEl) {
      cdEl.textContent = cd > 0 ? Math.ceil(cd) + 's' : 'RDY';
      cdEl.style.color = cd > 0 ? '#ff6b6b' : '#69db7c';
    }
    if (row) row.classList.toggle('on-cd', cd > 0);
  });

  // Special cooldown
  const spCdEl = cihSpecialRow.querySelector('[data-cd="special"]');
  if (spCdEl) {
    if (p.ult < 100) {
      spCdEl.textContent = Math.floor(p.ult) + '%';
      spCdEl.style.color = '#888';
    } else if (p.specialCd > 0) {
      spCdEl.textContent = Math.ceil(p.specialCd) + 's';
      spCdEl.style.color = '#ff6b6b';
    } else {
      spCdEl.textContent = 'RDY';
      spCdEl.style.color = '#ffd600';
    }
  }

  // Update name if awakened
  cihCharName.textContent = p.currentName;
}

/* =========================================================
   COMBAT LOG
   ========================================================= */
function log(msg, type = 'system') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = msg;
  DOM.combatLog.prepend(entry);
  setTimeout(() => entry.remove(), 4200);
}

/* =========================================================
   FLOATING DAMAGE NUMBERS
   ========================================================= */
function spawnDmgNum(text, x, y, color = '#ff6b6b') {
  if (window.GAME_SETTINGS && !window.GAME_SETTINGS.damageNums) return;
  const el = document.createElement('div');
  el.className = 'dmg-num';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  el.style.fontSize = (18 + Math.min(String(text).length * 2, 14)) + 'px';
  el.style.color = color;
  DOM.screenGame.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

/* =========================================================
   COMBAT ACTIONS
   ========================================================= */

// M1 hit range — bosses have slightly longer reach
const M1_RANGE = 135;

function doM1(attacker, defender) {
  if (attacker.m1Cooldown > 0 || attacker.stunTimer > 0) return;
  if (attacker.actionTimer > 0 && attacker.action !== 'idle') return;

  attacker.m1Cooldown  = attacker.isBoss ? 0.2 : 0.25;
  attacker.action      = 'm1';
  attacker.actionTimer = 0.25;

  // Face toward defender
  attacker.facing = attacker.x < defender.x ? 1 : -1;

  const dist = Math.abs(attacker.x - defender.x);
  const reach = M1_RANGE * ((attacker.isBoss ? 1.3 : 1) + (attacker.scale || 1) * 0.2);

  if (dist > reach) {
    // Miss — swing VFX only
    VFX.m1Swing(attacker.x, attacker.y, attacker.facing, attacker.color);
    return;
  }

  // Combo scaling: hits 1=6, 2=7, 3=8, 4=9; bosses deal 3x
  const comboDmg = [6, 7, 8, 9];
  const baseDmg = comboDmg[attacker.m1Combo];
  const hitDmg  = attacker.isBoss ? baseDmg * 3 : baseDmg;
  const dmg     = defender.takeDamage(hitDmg);

  attacker.addUlt(hitDmg * 0.2);
  attacker.m1Combo      = (attacker.m1Combo + 1) % 4;
  attacker.m1ComboTimer = 1.7;

  // Per-character M1 VFX
  VFX.m1Hit(attacker.def.id, attacker.x, defender.x, defender.y);

  const comboLabel = ['1ST', '2ND', '3RD', '4TH'][attacker.m1Combo === 0 ? 3 : attacker.m1Combo - 1];
  log(`${attacker.isPlayer ? 'You' : 'Enemy'} M1 [${comboLabel}] — ${dmg} dmg`, 'dmg');
  spawnDmgNum(dmg, defender.x + (attacker.isPlayer ? 22 : -22), defender.y - 60, '#ff8080');
}

function doMove(attacker, defender, moveIndex) {
  if (attacker.cooldowns[moveIndex] > 0 || attacker.stunTimer > 0) return;
  const move = attacker.currentMoves[moveIndex];
  if (!move) return;

  attacker.cooldowns[moveIndex] = move.cooldown;
  attacker.action = 'move';
  attacker.actionTimer = 0.6;

  if (move.type === 'defense' || move.damage === 0) {
    attacker.invincible = true;
    setTimeout(() => { attacker.invincible = false; }, 800);
    // Barrier/defense VFX on self
    VFX.ring(attacker.x, attacker.y, attacker.color, 65, 3, 0.35);
    log(`${attacker.isPlayer ? 'You' : 'Enemy'} used ${move.name}!`, 'system');
    return;
  }

  const dmg = defender.takeDamage(move.damage);
  attacker.addUlt(move.damage * 0.25);

  // Move VFX — try character-specific first, fall back to generic
  if (!VFX.charMoveHit(attacker.def.id, moveIndex, defender.x, defender.y)) {
    VFX.moveHit(move.type, defender.x, defender.y, attacker.color, move.damage);
  }

  if (move.type === 'counter') {
    defender.stunTimer = 1.5;
    log(`COUNTER! ${move.name} — ${dmg} dmg, stun`, 'special');
  } else {
    log(`${attacker.isPlayer ? 'You' : 'Enemy'} ${move.name} — ${dmg} dmg`, 'dmg');
  }
  const numColor = move.type === 'slash' ? '#ff8844'
    : move.type === 'ranged' ? '#44aaff'
    : move.type === 'aoe'    ? '#ffcc44'
    : '#ff8080';
  spawnDmgNum(dmg, defender.x, defender.y - 60 - Math.random() * 20, numColor);
}

function doSpecial(attacker, defender) {
  if (attacker.ult < 100 || attacker.specialCd > 0 || attacker.stunTimer > 0) return;

  const sp = attacker.currentSpecial;
  attacker.ult = 0;
  attacker.specialCd = sp.cooldown;
  attacker.action = 'special';
  attacker.actionTimer = 1.2;

  if (sp.heal) {
    attacker.heal(sp.heal);
    VFX.ring(attacker.x, attacker.y, '#69db7c', 90, 4, 0.4);
    VFX.ring(attacker.x, attacker.y, '#ffffff', 55, 2, 0.28);
    log(`JACKPOT! ${sp.name} — +${sp.heal} HP!`, 'heal');
    spawnDmgNum(`+${sp.heal}`, attacker.x, attacker.y - 80, '#69db7c');
  } else {
    const dmg = defender.takeDamage(sp.damage);
    attacker.addUlt(sp.damage * 0.1);
    VFX.specialHit(defender.x, defender.y, attacker.color);
    log(`SPECIAL: ${sp.name} — ${dmg} DAMAGE!`, 'special');
    spawnDmgNum(dmg, defender.x, defender.y - 80, '#ffd43b');
  }
}

function doAwaken(fighter) {
  if (fighter.isBoss || fighter.awakenUsed || fighter.ult < 100 || fighter.awakened) return;

  fighter.awakened    = true;
  fighter.awakenUsed  = true;
  fighter.ult         = 0;
  fighter.awakenTimer = fighter.def.awakening.duration;
  fighter.awakenCd    = 999;
  fighter.invincible  = true;
  fighter.action      = 'awakening';
  fighter.actionTimer = 2.5;

  const bonus = Math.floor(fighter.maxHp * fighter.def.awakening.hpBonus);
  fighter.heal(bonus);

  VFX.awakenBurst(fighter.x, fighter.y, fighter.color);

  log(`${fighter.isPlayer ? 'YOU' : 'ENEMY'} AWAKENED → ${fighter.def.awakening.name}!`, 'special');

  if (fighter.isPlayer) {
    DOM.awakenBanner.textContent = fighter.def.awakening.name.toUpperCase() + '!';
    DOM.awakenBanner.classList.remove('hidden');
    setTimeout(() => DOM.awakenBanner.classList.add('hidden'), 2600);
    updateMoveSlots(fighter);
  }
  setTimeout(() => { fighter.invincible = false; }, 2600);
}

function doBlock(fighter, active) {
  fighter.blocking = active;
}

function doDash(fighter) {
  if (fighter.dashing) return;
  fighter.dashing    = true;
  fighter.dashTimer  = 0.3;
  fighter.invincible = true;
  fighter.vx = fighter.facing * 180;
  setTimeout(() => { fighter.invincible = false; }, 320);
  // Initial dash burst
  VFX.ring(fighter.x, fighter.y, fighter.color, 40, 2, 0.2);
}

/* =========================================================
   BOSS PHASE TRANSITION
   ========================================================= */
function checkBossPhase(boss) {
  if (!boss.isBoss) return;
  const nextPhaseIdx = boss.phase + 1;
  if (nextPhaseIdx >= boss.def.phases.length) return;

  const nextPhase = boss.def.phases[nextPhaseIdx];
  if (boss.hp / boss.maxHp <= nextPhase.threshold) {
    boss.phase = nextPhaseIdx;
    triggerPhaseTransition(boss, nextPhase);
  }
}

function triggerPhaseTransition(boss, phase) {
  boss.invincible  = true;
  boss.stunTimer   = 0;
  boss.actionTimer = 2.5;
  boss.ult         = 0;

  // Brief heal on phase change
  boss.heal(Math.floor(boss.maxHp * 0.08));

  // Canvas VFX
  VFX.phaseTransition(boss.x, boss.y, boss.color);

  // HTML overlay flash
  state.enrageFlash = 1;
  DOM.enrageFlashEl.classList.remove('hidden');
  setTimeout(() => DOM.enrageFlashEl.classList.add('hidden'), 1200);

  // Phase banner
  DOM.phaseBanner.textContent = `⚠ ${phase.label} ⚠`;
  DOM.phaseBanner.classList.remove('hidden');
  setTimeout(() => DOM.phaseBanner.classList.add('hidden'), 3100);

  log(`PHASE CHANGE — ${boss.def.name} ENRAGES!`, 'special');
  log(`${phase.label}`, 'special');

  setTimeout(() => { boss.invincible = false; }, 2600);
}

/* =========================================================
   AI
   ========================================================= */
const AI = {
  thinkTimer: 0,
  isBoss: false,
  reset(isBoss) {
    this.thinkTimer = 0;
    this.isBoss = isBoss;
  }
};

function updateAI(dt) {
  const e = state.enemy;
  const p = state.player;
  if (!e.isAlive() || !p.isAlive()) return;

  AI.thinkTimer -= dt;

  const dist = Math.abs(e.x - p.x);
  const speed = AI.isBoss ? 90 : 100;

  // Move toward player
  if (dist > (AI.isBoss ? 130 : 90)) {
    e.facing = p.x < e.x ? -1 : 1;
    e.x += e.facing * speed * dt;
  }

  if (AI.thinkTimer > 0) return;
  // Boss thinks faster
  AI.thinkTimer = AI.isBoss
    ? (0.2 + Math.random() * 0.15)
    : (0.35 + Math.random() * 0.25);

  if (e.stunTimer > 0) return;

  // PVP: try to awaken
  if (!AI.isBoss && !e.awakened && !e.awakenUsed && e.ult >= 100) {
    if (Math.random() < 0.85) { doAwaken(e); return; }
  }

  // Use special when ult full
  if (e.ult >= 100 && e.specialCd <= 0 && Math.random() < (AI.isBoss ? 0.7 : 0.5)) {
    doSpecial(e, p); return;
  }

  const closeRange = dist < (AI.isBoss ? 160 : 120);
  const midRange = dist < (AI.isBoss ? 280 : 220);

  // Mid-range: try ranged moves
  if (!closeRange && midRange) {
    const avail = e.cooldowns.map((cd, i) => cd <= 0 ? i : -1).filter(i => i >= 0);
    const rangedMoves = avail.filter(i => {
      const m = e.currentMoves[i];
      return m && (m.type === 'ranged' || m.type === 'aoe' || m.type === 'slash');
    });
    if (rangedMoves.length && Math.random() < 0.5) {
      doMove(e, p, rangedMoves[Math.floor(Math.random() * rangedMoves.length)]);
      return;
    }
  }

  if (closeRange) {
    const roll = Math.random();
    const atkChance = AI.isBoss ? 0.65 : 0.55;
    if (roll < atkChance) {
      doM1(e, p);
    } else if (roll < atkChance + 0.30) {
      const avail = e.cooldowns.map((cd, i) => cd <= 0 ? i : -1).filter(i => i >= 0);
      if (avail.length) doMove(e, p, avail[Math.floor(Math.random() * avail.length)]);
    } else if (roll < atkChance + 0.38) {
      doBlock(e, true);
      setTimeout(() => doBlock(e, false), 350 + Math.random() * 350);
    } else if (roll < atkChance + 0.46) {
      doDash(e);
    }
  }
}

/* =========================================================
   PHYSICS
   ========================================================= */
const GRAVITY = 800;
const ARENA_W = () => DOM.canvas.width;
const GROUND  = () => DOM.canvas.height - 100;

function updateFighter(fighter, dt) {
  if (fighter.stunTimer   > 0) fighter.stunTimer   = Math.max(0, fighter.stunTimer   - dt);
  if (fighter.m1Cooldown  > 0) fighter.m1Cooldown  = Math.max(0, fighter.m1Cooldown  - dt);
  if (fighter.m1ComboTimer > 0) {
    fighter.m1ComboTimer -= dt;
    if (fighter.m1ComboTimer <= 0) fighter.m1Combo = 0;
  }
  if (fighter.actionTimer > 0) fighter.actionTimer = Math.max(0, fighter.actionTimer - dt);
  if (fighter.dashTimer   > 0) fighter.dashTimer   = Math.max(0, fighter.dashTimer   - dt);
  if (fighter.specialCd   > 0) fighter.specialCd   = Math.max(0, fighter.specialCd   - dt);
  fighter.cooldowns = fighter.cooldowns.map(cd => Math.max(0, cd - dt));
  if (fighter.hitFlash    > 0) fighter.hitFlash    = Math.max(0, fighter.hitFlash - 1);

  // Dash friction + trail
  if (!fighter.dashing || fighter.dashTimer <= 0) {
    fighter.dashing = false;
    fighter.vx *= 0.72;
  } else if (Math.random() < 0.55) {
    VFX.dashTrail(fighter.x, fighter.y, fighter.color, fighter.facing);
  }

  // Gravity
  if (!fighter.grounded) fighter.vy += GRAVITY * dt;

  // Move
  fighter.x += fighter.vx * dt;
  fighter.y += fighter.vy * dt;

  // --- Platform collision ---
  if (fighter.vy >= 0) {
    for (const plat of state.platforms) {
      const feetY = fighter.y;
      const prevFeet = feetY - fighter.vy * dt - 2;
      const withinX = fighter.x > plat.x && fighter.x < plat.x + plat.w;
      if (withinX && prevFeet <= plat.y && feetY >= plat.y) {
        fighter.y       = plat.y;
        fighter.vy      = 0;
        fighter.grounded = true;
        break;
      }
    }
  }

  // If moving up (jump), leave platform
  if (fighter.vy < 0) fighter.grounded = false;

  // Ground clamp
  const gnd = GROUND();
  if (fighter.y >= gnd) {
    fighter.y       = gnd;
    fighter.vy      = 0;
    fighter.grounded = true;
  }

  // Arena bounds
  fighter.x = Math.max(fighter.width / 2 + 4, Math.min(ARENA_W() - fighter.width / 2 - 4, fighter.x));

  // Awakening countdown (PVP)
  if (fighter.awakened) {
    fighter.awakenTimer -= dt;
    if (fighter.awakenTimer <= 0) {
      fighter.awakened    = false;
      fighter.awakenTimer = 0;
      if (fighter.isPlayer) updateMoveSlots(fighter);
      log(`${fighter.isPlayer ? 'Your' : 'Enemy'} awakening expired.`, 'system');
    }
  }

  // Emote countdown
  if (fighter.emoteTimer > 0) {
    fighter.emoteTimer -= dt;
    fighter.emoteAnim  += dt;
    if (fighter.emoteTimer <= 0) { fighter.emoteIcon = null; fighter.emoteTimer = 0; }
  }

  // Boss phase check
  if (fighter.isBoss) checkBossPhase(fighter);
}

/* =========================================================
   RENDER
   ========================================================= */
function render() {
  const W = DOM.canvas.width;
  const H = DOM.canvas.height;
  const t = state.time;

  // 1. Map background (no shake — stays stable)
  renderMapBackground(ctx, W, H, state.mapId, t);

  // 2. Everything that shakes together
  ctx.save();
  ctx.translate(VFX.sx, VFX.sy);

  // 3. Map foreground + platforms
  renderMapForeground(ctx, W, H, state.mapId, t, state.platforms);

  // 4. Fighters
  drawFighter(state.player);
  drawFighter(state.enemy);

  // 5. World-space VFX (particles, slashes, rings, shockwaves)
  VFX.renderWorld(ctx);

  ctx.restore();

  // 6. Screen-space VFX (flash overlays — no shake)
  VFX.renderScreen(ctx, W, H);

  // 7. 3D overlay — update and render rigged models
  if (typeof Renderer3D !== 'undefined' && Renderer3D.initialized) {
    const dt = state._lastDt || 0.016;
    Renderer3D.update(dt, state.player, state.enemy);
    Renderer3D.render();
  }
}

function drawFighter(f) {
  const x = f.x;
  const y = f.y;
  const W = f.width;
  const H = f.height;

  ctx.save();
  ctx.translate(x, y);

  if (f.hitFlash > 0) ctx.globalAlpha = 0.55 + (f.hitFlash / 8) * 0.45;

  // Awakening / Boss glow
  if (f.awakened || f.isBoss) {
    ctx.shadowBlur  = f.isBoss ? 36 : 24;
    ctx.shadowColor = f.glowColor || f.color;
  }

  // Enrage pulse for boss in phase 2
  const enrageGlow = f.isBoss && f.phase >= 1;
  if (enrageGlow) {
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 4);
    ctx.shadowBlur = 30 + pulse * 20;
  }

  // Body
  ctx.fillStyle = f.hitFlash > 0 ? '#ffffff' : f.color;
  ctx.beginPath();
  ctx.roundRect(-W/2, -H, W, H, 8);
  ctx.fill();

  // Block overlay
  if (f.blocking) {
    ctx.fillStyle = 'rgba(100,200,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(-W/2, -H, W, H, 8);
    ctx.fill();
  }

  // Eyes
  const eyeY = -H + 14;
  ctx.fillStyle = '#fff';
  ctx.fillRect(-10, eyeY,     8, 10);
  ctx.fillRect(  2, eyeY,     8, 10);
  ctx.fillStyle = (f.awakened || (f.isBoss && f.phase >= 1)) ? '#ff0000' : '#111';
  ctx.fillRect( -8, eyeY + 2, 5, 6);
  ctx.fillRect(  4, eyeY + 2, 5, 6);

  // Boss extra eyes (4-armed effect)
  if (f.isBoss) {
    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.fillRect(-12, eyeY + 14, 4, 4);
    ctx.fillRect(  8, eyeY + 14, 4, 4);
  }

  // Character icon
  ctx.shadowBlur = 0;
  ctx.font = `${Math.round(16 * f.scale)}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText(f.def.icon, 0, -H/2 + 6 * f.scale);

  // HP bar (above character)
  const bW  = W + 12;
  const bH  = f.isBoss ? 8 : 6;
  const bX  = -bW/2;
  const bY  = -H - 18;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(bX, bY, bW, bH);
  const hpPct = f.hp / f.maxHp;
  ctx.fillStyle = f.isBoss
    ? `hsl(${hpPct * 20}, 100%, 50%)`
    : (hpPct > 0.5 ? '#00e676' : hpPct > 0.25 ? '#ffea00' : '#ff1744');
  ctx.fillRect(bX, bY, bW * hpPct, bH);

  // Name tag
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(-W/2 - 2, -H - 32, W + 4, 13);
  ctx.fillStyle = f.isBoss ? '#ff6666' : '#fff';
  ctx.font = `bold ${f.isBoss ? 10 : 9}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(f.isBoss ? f.def.name : f.currentName, 0, -H - 22);

  // Awakening ring timer (PVP)
  if (f.awakened && !f.isBoss) {
    const prog = f.awakenTimer / f.def.awakening.duration;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, -H/2, W/2 + 9, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * prog);
    ctx.stroke();
  }

  // Boss phase ring
  if (f.isBoss) {
    const phaseColors = ['#ff6644', '#ff0000'];
    ctx.strokeStyle = phaseColors[Math.min(f.phase, phaseColors.length - 1)];
    ctx.lineWidth = 4;
    ctx.shadowBlur = 0;
    const spinAngle = state.time * (f.phase >= 1 ? 2.5 : 1.2);
    ctx.beginPath();
    ctx.arc(0, -H/2, W/2 + 11, spinAngle, spinAngle + Math.PI * 1.5);
    ctx.stroke();
  }

  // Emote bubble
  if (f.emoteIcon) {
    const bounce = Math.sin(f.emoteAnim * 4) * 3;
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(2, -H - 48 + bounce + 2, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(f.emoteIcon, 0, -H - 38 + bounce);
  }

  ctx.restore();
}

/* =========================================================
   GAME LOOP
   ========================================================= */
let lastTime = 0;

function tick(ts = 0) {
  if (!state.running) return;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  state.time += dt;
  state._lastDt = dt;

  updateFighter(state.player, dt);
  updateFighter(state.enemy,  dt);
  updateAI(dt);
  VFX.update(dt);
  render();
  updateHUD();
  checkEndCondition();

  state.frame = requestAnimationFrame(tick);
}

function checkEndCondition() {
  if (!state.running) return;
  if (!state.player.isAlive() || !state.enemy.isAlive()) {
    state.running = false;
    cancelAnimationFrame(state.frame);

    const playerWon = state.player.isAlive();
    if (state.gameMode === 'boss') {
      DOM.resultText.textContent = playerWon ? 'BOSS DEFEATED!' : 'OBLITERATED';
      DOM.resultText.style.color = playerWon ? 'var(--hp-green)' : 'var(--enemy-red)';
      DOM.resultSub.textContent  = playerWon
        ? state.enemy.def.name + ' has fallen.'
        : 'You were no match for ' + state.enemy.def.name + '.';
    } else {
      DOM.resultText.textContent = playerWon ? 'VICTORY!' : 'DEFEATED';
      DOM.resultText.style.color = playerWon ? 'var(--hp-green)' : 'var(--enemy-red)';
      DOM.resultSub.textContent  = '';
    }
    DOM.resultOverlay.classList.remove('hidden');
  }
}

/* =========================================================
   INPUT — KEYBOARD
   ========================================================= */
const keysDown = new Set();

function setupInput() {
  // Remove old listeners by reassigning
  document.onkeydown = e => {
    if (keysDown.has(e.code)) return;
    keysDown.add(e.code);
    handleKey(e.code, true);
  };
  document.onkeyup = e => {
    keysDown.delete(e.code);
    handleKey(e.code, false);
  };
  setupTouchControls();
}

function handleKey(code, down) {
  const p = state.player;
  const en = state.enemy;
  if (!state.running || !p || !en) return;

  switch (code) {
    case 'KeyZ':     if (down) doM1(p, en);     break;
    case 'KeyF':     doBlock(p, down);           break;
    case 'ShiftLeft':
    case 'ShiftRight': if (down) doDash(p);     break;
    case 'Digit1':   if (down) doMove(p, en, 0); break;
    case 'Digit2':   if (down) doMove(p, en, 1); break;
    case 'Digit3':   if (down) doMove(p, en, 2); break;
    case 'Digit4':   if (down) doMove(p, en, 3); break;
    case 'KeyR':     if (down) doSpecial(p, en); break;
    case 'KeyE':     if (down) doAwaken(p);      break;
    case 'KeyB':     if (down) {
      if (window.emoteWheelOpen) { if (typeof window.closeEmoteWheel === 'function') window.closeEmoteWheel(); }
      else { if (typeof window.openEmoteWheel === 'function') window.openEmoteWheel(); }
    } break;
  }
}

/* ── Emote trigger (called by emote wheel) ── */
window.triggerEmote = function(emote) {
  const p = state.player;
  if (!p) return;
  p.emoteIcon  = emote.icon;
  p.emoteTimer = 3.0;
  p.emoteAnim  = 0;
  log(`${p.isPlayer ? 'You' : 'Enemy'} played emote: ${emote.name}`, 'system');
};

// Canvas tap = M1
DOM.canvas.addEventListener('click', () => {
  if (state.running) doM1(state.player, state.enemy);
});

/* =========================================================
   TOUCH CONTROLS
   ========================================================= */
function setupTouchControls() {
  const map = {
    't-m1':    () => doM1(state.player, state.enemy),
    't-block': null,
    't-dash':  () => doDash(state.player),
    't-1':     () => doMove(state.player, state.enemy, 0),
    't-2':     () => doMove(state.player, state.enemy, 1),
    't-3':     () => doMove(state.player, state.enemy, 2),
    't-4':     () => doMove(state.player, state.enemy, 3),
    't-r':     () => doSpecial(state.player, state.enemy),
    't-e':     () => doAwaken(state.player)
  };

  Object.entries(map).forEach(([id, fn]) => {
    const el = $(id);
    if (!el) return;
    if (id === 't-block') {
      el.addEventListener('touchstart', e => { e.preventDefault(); doBlock(state.player, true);  el.classList.add('pressed'); });
      el.addEventListener('touchend',   e => { e.preventDefault(); doBlock(state.player, false); el.classList.remove('pressed'); });
      el.addEventListener('mousedown',  () => { doBlock(state.player, true);  el.classList.add('pressed'); });
      el.addEventListener('mouseup',    () => { doBlock(state.player, false); el.classList.remove('pressed'); });
    } else if (fn) {
      el.addEventListener('click', fn);
      el.addEventListener('touchstart', e => { e.preventDefault(); fn(); el.classList.add('pressed'); });
      el.addEventListener('touchend',   e => { e.preventDefault();       el.classList.remove('pressed'); });
    }
  });
}

/* =========================================================
   REMATCH / BACK
   ========================================================= */
DOM.btnRematch.addEventListener('click', () => {
  cancelAnimationFrame(state.frame);
  startGame();
});

DOM.btnBack.addEventListener('click', () => {
  cancelAnimationFrame(state.frame);
  state.running = false;
  if (typeof Renderer3D !== 'undefined') Renderer3D.cleanup();
  if (charInfoHud) { charInfoHud.classList.add('hidden'); charInfoHud.classList.remove('open'); }
  DOM.screenGame.classList.remove('active');
  DOM.screenSelect.classList.add('active');
  DOM.btnPlay.disabled = false;
});

/* =========================================================
   RESIZE
   ========================================================= */
function resizeCanvas() {
  DOM.canvas.width  = DOM.canvas.clientWidth  || window.innerWidth;
  DOM.canvas.height = DOM.canvas.clientHeight || window.innerHeight;
}

window.addEventListener('resize', () => {
  resizeCanvas();
  if (typeof Renderer3D !== 'undefined' && Renderer3D.initialized) Renderer3D.resize();
  if (state.player) {
    state.platforms = getPlatforms(DOM.canvas.width, DOM.canvas.height);
    const gnd = GROUND();
    // Keep fighters on ground level after resize
    if (state.player.y > gnd) state.player.y = gnd;
    if (state.enemy.y  > gnd) state.enemy.y  = gnd;
  }
});

/* =========================================================
   INIT
   ========================================================= */
buildCharSelect();
resizeCanvas();
