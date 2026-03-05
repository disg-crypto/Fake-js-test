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
