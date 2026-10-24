// Generates the PWA icons without any image library: a rounded dark square
// with the GLead mark (a ring and a dot, the neck's root and tone colours).
// Pure zlib + CRC PNG writer. Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const BG = [0x14, 0x1a, 0x1f];
const RING = [0x56, 0xb4, 0xe9];
const DOT = [0xe6, 0x9f, 0x00];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, { maskable }) {
  const rows = [];
  const c = size / 2;
  const radius = maskable ? size : size * 0.22; // maskable icons are full-bleed
  const ringR = size * 0.28;
  const ringW = size * 0.075;
  const dotR = size * 0.095;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      // Rounded-square mask.
      const inX = Math.max(0, Math.abs(dx) - (c - radius));
      const inY = Math.max(0, Math.abs(dy) - (c - radius));
      const inside = maskable || Math.hypot(inX, inY) <= radius;
      let rgb = BG;
      let a = inside ? 255 : 0;
      if (inside) {
        if (Math.abs(d - ringR) <= ringW / 2) rgb = RING;
        if (d <= dotR) rgb = DOT;
      }
      const o = 1 + x * 4;
      row[o] = rgb[0];
      row[o + 1] = rgb[1];
      row[o + 2] = rgb[2];
      row[o + 3] = a;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/pwa-192.png', png(192, { maskable: false }));
writeFileSync('public/pwa-512.png', png(512, { maskable: false }));
writeFileSync('public/pwa-maskable-512.png', png(512, { maskable: true }));
writeFileSync('public/apple-touch-icon.png', png(180, { maskable: true }));
console.log('icons written');
