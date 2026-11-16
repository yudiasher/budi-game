// Neon Drift — tuning, palette and level numbers in one place.
// The ship flies right-to-left through a neon asteroid field toward a warp gate.
// Reach the gate to win; lose all three hull hearts and the run ends.
export const CONFIG = {
  width: 1280,
  height: 720,
  // Distance (metres) to the warp gate that wins the run.
  gateDistance: 5000,
  // Ship handling.
  shipRadius: 16,
  shipAccel: 2600,
  shipMaxSpeed: 430,
  shipDrag: 1.6,
  boostMultiplier: 1.85,
  boostDrain: 34,
  boostRegen: 16,
  boostMax: 100,
  // Hull.
  hullMax: 3,
  invulnerableSeconds: 1.6,
  // Scoring.
  orbScore: 50,
  nearMissScore: 75,
  gateScore: 1000,
  // Difficulty ramp: speed and spawn density grow with distance travelled.
  baseSpeed: 170,
  maxSpeed: 430,
  baseSpawnInterval: 0.85,
  minSpawnInterval: 0.34,
  // Palette: deep space blues with hot neon accents.
  colors: {
    backgroundTop: '#070b1e',
    backgroundBottom: '#12082e',
    star: '#cfe6ff',
    ship: '#7df9ff',
    shipGlow: '#22d3ee',
    orb: '#facc15',
    orbGlow: '#fde047',
    shield: '#4ade80',
    asteroid: '#8b7fd4',
    asteroidEdge: '#c4b5fd',
    gate: '#f472b6',
    danger: '#fb7185',
    hud: '#e2e8f0',
    dim: '#94a3b8',
  },
};

// Difficulty at a given distance: 0 at launch, 1 at the gate.
export function difficultyAt(distance) {
  return Math.min(1, Math.max(0, distance / CONFIG.gateDistance));
}

// Field scroll speed at a given distance.
export function scrollSpeedAt(distance) {
  const d = difficultyAt(distance);
  return CONFIG.baseSpeed + (CONFIG.maxSpeed - CONFIG.baseSpeed) * d;
}

// Seconds between asteroid spawns at a given distance.
export function spawnIntervalAt(distance) {
  const d = difficultyAt(distance);
  return CONFIG.baseSpawnInterval - (CONFIG.baseSpawnInterval - CONFIG.minSpawnInterval) * d;
}
