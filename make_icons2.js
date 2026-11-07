// ConfluX Icon Generator v2 - Pure Node.js, no deps
// Uses proper PNG encoding with zlib

const fs = require('fs');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32buf(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function encodePNG(width, height, rgbaData) {
  // Build raw image data with filter byte per row
  const rowSize = width * 4;
  const rawSize = (rowSize + 1) * height;
  const raw = Buffer.allocUnsafe(rawSize);
  for (let y = 0; y < height; y++) {
    raw[y * (rowSize + 1)] = 0; // filter: None
    for (let x = 0; x < rowSize; x++) {
      raw[y * (rowSize + 1) + 1 + x] = rgbaData[y * rowSize + x];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  function mkChunk(type, data) {
    const len = Buffer.allocUnsafe(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const payload = Buffer.concat([typeBuf, data]);
    const crcVal = Buffer.allocUnsafe(4);
    crcVal.writeUInt32BE(crc32buf(payload), 0);
    return Buffer.concat([len, typeBuf, data, crcVal]);
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA color type
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace: none

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    mkChunk('IHDR', ihdr),
    mkChunk('IDAT', compressed),
    mkChunk('IEND', Buffer.alloc(0))
  ]);
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function generateIcon(size, maskable) {
  const data = new Uint8Array(size * size * 4);

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    if (a >= 255) {
      data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 255;
    } else {
      const sa = a / 255, da = data[i+3] / 255;
      const oa = sa + da * (1 - sa);
      if (oa > 0) {
        data[i]   = Math.round((r * sa + data[i]   * da * (1 - sa)) / oa);
        data[i+1] = Math.round((g * sa + data[i+1] * da * (1 - sa)) / oa);
        data[i+2] = Math.round((b * sa + data[i+2] * da * (1 - sa)) / oa);
        data[i+3] = Math.round(oa * 255);
      }
    }
  }

  const cx = size / 2, cy = size / 2;
  // Safe zone for maskable: 80% of size; for regular: full circle
  const circleR = maskable ? size * 0.38 : size * 0.5;

  // 1. Fill all black (transparent BG outside circle)
  for (let i = 0; i < size * size * 4; i += 4) {
    data[i] = 7; data[i+1] = 11; data[i+2] = 20; data[i+3] = 255;
  }

  // 2. Draw gradient circle
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= circleR + 0.5) {
        const t = Math.max(0, Math.min(1, (y / size)));
        // Blue gradient: #1a3a8f → #0ea5e9
        const r = lerp(26, 14, t);
        const g = lerp(58, 165, t);
        const b = lerp(143, 233, t);
        const aa = Math.max(0, Math.min(255, Math.round((circleR + 0.5 - dist) * 255)));
        setPixel(x, y, r, g, b, aa);
      }
    }
  }

  // 3. Draw lightning bolt ⚡
  // Scale relative to circle
  const sc = circleR / 90; // base design at radius=90

  // Bolt as filled polygon
  // Design: tall lightning bolt centered
  const pts = [
    [cx + 20*sc, cy - 52*sc],  // top right corner
    [cx -  2*sc, cy -  4*sc],  // mid right
    [cx + 16*sc, cy -  4*sc],  // mid right bulge
    [cx - 22*sc, cy + 55*sc],  // bottom left tip
    [cx +  2*sc, cy +  6*sc],  // mid left
    [cx - 16*sc, cy +  6*sc],  // mid left bulge
  ];

  // Scanline fill
  let minY = Infinity, maxY = -Infinity;
  pts.forEach(p => { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
  
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i+1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const xi = a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
        xs.push(xi);
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i += 2) {
      const x1 = Math.round(xs[i]), x2 = Math.round(xs[i+1]);
      for (let x = x1; x <= x2; x++) {
        setPixel(x, y, 250, 204, 21, 255); // #facc15 yellow
      }
    }
  }

  // 4. Thin white highlight arc (top of circle)
  const hlR = circleR * 0.72;
  const hlY = cy - circleR * 0.3;
  for (let angle = 200; angle <= 340; angle += 0.5) {
    const rad = angle * Math.PI / 180;
    const hx = Math.round(cx + Math.cos(rad) * hlR);
    const hy = Math.round(hlY + Math.sin(rad) * hlR * 0.25);
    setPixel(hx, hy, 255, 255, 255, 40);
  }

  return new Uint8Array(data.buffer);
}

// Generate all icon sizes
const icons = [
  { name: 'icon-192.png',          size: 192, maskable: false },
  { name: 'icon-512.png',          size: 512, maskable: false },
  { name: 'icon-maskable-192.png', size: 192, maskable: true  },
  { name: 'icon-maskable-512.png', size: 512, maskable: true  },
  { name: 'apple-touch-icon.png',  size: 180, maskable: false },
];

for (const cfg of icons) {
  const rgba = generateIcon(cfg.size, cfg.maskable);
  const png = encodePNG(cfg.size, cfg.size, rgba);
  fs.writeFileSync(`${__dirname}/${cfg.name}`, png);
  console.log(`✅ ${cfg.name}  (${(png.length/1024).toFixed(1)} KB)`);
}
console.log('\n🎉 Done! ConfluX icons ready.');
