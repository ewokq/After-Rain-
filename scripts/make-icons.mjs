import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FONT = {
  A: "010101111101101",
  R: "110101110101101",
};

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= size || iy >= size || a <= 0) return;
    const i = (iy * size + ix) * 4;
    const aa = Math.min(1, a);
    const oa = px[i + 3] / 255;
    const out = aa + oa * (1 - aa);
    px[i] = Math.round((r * aa + px[i] * oa * (1 - aa)) / out);
    px[i + 1] = Math.round((g * aa + px[i + 1] * oa * (1 - aa)) / out);
    px[i + 2] = Math.round((b * aa + px[i + 2] * oa * (1 - aa)) / out);
    px[i + 3] = Math.round(out * 255);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const v = (x + y) % 2 === 0 ? 8 : 6;
      px[i] = 7;
      px[i + 1] = 9 + (v > 7 ? 1 : 0);
      px[i + 2] = 13;
      px[i + 3] = 255;
    }
  }

  for (let k = 0; k < Math.floor(size / 6); k++) {
    const x = Math.floor(hash(k * 3.1) * size);
    const y0 = Math.floor(hash(k * 7.7) * size);
    const len = 4 + Math.floor(hash(k * 1.9) * (size * 0.12));
    for (let j = 0; j < len; j++) set(x, y0 + j, 150, 210, 230, 0.18);
  }

  const inset = Math.round(size * 0.08);
  for (let i = 0; i < Math.max(2, Math.round(size * 0.012)); i++) {
    for (let x = inset; x < size - inset; x++) {
      set(x, inset + i, 61, 245, 208, 0.85);
      set(x, size - inset - 1 - i, 255, 111, 154, 0.75);
    }
    for (let y = inset; y < size - inset; y++) {
      set(inset + i, y, 61, 245, 208, 0.55);
      set(size - inset - 1 - i, y, 255, 111, 154, 0.45);
    }
  }

  const text = "AR";
  const gw = 3;
  const gh = 5;
  const gap = 1;
  const cols = text.length * gw + (text.length - 1) * gap;
  const scale = Math.max(2, Math.floor((size * 0.58) / cols));
  const ox = Math.round((size - cols * scale) / 2);
  const oy = Math.round((size - gh * scale) / 2);

  const stamp = (dx, dy, r, g, b, a) => {
    for (let i = 0; i < text.length; i++) {
      const gl = FONT[text[i]];
      for (let row = 0; row < gh; row++) {
        for (let col = 0; col < gw; col++) {
          if (gl[row * gw + col] !== "1") continue;
          const x0 = ox + (i * (gw + gap) + col) * scale + dx;
          const y0 = oy + row * scale + dy;
          for (let yy = 0; yy < scale; yy++) {
            for (let xx = 0; xx < scale; xx++) set(x0 + xx, y0 + yy, r, g, b, a);
          }
        }
      }
    }
  };

  const glow = Math.max(2, Math.round(scale * 0.7));
  for (let gy = -glow; gy <= glow; gy++) {
    for (let gx = -glow; gx <= glow; gx++) {
      const d = Math.hypot(gx, gy) / glow;
      if (d > 1) continue;
      stamp(gx + Math.round(scale * 0.35), gy + Math.round(scale * 0.25), 255, 80, 140, (1 - d) * 0.16);
      stamp(gx, gy, 80, 255, 220, (1 - d) * 0.14);
    }
  }
  stamp(Math.round(scale * 0.22), Math.round(scale * 0.18), 255, 111, 154, 0.9);
  stamp(0, 0, 214, 255, 244, 1);

  return encodePng(size, size, px);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "icon-192.png"), drawIcon(192));
writeFileSync(join(outDir, "icon-512.png"), drawIcon(512));
writeFileSync(join(outDir, "apple-touch-icon.png"), drawIcon(180));
console.log("wrote icons to", outDir);
