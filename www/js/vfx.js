/**
 * VFX System — Jujutsu Shenanigans
 *
 * Handles:
 *  - Per-character M1 hit effects (punch arcs, wave ripples, claw slashes, etc.)
 *  - Move-type effects (slash trails, energy waves, AoE rings, counter flash)
 *  - Special move flash + burst
 *  - Awakening particle explosion
 *  - Boss phase transition shockwave storm
 *  - Dash particle trails
 *  - Screen shake
 */

'use strict';

const VFX = (() => {

  /* -------------------------------------------------------
     EFFECT POOL
  ------------------------------------------------------- */
  const pool = [];

  function push(type, x, y, opts) {
    const life = opts.life || 0.4;
    pool.push({ type, x, y, life, maxLife: life, ...opts });
  }

  /* -------------------------------------------------------
     SCREEN SHAKE
  ------------------------------------------------------- */
  let shakeAmt = 0;
  let _sx = 0, _sy = 0;

  function shake(amt) {
    if (window.GAME_SETTINGS && !window.GAME_SETTINGS.screenShake) return;
    shakeAmt = Math.max(shakeAmt, amt);
  }

  /* -------------------------------------------------------
     CHARACTER M1 CONFIG
     Each character's M1 has a unique visual style, color,
     particle count, and shake amount.
  ------------------------------------------------------- */
  const CHAR_M1 = {
    vessel: {
      color: '#ff6b6b', color2: '#ff2244',
      style: 'punch', shake: 3, count: 9,
      label: 'STRIKE'
    },
    honored_one: {
      color: '#74c0fc', color2: '#ffffff',
      style: 'wave', shake: 3, count: 10,
      label: 'INFINITY STRIKE'
    },
    ten_shadows: {
      color: '#a9e34b', color2: '#1a3010',
      style: 'claw', shake: 2, count: 8,
      label: 'SHADOW CLAW'
    },
    hakari: {
      color: '#ffd43b', color2: '#ff6600',
      style: 'punch', shake: 3, count: 9,
      label: 'IDLE PUNCH'
    },
    perfection: {
      color: '#ffffff', color2: '#ffaa77',
      style: 'slash', shake: 3, count: 7,
      label: 'SWIFT STRIKE'
    },
    strongest_of_history: {
      color: '#ff1744', color2: '#111111',
      style: 'slam', shake: 6, count: 14,
      label: "KING'S FIST"
    },
    // Bosses
    boss_sukuna: {
      color: '#ff1744', color2: '#000000',
      style: 'slam', shake: 9, count: 18,
      label: 'CURSED FIST'
    },
    boss_gojo: {
      color: '#00b0ff', color2: '#ffffff',
      style: 'wave', shake: 7, count: 14,
      label: 'LIMITLESS STRIKE'
    },
    boss_mahoraga: {
      color: '#69db7c', color2: '#ffffff',
      style: 'slam', shake: 8, count: 16,
      label: 'WHEEL SMASH'
    },
    // New characters
    kashimo: {
      color: '#00e5ff', color2: '#ffffff',
      style: 'punch', shake: 4, count: 11,
      label: 'THUNDER STRIKE'
    },
    takaba: {
      color: '#ff6f91', color2: '#ffd43b',
      style: 'punch', shake: 2, count: 7,
      label: 'COMEDY SLAP'
    },
    yuta: {
      color: '#b388ff', color2: '#1a1a2e',
      style: 'slash', shake: 4, count: 12,
      label: 'RIKA STRIKE'
    },
    maki: {
      color: '#2ed573', color2: '#1a3a1a',
      style: 'slash', shake: 3, count: 9,
      label: 'WEAPON STRIKE'
    },
    choso: {
      color: '#e03131', color2: '#2a1a1a',
      style: 'punch', shake: 4, count: 10,
      label: 'BLOOD FIST'
    },
    naoya: {
      color: '#20c997', color2: '#886644',
      style: 'punch', shake: 3, count: 8,
      label: 'SPEED STRIKE'
    }
  };

  /* -------------------------------------------------------
     MOVE TYPE CONFIG
  ------------------------------------------------------- */
  const MOVE_STYLE = {
    slash:   { style: 'slash',   count: 12, scale: 1.0 },
    melee:   { style: 'punch',   count: 10, scale: 1.0 },
    ranged:  { style: 'energy',  count: 14, scale: 1.2 },
    aoe:     { style: 'ring',    count: 20, scale: 1.6 },
    counter: { style: 'counter', count: 16, scale: 1.3 },
    summon:  { style: 'shadow',  count: 12, scale: 1.0 },
    defense: { style: 'barrier', count: 8,  scale: 1.0 },
    utility: { style: 'spark',   count: 7,  scale: 0.8 },
    ultimate:{ style: 'ring',    count: 24, scale: 2.0 }
  };

  /* -------------------------------------------------------
     PRIMITIVE SPAWNERS
  ------------------------------------------------------- */

  // Sparks — colored particles flying outward from a point
  function sparks(x, y, color, color2, count, speed, spreadY = -60) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = speed * (0.4 + Math.random() * 0.8);
      push('particle', x, y, {
        vx:      Math.cos(angle) * spd,
        vy:      Math.sin(angle) * spd + spreadY,
        color:   Math.random() < 0.55 ? color : color2,
        r:       2 + Math.random() * 3,
        life:    0.2 + Math.random() * 0.25,
        gravity: 380,
        glow:    true
      });
    }
  }

  // Slash line — angled fading line
  function slash(x, y, angle, color, len, width, count = 1) {
    for (let i = 0; i < count; i++) {
      const a = angle + (i - (count - 1) / 2) * 0.18;
      push('slash', x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, {
        angle: a,
        len:   len * (0.7 + Math.random() * 0.5),
        color,
        lw:    width * (0.6 + Math.random() * 0.6),
        life:  0.18 + Math.random() * 0.1,
        glow:  true
      });
    }
  }

  // Ring — expanding circular pulse
  function ring(x, y, color, maxR, thick, life = 0.35) {
    push('ring', x, y, {
      r: 8, maxR, color,
      speed: maxR / life,
      lw:    thick,
      life, glow: true
    });
  }

  // Projectile — moving dot with fade
  function projectile(x, y, vx, vy, color, r, life) {
    push('particle', x, y, {
      vx, vy,
      color, r,
      life, gravity: 0, glow: true
    });
  }

  // Shockwave — horizontal ellipse on the ground
  function shockwave(x, groundY, color, maxW = 130) {
    push('shockwave', x, groundY, {
      color, maxW,
      life: 0.3
    });
  }

  // Screen flash — full-canvas color overlay
  function flash(color, intensity = 0.35, life = 0.18) {
    push('flash', 0, 0, { color, intensity, life });
  }

  // Shadow smoke — rising particles for summon effects
  function shadowSmoke(x, groundY, color, count = 14) {
    for (let i = 0; i < count; i++) {
      push('particle', x + (Math.random() - 0.5) * 70, groundY, {
        vx: (Math.random() - 0.5) * 45,
        vy: -50 - Math.random() * 130,
        color,
        r:  3 + Math.random() * 5,
        life: 0.4 + Math.random() * 0.4,
        gravity: -30,  // rises
        glow: false
      });
    }
  }

  /* -------------------------------------------------------
     PUBLIC — M1 HIT  (character-specific styles)
  ------------------------------------------------------- */
  function m1Hit(charId, attackerX, defX, defY) {
    const cfg = CHAR_M1[charId] || CHAR_M1.vessel;
    const dir = attackerX < defX ? 1 : -1;
    const ix  = defX - dir * 18;
    const iy  = defY - 44;

    shake(cfg.shake);

    switch (cfg.style) {

      case 'punch':
        // Burst of sparks + single punch-arc slash
        sparks(ix, iy, cfg.color, cfg.color2, cfg.count, 130);
        slash(ix, iy, dir > 0 ? -0.25 : Math.PI + 0.25, cfg.color, 52, 3, 1);
        break;

      case 'wave':
        // Outward ripple ring + lighter sparks
        sparks(ix, iy, cfg.color, cfg.color2, cfg.count, 100);
        ring(ix, iy, cfg.color, 58, 2, 0.28);
        // Small inner ring
        ring(ix, iy, cfg.color2, 30, 1, 0.18);
        break;

      case 'claw':
        // Three spread slashes + dark smoke debris
        sparks(ix, iy, cfg.color, cfg.color2, cfg.count, 115);
        slash(ix, iy, dir > 0 ? 0.35 : Math.PI - 0.35, cfg.color, 55, 3, 3);
        break;

      case 'slash':
        // Fast single wide slash + bright sparks
        slash(ix, iy, dir > 0 ? -0.45 : Math.PI + 0.45, cfg.color, 72, 5, 2);
        sparks(ix, iy, cfg.color, cfg.color2, cfg.count, 160);
        break;

      case 'slam':
        // Shockwave on ground + huge sparks + ring + flash tint
        sparks(ix, iy, cfg.color, cfg.color2, cfg.count, 185);
        ring(ix, iy, cfg.color, 68, 4, 0.3);
        shockwave(defX, defY, cfg.color, 100);
        if (cfg.shake >= 7) flash(cfg.color, 0.07);
        break;
    }
  }

  // M1 swing MISS — just an arm-swing effect, no impact
  function m1Swing(x, y, dir, color) {
    slash(x + dir * 20, y - 30, dir > 0 ? -0.3 : Math.PI + 0.3, color + 'aa', 40, 2, 1);
  }

  /* -------------------------------------------------------
     PUBLIC — MOVE HIT  (move-type styles)
  ------------------------------------------------------- */
  function moveHit(moveType, defX, defY, color, damage) {
    const cfg   = MOVE_STYLE[moveType] || MOVE_STYLE.melee;
    const sc    = cfg.scale;
    const shAmt = Math.min(4 + damage / 18, 12);

    shake(shAmt);

    switch (cfg.style) {

      case 'slash':
        sparks(defX, defY - 50, color, '#ffffff', cfg.count, 155 * sc);
        slash(defX, defY - 42, -0.38, color, 82 * sc, 4, 2);
        slash(defX, defY - 60, 0.18,  color, 58 * sc, 3, 1);
        break;

      case 'punch':
        sparks(defX, defY - 50, color, '#fff', cfg.count, 140 * sc);
        ring(defX, defY - 42, color, 52 * sc, 2);
        break;

      case 'energy':
        // Projectile stream + ring + sparks
        for (let i = 0; i < 5; i++) {
          projectile(defX - 60, defY - 46, 260 + i * 25, (Math.random() - 0.5) * 35,
            color, 5 - i * 0.5, 0.22 + i * 0.03);
        }
        ring(defX, defY - 42, color, 72 * sc, 3);
        sparks(defX, defY - 50, color, '#ffffff', cfg.count, 130 * sc);
        break;

      case 'ring':
        ring(defX, defY - 42, color, 105 * sc, 5);
        ring(defX, defY - 42, color + '55', 70 * sc, 2, 0.28);
        sparks(defX, defY - 42, color, '#ffffff', cfg.count, 165 * sc);
        shockwave(defX, defY, color, 120 * sc);
        flash(color, 0.07 * sc);
        break;

      case 'counter':
        flash('#ffffff', 0.28);
        ring(defX, defY - 40, '#ffffff', 85, 3, 0.3);
        sparks(defX, defY - 40, color, '#ffffff', cfg.count, 210);
        break;

      case 'shadow':
        shadowSmoke(defX, defY, color, cfg.count);
        ring(defX, defY, color, 62 * sc, 2);
        break;

      case 'barrier':
        ring(defX, defY - 36, color, 58, 2);
        sparks(defX, defY - 36, color, '#ffffff', 7, 75);
        break;

      default:
        sparks(defX, defY - 46, color, '#fff', cfg.count, 125);
    }
  }

  /* -------------------------------------------------------
     PUBLIC — SPECIAL MOVE
  ------------------------------------------------------- */
  function specialHit(defX, defY, color) {
    shake(14);
    flash(color, 0.22);
    ring(defX, defY - 40, color, 140, 6);
    ring(defX, defY - 40, '#ffffff', 95, 2, 0.28);
    ring(defX, defY - 40, color, 55, 2, 0.2);
    sparks(defX, defY - 40, color, '#ffffff', 28, 230);
    shockwave(defX, defY, color, 150);
  }

  /* -------------------------------------------------------
     PUBLIC — CHARACTER-SPECIFIC MOVE VFX
     Unique visual effects per character per move slot.
  ------------------------------------------------------- */
  const CHAR_MOVE_VFX = {
    vessel: [
      // 1: Divergent Fist — red impact burst
      (x, y, c) => { sparks(x, y, '#ff4444', '#ff8888', 14, 160); slash(x, y, -0.3, '#ff2244', 65, 4, 2); ring(x, y, '#ff4444', 50, 3); },
      // 2: Manji Kick — arc trail
      (x, y, c) => { slash(x, y, 0.8, '#ff6b6b', 80, 5, 1); sparks(x, y, '#ff6b6b', '#ff2244', 10, 140); shockwave(x, y + 44, '#ff6b6b', 80); },
      // 3: Black Flash — dark lightning flash
      (x, y, c) => { flash('#000000', 0.3, 0.12); flash('#ff0000', 0.2, 0.08); sparks(x, y, '#111111', '#ff0000', 20, 200); ring(x, y, '#000000', 100, 5); ring(x, y, '#ff0000', 60, 2, 0.2); },
      // 4: Boogie Woogie — teleport swap sparkle
      (x, y, c) => { ring(x, y, '#ffaa00', 70, 2); sparks(x, y, '#ffdd00', '#ff8800', 16, 120); flash('#ffaa00', 0.08); }
    ],
    honored_one: [
      // 1: Blue — gravitational pull sphere
      (x, y, c) => { ring(x, y, '#2266ff', 80, 4); ring(x, y, '#00aaff', 50, 2, 0.22); sparks(x, y, '#4488ff', '#ffffff', 16, 90); },
      // 2: Red — repulsive burst
      (x, y, c) => { ring(x, y, '#ff2244', 90, 5); sparks(x, y, '#ff4444', '#ff0000', 18, 180); shockwave(x, y + 44, '#ff2244', 110); flash('#ff0000', 0.1); },
      // 3: Hollow Purple — massive energy ball
      (x, y, c) => { flash('#7c4dff', 0.25, 0.15); ring(x, y, '#7c4dff', 120, 6); ring(x, y, '#ffffff', 70, 3, 0.25); sparks(x, y, '#9966ff', '#ffffff', 24, 220); shockwave(x, y + 44, '#7c4dff', 140); },
      // 4: Infinity — barrier pulse
      (x, y, c) => { ring(x, y, '#00b0ff', 60, 2, 0.5); ring(x, y, '#ffffff', 45, 1, 0.4); sparks(x, y, '#88ddff', '#ffffff', 8, 60); }
    ],
    ten_shadows: [
      // 1: Divine Dog — shadow slash
      (x, y, c) => { sparks(x, y, '#1a3010', '#69db7c', 12, 150); slash(x, y, -0.5, '#69db7c', 70, 4, 3); shadowSmoke(x, y + 44, '#1a3010', 8); },
      // 2: Nue — lightning bird strike
      (x, y, c) => { flash('#ffff00', 0.12); sparks(x, y, '#ffff00', '#ffffff', 14, 170); slash(x, y, -1.2, '#ffdd00', 80, 3, 2); ring(x, y, '#ffff00', 55, 2); },
      // 3: Toad — grapple pull
      (x, y, c) => { sparks(x, y, '#44aa44', '#88ff88', 10, 100); ring(x, y, '#44aa44', 45, 2, 0.3); shadowSmoke(x, y + 44, '#2a5a2a', 6); },
      // 4: Shadow Stretch — dark tendrils
      (x, y, c) => { shadowSmoke(x, y + 44, '#0a0a2e', 18); slash(x, y, 0, '#1a1a3e', 60, 3, 4); sparks(x, y, '#333366', '#1a1a2e', 10, 80); }
    ],
    hakari: [
      // 1: Door Barricade — barrier flash
      (x, y, c) => { ring(x, y, '#ffd43b', 50, 3, 0.4); sparks(x, y, '#ffd43b', '#ffffff', 8, 70); flash('#ffd43b', 0.06); },
      // 2: Idle Death Gamble — dice roll burst
      (x, y, c) => { sparks(x, y, '#ff6600', '#ffd43b', 16, 160); ring(x, y, '#ff6600', 70, 4); slash(x, y, -0.2, '#ffd43b', 55, 3, 2); },
      // 3: Jackpot Slam — slot machine reels
      (x, y, c) => { shockwave(x, y + 44, '#ffd43b', 100); sparks(x, y, '#ffd43b', '#ffffff', 18, 185); ring(x, y, '#ffaa00', 80, 4); flash('#ffdd00', 0.1); },
      // 4: Pachinko Rush — rapid hits
      (x, y, c) => { for (let i = 0; i < 3; i++) { sparks(x + (i-1)*15, y, '#ffd43b', '#ff6600', 6, 120); } slash(x, y, -0.1, '#ffaa00', 50, 3, 3); }
    ],
    perfection: [
      // 1: Inverted Spear — piercing thrust
      (x, y, c) => { slash(x, y, 0, '#ffffff', 90, 5, 1); sparks(x, y, '#ffffff', '#ffaa77', 10, 180); ring(x, y, '#ffffff', 40, 2, 0.15); },
      // 2: Chain of Heaven — whip crack
      (x, y, c) => { slash(x, y, 0.4, '#ffcc88', 100, 3, 1); slash(x, y, -0.4, '#ffcc88', 80, 2, 1); sparks(x, y, '#ffaa77', '#ffffff', 12, 140); },
      // 3: Hunter Dash — afterimage blur
      (x, y, c) => { for (let i = 0; i < 4; i++) { sparks(x - i*20, y, '#ffffff44', '#ffaa7744', 3, 90); } shockwave(x, y + 44, '#ffffff', 70); },
      // 4: Inventory Draw — weapon glint
      (x, y, c) => { flash('#ffffff', 0.15, 0.08); slash(x, y, -0.6, '#ffffff', 85, 6, 2); sparks(x, y, '#ffffff', '#ffcc88', 14, 175); ring(x, y, '#ffffff', 60, 3); }
    ],
    strongest_of_history: [
      // 1: Ancient Cleave — devastating slash
      (x, y, c) => { slash(x, y, -0.4, '#ff0000', 100, 6, 3); sparks(x, y, '#ff1744', '#000000', 20, 200); ring(x, y, '#ff0000', 80, 4); },
      // 2: Dismantle — disintegration lines
      (x, y, c) => { for (let a = 0; a < 6; a++) { slash(x, y, a * 0.5, '#ff1744', 70, 2, 1); } sparks(x, y, '#ff0000', '#440000', 16, 160); },
      // 3: Flame Arrow — fire projectile burst
      (x, y, c) => { flash('#ff4400', 0.15); sparks(x, y, '#ff4400', '#ff8800', 22, 210); ring(x, y, '#ff6600', 90, 5); shockwave(x, y + 44, '#ff4400', 120); },
      // 4: Domain Slash — world-cutting effect
      (x, y, c) => { flash('#ff0000', 0.3, 0.15); slash(x, y, -0.2, '#ff0000', 130, 8, 4); ring(x, y, '#ff0000', 150, 6); sparks(x, y, '#ff0000', '#ffffff', 30, 250); shockwave(x, y + 44, '#ff0000', 160); }
    ],
    kashimo: [
      // 1: Discharge — electric burst
      (x, y, c) => { sparks(x, y, '#00e5ff', '#ffffff', 16, 180); ring(x, y, '#00e5ff', 70, 3); flash('#00e5ff', 0.08); },
      // 2: Thunder Strike — lightning bolt
      (x, y, c) => { flash('#ffffff', 0.15); slash(x, y, -1.5, '#00e5ff', 100, 4, 2); sparks(x, y, '#00e5ff', '#88ffff', 20, 200); shockwave(x, y + 44, '#00e5ff', 100); },
      // 3: Guaranteed Hit — electric field
      (x, y, c) => { ring(x, y, '#00e5ff', 90, 5); ring(x, y, '#ffffff', 60, 2, 0.2); sparks(x, y, '#00e5ff', '#ffffff', 22, 190); flash('#00e5ff', 0.12); },
      // 4: Cursed Lightning — massive discharge
      (x, y, c) => { flash('#00e5ff', 0.3, 0.15); for (let a = 0; a < 4; a++) { slash(x, y, a * 0.8 - 1.2, '#00e5ff', 90, 3, 1); } sparks(x, y, '#ffffff', '#00e5ff', 28, 240); ring(x, y, '#00e5ff', 130, 6); shockwave(x, y + 44, '#00e5ff', 140); }
    ],
    takaba: [
      // 1: Comedian Slap — silly sparkles
      (x, y, c) => { sparks(x, y, '#ff6f91', '#ffd43b', 10, 100); ring(x, y, '#ff6f91', 40, 2); },
      // 2: Punchline — comedic burst
      (x, y, c) => { sparks(x, y, '#ffd43b', '#ff6f91', 14, 140); ring(x, y, '#ffd43b', 60, 3); flash('#ffd43b', 0.06); shockwave(x, y + 44, '#ff6f91', 70); },
      // 3: Plot Armor — reality warp
      (x, y, c) => { flash('#ff6f91', 0.2, 0.12); ring(x, y, '#ff6f91', 80, 4); ring(x, y, '#ffd43b', 50, 2, 0.3); sparks(x, y, '#ff6f91', '#ffffff', 18, 160); },
      // 4: Comedian's Finale — chaos burst
      (x, y, c) => { flash('#ffd43b', 0.25, 0.15); sparks(x, y, '#ff6f91', '#ffd43b', 24, 200); ring(x, y, '#ff6f91', 100, 5); shockwave(x, y + 44, '#ffd43b', 110); slash(x, y, 0.3, '#ff6f91', 70, 4, 3); }
    ],
    yuta: [
      // 1: Rika Punch — spectral fist
      (x, y, c) => { sparks(x, y, '#b388ff', '#1a1a2e', 14, 160); ring(x, y, '#b388ff', 60, 3); slash(x, y, -0.3, '#b388ff', 55, 3, 2); },
      // 2: Copy — mimicked technique
      (x, y, c) => { ring(x, y, '#b388ff', 70, 4); ring(x, y, '#ffffff', 45, 2, 0.25); sparks(x, y, '#b388ff', '#ffffff', 16, 170); flash('#b388ff', 0.08); },
      // 3: Rika Full Manifestation — massive spirit burst
      (x, y, c) => { flash('#b388ff', 0.25, 0.15); ring(x, y, '#b388ff', 110, 6); sparks(x, y, '#b388ff', '#1a1a2e', 24, 220); shockwave(x, y + 44, '#b388ff', 130); },
      // 4: Pure Love — devastating energy wave
      (x, y, c) => { flash('#b388ff', 0.3, 0.18); slash(x, y, -0.2, '#b388ff', 120, 7, 3); ring(x, y, '#b388ff', 140, 6); sparks(x, y, '#b388ff', '#ffffff', 28, 240); shockwave(x, y + 44, '#b388ff', 150); }
    ],
    maki: [
      // 1: Playful Cloud — cursed tool strike
      (x, y, c) => { slash(x, y, -0.3, '#2ed573', 80, 5, 2); sparks(x, y, '#2ed573', '#1a3a1a', 12, 160); ring(x, y, '#2ed573', 45, 2); },
      // 2: Dragon Bone — spear thrust
      (x, y, c) => { slash(x, y, 0, '#2ed573', 95, 4, 1); sparks(x, y, '#2ed573', '#ffffff', 14, 175); shockwave(x, y + 44, '#2ed573', 80); },
      // 3: Heavenly Restriction — pure physical power
      (x, y, c) => { ring(x, y, '#2ed573', 80, 4); sparks(x, y, '#2ed573', '#1a3a1a', 18, 190); slash(x, y, -0.5, '#2ed573', 75, 5, 3); flash('#2ed573', 0.1); },
      // 4: Annihilation — devastating weapon combo
      (x, y, c) => { flash('#2ed573', 0.2, 0.12); for (let a = 0; a < 3; a++) { slash(x, y, a * 0.6 - 0.6, '#2ed573', 85, 4, 2); } sparks(x, y, '#2ed573', '#ffffff', 22, 210); ring(x, y, '#2ed573', 110, 5); shockwave(x, y + 44, '#2ed573', 120); }
    ],
    choso: [
      // 1: Blood Bullet — piercing blood shot
      (x, y, c) => { slash(x, y, 0, '#e03131', 70, 3, 1); sparks(x, y, '#e03131', '#2a1a1a', 12, 150); ring(x, y, '#e03131', 40, 2); },
      // 2: Flowing Red Scale — blood armor burst
      (x, y, c) => { ring(x, y, '#e03131', 65, 4); sparks(x, y, '#e03131', '#ff6b6b', 16, 160); flash('#e03131', 0.08); },
      // 3: Supernova — compressed blood explosion
      (x, y, c) => { flash('#e03131', 0.2, 0.12); ring(x, y, '#e03131', 100, 5); sparks(x, y, '#e03131', '#ffffff', 22, 200); shockwave(x, y + 44, '#e03131', 110); },
      // 4: Piercing Blood — high-pressure blood beam
      (x, y, c) => { flash('#e03131', 0.3, 0.15); slash(x, y, 0, '#e03131', 130, 6, 1); ring(x, y, '#e03131', 120, 5); sparks(x, y, '#e03131', '#2a1a1a', 26, 230); shockwave(x, y + 44, '#e03131', 140); }
    ],
    naoya: [
      // 1: Projection Sorcery — speed strike
      (x, y, c) => { for (let i = 0; i < 3; i++) { sparks(x - i*18, y, '#20c99744', '#88664444', 4, 100); } sparks(x, y, '#20c997', '#886644', 10, 150); },
      // 2: Frame Skip — afterimage attack
      (x, y, c) => { for (let i = 0; i < 4; i++) { sparks(x - i*15, y, '#20c99766', '#ffffff44', 3, 80); } slash(x, y, -0.2, '#20c997', 70, 3, 2); ring(x, y, '#20c997', 50, 2); },
      // 3: 24 FPS — rapid multi-hit
      (x, y, c) => { for (let i = 0; i < 5; i++) { sparks(x + (i-2)*12, y, '#20c997', '#ffffff', 5, 130); } ring(x, y, '#20c997', 75, 4); shockwave(x, y + 44, '#20c997', 90); flash('#20c997', 0.08); },
      // 4: Mach Speed Barrage — overwhelming speed combo
      (x, y, c) => { flash('#20c997', 0.25, 0.15); for (let i = 0; i < 6; i++) { sparks(x + (i-3)*10, y, '#20c997', '#886644', 5, 140); } slash(x, y, -0.1, '#20c997', 100, 5, 3); ring(x, y, '#20c997', 110, 5); shockwave(x, y + 44, '#20c997', 130); }
    ]
  };

  function charMoveHit(charId, moveIdx, defX, defY) {
    const charVfx = CHAR_MOVE_VFX[charId];
    if (charVfx && charVfx[moveIdx]) {
      charVfx[moveIdx](defX, defY - 44);
      return true;
    }
    return false; // Use default moveHit
  }

  /* -------------------------------------------------------
     PUBLIC — AWAKENING
  ------------------------------------------------------- */
  function awakenBurst(x, y, color) {
    shake(12);
    flash(color, 0.28);
    ring(x, y - 36, color, 170, 7);
    ring(x, y - 36, '#ffffff', 115, 3, 0.28);
    ring(x, y - 36, color, 72, 2, 0.22);
    sparks(x, y - 36, color, '#ffffff', 35, 215);
    sparks(x, y - 36, color, '#ffffff', 20, 100);
    shockwave(x, y, color, 160);
  }

  /* -------------------------------------------------------
     PUBLIC — BOSS PHASE TRANSITION
  ------------------------------------------------------- */
  function phaseTransition(x, y, color) {
    shake(20);
    flash(color, 0.4);
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        shake(14 - i * 2);
        ring(x, y - 36, color, 160 + i * 45, 5 - i);
        sparks(x, y - 36, color, '#ffffff', 22, 190 + i * 25);
        shockwave(x, y, color, 140);
      }, i * 140);
    }
  }

  /* -------------------------------------------------------
     PUBLIC — DASH TRAIL  (called per-frame while dashing)
  ------------------------------------------------------- */
  function dashTrail(x, y, color, dir) {
    for (let i = 0; i < 4; i++) {
      push('particle', x - dir * i * 9, y - 20 - Math.random() * 38, {
        vx: (Math.random() - 0.5) * 35,
        vy: -12 - Math.random() * 22,
        color: color + (i === 0 ? 'ff' : i === 1 ? 'bb' : '77'),
        r:   3 - i * 0.5,
        life: 0.1 + i * 0.04,
        gravity: 0,
        glow: true
      });
    }
  }

  /* -------------------------------------------------------
     UPDATE
  ------------------------------------------------------- */
  function update(dt) {
    // Screen shake decay
    shakeAmt = Math.max(0, shakeAmt - dt * 22);
    _sx = shakeAmt > 0.1 ? (Math.random() - 0.5) * shakeAmt * 3.2 : 0;
    _sy = shakeAmt > 0.1 ? (Math.random() - 0.5) * shakeAmt * 1.6 : 0;

    for (let i = pool.length - 1; i >= 0; i--) {
      const e = pool[i];
      e.life -= dt;
      if (e.life <= 0) { pool.splice(i, 1); continue; }

      if (e.type === 'particle') {
        e.x  += e.vx * dt;
        e.y  += e.vy * dt;
        if (e.gravity) e.vy += e.gravity * dt;
      } else if (e.type === 'ring') {
        e.r = Math.min(e.r + e.speed * dt, e.maxR);
      } else if (e.type === 'shockwave') {
        e.prog = 1 - e.life / e.maxLife;
      }
    }
  }

  /* -------------------------------------------------------
     RENDER (world-space — call inside shake translate)
  ------------------------------------------------------- */
  function renderWorld(ctx) {
    pool.forEach(e => {
      if (e.type === 'flash') return; // handled separately
      const alpha = e.life / e.maxLife;

      ctx.save();
      if (e.glow) {
        ctx.shadowBlur  = 10;
        ctx.shadowColor = e.color;
      }

      switch (e.type) {

        case 'particle': {
          const r = Math.max(0.3, e.r * alpha);
          ctx.globalAlpha = Math.min(1, alpha * 1.1);
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'slash': {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = e.color;
          ctx.lineWidth   = Math.max(0.5, e.lw * alpha);
          ctx.lineCap     = 'round';
          ctx.shadowBlur  = 12;
          const hx = Math.cos(e.angle) * e.len / 2;
          const hy = Math.sin(e.angle) * e.len / 2;
          ctx.beginPath();
          ctx.moveTo(e.x - hx, e.y - hy);
          ctx.lineTo(e.x + hx, e.y + hy);
          ctx.stroke();
          break;
        }

        case 'ring': {
          ctx.globalAlpha = alpha * 0.9;
          ctx.strokeStyle = e.color;
          ctx.lineWidth   = Math.max(0.5, (e.lw || 2) * alpha);
          ctx.shadowBlur  = 14;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case 'shockwave': {
          const p  = e.prog || 0;
          const sw = e.maxW * p;
          const sh = e.maxW * 0.22 * p;
          ctx.globalAlpha = (1 - p) * 0.55;
          ctx.strokeStyle = e.color;
          ctx.lineWidth   = 2 * (1 - p);
          ctx.shadowBlur  = 8;
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, sw, sh + 3, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
    });
  }

  /* -------------------------------------------------------
     RENDER (screen-space — call OUTSIDE shake translate)
  ------------------------------------------------------- */
  function renderScreen(ctx, W, H) {
    pool.forEach(e => {
      if (e.type !== 'flash') return;
      const p = e.life / e.maxLife;
      ctx.save();
      ctx.globalAlpha = e.intensity * p;
      ctx.fillStyle   = e.color;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    });
  }

  /* -------------------------------------------------------
     PUBLIC API
  ------------------------------------------------------- */
  return {
    m1Hit,
    m1Swing,
    moveHit,
    charMoveHit,
    specialHit,
    awakenBurst,
    phaseTransition,
    dashTrail,
    flash,
    ring: (x, y, c, r, w, l) => ring(x, y, c, r, w, l),
    update,
    renderWorld,
    renderScreen,
    shake,
    get sx() { return _sx; },
    get sy() { return _sy; }
  };

})();
