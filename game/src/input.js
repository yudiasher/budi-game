// Neon Drift — keyboard, mouse and touch input, normalised to one state object.
// Arrow keys / WASD steer, Space (hold) boosts, P pauses, M mutes, Enter starts.
// The mouse steers toward the pointer while held; a tap/click also starts the game.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    this.pressed = new Set();
    this.canvas = canvas;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });

    const track = (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.mouse.x = (event.clientX - rect.left) * scaleX;
      this.mouse.y = (event.clientY - rect.top) * scaleY;
    };
    canvas.addEventListener('pointermove', track);
    canvas.addEventListener('pointerdown', (event) => {
      track(event);
      this.mouse.down = true;
      this.pressed.add('Pointer');
    });
    window.addEventListener('pointerup', () => {
      this.mouse.down = false;
    });
  }

  // Steering vector from keys, or toward the mouse while it is held. Normalised.
  steer() {
    let x = 0;
    let y = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) x -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) x += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) y -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) y += 1;
    if (x !== 0 || y !== 0) {
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length, active: true };
    }
    return { x: 0, y: 0, active: false };
  }

  get boosting() {
    return this.keys.has('Space') || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  // True once for a key/button pressed since the last frame; consumed by the caller.
  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
  }
}
