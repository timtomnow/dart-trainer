import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'public', 'icons');

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const v of buf) c = crcTable[(c ^ v) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
};

const palette = {
  bg:   [11, 15, 20, 255],
  ring: [30, 35, 45, 255],
  mid:  [235, 238, 242, 255],
  bull: [210, 50, 55, 255]
};

const makePng = (size, safeScale) => {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(rowLen * size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const r = (size / 2) * safeScale;
  const outer = r * 0.92;
  const mid = r * 0.60;
  const inner = r * 0.22;

  for (let y = 0; y < size; y++) {
    const off = y * rowLen;
    raw[off] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      let c;
      if (d < inner) c = palette.bull;
      else if (d < mid) c = palette.mid;
      else if (d < outer) c = palette.ring;
      else c = palette.bg;
      const p = off + 1 + x * 4;
      raw[p] = c[0]; raw[p + 1] = c[1]; raw[p + 2] = c[2]; raw[p + 3] = c[3];
    }
  }

  const idat = deflateSync(raw, { level: 9 });
  const iend = Buffer.alloc(0);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', iend)]);
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'icon-192.png'), makePng(192, 1.0));
writeFileSync(join(outDir, 'icon-512.png'), makePng(512, 1.0));
writeFileSync(join(outDir, 'icon-maskable-512.png'), makePng(512, 0.7));

console.log(`wrote icons → ${outDir}`);
