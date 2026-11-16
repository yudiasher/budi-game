// Neon Drift — bootstrap and the main loop.
// States: title -> playing <-> paused -> win / gameover -> playing.
// A ?shot=start|play|win|gameover query poses the game for screenshots.
import { CONFIG } from './config.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { makeShip } from './entities.js';
import { makeWorld, updateWorld } from './world.js';
import { updateParticles } from './entities.js';
import { renderGameOver, renderPaused, renderPlaying, renderTitle, renderWin } from './render.js';
import { poseForShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
canvas.width = CONFIG.width;
canvas.height = CONFIG.height;

const sounds = new SoundBank();
const input = new Input(canvas);
const BEST_KEY = 'neon-drift-best';

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Storage unavailable (private mode): best score just lives for the session.
  }
}

const game = {
  state: 'title',
  ship: makeShip(),
  world: makeWorld(),
  best: loadBest(),
  lastTime: 0,
};
// Read-only handle for play-testing (lets a test script read state, score and hull).
window.__neonDrift = game;

function startRun() {
  game.ship = makeShip();
  game.world = makeWorld();
  game.state = 'playing';
  sounds.ensure();
  sounds.startMusic();
  sounds.click();
  statusLine.textContent = 'Neon Drift started. Reach the warp gate.';
}

function finishRun(outcome) {
  game.state = outcome;
  sounds.stopMusic();
  if (game.world.score > game.best) {
    game.best = game.world.score;
    saveBest(game.best);
  }
  if (outcome === 'win') sounds.win();
  else sounds.lose();
  statusLine.textContent = outcome === 'win'
    ? `Gate reached! Score ${game.world.score}.`
    : `Ship lost. Score ${game.world.score}. Press R to fly again.`;
}

function update(dt) {
  if (game.state !== 'playing') return;
  const result = updateWorld(game.world, game.ship, input, dt, sounds);
  updateParticles(game.world.particles, dt);
  if (result === 'win' || result === 'gameover') finishRun(result);
}

function render(dt) {
  if (game.state === 'title') renderTitle(ctx, game.world, game.best);
  else if (game.state === 'paused') {
    renderPlaying(ctx, game.world, game.ship, 0);
    renderPaused(ctx);
  } else if (game.state === 'win') renderWin(ctx, game.world, game.best);
  else if (game.state === 'gameover') renderGameOver(ctx, game.world, game.best);
  else renderPlaying(ctx, game.world, game.ship, dt);
}

function frame(timestamp) {
  const dt = Math.min(0.05, (timestamp - game.lastTime) / 1000 || 0.016);
  game.lastTime = timestamp;

  // Global keys, whatever the state.
  if (input.wasPressed('KeyM')) {
    sounds.ensure();
    const muted = sounds.toggleMute();
    statusLine.textContent = muted ? 'Sound muted.' : 'Sound on.';
  }
  if (game.state === 'title') {
    if (input.wasPressed('Enter') || input.wasPressed('Space') || input.wasPressed('Pointer')) startRun();
  } else if (game.state === 'playing') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      game.state = 'paused';
      sounds.click();
    }
  } else if (game.state === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter')) {
      game.state = 'playing';
      sounds.click();
    }
  } else if (game.state === 'win' || game.state === 'gameover') {
    if (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.wasPressed('Pointer')) startRun();
  }

  update(dt);
  render(dt);
  input.endFrame();
  requestAnimationFrame(frame);
}

// Screenshot poses: ?shot=start|play|win|gameover (and &seed=N for variety).
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  poseForShot(game, shot, Number(params.get('seed')) || 1);
  // Posed frames render through the normal loop; keep the title music silent.
  if (game.state === 'title') {
    // Title pose: draw once now so a headless capture never waits on input.
    renderTitle(ctx, game.world, game.best);
  }
}

requestAnimationFrame(frame);
