// Neon Drift — deterministic poses for screenshots.
// A ?shot= URL poses the game in a real state (title, mid-flight, win, loss)
// using the game's own update code, so a screenshot is a genuine render,
// never a mock-up. A seeded shuffle keeps each pose varied but stable.
import { CONFIG } from './config.js';
import { burst, makeAsteroid, makeOrb, makeShieldPickup } from './entities.js';
import { makeWorld } from './world.js';

function seededRandom(seed) {
  let value = seed >>> 0 || 1;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function buildPlayScene(game, seed) {
  const random = seededRandom(seed);
  const world = makeWorld();
  const ship = game.ship;
  // A lively mid-run moment: partway to the gate, score already ticking.
  world.distance = 2350 + random() * 400;
  world.score = 2450 + Math.floor(random() * 800);
  world.combo = 3;
  world.comboTimer = 2;
  world.orbsCollected = 17;
  world.nearMisses = 5;
  ship.x = CONFIG.width * 0.3;
  ship.y = CONFIG.height * 0.55;
  ship.vx = 120;
  ship.vy = -60;
  ship.angle = -0.35;
  ship.boost = 62;
  ship.trail = [
    { x: ship.x - 20, y: ship.y + 8 }, { x: ship.x - 44, y: ship.y + 14 },
    { x: ship.x - 70, y: ship.y + 18 }, { x: ship.x - 96, y: ship.y + 20 },
  ];
  // Asteroids ahead and around the ship, orbs in a trail, one shield pickup.
  // Keep every rock well clear of the ship so the posed moment stays clean:
  // no collision (and no HULL HIT text) fires while the shot is taken.
  for (let i = 0; i < 9; i += 1) {
    let ax = 560 + random() * 640;
    let ay = 60 + random() * (CONFIG.height - 120);
    if (Math.hypot(ax - ship.x, ay - ship.y) < 380) ax = ship.x + 420 + random() * 300;
    const a = makeAsteroid(ax, ay, 18 + random() * 28, 220, random() * 6);
    world.asteroids.push(a);
  }
  world.spawnTimer = 3;
  world.orbTimer = 3;
  world.asteroids.push(makeAsteroid(ship.x + 170, ship.y - 90, 26, 240, 1));
  for (let i = 0; i < 4; i += 1) {
    world.orbs.push(makeOrb(420 + i * 90, 300 + Math.sin(i) * 60));
  }
  world.shields.push(makeShieldPickup(980, 180));
  burst(world.particles, ship.x + 120, ship.y - 40, '#facc15', 10, 140);
  game.world = world;
  game.state = 'playing';
}

export function poseForShot(game, shot, seed) {
  if (shot === 'start') {
    game.state = 'title';
    game.best = 3850;
    return;
  }
  if (shot === 'play') {
    buildPlayScene(game, seed);
    return;
  }
  if (shot === 'win') {
    buildPlayScene(game, seed);
    game.world.distance = CONFIG.gateDistance;
    game.world.score = 12480;
    game.world.orbsCollected = 34;
    game.world.nearMisses = 11;
    game.state = 'win';
    game.best = 12480;
    return;
  }
  if (shot === 'gameover') {
    buildPlayScene(game, seed);
    game.ship.hull = 0;
    game.world.distance = 3120;
    game.world.score = 5980;
    game.world.orbsCollected = 21;
    game.world.nearMisses = 7;
    game.state = 'gameover';
    game.best = 8120;
    return;
  }
  // Unknown shot name: leave the title screen.
  game.state = 'title';
}
