/**
 * Jujutsu Shenanigans — Map System
 * 3 arenas: Shinjuku Station, Shibuya Crossing, Malevolent Shrine (Domain)
 *
 * Each map provides:
 *  - renderBackground(ctx, W, H, time) — draws sky + far BG
 *  - renderForeground(ctx, W, H, time) — draws ground details, decals
 *  - getPlatforms(W, H)               — returns [{x,y,w,h,color}] for collision
 */

'use strict';

/* =========================================================
   MAP REGISTRY
   ========================================================= */
const MAP_DEFS = [
  {
    id: 'shinjuku',
    name: 'Shinjuku Station',
    emoji: '🏢',
    description: 'Urban battleground. Destructible infrastructure.',
    groundColor:  '#1a1520',
    accentColor:  '#7c4dff',
    skyTop:    '#06040f',
    skyBottom: '#1a0035'
  },
  {
    id: 'shibuya',
    name: 'Shibuya Crossing',
    emoji: '🌆',
    description: 'Neon-lit streets. Cursed energy corrupts everything.',
    groundColor:  '#120a0a',
    accentColor:  '#ff4444',
    skyTop:    '#1a0000',
    skyBottom: '#330011'
  },
  {
    id: 'domain',
    name: 'Malevolent Shrine',
    emoji: '⛩️',
    description: 'Domain Expansion. Relentless slashes fill the void.',
    groundColor:  '#0d0000',
    accentColor:  '#ff1744',
    skyTop:    '#000000',
    skyBottom: '#1a0000'
  }
];

/* =========================================================
   PLATFORM LAYOUT  (responsive — expressed as W/H fractions)
   ========================================================= */
function getPlatforms(W, H) {
  const gnd   = H - 100;         // same as GROUND()
  const pH    = 14;              // platform thickness

  return [
    // Left platform
    {
      x: W * 0.05,
      y: gnd - H * 0.18,
      w: W * 0.20,
      h: pH,
      edge: true
    },
    // Centre platform (higher)
    {
      x: W * 0.40,
      y: gnd - H * 0.24,
      w: W * 0.20,
      h: pH,
      edge: false
    },
    // Right platform
    {
      x: W * 0.75,
      y: gnd - H * 0.18,
      w: W * 0.20,
      h: pH,
      edge: true
    }
  ];
}

/* =========================================================
   SHINJUKU STATION
   ========================================================= */
function renderShinjukuBg(ctx, W, H, time) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, '#06040f');
  sky.addColorStop(1, '#1a0035');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Moon
  ctx.save();
  ctx.shadowBlur = 40;
  ctx.shadowColor = '#9966ff';
  ctx.fillStyle = '#e8e0ff';
  ctx.beginPath();
  ctx.arc(W * 0.82, H * 0.1, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137.5) % W);
    const sy = ((i * 53.7) % (H * 0.45));
    const sr = 0.5 + (i % 3) * 0.4;
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.2 + i * 0.8);
    ctx.globalAlpha = 0.3 + pulse * 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Far background — city silhouettes (brighter)
  drawCityBuildings(ctx, W, H, time, 0.6, '#1a1035', '#1a1035');
  // Mid buildings
  drawCityBuildings(ctx, W, H, time, 0.75, '#241840', '#241840', true);

  // Station roof/overhang
  const roofY = H * 0.38;
  const def   = MAP_DEFS[0];

  // Roof shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, roofY + 18, W, 10);

  // Roof beam
  const roofGrad = ctx.createLinearGradient(0, roofY, 0, roofY + 18);
  roofGrad.addColorStop(0, '#2a1840');
  roofGrad.addColorStop(1, '#180e28');
  ctx.fillStyle = roofGrad;
  ctx.fillRect(0, roofY, W, 18);

  // Roof edge glow
  ctx.strokeStyle = '#7c4dff44';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, roofY);
  ctx.lineTo(W, roofY);
  ctx.stroke();

  // Support columns
  ctx.fillStyle = '#1e1030';
  const cols = 7;
  for (let c = 0; c <= cols; c++) {
    const cx = (W / cols) * c - 6;
    ctx.fillRect(cx, roofY + 18, 12, H - roofY);
    // Neon strip on column
    ctx.fillStyle = 'rgba(124,77,255,0.25)';
    ctx.fillRect(cx + 4, roofY + 18, 4, H - roofY);
    ctx.fillStyle = '#1e1030';
  }

  // Neon signs
  drawNeonSigns(ctx, W, H, time);
}

