/**
 * Jujutsu Shenanigans - Fake JS Test Build
 * A browser-based mock of the Roblox game Jujutsu Shenanigans by Tze.
 *
 * Features:
 *  - Character select (6 characters based on JJS roster)
 *  - HP system, Ultimate meter, Awakening
 *  - M1 combo chain (up to 4 hits), Block, Dash
 *  - 4 unique moves per character with cooldowns
 *  - Special (R) and Awakening (E)
 *  - AI opponent
 *  - Canvas-rendered arena
 *  - Mobile touch controls
 *  - Floating damage numbers
 *  - Combat log
 */

'use strict';

/* =========================================================
   STATE
   ========================================================= */
const state = {
  selectedCharId: null,
  player: null,
  enemy: null,
  running: false,
  frame: null
};

/* =========================================================
   DOM REFS
   ========================================================= */
const $ = id => document.getElementById(id);

const DOM = {
  screenSelect: $('screen-select'),
  screenGame:   $('screen-game'),
  charGrid:     $('char-grid'),
  btnPlay:      $('btn-play'),

  canvas:        $('game-canvas'),
  playerHpBar:   $('player-hp-bar'),
  playerHpText:  $('player-hp-text'),
  playerUltBar:  $('player-ult-bar'),
  playerName:    $('player-name-label'),
  enemyHpBar:    $('enemy-hp-bar'),
  enemyHpText:   $('enemy-hp-text'),
  enemyName:     $('enemy-name-label'),
  combatLog:     $('combat-log'),
  awakenBanner:  $('awaken-banner'),
  resultOverlay: $('result-overlay'),
  resultText:    $('result-text'),
  btnRematch:    $('btn-rematch'),
  btnBack:       $('btn-back'),

  moveSlots: [1,2,3,4].map(i => ({
    slot: $(`slot-${i}`),
    name: $(`move-${i}-name`),
    cd:   $(`cd-${i}`)
  })),
  slotR:      $('slot-r'),
  slotAwaken: $('slot-awaken'),
  moveRName:  $('move-r-name'),
  cdR:        $('cd-r'),
  cdAwaken:   $('cd-awaken')
};

const ctx = DOM.canvas.getContext('2d');

/* =========================================================
   FIGHTER CLASS
   ========================================================= */
class Fighter {
  constructor(charDef, isPlayer, x, y) {
    this.def = charDef;
    this.isPlayer = isPlayer;
    this.maxHp = charDef.hp;
    this.hp = charDef.hp;
    this.ult = 0;   // 0–100
    this.x = x;
    this.y = y;
    this.facing = isPlayer ? 1 : -1; // 1=right, -1=left
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    this.blocking = false;
    this.dashing = false;
    this.dashTimer = 0;
    this.stunTimer = 0;
    this.invincible = false;
    this.awakened = false;
    this.awakenTimer = 0;
    this.awakenUsed = false;
    this.m1Combo = 0;
    this.m1ComboTimer = 0;
    this.m1Cooldown = 0;
    this.cooldowns = [0, 0, 0, 0]; // moves 1-4
    this.specialCd = 0;
    this.awakenCd = 0;
    this.width = 44;
    this.height = 72;
    this.color = charDef.color;
    this.action = 'idle';
    this.actionTimer = 0;
    this.hitFlash = 0;
  }

  get currentMoves() {
    return this.awakened ? this.def.awakening.moves : this.def.moves;
  }

  get currentSpecial() {
    return this.awakened ? this.def.awakening.special : this.def.special;
  }

  get currentName() {
    return this.awakened ? this.def.awakening.name : this.def.name;
  }

