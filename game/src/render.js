// Neon Drift — everything drawn: the starfield, the field, the ship,
// the HUD, and the title / pause / win / game-over screens.
// Canvas 2D only, no images: every shape is drawn in code.
import { CONFIG } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world, dt) {
  const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
  gradient.addColorStop(0, CONFIG.colors.backgroundTop);
  gradient.addColorStop(1, CONFIG.colors.backgroundBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  // Parallax starfield drifting left, faster for nearer stars.
  for (const star of world.stars) {
    star.x -= (40 + star.depth * 160) * dt;
    if (star.x < 0) {
      star.x = CONFIG.width;
      star.y = Math.random() * CONFIG.height;
    }
    const twinkle = 0.5 + 0.5 * Math.sin(world.time * 2 + star.twinkle);
    ctx.globalAlpha = 0.35 + 0.55 * twinkle * star.depth;
    ctx.fillStyle = CONFIG.colors.star;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  // A faint nebula band for depth.
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.ellipse(CONFIG.width * 0.7, CONFIG.height * 0.25, 320, 90, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.ellipse(CONFIG.width * 0.25, CONFIG.height * 0.8, 280, 70, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGate(ctx, world) {
  // The warp gate slides in from the right as the run nears its end.
  const progress = Math.min(1, world.distance / CONFIG.gateDistance);
  if (progress < 0.86) return;
  const gateX = CONFIG.width - (progress - 0.86) * 4200;
  const pulse = 0.6 + 0.4 * Math.sin(world.time * 5);
  ctx.save();
  ctx.translate(gateX, CONFIG.height / 2);
  ctx.strokeStyle = CONFIG.colors.gate;
  ctx.lineWidth = 6;
  ctx.shadowColor = CONFIG.colors.gate;
  ctx.shadowBlur = 24 * pulse;
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 190, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.25 * pulse;
  ctx.fillStyle = CONFIG.colors.gate;
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 170, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fbcfe8';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WARP GATE', gateX, CONFIG.height / 2 - 210);
}

function drawShip(ctx, ship, world) {
  const blink = world.time < ship.invulnerableUntil && Math.floor(world.time * 14) % 2 === 0;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  if (!blink) {
    ctx.shadowColor = CONFIG.colors.shipGlow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = CONFIG.colors.ship;
    // A dart-shaped drift ship.
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-14, -13);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-14, 13);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(6, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(7, -1, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Engine trail.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = CONFIG.colors.shipGlow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ship.trail.forEach((point, i) => {
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();

  // Shield ring.
  if (ship.shield) {
    ctx.save();
    ctx.strokeStyle = CONFIG.colors.shield;
    ctx.globalAlpha = 0.55 + 0.3 * Math.sin(world.time * 6);
    ctx.lineWidth = 3;
    ctx.shadowColor = CONFIG.colors.shield;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawAsteroid(ctx, a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rotation);
  ctx.fillStyle = CONFIG.colors.asteroid;
  ctx.strokeStyle = CONFIG.colors.asteroidEdge;
  ctx.lineWidth = 2;
  ctx.shadowColor = '#a78bfa';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  a.points.forEach((scale, i) => {
    const angle = (i / a.points.length) * Math.PI * 2;
    const r = a.radius * scale;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Craters.
  ctx.fillStyle = 'rgba(15, 10, 40, 0.55)';
  ctx.beginPath();
  ctx.arc(-a.radius * 0.25, -a.radius * 0.15, a.radius * 0.22, 0, Math.PI * 2);
  ctx.arc(a.radius * 0.3, a.radius * 0.3, a.radius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOrb(ctx, o) {
  const bob = Math.sin(o.phase) * 3;
  ctx.save();
  ctx.translate(o.x, o.y + bob);
  ctx.shadowColor = CONFIG.colors.orbGlow;
  ctx.shadowBlur = 16;
  ctx.fillStyle = CONFIG.colors.orb;
  ctx.beginPath();
  ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff7cc';
  ctx.beginPath();
  ctx.arc(-2, -3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShieldPickup(ctx, s) {
  const bob = Math.sin(s.phase) * 3;
  ctx.save();
  ctx.translate(s.x, s.y + bob);
  ctx.shadowColor = CONFIG.colors.shield;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = CONFIG.colors.shield;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = CONFIG.colors.shield;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', 0, 1);
  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloatingTexts(ctx, texts) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px system-ui, sans-serif';
  for (const t of texts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, t.life));
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world, ship) {
  ctx.textBaseline = 'alphabetic';
  // Score, top left.
  ctx.fillStyle = CONFIG.colors.hud;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${world.score}`, 24, 44);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = CONFIG.colors.dim;
  ctx.fillText(`DISTANCE ${Math.floor(world.distance)} m / ${CONFIG.gateDistance} m`, 24, 72);
  if (world.combo > 1) {
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`COMBO x${world.combo}`, 24, 102);
  }

  // Hull hearts, top right.
  ctx.textAlign = 'right';
  ctx.font = '26px system-ui, sans-serif';
  let hearts = '';
  for (let i = 0; i < CONFIG.hullMax; i += 1) hearts += i < ship.hull ? '♥ ' : '♡ ';
  ctx.fillStyle = '#fb7185';
  ctx.fillText(hearts, CONFIG.width - 24, 44);
  ctx.fillStyle = ship.shield ? CONFIG.colors.shield : CONFIG.colors.dim;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(ship.shield ? 'SHIELD ACTIVE' : 'NO SHIELD', CONFIG.width - 24, 72);

  // Boost meter, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = CONFIG.colors.dim;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('BOOST  [SPACE]', 24, CONFIG.height - 42);
  ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
  roundRect(ctx, 24, CONFIG.height - 34, 220, 14, 7);
  ctx.fill();
  ctx.fillStyle = ship.boost > 25 ? CONFIG.colors.shipGlow : CONFIG.colors.danger;
  roundRect(ctx, 24, CONFIG.height - 34, 220 * (ship.boost / CONFIG.boostMax), 14, 7);
  ctx.fill();

  // Distance progress bar, bottom centre.
  const barWidth = 420;
  const barX = (CONFIG.width - barWidth) / 2;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
  roundRect(ctx, barX, CONFIG.height - 34, barWidth, 14, 7);
  ctx.fill();
  ctx.fillStyle = CONFIG.colors.gate;
  roundRect(ctx, barX, CONFIG.height - 34, barWidth * (world.distance / CONFIG.gateDistance), 14, 7);
  ctx.fill();
  ctx.fillStyle = CONFIG.colors.dim;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('— WARP GATE —', CONFIG.width / 2, CONFIG.height - 42);
}

function panel(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 8, 24, 0.72)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 26;
  ctx.fillText(title, CONFIG.width / 2, 210);
  ctx.shadowBlur = 0;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = CONFIG.colors.hud;
  lines.forEach((line, i) => {
    ctx.fillText(line, CONFIG.width / 2, 280 + i * 34);
  });
  ctx.restore();
}

export function renderTitle(ctx, world, best) {
  drawBackground(ctx, world, 0.016);
  panel(ctx, 'NEON DRIFT', [
    'Pilot your ship through the asteroid field and reach the warp gate.',
    '',
    'STEER  Arrow keys / WASD  or hold the mouse      BOOST  hold Space',
    'Collect energy orbs (+50), skim asteroids for NEAR MISS bonuses,',
    'grab the green S for a shield. Three hull hits and the run ends.',
    '',
    `BEST SCORE  ${best}`,
    '',
    'Press ENTER or click to launch',
  ], '#22d3ee');
}

export function renderGameOver(ctx, world, best) {
  panel(ctx, 'SHIP LOST', [
    `You drifted ${Math.floor(world.distance)} m of ${CONFIG.gateDistance} m toward the gate.`,
    `SCORE  ${world.score}      ORBS  ${world.orbsCollected}      NEAR MISSES  ${world.nearMisses}`,
    `BEST SCORE  ${best}`,
    '',
    'Press R or ENTER to fly again',
  ], '#fb7185');
}

export function renderWin(ctx, world, best) {
  panel(ctx, 'GATE REACHED!', [
    'You threaded the field and made the warp gate. Sector cleared!',
    `SCORE  ${world.score}   (+${CONFIG.gateScore} gate bonus)`,
    `ORBS  ${world.orbsCollected}      NEAR MISSES  ${world.nearMisses}`,
    `BEST SCORE  ${best}`,
    '',
    'Press R or ENTER to fly again',
  ], '#f472b6');
}

export function renderPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 8, 24, 0.6)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = CONFIG.colors.hud;
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText('PAUSED', CONFIG.width / 2, CONFIG.height / 2 - 10);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Press P to resume   ·   M to mute', CONFIG.width / 2, CONFIG.height / 2 + 34);
  ctx.restore();
}

export function renderPlaying(ctx, world, ship, dt) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackground(ctx, world, dt);
  drawGate(ctx, world);
  for (const s of world.shields) drawShieldPickup(ctx, s);
  for (const o of world.orbs) drawOrb(ctx, o);
  for (const a of world.asteroids) drawAsteroid(ctx, a);
  drawShip(ctx, ship, world);
  drawParticles(ctx, world.particles);
  drawFloatingTexts(ctx, world.floatingTexts);
  ctx.restore();
  drawHud(ctx, world, ship);
}