function renderShinjukuFg(ctx, W, H, time, platforms) {
  const gnd = H - 100;

  // Platform surfaces (draw under fighters)
  platforms.forEach(p => {
    drawPlatform(ctx, p, '#7c4dff');
  });

  // Ground floor — station platform
  const groundGrad = ctx.createLinearGradient(0, gnd, 0, H);
  groundGrad.addColorStop(0, '#2a1840');
  groundGrad.addColorStop(0.3, '#18102a');
  groundGrad.addColorStop(1, '#0d0914');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, gnd, W, H - gnd);

  // Ground edge glow
  ctx.strokeStyle = '#7c4dff66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, gnd);
  ctx.lineTo(W, gnd);
  ctx.stroke();

  // Track lines on ground
  ctx.strokeStyle = 'rgba(124,77,255,0.15)';
  ctx.lineWidth = 3;
  for (let t = 0; t < 4; t++) {
    const ty = gnd + 20 + t * 18;
    ctx.beginPath();
    ctx.moveTo(0, ty);
    ctx.lineTo(W, ty);
    ctx.stroke();
  }

  // Train in background (static)
  drawTrain(ctx, W, H, time, gnd);
}

/* =========================================================
   SHIBUYA CROSSING
   ========================================================= */
function renderShibuyaBg(ctx, W, H, time) {
  // Sky — cursed energy red
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, '#200000');
  sky.addColorStop(1, '#400010');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Cursed energy wisps in sky
  for (let i = 0; i < 8; i++) {
    const wx = W * (0.1 + (i / 8) * 0.85);
    const wy = H * 0.15 + Math.sin(time * 0.4 + i) * H * 0.05;
    const wGrad = ctx.createRadialGradient(wx, wy, 0, wx, wy, 60);
    wGrad.addColorStop(0, 'rgba(255,30,50,0.12)');
    wGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = wGrad;
    ctx.fillRect(wx - 60, wy - 60, 120, 120);
  }

  // Background buildings (red-tinted)
  drawCityBuildings(ctx, W, H, time, 0.55, '#1a0505', '#1a0505');
  drawCityBuildings(ctx, W, H, time, 0.72, '#220808', '#220808', true);

  // Scramble crossing lines on elevated walkway
  const walkY = H * 0.55;
  ctx.fillStyle = '#1a0505';
  ctx.fillRect(0, walkY, W, H * 0.12);
  ctx.strokeStyle = '#ff444422';
  ctx.lineWidth = 2;
  for (let c = 0; c < 12; c++) {
    const cx = W * (c / 11);
    ctx.beginPath();
    ctx.moveTo(cx, walkY);
    ctx.lineTo(cx, walkY + H * 0.12);
    ctx.stroke();
  }

  // Neon signs (red/pink)
  drawNeonSigns(ctx, W, H, time, '#ff4444', '#ff88aa');
}

function renderShibuyaFg(ctx, W, H, time, platforms) {
  const gnd = H - 100;

  platforms.forEach(p => drawPlatform(ctx, p, '#cc2233'));

  // Ground — cracked asphalt
  const gGrad = ctx.createLinearGradient(0, gnd, 0, H);
  gGrad.addColorStop(0, '#2a0808');
  gGrad.addColorStop(1, '#120303');
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, gnd, W, H - gnd);

  ctx.strokeStyle = '#ff444455';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, gnd); ctx.lineTo(W, gnd); ctx.stroke();

  // Crosswalk lines
  ctx.fillStyle = 'rgba(255,80,80,0.12)';
  for (let s = 0; s < 16; s++) {
    if (s % 2 === 0) ctx.fillRect(s * (W / 16), gnd, W / 16, H - gnd);
  }

  // Cracks in ground
  ctx.strokeStyle = '#ff222244';
  ctx.lineWidth = 1;
  drawCracks(ctx, W * 0.3, gnd + 10, 5);
  drawCracks(ctx, W * 0.6, gnd + 25, 4);
  drawCracks(ctx, W * 0.7, gnd + 8, 6);
}

/* =========================================================
   DOMAIN EXPANSION — MALEVOLENT SHRINE
   ========================================================= */
function renderDomainBg(ctx, W, H, time) {
  // Pure void
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // Pulsing red center glow
  const pulse = 0.5 + 0.5 * Math.sin(time * 1.5);
  const centerGlow = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.6);
  centerGlow.addColorStop(0, `rgba(180,0,0,${0.08 + pulse * 0.07})`);
  centerGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, W, H);

  // Domain grid lines (red)
  ctx.strokeStyle = `rgba(160,0,0,${0.12 + pulse * 0.06})`;
  ctx.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 55) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
  }
  for (let gy = 0; gy < H; gy += 55) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }

  // Shrine torii gate silhouette (center back)
  drawTorii(ctx, W * 0.5, H * 0.3, H * 0.25, time);

  // Floating slash marks
  drawSlashMarks(ctx, W, H, time);

  // Floating debris particles
  drawDebrisParticles(ctx, W, H, time);
}

