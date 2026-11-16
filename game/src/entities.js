// Neon Drift — the things that exist in the field: the ship, asteroids,
// energy orbs, shield pickups and the particles they leave behind.
// Plain data plus small update helpers; collisions live in world.js.
import { CONFIG } from './config.js';

export function makeShip() {
  return {
    x: CONFIG.width * 0.22,
    y: CONFIG.height / 2,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: CONFIG.shipRadius,
    hull: CONFIG.hullMax,
    shield: false,
    invulnerableUntil: 0,
    boost: CONFIG.boostMax,
    trail: [],
  };
}

export function makeAsteroid(x, y, radius, speed, wobble) {
  const points = [];
  const count = 9 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i += 1) {
    points.push(0.72 + Math.random() * 0.45);
  }
  return {
    kind: 'asteroid',
    x, y, radius,
    vx: -speed,
    vy: (Math.random() - 0.5) * 90,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.6,
    wobble: wobble ?? Math.random() * Math.PI * 2,
    wobbleSpeed: 0.6 + Math.random() * 1.2,
    points,
    scored: false,
    passed: false,
  };
}

export function makeOrb(x, y) {
  return { kind: 'orb', x, y, radius: 11, phase: Math.random() * Math.PI * 2, taken: false };
}

export function makeShieldPickup(x, y) {
  return { kind: 'shield', x, y, radius: 14, phase: Math.random() * Math.PI * 2, taken: false };
}

export function makeParticle(x, y, color, speed, life, size) {
  const angle = Math.random() * Math.PI * 2;
  return {
    x, y, color,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life,
    maxLife: life,
    size: size ?? 2 + Math.random() * 3,
  };
}

export function burst(particles, x, y, color, count, speed = 220) {
  for (let i = 0; i < count; i += 1) {
    particles.push(makeParticle(x, y, color, speed * (0.3 + Math.random() * 0.9), 0.4 + Math.random() * 0.5));
  }
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