  takeDamage(amount) {
    if (this.invincible) return 0;
    let dmg = amount;
    if (this.blocking) dmg = Math.floor(dmg * 0.2);
    this.hp = Math.max(0, this.hp - dmg);
    this.hitFlash = 6;
    // gain ult from taking damage
    this.addUlt(dmg * 0.3);
    return dmg;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addUlt(amount) {
    this.ult = Math.min(100, this.ult + amount);
  }

  isAlive() {
    return this.hp > 0;
  }
}

/* =========================================================
   CHARACTER SELECT
   ========================================================= */
function buildCharSelect() {
  DOM.charGrid.innerHTML = '';
  CHARACTERS.forEach(c => {
    const card = document.createElement('div');
    card.className = 'char-card';
    card.dataset.id = c.id;
    card.innerHTML = `
      ${c.badge ? `<div class="char-badge ${c.badgeType || ''}">${c.badge}</div>` : ''}
      <div class="char-icon">${c.icon}</div>
      <div class="char-card-name">${c.name}</div>
      <div class="char-card-sub">${c.subName}</div>
    `;
    card.addEventListener('click', () => selectChar(c.id));
    DOM.charGrid.appendChild(card);
  });
}

function selectChar(id) {
  state.selectedCharId = id;
  document.querySelectorAll('.char-card').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });
  DOM.btnPlay.disabled = false;
  DOM.btnPlay.textContent = 'FIGHT!';
}

DOM.btnPlay.addEventListener('click', () => {
  if (!state.selectedCharId) return;
  startGame();
});

/* =========================================================
   GAME START
   ========================================================= */
function startGame() {
  const playerDef = CHARACTERS.find(c => c.id === state.selectedCharId);

  // Pick a random enemy that is different from player
  const enemies = CHARACTERS.filter(c => c.id !== state.selectedCharId);
  const enemyDef = enemies[Math.floor(Math.random() * enemies.length)];

  const W = DOM.canvas.clientWidth || window.innerWidth;
  const GROUND = groundY();

  state.player = new Fighter(playerDef, true,  W * 0.25, GROUND);
  state.enemy  = new Fighter(enemyDef, false, W * 0.75, GROUND);
  state.running = true;

  // Switch screens
  DOM.screenSelect.classList.remove('active');
  DOM.screenGame.classList.add('active');
  DOM.resultOverlay.classList.add('hidden');

  // HUD labels
  DOM.playerName.textContent = playerDef.name;
  DOM.enemyName.textContent  = enemyDef.name;

  // Move slots
  updateMoveSlots(state.player);

  setupInput();
  resizeCanvas();
  tick();
}

function groundY() {
  return (DOM.canvas.clientHeight || window.innerHeight) - 100;
}

/* =========================================================
   HUD UPDATE
   ========================================================= */
function updateHUD() {
  const p = state.player;
  const e = state.enemy;

  const pPct = (p.hp / p.maxHp) * 100;
  DOM.playerHpBar.style.width = pPct + '%';
  DOM.playerHpBar.style.background =
    pPct > 50 ? 'var(--hp-green)' :
    pPct > 25 ? 'var(--hp-yellow)' : 'var(--hp-red)';
  DOM.playerHpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;

  const ultPct = p.ult;
  DOM.playerUltBar.style.width = ultPct + '%';
  DOM.playerUltBar.classList.toggle('full', ultPct >= 100);

  const ePct = (e.hp / e.maxHp) * 100;
  DOM.enemyHpBar.style.width = ePct + '%';
  DOM.enemyHpText.textContent = `${Math.ceil(e.hp)} / ${e.maxHp}`;

  // Cooldowns overlay
  p.cooldowns.forEach((cd, i) => {
    const el = DOM.moveSlots[i];
    const maxCd = p.currentMoves[i] ? p.currentMoves[i].cooldown : 1;
    el.cd.textContent = cd > 0 ? Math.ceil(cd) + 's' : '';
    el.cd.classList.toggle('active', cd > 0);
    el.slot.classList.toggle('on-cooldown', cd > 0);
  });

  // Special cooldown
  const sCd = p.specialCd;
  DOM.cdR.textContent = sCd > 0 ? Math.ceil(sCd) + 's' : '';
  DOM.cdR.classList.toggle('active', sCd > 0);
  DOM.slotR.classList.toggle('on-cooldown', sCd > 0 || p.ult < 100);

  // Awaken cd
  const aCd = p.awakenCd;
  const canAwaken = !p.awakenUsed && p.ult >= 100 && !p.awakened;
  DOM.cdAwaken.textContent = aCd > 0 ? Math.ceil(aCd) + 's' : (canAwaken ? 'READY' : '');
  DOM.cdAwaken.classList.toggle('active', !canAwaken);
  DOM.slotAwaken.classList.toggle('on-cooldown', !canAwaken);
}