function renderDomainFg(ctx, W, H, time, platforms) {
  const gnd = H - 100;

  platforms.forEach(p => drawPlatform(ctx, p, '#cc0000'));

  // Ground — blood-red void floor
  const gGrad = ctx.createLinearGradient(0, gnd, 0, H);
  gGrad.addColorStop(0, '#1a0000');
  gGrad.addColorStop(1, '#0a0000');
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, gnd, W, H - gnd);

  // Ground glow
  const gndGlow = ctx.createLinearGradient(0, gnd - 20, 0, gnd + 20);
  gndGlow.addColorStop(0, 'transparent');
  gndGlow.addColorStop(0.5, 'rgba(200,0,0,0.3)');
  gndGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = gndGlow;
  ctx.fillRect(0, gnd - 20, W, 40);

  // Ground rune lines
  ctx.strokeStyle = `rgba(200,0,0,0.3)`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, gnd); ctx.lineTo(W, gnd); ctx.stroke();

  // Shrine symbol on ground
  drawShrineSymbol(ctx, W/2, gnd + 40, time);
}

/* =========================================================
   SHARED DRAW HELPERS
   ========================================================= */
function drawPlatform(ctx, p, glowColor) {
  // Platform shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(p.x + 4, p.y + p.h + 2, p.w, 6);

  // Platform body
  const pg = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  pg.addColorStop(0, '#2a1f40');
  pg.addColorStop(1, '#1a1228');
  ctx.fillStyle = pg;
  ctx.fillRect(p.x, p.y, p.w, p.h);

  // Top edge glow
  ctx.strokeStyle = glowColor + '88';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + p.w, p.y);
  ctx.stroke();

  // Underside drip glow
  const drip = ctx.createLinearGradient(p.x, p.y + p.h, p.x, p.y + p.h + 12);
  drip.addColorStop(0, glowColor + '44');
  drip.addColorStop(1, 'transparent');
  ctx.fillStyle = drip;
  ctx.fillRect(p.x, p.y + p.h, p.w, 12);
}

function drawCityBuildings(ctx, W, H, time, horizFrac, colorA, colorB, mid = false) {
  const baseY = H * horizFrac;
  const seed = mid ? 7 : 3;
  ctx.fillStyle = colorA;
  for (let b = 0; b < 18; b++) {
    const bw = 30 + ((b * seed * 17 + 11) % 60);
    const bh = 40 + ((b * seed * 31 + 23) % 120);
    const bx = (b / 18) * W * 1.1 - W * 0.05;
    ctx.fillRect(bx, baseY - bh, bw, bh);

    // Windows
    ctx.fillStyle = 'rgba(255,210,120,0.18)';
    for (let wy = baseY - bh + 6; wy < baseY - 6; wy += 10) {
      for (let wx = bx + 4; wx < bx + bw - 6; wx += 9) {
        if ((b + Math.floor(wy / 10)) % 3 !== 0) {
          ctx.fillRect(wx, wy, 4, 5);
        }
      }
    }
    ctx.fillStyle = colorA;
  }
}

