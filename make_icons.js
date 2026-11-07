// Pure Node.js PNG icon generator for ConfluX
// Creates icon-192.png, icon-512.png, icon-maskable-192.png, icon-maskable-512.png, apple-touch-icon.png
// No external dependencies - uses raw PNG format

const fs = require('fs');
const zlib = require('zlib');

// ─── PNG Writer ───────────────────────────────────────────────────────────────
function writePNG(width, height, pixels) {
  // pixels: Uint8Array of RGBA, row-major
  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(width, 0);
  IHDR.writeUInt32BE(height, 4);
  IHDR[8] = 8;  // bit depth
  IHDR[9] = 2;  // color type: RGB (we'll embed alpha via RGBA=3)
  IHDR[9] = 6;  // RGBA
  IHDR[10] = 0; // compression
  IHDR[11] = 0; // filter
  IHDR[12] = 0; // interlace

  // Build raw scanlines (filter byte 0 + RGBA per pixel)
  const raw = Buffer.alloc((1 + width * 4) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const ri = y * (1 + width * 4) + 1 + x * 4;
      raw[ri]   = pixels[pi];
      raw[ri+1] = pixels[pi+1];
      raw[ri+2] = pixels[pi+2];
      raw[ri+3] = pixels[pi+3];
    }
  }

  const compressed = zlib.deflateSync(raw);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeB, data]);
    const crc = crc32(crcData);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', IHDR),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// CRC32
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ─── Draw ConfluX Icon ────────────────────────────────────────────────────────
function drawConfluXIcon(size, maskable) {
  const pixels = new Uint8Array(size * size * 4);

  // Colors
  const BG   = [7, 11, 20, 255];       // #070b14 dark navy
  const GRAD1 = [30, 64, 175, 255];    // #1e40af blue (top)
  const GRAD2 = [14, 165, 233, 255];   // #0ea5e9 sky blue (bottom)
  const BOLT  = [250, 204, 21, 255];   // #facc15 yellow lightning
  const WHITE = [255, 255, 255, 255];

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    // Alpha blend over existing
    const srcA = a / 255;
    const dstA = pixels[i+3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA === 0) return;
    pixels[i]   = Math.round((r * srcA + pixels[i]   * dstA * (1 - srcA)) / outA);
    pixels[i+1] = Math.round((g * srcA + pixels[i+1] * dstA * (1 - srcA)) / outA);
    pixels[i+2] = Math.round((b * srcA + pixels[i+2] * dstA * (1 - srcA)) / outA);
    pixels[i+3] = Math.round(outA * 255);
  }

  function fillCircle(cx, cy, r, fn) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist <= r) {
          const aa = Math.max(0, Math.min(1, r - dist + 0.5));
          fn(x, y, aa);
        }
      }
    }
  }

  function fillRect(x1, y1, x2, y2, col) {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++)
        setPixel(x, y, col[0], col[1], col[2], col[3]);
  }

  function fillPoly(pts, col) {
    // Simple scanline fill
    let minY = Infinity, maxY = -Infinity;
    pts.forEach(p => { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    minY = Math.floor(minY); maxY = Math.ceil(maxY);
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i+1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      xs.sort((a,b) => a-b);
      for (let i = 0; i < xs.length - 1; i += 2) {
        for (let x = Math.round(xs[i]); x <= Math.round(xs[i+1]); x++) {
          setPixel(x, y, col[0], col[1], col[2], col[3]);
        }
      }
    }
  }

  // ── 1. Fill background ──
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      setPixel(x, y, BG[0], BG[1], BG[2], 255);
    }
  }

  const pad = maskable ? size * 0.12 : 0;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - pad;

  // ── 2. Blue gradient circle background ──
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= radius) {
        // Gradient top→bottom
        const t = (y - (cy - radius)) / (2 * radius);
        const r = Math.round(GRAD1[0] + (GRAD2[0] - GRAD1[0]) * t);
        const g = Math.round(GRAD1[1] + (GRAD2[1] - GRAD1[1]) * t);
        const b = Math.round(GRAD1[2] + (GRAD2[2] - GRAD1[2]) * t);
        // Anti-alias edge
        const aa = Math.max(0, Math.min(1, radius - dist + 0.5));
        setPixel(x, y, r, g, b, Math.round(aa * 255));
      }
    }
  }

  // ── 3. Lightning bolt ⚡ ──
  // Scale bolt relative to icon size
  const s = size / 192; // base at 192px
  const bx = cx; // center x
  const by = cy; // center y

  // Lightning bolt polygon points (normalized for 192px)
  // Top-right angled tip going down-left, then bottom spike
  const boltPts = [
    [bx + 18*s, by - 50*s],   // top right
    [bx - 2*s,  by - 6*s],    // middle right top
    [bx + 14*s, by - 6*s],    // middle notch right
    [bx - 20*s, by + 55*s],   // bottom left tip
    [bx + 2*s,  by + 8*s],    // middle left bottom
    [bx - 14*s, by + 8*s],    // middle notch left
  ];

  fillPoly(boltPts, BOLT);

  return pixels;
}

// ─── Generate all icons ───────────────────────────────────────────────────────
const dir = __dirname;

const configs = [
  { name: 'icon-192.png',          size: 192, maskable: false },
  { name: 'icon-512.png',          size: 512, maskable: false },
  { name: 'icon-maskable-192.png', size: 192, maskable: true  },
  { name: 'icon-maskable-512.png', size: 512, maskable: true  },
  { name: 'apple-touch-icon.png',  size: 180, maskable: false },
  { name: 'favicon-32.png',        size: 32,  maskable: false },
];

for (const cfg of configs) {
  const pixels = drawConfluXIcon(cfg.size, cfg.maskable);
  const png = writePNG(cfg.size, cfg.size, pixels);
  fs.writeFileSync(`${dir}/${cfg.name}`, png);
  console.log(`✅ ${cfg.name} (${cfg.size}x${cfg.size})`);
}

console.log('\n🎉 All ConfluX icons generated!');