function updateMoveSlots(fighter) {
  fighter.currentMoves.forEach((m, i) => {
    if (DOM.moveSlots[i]) {
      DOM.moveSlots[i].name.textContent = m.name;
    }
  });
  DOM.moveRName.textContent = fighter.currentSpecial.name;
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
  const el = document.createElement('div');
  el.className = 'dmg-num';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  el.style.fontSize = (18 + Math.min(text.length * 2, 12)) + 'px';
  el.style.color = color;
  DOM.screenGame.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

/* =========================================================
   ACTIONS — PLAYER
   ========================================================= */
function doM1(attacker, defender) {
  if (attacker.m1Cooldown > 0 || attacker.stunTimer > 0) return;
  if (attacker.actionTimer > 0 && attacker.action !== 'idle') return;

  const comboHit = attacker.m1Combo < 2 ? 3 : 4;
  const dmg = defender.takeDamage(comboHit);
  attacker.addUlt(comboHit * 0.2);
  attacker.m1Combo = (attacker.m1Combo + 1) % 4;
  attacker.m1ComboTimer = 1.7;
  attacker.m1Cooldown = 0.25;
  attacker.action = 'm1';
  attacker.actionTimer = 0.25;

  log(`${attacker.isPlayer ? 'You' : 'Enemy'} M1 hit — ${dmg} dmg`, 'dmg');
  const targetX = defender.x + (attacker.isPlayer ? 20 : -20);
  spawnDmgNum(dmg, targetX, defender.y - 60, '#ff6b6b');
}

function doMove(attacker, defender, moveIndex) {
  if (attacker.cooldowns[moveIndex] > 0) return;
  if (attacker.stunTimer > 0) return;
  const move = attacker.currentMoves[moveIndex];
  if (!move) return;

  attacker.cooldowns[moveIndex] = move.cooldown;
  attacker.action = 'move';
  attacker.actionTimer = 0.6;

  if (move.type === 'defense' || move.damage === 0) {
    // Defensive / utility
    attacker.invincible = true;
    setTimeout(() => { attacker.invincible = false; }, 800);
    log(`${attacker.isPlayer ? 'You' : 'Enemy'} used ${move.name}!`, 'system');
    return;
  }

  const dmg = defender.takeDamage(move.damage);
  attacker.addUlt(move.damage * 0.25);

  if (move.type === 'counter') {
    // Interrupt if enemy was attacking
    defender.stunTimer = 1.5;
    log(`COUNTER! ${move.name} — ${dmg} dmg, stun`, 'special');
  } else {
    log(`${attacker.isPlayer ? 'You' : 'Enemy'} ${move.name} — ${dmg} dmg`, 'dmg');
  }
  spawnDmgNum(dmg, defender.x, defender.y - 60 - Math.random() * 20, '#ff6b6b');
}

function doSpecial(attacker, defender) {
  if (attacker.ult < 100) return;
  if (attacker.specialCd > 0) return;
  if (attacker.stunTimer > 0) return;

  const sp = attacker.currentSpecial;
  attacker.ult = 0;
  attacker.specialCd = sp.cooldown;
  attacker.action = 'special';
  attacker.actionTimer = 1.2;

  if (sp.heal) {
    attacker.heal(sp.heal);
    log(`JACKPOT! ${sp.name} — Healed ${sp.heal} HP!`, 'heal');
    spawnDmgNum(`+${sp.heal}`, attacker.x, attacker.y - 80, '#69db7c');
  } else {
    const dmg = defender.takeDamage(sp.damage);
    attacker.addUlt(sp.damage * 0.15);
    log(`SPECIAL: ${sp.name} — ${dmg} DAMAGE!`, 'special');
    spawnDmgNum(dmg, defender.x, defender.y - 80, '#ffd43b');
  }
}

function doAwaken(fighter) {
  if (fighter.awakenUsed) return;
  if (fighter.ult < 100) return;
  if (fighter.awakened) return;

  fighter.awakened = true;
  fighter.awakenUsed = true;
  fighter.ult = 0;
  fighter.awakenTimer = fighter.def.awakening.duration;
  fighter.awakenCd = 999;
  fighter.invincible = true;
  fighter.action = 'awakening';
  fighter.actionTimer = 2.5;

  // HP restore
  const bonus = Math.floor(fighter.maxHp * fighter.def.awakening.hpBonus);
  fighter.heal(bonus);

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
  fighter.dashing = true;
  fighter.dashTimer = 0.3;
  fighter.invincible = true;
  fighter.vx = fighter.facing * 180;
  setTimeout(() => { fighter.invincible = false; }, 320);
}

/* =========================================================
   AI LOGIC
   ========================================================= */
const AI = {
  thinkTimer: 0,
  nextAction: null,
  aggression: 0.6
};

function updateAI(dt) {
  const e = state.enemy;
  const p = state.player;
  if (!e.isAlive() || !p.isAlive()) return;

  AI.thinkTimer -= dt;

  const dist = Math.abs(e.x - p.x);
  const closeRange = dist < 120;

  // Move toward player
  if (dist > 90) {
    e.facing = p.x < e.x ? -1 : 1;
    e.x += e.facing * 85 * dt;
  }

  if (AI.thinkTimer > 0) return;
  AI.thinkTimer = 0.6 + Math.random() * 0.8;

  if (e.stunTimer > 0) return;

  // Awaken if able
  if (!e.awakened && !e.awakenUsed && e.ult >= 100) {
    if (Math.random() < 0.85) { doAwaken(e); return; }
  }

  // Special
  if (e.ult >= 100 && e.specialCd <= 0 && Math.random() < 0.5) {
    doSpecial(e, p); return;
  }

  if (closeRange) {
    const roll = Math.random();
    if (roll < 0.45) {
      doM1(e, p);
    } else if (roll < 0.65) {
      const avail = e.cooldowns.map((cd, i) => cd <= 0 ? i : -1).filter(i => i >= 0);
      if (avail.length) doMove(e, p, avail[Math.floor(Math.random() * avail.length)]);
    } else if (roll < 0.75) {
      doBlock(e, true);
      setTimeout(() => doBlock(e, false), 400 + Math.random() * 400);
    } else if (roll < 0.85) {
      doDash(e);
    }
  }
}

/* =========================================================
   PHYSICS / UPDATE
   ========================================================= */
const GRAVITY = 800;
const ARENA_W = () => DOM.canvas.width;
const GROUND  = () => DOM.canvas.height - 100;

function updateFighter(fighter, dt) {
  // Timers
  if (fighter.stunTimer > 0)    fighter.stunTimer    = Math.max(0, fighter.stunTimer - dt);
  if (fighter.m1Cooldown > 0)   fighter.m1Cooldown   = Math.max(0, fighter.m1Cooldown - dt);
  if (fighter.m1ComboTimer > 0) {
    fighter.m1ComboTimer -= dt;
    if (fighter.m1ComboTimer <= 0) fighter.m1Combo = 0;
  }
  if (fighter.actionTimer > 0)  fighter.actionTimer  = Math.max(0, fighter.actionTimer - dt);
  if (fighter.dashTimer > 0)    fighter.dashTimer    = Math.max(0, fighter.dashTimer - dt);
  if (fighter.specialCd > 0)    fighter.specialCd    = Math.max(0, fighter.specialCd - dt);
  fighter.cooldowns = fighter.cooldowns.map(cd => Math.max(0, cd - dt));
  if (fighter.hitFlash > 0)     fighter.hitFlash     = Math.max(0, fighter.hitFlash - 1);

  // Dash decay
  if (!fighter.dashing || fighter.dashTimer <= 0) {
    fighter.dashing = false;
    fighter.vx *= 0.75;
  }

  // Gravity
  if (!fighter.grounded) {
    fighter.vy += GRAVITY * dt;
  }

  // Position
  fighter.x += fighter.vx * dt;
  fighter.y += fighter.vy * dt;

  // Ground clamp
  const gnd = GROUND();
  if (fighter.y >= gnd) {
    fighter.y = gnd;
    fighter.vy = 0;
    fighter.grounded = true;
  }

  // Arena bounds
  fighter.x = Math.max(20, Math.min(ARENA_W() - 20, fighter.x));

  // Awakening countdown
  if (fighter.awakened) {
    fighter.awakenTimer -= dt;
    if (fighter.awakenTimer <= 0) {
      fighter.awakened = false;
      fighter.awakenTimer = 0;
      if (fighter.isPlayer) updateMoveSlots(fighter);
      log(`${fighter.isPlayer ? 'Your' : 'Enemy'} awakening expired.`, 'system');
    }
  }
}

/* =========================================================
   RENDER
   ========================================================= */
function render() {
  const W = DOM.canvas.width;
  const H = DOM.canvas.height;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a0a24');
  bg.addColorStop(1, '#0d0d18');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid lines (subtle)
  ctx.strokeStyle = 'rgba(100,80,200,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Ground
  const gnd = GROUND();
  ctx.strokeStyle = '#7c4dff44';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, gnd + state.player.height);
  ctx.lineTo(W, gnd + state.player.height);
  ctx.stroke();

  ctx.fillStyle = 'rgba(124,77,255,0.05)';
  ctx.fillRect(0, gnd + state.player.height, W, H - gnd - state.player.height);

  // Fighters
  drawFighter(state.player);
  drawFighter(state.enemy);
}

