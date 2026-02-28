/* ============================================================
   Art Generator — art.js
   ============================================================ */

// ── Seeded PRNG (mulberry32) ─────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

// ── Colour Palettes ──────────────────────────────────────────
const PALETTES = {
  cosmic: {
    bg: '#0d0d2b',
    colors: ['#6a0dad', '#9b30ff', '#ff6ec7', '#ffd700', '#c084fc', '#e879f9', '#818cf8'],
  },
  ocean: {
    bg: '#001220',
    colors: ['#0074d9', '#7fdbff', '#01ff70', '#0047ab', '#00b4d8', '#48cae4', '#90e0ef'],
  },
  fire: {
    bg: '#120000',
    colors: ['#ff4500', '#ff6a00', '#ff8c00', '#ffd700', '#e25822', '#ff2400', '#ffbf00'],
  },
  forest: {
    bg: '#071210',
    colors: ['#2d6a4f', '#52b788', '#74c69d', '#d8f3dc', '#1b4332', '#40916c', '#95d5b2'],
  },
  monochrome: {
    bg: '#0a0a0a',
    colors: ['#1a1a1a', '#333', '#555', '#888', '#aaa', '#ccc', '#eee'],
  },
  neon: {
    bg: '#080808',
    colors: ['#ff00ff', '#00ffff', '#ff0099', '#00ff99', '#ff9900', '#9900ff', '#00ccff'],
  },
};

// ── State ────────────────────────────────────────────────────
const state = {
  style: 'geometric',
  palette: 'cosmic',
  density: 5,
  complexity: 5,
  speed: 3,
  symmetry: false,
  seed: '',
  animFrame: null,
  hasGenerated: false,
};

// ── Canvas setup ─────────────────────────────────────────────
const canvas = document.getElementById('artCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const container = canvas.parentElement;
  const maxW = container.clientWidth - 48;
  const maxH = container.clientHeight - 48;
  const aspect = 4 / 3;

  let w = Math.min(maxW, 800);
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  canvas.width = Math.floor(w);
  canvas.height = Math.floor(h);
}

