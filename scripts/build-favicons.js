const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const off = 1 + x * 4;
      row[off] = r;
      row[off + 1] = g;
      row[off + 2] = b;
      row[off + 3] = a;
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function createIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const dirEntries = [];

  for (const img of images) {
    const dir = Buffer.alloc(16);
    dir[0] = img.width >= 256 ? 0 : img.width;
    dir[1] = img.height >= 256 ? 0 : img.height;
    dir[2] = 0;
    dir[3] = 0;
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(img.buffer.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += img.buffer.length;
    dirEntries.push(dir);
  }

  return Buffer.concat([header, ...dirEntries, ...images.map((img) => img.buffer)]);
}

function starDist(px, py, cx, cy, rx, ry) {
  const dx = Math.abs(px - cx) / rx;
  const dy = Math.abs(py - cy) / ry;
  if (dx >= 1 || dy >= 1) return 2;
  return Math.sqrt(dx) + Math.sqrt(dy);
}

function getPixel(x, y, w, h) {
  const fx = x / w;
  const fy = y / h;

  // Rounded rectangle check
  const R = 0.24 * w;
  let inRect = true;
  if (x < R && y < R && Math.hypot(x - R, y - R) > R) inRect = false;
  if (x >= w - R && y < R && Math.hypot(x - (w - R), y - R) > R) inRect = false;
  if (x < R && y >= h - R && Math.hypot(x - R, y - (h - R)) > R) inRect = false;
  if (x >= w - R && y >= h - R && Math.hypot(x - (w - R), y - (h - R)) > R) inRect = false;
  if (!inRect) return [0, 0, 0, 0];

  // Emerald gradient from top-left (#10b981) to bottom-right (#047857)
  const t = Math.min(1, Math.max(0, (fx + fy) / 1.5));
  let r = Math.round(16 * (1 - t) + 4 * t);
  let g = Math.round(185 * (1 - t) + 120 * t);
  let b = Math.round(129 * (1 - t) + 87 * t);

  // Sparkles
  // 1. Primary main star
  const d1 = starDist(fx, fy, 0.44, 0.50, 0.28, 0.28);
  // 2. Secondary top-right star
  const d2 = starDist(fx, fy, 0.72, 0.28, 0.16, 0.16);
  // 3. Tertiary bottom-right star
  const d3 = starDist(fx, fy, 0.72, 0.72, 0.10, 0.10);

  if (d1 <= 1.0) {
    const alpha = Math.min(1, Math.max(0, (1.05 - d1) * 8));
    r = Math.round(r * (1 - alpha) + 255 * alpha);
    g = Math.round(g * (1 - alpha) + 255 * alpha);
    b = Math.round(b * (1 - alpha) + 255 * alpha);
  } else if (d2 <= 1.0) {
    const alpha = Math.min(1, Math.max(0, (1.05 - d2) * 8));
    // Warm golden-white tint for secondary star
    r = Math.round(r * (1 - alpha) + 253 * alpha);
    g = Math.round(g * (1 - alpha) + 230 * alpha);
    b = Math.round(b * (1 - alpha) + 138 * alpha);
  } else if (d3 <= 1.0) {
    const alpha = Math.min(1, Math.max(0, (1.05 - d3) * 8));
    r = Math.round(r * (1 - alpha) + 255 * alpha);
    g = Math.round(g * (1 - alpha) + 255 * alpha);
    b = Math.round(b * (1 - alpha) + 255 * alpha);
  }

  return [r, g, b, 255];
}

const targetDir = path.resolve(__dirname, '../frontend/public');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const png16 = createPng(16, 16, getPixel);
const png32 = createPng(32, 32, getPixel);
const png48 = createPng(48, 48, getPixel);
const png180 = createPng(180, 180, getPixel);
const png192 = createPng(192, 192, getPixel);
const png512 = createPng(512, 512, getPixel);

fs.writeFileSync(path.join(targetDir, 'favicon-16x16.png'), png16);
fs.writeFileSync(path.join(targetDir, 'favicon-32x32.png'), png32);
fs.writeFileSync(path.join(targetDir, 'apple-touch-icon.png'), png180);
fs.writeFileSync(path.join(targetDir, 'android-chrome-192x192.png'), png192);
fs.writeFileSync(path.join(targetDir, 'android-chrome-512x512.png'), png512);

// Generate multi-resolution ICO file (16x16, 32x32, 48x48)
const icoBuf = createIco([
  { width: 16, height: 16, buffer: png16 },
  { width: 32, height: 32, buffer: png32 },
  { width: 48, height: 48, buffer: png48 }
]);
fs.writeFileSync(path.join(targetDir, 'favicon.ico'), icoBuf);

console.log('Successfully generated all favicon assets in', targetDir);