function drawNeonSigns(ctx, W, H, time, c1 = '#b060ff', c2 = '#60ffff') {
  const signs = [
    { x: W * 0.07, y: H * 0.44, text: '新宿', color: c1 },
    { x: W * 0.28, y: H * 0.41, text: 'CURSE', color: c2 },
    { x: W * 0.55, y: H * 0.45, text: '呪術', color: c1 },
    { x: W * 0.78, y: H * 0.42, text: 'FIGHT', color: c2 }
  ];
  signs.forEach(s => {
    const glow = 0.7 + 0.3 * Math.sin(time * 2 + s.x);
    ctx.save();
    ctx.shadowBlur = 12 * glow;
    ctx.shadowColor = s.color;
    ctx.fillStyle = s.color;
    ctx.globalAlpha = 0.6 + 0.3 * glow;
    ctx.font = `bold ${Math.floor(W * 0.022)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(s.text, s.x, s.y);
    ctx.restore();
  });
}

function drawTrain(ctx, W, H, time, gnd) {
  // Static train silhouette in BG
  const tx = W * 0.55;
  const ty = gnd - H * 0.12;
  const tw = W * 0.38;
  const th = H * 0.09;

  ctx.fillStyle = '#1a1030';
  ctx.beginPath();
  ctx.roundRect(tx, ty, tw, th, 6);
  ctx.fill();

  // Windows (lit)
  const winCols = 6;
  for (let w = 0; w < winCols; w++) {
    const wx = tx + 10 + w * (tw / winCols);
    const flicker = Math.sin(time * 3 + w * 1.7) > 0.9 ? 0 : 1;
    ctx.fillStyle = `rgba(200,180,255,${0.15 * flicker})`;
    ctx.fillRect(wx, ty + 8, (tw / winCols) - 8, th - 20);
  }

  // Train stripe
  ctx.strokeStyle = '#7c4dff33';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tx, ty + th * 0.3);
  ctx.lineTo(tx + tw, ty + th * 0.3);
  ctx.stroke();
}

function drawTorii(ctx, cx, cy, size, time) {
  const pulse = 0.6 + 0.4 * Math.sin(time * 0.8);
  ctx.save();
  ctx.globalAlpha = 0.15 + 0.05 * pulse;
  ctx.fillStyle = '#cc0000';

  // Top crossbeam
  ctx.fillRect(cx - size * 0.6, cy, size * 1.2, size * 0.06);
  // Second crossbeam
  ctx.fillRect(cx - size * 0.5, cy + size * 0.12, size, size * 0.05);
  // Left pillar
  ctx.fillRect(cx - size * 0.45, cy, size * 0.08, size * 0.7);
  // Right pillar
  ctx.fillRect(cx + size * 0.37, cy, size * 0.08, size * 0.7);
  ctx.restore();
}

function drawSlashMarks(ctx, W, H, time) {
  const slashes = [
    { x: W * 0.15, y: H * 0.25, a: -0.6 },
    { x: W * 0.4,  y: H * 0.18, a: 0.3  },
    { x: W * 0.65, y: H * 0.3,  a: -0.4 },
    { x: W * 0.85, y: H * 0.22, a: 0.5  }
  ];
  slashes.forEach((s, i) => {
    const fade = (Math.sin(time * 0.6 + i * 1.3) + 1) / 2;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.a);
    ctx.strokeStyle = `rgba(200,0,0,${0.08 + fade * 0.12})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-40, -3); ctx.lineTo(40, -3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-35, 4);  ctx.lineTo(35, 4);  ctx.stroke();
    ctx.restore();
  });
}

function drawDebrisParticles(ctx, W, H, time) {
  for (let i = 0; i < 20; i++) {
    const dx = ((i * 113.7 + time * 15) % W);
    const dy = ((i * 47.3 + time * 20 + i * 30) % (H * 0.85));
    const ds = 1 + (i % 4);
    const alpha = 0.1 + (i % 5) * 0.06;
    ctx.fillStyle = `rgba(180,0,0,${alpha})`;
    ctx.beginPath();
    ctx.arc(dx, dy, ds, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawShrineSymbol(ctx, cx, cy, time) {
  const pulse = 0.4 + 0.3 * Math.sin(time * 1.2);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 1.5;

  // Outer circle
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.stroke();

  // Inner lines
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + time * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCracks(ctx, cx, cy, count) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + i * 0.4;
    const len   = 15 + i * 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len * 0.4);
    ctx.stroke();
  }
}

/* =========================================================
   MAIN RENDER DISPATCHER
   ========================================================= */
function renderMapBackground(ctx, W, H, mapId, time) {
  switch (mapId) {
    case 'shinjuku': renderShinjukuBg(ctx, W, H, time); break;
    case 'shibuya':  renderShibuyaBg(ctx, W, H, time);  break;
    case 'domain':   renderDomainBg(ctx, W, H, time);   break;
    default:         renderShinjukuBg(ctx, W, H, time);
  }
}

function renderMapForeground(ctx, W, H, mapId, time, platforms) {
  switch (mapId) {
    case 'shinjuku': renderShinjukuFg(ctx, W, H, time, platforms); break;
    case 'shibuya':  renderShibuyaFg(ctx, W, H, time, platforms);  break;
    case 'domain':   renderDomainFg(ctx, W, H, time, platforms);   break;
    default:         renderShinjukuFg(ctx, W, H, time, platforms);
  }
}

function getMapAccent(mapId) {
  const m = MAP_DEFS.find(d => d.id === mapId);
  return m ? m.accentColor : '#7c4dff';
}