function drawFighter(f) {
  const x = f.x;
  const y = f.y;
  const W = f.width;
  const H = f.height;

  ctx.save();
  ctx.translate(x, y);

  // Hit flash
  if (f.hitFlash > 0) {
    ctx.globalAlpha = 0.6 + (f.hitFlash / 6) * 0.4;
  }

  // Awakening glow
  if (f.awakened) {
    ctx.shadowBlur = 28;
    ctx.shadowColor = f.color;
  }

  // Body
  const bodyColor = f.hitFlash > 0 ? '#ffffff' : f.color;
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-W/2, -H, W, H, 8);
  ctx.fill();

  // Block stance overlay
  if (f.blocking) {
    ctx.fillStyle = 'rgba(100,200,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(-W/2, -H, W, H, 8);
    ctx.fill();
  }

  // Eyes
  ctx.fillStyle = '#fff';
  const eyeY = -H + 14;
  ctx.fillRect(-10, eyeY, 8, 10);
  ctx.fillRect(2, eyeY, 8, 10);

  if (f.awakened) {
    ctx.fillStyle = '#ff0000';
  } else {
    ctx.fillStyle = '#111';
  }
  ctx.fillRect(-8, eyeY + 2, 5, 6);
  ctx.fillRect(4, eyeY + 2, 5, 6);

  // Character icon
  ctx.font = '18px serif';
  ctx.textAlign = 'center';
  ctx.fillText(f.def.icon, 0, -H/2 + 6);

  // HP bar above character
  const barW = W + 10;
  const barH = 6;
  const barX = -barW/2;
  const barY = -H - 16;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(barX, barY, barW, barH);
  const hpPct = f.hp / f.maxHp;
  ctx.fillStyle = hpPct > 0.5 ? '#00e676' : hpPct > 0.25 ? '#ffea00' : '#ff1744';
  ctx.fillRect(barX, barY, barW * hpPct, barH);

  // Name tag
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-W/2 - 2, -H - 28, W + 4, 12);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 9px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(f.currentName, 0, -H - 19);

  // Awakening timer ring
  if (f.awakened) {
    const prog = f.awakenTimer / f.def.awakening.duration;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, -H/2, W/2 + 8, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * prog);
    ctx.stroke();
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

  updateFighter(state.player, dt);
  updateFighter(state.enemy, dt);
  updateAI(dt);

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
    DOM.resultText.textContent = playerWon ? 'VICTORY!' : 'DEFEATED';
    DOM.resultText.style.color = playerWon ? 'var(--hp-green)' : 'var(--enemy-red)';
    DOM.resultOverlay.classList.remove('hidden');
  }
}

