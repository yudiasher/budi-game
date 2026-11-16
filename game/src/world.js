// Neon Drift — the simulation: spawning, movement, difficulty ramp,
// collisions, near-misses, scoring and the win/lose conditions.
// Rendering lives in render.js; this file only changes game state.
import { CONFIG, difficultyAt, scrollSpeedAt, spawnIntervalAt } from './config.js';
import { burst, makeAsteroid, makeOrb, makeShieldPickup } from './entities.js';

export function makeWorld() {
  return {
    time: 0,
    distance: 0,
    score: 0,
    combo: 1,
    comboTimer: 0,
    orbsCollected: 0,
    nearMisses: 0,
    asteroidsDodged: 0,
    spawnTimer: 0.6,
    orbTimer: 1.4,
    shieldTimer: 14,
    shake: 0,
    asteroids: [],
    orbs: [],
    shields: [],
    particles: [],
    stars: makeStars(),
    floatingTexts: [],
    gateReached: false,
  };
}

function makeStars() {
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: Math.random() * CONFIG.width,
      y: Math.random() * CONFIG.height,
      size: 0.6 + Math.random() * 1.8,
      depth: 0.25 + Math.random() * 0.75,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

export function addFloatingText(world, x, y, text, color) {
  world.floatingTexts.push({ x, y, text, color, life: 1 });
}

function spawnAsteroid(world) {
  const speed = scrollSpeedAt(world.distance) * (0.9 + Math.random() * 0.35);
  const radius = 16 + Math.random() * 30;
  // Spawn across the full height, edges included: hugging the top or bottom
  // wall must never be a safe spot.
  const margin = 24;
  const y = margin + Math.random() * (CONFIG.height - margin * 2);
  world.asteroids.push(makeAsteroid(CONFIG.width + radius + 20, y, radius, speed, Math.random() * 6));
}

function spawnOrb(world) {
  const y = 50 + Math.random() * (CONFIG.height - 100);
  world.orbs.push(makeOrb(CONFIG.width + 30, y));
}

export function updateWorld(world, ship, input, dt, sounds) {
  world.time += dt;
  const scroll = scrollSpeedAt(world.distance);
  world.distance += scroll * dt * 0.35;
  world.shake = Math.max(0, world.shake - dt * 26);

  // --- Ship steering -------------------------------------------------------
  const steer = input.steer();
  const boosting = input.boosting && ship.boost > 1;
  const accel = CONFIG.shipAccel * (boosting ? CONFIG.boostMultiplier : 1);
  if (steer.active) {
    ship.vx += steer.x * accel * dt;
    ship.vy += steer.y * accel * dt;
  } else if (input.mouse.down) {
    // Mouse steering: chase the pointer, faster the further away it is.
    const dx = input.mouse.x - ship.x;
    const dy = input.mouse.y - ship.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      const pull = Math.min(1, dist / 160);
      ship.vx += (dx / dist) * accel * pull * dt;
      ship.vy += (dy / dist) * accel * pull * dt;
    }
  }
  ship.vx *= Math.max(0, 1 - CONFIG.shipDrag * dt);
  ship.vy *= Math.max(0, 1 - CONFIG.shipDrag * dt);
  const speed = Math.hypot(ship.vx, ship.vy);
  const max = CONFIG.shipMaxSpeed * (boosting ? CONFIG.boostMultiplier : 1);
  if (speed > max) {
    ship.vx = (ship.vx / speed) * max;
    ship.vy = (ship.vy / speed) * max;
  }
  ship.x = Math.min(CONFIG.width - ship.radius, Math.max(ship.radius, ship.x + ship.vx * dt));
  ship.y = Math.min(CONFIG.height - ship.radius, Math.max(ship.radius, ship.y + ship.vy * dt));
  ship.angle = Math.atan2(ship.vy, ship.vx);
  if (Math.abs(ship.vx) < 4 && Math.abs(ship.vy) < 4) ship.angle = 0;

  // Boost meter: drains while boosting, refills otherwise.
  if (boosting) {
    ship.boost = Math.max(0, ship.boost - CONFIG.boostDrain * dt);
    if (Math.random() < dt * 30) {
      world.particles.push({
        x: ship.x - Math.cos(ship.angle) * 18, y: ship.y - Math.sin(ship.angle) * 18,
        vx: -Math.cos(ship.angle) * 180 + (Math.random() - 0.5) * 60,
        vy: -Math.sin(ship.angle) * 180 + (Math.random() - 0.5) * 60,
        life: 0.35, maxLife: 0.35, size: 3, color: '#22d3ee',
      });
    }
  } else {
    ship.boost = Math.min(CONFIG.boostMax, ship.boost + CONFIG.boostRegen * dt);
  }

  // Engine trail.
  ship.trail.unshift({ x: ship.x, y: ship.y });
  if (ship.trail.length > 14) ship.trail.pop();

  // --- Spawning ------------------------------------------------------------
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0) {
    spawnAsteroid(world);
    world.spawnTimer = spawnIntervalAt(world.distance) * (0.75 + Math.random() * 0.5);
    // Later on, asteroids sometimes arrive in pairs.
    if (difficultyAt(world.distance) > 0.45 && Math.random() < 0.35) spawnAsteroid(world);
  }
  world.orbTimer -= dt;
  if (world.orbTimer <= 0) {
    spawnOrb(world);
    world.orbTimer = 1.6 + Math.random() * 1.8;
  }
  world.shieldTimer -= dt;
  if (world.shieldTimer <= 0) {
    world.shields.push(makeShieldPickup(CONFIG.width + 30, 60 + Math.random() * (CONFIG.height - 120)));
    world.shieldTimer = 16 + Math.random() * 8;
  }

  // --- Asteroids -----------------------------------------------------------
  const now = world.time;
  for (let i = world.asteroids.length - 1; i >= 0; i -= 1) {
    const a = world.asteroids[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt + Math.sin(now * a.wobbleSpeed + a.wobble) * 55 * dt;
    a.rotation += a.spin * dt;
    if (a.y < a.radius) a.y = a.radius;
    if (a.y > CONFIG.height - a.radius) a.y = CONFIG.height - a.radius;

    const dist = Math.hypot(a.x - ship.x, a.y - ship.y);
    const hitDist = a.radius + ship.radius - 4;
    if (!a.passed && a.x + a.radius < ship.x - ship.radius) {
      a.passed = true;
      world.asteroidsDodged += 1;
    }
    // Near miss: swept past close, without touching.
    if (!a.scored && a.passed && dist < hitDist + 46 && dist > hitDist) {
      a.scored = true;
      world.nearMisses += 1;
      const gained = CONFIG.nearMissScore * world.combo;
      world.score += gained;
      world.combo = Math.min(8, world.combo + 1);
      world.comboTimer = 3;
      addFloatingText(world, ship.x + 30, ship.y - 24, `NEAR MISS +${gained}`, '#7df9ff');
      sounds.nearMiss();
    }
    if (dist < hitDist) {
      if (now < ship.invulnerableUntil) {
        // Brief grace after a hit: push the rock away instead of a second hit.
        a.x += 30;
      } else if (ship.shield) {
        ship.shield = false;
        ship.invulnerableUntil = now + CONFIG.invulnerableSeconds;
        burst(world.particles, a.x, a.y, '#4ade80', 26, 300);
        addFloatingText(world, ship.x, ship.y - 30, 'SHIELD DOWN', '#4ade80');
        world.shake = 10;
        sounds.hit();
        world.asteroids.splice(i, 1);
        continue;
      } else {
        ship.hull -= 1;
        ship.invulnerableUntil = now + CONFIG.invulnerableSeconds;
        burst(world.particles, ship.x, ship.y, '#fb7185', 30, 320);
        addFloatingText(world, ship.x, ship.y - 30, 'HULL HIT!', '#fb7185');
        world.shake = 14;
        world.combo = 1;
        sounds.hit();
        world.asteroids.splice(i, 1);
        if (ship.hull <= 0) return 'gameover';
        continue;
      }
    }
    if (a.x < -a.radius - 40) world.asteroids.splice(i, 1);
  }

  // --- Orbs ----------------------------------------------------------------
  for (let i = world.orbs.length - 1; i >= 0; i -= 1) {
    const o = world.orbs[i];
    o.x -= scroll * dt;
    o.phase += dt * 4;
    if (Math.hypot(o.x - ship.x, o.y - ship.y) < o.radius + ship.radius + 6) {
      world.orbs.splice(i, 1);
      world.orbsCollected += 1;
      world.score += CONFIG.orbScore * world.combo;
      ship.boost = Math.min(CONFIG.boostMax, ship.boost + 12);
      burst(world.particles, o.x, o.y, '#facc15', 14, 180);
      addFloatingText(world, o.x, o.y - 18, `+${CONFIG.orbScore * world.combo}`, '#facc15');
      sounds.pickup();
      continue;
    }
    if (o.x < -30) world.orbs.splice(i, 1);
  }

  // --- Shield pickups ------------------------------------------------------
  for (let i = world.shields.length - 1; i >= 0; i -= 1) {
    const s = world.shields[i];
    s.x -= scroll * dt;
    s.phase += dt * 3;
    if (Math.hypot(s.x - ship.x, s.y - ship.y) < s.radius + ship.radius + 6) {
      world.shields.splice(i, 1);
      ship.shield = true;
      burst(world.particles, s.x, s.y, '#4ade80', 20, 220);
      addFloatingText(world, s.x, s.y - 20, 'SHIELD UP', '#4ade80');
      sounds.shieldUp();
      continue;
    }
    if (s.x < -30) world.shields.splice(i, 1);
  }

  // --- Combo timer, particles, floating text --------------------------------
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 1;
  }
  for (let i = world.floatingTexts.length - 1; i >= 0; i -= 1) {
    const t = world.floatingTexts[i];
    t.y -= 34 * dt;
    t.life -= dt * 0.9;
    if (t.life <= 0) world.floatingTexts.splice(i, 1);
  }

  // --- The warp gate --------------------------------------------------------
  if (world.distance >= CONFIG.gateDistance) {
    world.gateReached = true;
    world.score += CONFIG.gateScore;
    return 'win';
  }
  return 'playing';
}