// ── Helpers ──────────────────────────────────────────────────
function pick(arr, rand) {
  return arr[Math.floor(rand() * arr.length)];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hsl(h, s, l, a = 1) {
  return `hsla(${h},${s}%,${l}%,${a})`;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ── Generators ───────────────────────────────────────────────

// 1. GEOMETRIC — layered polygons + lines
function drawGeometric(rand, palette, density, complexity, symmetry) {
  const { bg, colors } = palette;
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const count = 20 + density * 12 + complexity * 8;
  const maxSides = 3 + Math.floor(complexity * 0.7);

  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 20 + rand() * (60 + density * 10);
    const sides = 3 + Math.floor(rand() * maxSides);
    const rotation = rand() * Math.PI * 2;
    const color = pick(colors, rand);
    const alpha = 0.05 + rand() * 0.35;
    const filled = rand() > 0.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (symmetry) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-W, 0);
      drawPolygon(ctx, 0, 0, r, sides, color, alpha, filled);
      ctx.restore();
    }

    drawPolygon(ctx, 0, 0, r, sides, color, alpha, filled);
    ctx.restore();
  }

  // Add connecting lines
  const lineCount = 10 + complexity * 5;
  for (let i = 0; i < lineCount; i++) {
    const x1 = rand() * W, y1 = rand() * H;
    const x2 = rand() * W, y2 = rand() * H;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = pick(colors, rand);
    ctx.globalAlpha = 0.08 + rand() * 0.12;
    ctx.lineWidth = 0.5 + rand() * 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawPolygon(ctx, x, y, r, sides, color, alpha, filled) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.globalAlpha = alpha;
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 + Math.random();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// 2. PARTICLES — flowing dot clouds
function drawParticles(rand, palette, density, complexity, symmetry) {
  const { bg, colors } = palette;
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const count = 200 + density * 120 + complexity * 60;
  const clusters = 3 + Math.floor(complexity * 0.8);

  const centres = Array.from({ length: clusters }, () => ({
    x: rand() * W,
    y: rand() * H,
    r: 50 + rand() * 200,
    color: pick(colors, rand),
  }));

  for (let i = 0; i < count; i++) {
    const c = centres[Math.floor(rand() * clusters)];
    const angle = rand() * Math.PI * 2;
    const dist = rand() * c.r;
    const x = c.x + Math.cos(angle) * dist;
    const y = c.y + Math.sin(angle) * dist;
    const size = 1 + rand() * (2 + density * 0.3);
    const alpha = 0.3 + rand() * 0.6;

    ctx.beginPath();
    ctx.arc(symmetry ? W / 2 + (x - W / 2) : x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = c.color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (symmetry) {
      ctx.beginPath();
      ctx.arc(W / 2 - (x - W / 2), y, size, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// 3. WAVES — sinusoidal bands
function drawWaves(rand, palette, density, complexity, symmetry) {
  const { bg, colors } = palette;
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const bands = 8 + density * 3;
  for (let b = 0; b < bands; b++) {
    const color = pick(colors, rand);
    const amp = 10 + rand() * (30 + complexity * 10);
    const freq = 1 + rand() * (1 + complexity * 0.5);
    const phase = rand() * Math.PI * 2;
    const yBase = (H / bands) * b + H / (bands * 2);
    const alpha = 0.15 + rand() * 0.5;
    const lineW = 1 + rand() * (2 + density * 0.4);

    ctx.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const y = yBase + Math.sin((x / W) * Math.PI * 2 * freq + phase) * amp
        + Math.sin((x / W) * Math.PI * 4 * freq + phase * 1.3) * (amp * 0.4);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = lineW;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Filled wave areas
  const fills = 3 + Math.floor(complexity * 0.5);
  for (let f = 0; f < fills; f++) {
    const color = pick(colors, rand);
    const amp = 20 + rand() * 60;
    const freq = 0.5 + rand() * 2;
    const phase = rand() * Math.PI * 2;
    const yBase = rand() * H;

    ctx.beginPath();
    ctx.moveTo(0, yBase);
    for (let x = 0; x <= W; x += 3) {
      const y = yBase + Math.sin((x / W) * Math.PI * 2 * freq + phase) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.04 + rand() * 0.08;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// 4. FRACTAL — recursive tree + spirograph
function drawFractal(rand, palette, density, complexity, symmetry) {
  const { bg, colors } = palette;
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const depth = 4 + Math.floor(complexity * 0.8);
  const branches = 2 + Math.floor(rand() * 2);
  const startColor = pick(colors, rand);

  function branch(x, y, len, angle, d, colorIdx) {
    if (d === 0 || len < 1) return;
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    const alpha = 0.2 + (d / depth) * 0.7;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = colors[colorIdx % colors.length];
    ctx.globalAlpha = alpha;
    ctx.lineWidth = (d / depth) * (1 + density * 0.2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (symmetry) {
      ctx.beginPath();
      ctx.moveTo(W - x, y);
      ctx.lineTo(W - x2, y2);
      ctx.strokeStyle = colors[colorIdx % colors.length];
      ctx.globalAlpha = alpha;
      ctx.lineWidth = (d / depth) * (1 + density * 0.2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const spread = (0.3 + rand() * 0.4) * Math.PI / branches;
    for (let b = 0; b < branches; b++) {
      const newAngle = angle - spread * (branches - 1) / 2 + spread * b;
      branch(x2, y2, len * (0.6 + rand() * 0.2), newAngle, d - 1, colorIdx + 1);
    }
  }

  const trees = 1 + Math.floor(density * 0.4);
  for (let t = 0; t < trees; t++) {
    const x = symmetry ? W / 2 : (0.2 + rand() * 0.6) * W;
    const y = H * (0.7 + rand() * 0.2);
    const startLen = 60 + complexity * 10 + rand() * 30;
    branch(x, y, startLen, -Math.PI / 2 + (rand() - 0.5) * 0.3, depth, 0);
  }

  // Spirograph overlay
  const arms = 3 + Math.floor(complexity * 0.5);
  const R = Math.min(W, H) * (0.1 + rand() * 0.15);
  const r = R * (0.3 + rand() * 0.5);
  const d2 = r * (0.5 + rand() * 0.8);
  const cx = W / 2, cy = H / 2;
  const spColor = pick(colors, rand);
  const steps = 2000 + complexity * 300;

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * arms;
    const x = cx + (R - r) * Math.cos(t) + d2 * Math.cos(((R - r) / r) * t);
    const y = cy + (R - r) * Math.sin(t) - d2 * Math.sin(((R - r) / r) * t);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = spColor;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// 5. NOISE FIELD — vector field / flow field
function drawNoise(rand, palette, density, complexity, symmetry) {
  const { bg, colors } = palette;
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Simple smooth noise using sine waves
  const freq1 = 0.003 + rand() * 0.005;
  const freq2 = 0.005 + rand() * 0.008;
  const offset = rand() * 1000;

  function noiseVal(x, y) {
    return Math.sin(x * freq1 + offset) * Math.cos(y * freq1 * 1.3 + offset * 0.7)
      + 0.5 * Math.sin(x * freq2 + y * freq2 * 0.8 + offset * 0.3);
  }

  const particles = 300 + density * 150 + complexity * 80;
  const steps = 30 + complexity * 10;
  const stepLen = 3 + density * 0.4;

  for (let p = 0; p < particles; p++) {
    let x = rand() * W;
    let y = rand() * H;
    const color = pick(colors, rand);
    const alpha = 0.15 + rand() * 0.3;

    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let s = 0; s < steps; s++) {
      const n = noiseVal(x, y);
      const angle = n * Math.PI * 2;
      x += Math.cos(angle) * stepLen;
      y += Math.sin(angle) * stepLen;
      if (x < 0 || x > W || y < 0 || y > H) break;
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 0.8 + rand() * 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (symmetry) {
      x = W - (rand() * W);
      y = rand() * H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < steps; s++) {
        const n = noiseVal(W - x, y);
        const angle = (Math.PI - n * Math.PI * 2);
        x += Math.cos(angle) * stepLen;
        y += Math.sin(angle) * stepLen;
        if (x < 0 || x > W || y < 0 || y > H) break;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 0.8 + rand() * 1.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

// 6. SPLATTER — ink/paint splatter effect
function drawSplatter(rand, palette, density, complexity, symmetry) {
  const { bg, colors } = palette;
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const splats = 5 + density * 4 + complexity * 2;

  for (let s = 0; s < splats; s++) {
    const cx = rand() * W;
    const cy = rand() * H;
    const color = pick(colors, rand);
    const maxR = 30 + rand() * (60 + density * 15);
    const drops = 20 + density * 10 + complexity * 5;

    // Core splat
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5 + rand() * 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Drips and droplets
    for (let d = 0; d < drops; d++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * maxR;
      const dx = cx + Math.cos(angle) * dist;
      const dy = cy + Math.sin(angle) * dist;
      const dr = 1 + rand() * (maxR * 0.15);

      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3 + rand() * 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (symmetry) {
        ctx.beginPath();
        ctx.arc(W - dx, dy, dr, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3 + rand() * 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Streaks
    const streaks = 3 + Math.floor(rand() * complexity);
    for (let k = 0; k < streaks; k++) {
      const angle = rand() * Math.PI * 2;
      const len = maxR * (0.5 + rand() * 1.5);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(
        cx + Math.cos(angle + 0.3) * len * 0.5,
        cy + Math.sin(angle + 0.3) * len * 0.5,
        cx + Math.cos(angle) * len,
        cy + Math.sin(angle) * len
      );
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.2 + rand() * 0.3;
      ctx.lineWidth = 1 + rand() * 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

// ── Animation frame updater ──────────────────────────────────
let animState = null;
let tick = 0;

function animate() {
  if (!animState) return;
  const { rand0, palette, density, complexity, symmetry, style, speed } = animState;

  tick += 0.005 * speed;

  // Shift palette colors with time
  const shifted = palette.colors.map((c) => {
    const [r, g, b] = hexToRgb(c);
    const h = Math.atan2(g - 128, r - 128) * 180 / Math.PI + tick * 20;
    return `hsl(${h},70%,55%)`;
  });

  const animPalette = { bg: palette.bg, colors: shifted };

  // Re-seed rand to keep same structure but vary color
  const drawFn = DRAW_FNS[style];
  if (drawFn) {
    drawFn(rand0, animPalette, density, complexity, symmetry);
  }

  state.animFrame = requestAnimationFrame(animate);
}

const DRAW_FNS = {
  geometric: drawGeometric,
  particles: drawParticles,
  waves: drawWaves,
  fractal: drawFractal,
  noise: drawNoise,
  splatter: drawSplatter,
};

// ── Main generate ────────────────────────────────────────────
function generate(opts = {}) {
  if (state.animFrame) {
    cancelAnimationFrame(state.animFrame);
    state.animFrame = null;
  }

  const seedStr = opts.seed ?? (document.getElementById('seedInput').value || String(Date.now()));
  document.getElementById('seedInput').value = seedStr;

  const seed = hashStr(String(seedStr));
  const rand = mulberry32(seed);

  const palette = PALETTES[state.palette];
  const { density, complexity, speed, symmetry, style } = state;

  const drawFn = DRAW_FNS[style];
  if (drawFn) drawFn(rand, palette, density, complexity, symmetry);

  // Start animation if speed > 0
  if (speed > 0) {
    tick = 0;
    const rand0 = mulberry32(seed);
    animState = { rand0, palette, density, complexity, symmetry, style, speed };
    state.animFrame = requestAnimationFrame(animate);
  }

  // Show canvas, hide overlay
  document.getElementById('canvasOverlay').classList.add('hidden');
  document.getElementById('downloadBtn').disabled = false;
  state.hasGenerated = true;
}

// ── Randomize ────────────────────────────────────────────────
function randomize() {
  const styles = Object.keys(DRAW_FNS);
  const palettes = Object.keys(PALETTES);
  const randStyle = styles[Math.floor(Math.random() * styles.length)];
  const randPalette = palettes[Math.floor(Math.random() * palettes.length)];

  setStyle(randStyle);
  setPalette(randPalette);

  document.getElementById('densitySlider').value = 1 + Math.floor(Math.random() * 9);
  document.getElementById('complexitySlider').value = 1 + Math.floor(Math.random() * 9);
  document.getElementById('speedSlider').value = Math.floor(Math.random() * 8);
  document.getElementById('symmetryCheck').checked = Math.random() > 0.5;

  syncSliders();

  const newSeed = Math.random().toString(36).slice(2, 10);
  document.getElementById('seedInput').value = newSeed;

  generate({ seed: newSeed });
}

// ── Download ─────────────────────────────────────────────────
function download() {
  const link = document.createElement('a');
  link.download = `art-${state.style}-${document.getElementById('seedInput').value}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ── UI helpers ───────────────────────────────────────────────
function setStyle(s) {
  state.style = s;
  document.querySelectorAll('.style-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.style === s);
  });
}

function setPalette(p) {
  state.palette = p;
  document.querySelectorAll('.palette-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.palette === p);
  });
}

function syncSliders() {
  state.density = Number(document.getElementById('densitySlider').value);
  state.complexity = Number(document.getElementById('complexitySlider').value);
  state.speed = Number(document.getElementById('speedSlider').value);
  state.symmetry = document.getElementById('symmetryCheck').checked;

  document.getElementById('densityValue').textContent = state.density;
  document.getElementById('complexityValue').textContent = state.complexity;
  document.getElementById('speedValue').textContent = state.speed;
}

// ── Event Listeners ──────────────────────────────────────────
document.getElementById('generateBtn').addEventListener('click', () => generate());
document.getElementById('randomBtn').addEventListener('click', randomize);
document.getElementById('downloadBtn').addEventListener('click', download);

document.querySelectorAll('.style-btn').forEach((btn) => {
  btn.addEventListener('click', () => setStyle(btn.dataset.style));
});

document.querySelectorAll('.palette-btn').forEach((btn) => {
  btn.addEventListener('click', () => setPalette(btn.dataset.palette));
});

['densitySlider', 'complexitySlider', 'speedSlider'].forEach((id) => {
  document.getElementById(id).addEventListener('input', () => {
    syncSliders();
  });
});

document.getElementById('symmetryCheck').addEventListener('change', syncSliders);

document.getElementById('copySeedBtn').addEventListener('click', () => {
  const seed = document.getElementById('seedInput').value;
  if (seed) navigator.clipboard.writeText(seed).catch(() => {});
});

// ── Init ─────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  resizeCanvas();
  if (state.hasGenerated) generate();
});

resizeCanvas();
syncSliders();