/* =========================================================
   INPUT — KEYBOARD
   ========================================================= */
const keysDown = new Set();

function setupInput() {
  document.onkeydown = null;
  document.onkeyup   = null;

  document.addEventListener('keydown', e => {
    if (keysDown.has(e.code)) return;
    keysDown.add(e.code);
    handleKey(e.code, true);
  });

  document.addEventListener('keyup', e => {
    keysDown.delete(e.code);
    handleKey(e.code, false);
  });

  setupTouchControls();
}

function handleKey(code, down) {
  const p = state.player;
  const en = state.enemy;
  if (!state.running || !p || !en) return;

  switch (code) {
    // M1 attack
    case 'MouseLeft':
    case 'KeyZ':
      if (down) doM1(p, en);
      break;

    // Block
    case 'KeyF':
      doBlock(p, down);
      break;

    // Dash
    case 'ShiftLeft':
    case 'ShiftRight':
      if (down) doDash(p);
      break;

    // Move abilities
    case 'Digit1': if (down) doMove(p, en, 0); break;
    case 'Digit2': if (down) doMove(p, en, 1); break;
    case 'Digit3': if (down) doMove(p, en, 2); break;
    case 'Digit4': if (down) doMove(p, en, 3); break;

    // Special
    case 'KeyR': if (down) doSpecial(p, en); break;

    // Awakening
    case 'KeyE': if (down) doAwaken(p); break;
  }
}

// Canvas click = M1
DOM.canvas.addEventListener('click', () => {
  if (state.running) doM1(state.player, state.enemy);
});

/* =========================================================
   TOUCH CONTROLS
   ========================================================= */
function setupTouchControls() {
  const map = {
    't-m1':   () => doM1(state.player, state.enemy),
    't-block': null, // hold
    't-dash':  () => doDash(state.player),
    't-1':    () => doMove(state.player, state.enemy, 0),
    't-2':    () => doMove(state.player, state.enemy, 1),
    't-3':    () => doMove(state.player, state.enemy, 2),
    't-4':    () => doMove(state.player, state.enemy, 3),
    't-r':    () => doSpecial(state.player, state.enemy),
    't-e':    () => doAwaken(state.player)
  };

  Object.entries(map).forEach(([id, fn]) => {
    const el = $(id);
    if (!el) return;

    if (id === 't-block') {
      el.addEventListener('touchstart', e => { e.preventDefault(); doBlock(state.player, true); el.classList.add('pressed'); });
      el.addEventListener('touchend',   e => { e.preventDefault(); doBlock(state.player, false); el.classList.remove('pressed'); });
      el.addEventListener('mousedown',  () => { doBlock(state.player, true);  el.classList.add('pressed'); });
      el.addEventListener('mouseup',    () => { doBlock(state.player, false); el.classList.remove('pressed'); });
    } else if (fn) {
      el.addEventListener('click', fn);
      el.addEventListener('touchstart', e => { e.preventDefault(); fn(); el.classList.add('pressed'); });
      el.addEventListener('touchend',   e => { e.preventDefault(); el.classList.remove('pressed'); });
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
  DOM.screenGame.classList.remove('active');
  DOM.screenSelect.classList.add('active');
  DOM.btnPlay.disabled = false;
  DOM.btnPlay.textContent = 'FIGHT!';
});

/* =========================================================
   CANVAS RESIZE
   ========================================================= */
function resizeCanvas() {
  DOM.canvas.width  = DOM.canvas.clientWidth  || window.innerWidth;
  DOM.canvas.height = DOM.canvas.clientHeight || window.innerHeight;
}

window.addEventListener('resize', () => {
  resizeCanvas();
  if (state.player) {
    state.player.y = GROUND();
    state.enemy.y  = GROUND();
  }
});

/* =========================================================
   INIT
   ========================================================= */
buildCharSelect();
resizeCanvas();
