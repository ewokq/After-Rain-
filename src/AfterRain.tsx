import { useEffect, useRef, useState, useGrokTheme, type CSSProperties, type PointerEvent, type MouseEvent } from "grok/canvas";

type Ctx = CanvasRenderingContext2D;
let W = 320;
const H = 180;
const FEET = 160;
type LocId = "apt" | "district" | "market";
const LOCW: Record<LocId, number> = { apt: 360, district: 1400, market: 900 };
const FW = Math.ceil(340 + 1400 * 0.15);
const MW = Math.ceil(340 + 1400 * 0.45);
const KW = Math.ceil(340 + 900 * 0.6);

function h1(n: number): number { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function clamp(v: number, a: number, b: number): number { return v < a ? a : v > b ? b : v; }
function R(c: Ctx, x: number, y: number, w: number, h: number, col: string): void { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }
function tri(v: number, m: number): number { return m - Math.abs((((v % (2 * m)) + 2 * m) % (2 * m)) - m); }

const FONT: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110",
  "4": "101101111001001", "5": "111100110001110", "6": "011100111101111", "7": "111001010010010", "8": "111101111101111",
  "9": "111101111001110", "-": "000000111000000", ".": "000000000000010", ":": "000010000010000", " ": "000000000000000", "+": "000010111010000",
};
function ptext(c: Ctx, s: string, x: number, y: number, col: string, sc: number): void {
  c.fillStyle = col;
  for (let i = 0; i < s.length; i++) {
    const gl = FONT[s.charAt(i)];
    if (!gl) continue;
    for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (gl.charAt(r * 3 + q) === "1") c.fillRect(Math.round(x + i * 4 * sc + q * sc), Math.round(y + r * sc), sc, sc);
  }
}
function flick(t: number, seed: number): boolean {
  if (h1(seed * 3.3 + Math.floor(t * 0.4)) <= 0.75) return true;
  return h1(seed + Math.floor(t * 14)) > 0.4;
}
const GLOWS = new Map<string, HTMLCanvasElement>();
function glowSprite(rgb: string): HTMLCanvasElement {
  const have = GLOWS.get(rgb);
  if (have) return have;
  const s = document.createElement("canvas"); s.width = 64; s.height = 64;
  const c = s.getContext("2d");
  if (c) {
    const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.3, `rgba(${rgb},0.45)`); gr.addColorStop(0.65, `rgba(${rgb},0.12)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  }
  GLOWS.set(rgb, s);
  return s;
}
function glow(c: Ctx, x: number, y: number, r: number, rgb: string, a: number): void {
  c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = a; c.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2); c.restore();
}
function glowRect(c: Ctx, x: number, y: number, w: number, h: number, color: string, a: number): void {
  c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = color;
  c.globalAlpha = a * 0.35; c.fillRect(x - 1, y - 1, w + 2, h + 2);
  c.globalAlpha = a * 0.16; c.fillRect(x - 3, y - 3, w + 6, h + 6);
  c.globalAlpha = a * 0.07; c.fillRect(x - 7, y - 7, w + 14, h + 14);
  c.restore();
}
function neon(c: Ctx, s: string, x: number, y: number, color: string, t: number, seed: number, sc: number): void {
  const on = flick(t, seed);
  if (on) glowRect(c, x, y, (s.length * 4 - 1) * sc, 5 * sc, color, 0.9);
  ptext(c, s, x, y, on ? color : "#1e2a2c", sc);
}
const GREENS = ["#173a26", "#245a32", "#347a3e", "#4f9a48"];
function vines(c: Ctx, x: number, y: number, w: number, maxLen: number, seed: number): void {
  for (let k = 0; k < w; k++) {
    const th = 1 + Math.floor(h1(seed + k * 0.71) * 4);
    for (let j = 0; j < th; j++) R(c, x + k, y - j, 1, 1, GREENS[(k + j) % 4] ?? "#245a32");
    if (h1(seed + k * 5.3) > 0.86) R(c, x + k, y - th, 1, 1, "#8cc06a");
    if (h1(seed + k * 1.37) < 0.42) {
      const len = 2 + Math.floor(h1(seed + k * 2.11) * maxLen);
      for (let j = 0; j < len; j++) {
        R(c, x + k, y + j, 1, 1, GREENS[(j + k) % 3] ?? "#245a32");
        if (j % 3 === 1 && h1(seed + k + j * 3.3) > 0.45) R(c, x + k + (j % 2 === 0 ? 1 : -1), y + j, 1, 1, "#5aa04a");
      }
      if (h1(seed + k * 9.1) > 0.88) R(c, x + k, y + len, 1, 1, "#e86a8a");
    }
  }
}
function plant(c: Ctx, x: number, y: number, w: number, seed: number): void {
  R(c, x, y, w, 2, "#5a3424");
  for (let k = 0; k < w; k++) {
    const hh = 1 + Math.floor(h1(seed + k * 1.9) * 4);
    R(c, x + k, y - hh, 1, hh, GREENS[(k + 1) % 4] ?? "#245a32");
    if (h1(seed + k * 4.1) > 0.6) R(c, x + k, y + 2, 1, 1 + Math.floor(h1(seed + k) * 5), "#245a32");
  }
}
const BULB = ["255,207,107", "255,122,90", "122,255,192", "122,200,255", "255,160,64"];
function bulbs(c: Ctx, x0: number, x1: number, y: number, sag: number, seed: number): void {
  for (let x = x0; x <= x1; x++) {
    const yy = Math.round(y + Math.sin(Math.PI * (x - x0) / (x1 - x0)) * sag);
    R(c, x, yy, 1, 1, "#0e1114");
    if ((x - x0) % 6 === 3) {
      const col = BULB[Math.floor(h1(seed + x) * BULB.length)] ?? "255,207,107";
      R(c, x, yy + 1, 1, 2, `rgb(${col})`); glow(c, x, yy + 2, 6, col, 0.6);
    }
  }
}
const WINC = ["#f0a64e", "#ffd27a", "#e8903a", "#4fb3a0", "#d0606a"];
function bldg(c: Ctx, x0: number, x1: number, top: number, base: string, seed: number, winBottom: number): void {
  const w = x1 - x0;
  R(c, x0, top, w, FEET - top, base); R(c, x0, top, w, 2, "#1b2a36");
  vines(c, x0, top, w, 6, seed * 1.3);
  for (let wy = top + 8, iy = 0; wy < winBottom; wy += 11, iy++) {
    for (let wx = x0 + 6, ix = 0; wx < x1 - 8; wx += 12, ix++) {
      const r = h1(seed + ix * 3.3 + iy * 9.1);
      const lit = r < 0.5;
      const col = lit ? (WINC[Math.floor(r * 10) % WINC.length] ?? "#f0a64e") : "#060a10";
      R(c, wx, wy, 6, 7, col);
      if (lit) { R(c, wx, wy + 5, 6, 2, "rgba(0,0,0,0.3)"); if (h1(r * 99) < 0.35) R(c, wx + 1, wy + 2, 2, 5, "#1a1008"); glowRect(c, wx, wy, 6, 7, col, 0.4); }
      R(c, wx - 1, wy + 7, 8, 1, "#17222c");
      if (h1(seed + ix * 1.7 + iy * 2.3) > 0.68) plant(c, wx - 1, wy + 8, 8, seed + ix * 7 + iy);
    }
  }
}
type Bld = { x: number; w: number; h: number; s: number };
function genLayer(seed: number, span: number, wMin: number, wMax: number, hMin: number, hMax: number): Bld[] {
  const out: Bld[] = []; let x = -10; let i = 0;
  while (x < span) {
    const w = wMin + Math.floor(h1(seed + i * 3.1) * (wMax - wMin));
    out.push({ x, w, h: hMin + Math.floor(h1(seed + i * 7.7) * (hMax - hMin)), s: seed + i * 13.37 });
    x += w + Math.floor(h1(seed + i * 5.3) * 3) - 1; i++;
  }
  return out;
}
function bakeFar(c: Ctx): void {
  for (const bd of genLayer(1, FW, 10, 26, 50, 125)) {
    const top = FEET - 10 - bd.h;
    R(c, bd.x, top, bd.w, bd.h + 10, "#0b1a22");
    if (h1(bd.s + 2) > 0.7) R(c, bd.x + 3, top - 10, 1, 10, "#0b1a22");
    for (let wy = top + 3, iy = 0; wy < FEET - 12; wy += 3, iy++) for (let wx = bd.x + 2, ix = 0; wx < bd.x + bd.w - 1; wx += 3, ix++) {
      const r = h1(bd.s + ix * 5.1 + iy * 11.3);
      if (r < 0.2) R(c, wx, wy, 1, 1, r < 0.12 ? "#b8803e" : "#3f8a80");
    }
  }
  c.save(); c.globalCompositeOperation = "source-atop";
  const g = c.createLinearGradient(0, 30, 0, FEET); g.addColorStop(0, "rgba(30,90,90,0.15)"); g.addColorStop(1, "rgba(50,140,130,0.55)");
  c.fillStyle = g; c.fillRect(0, 0, FW, H); c.restore();
}
function bakeMid(c: Ctx): void {
  for (const bd of genLayer(50, MW, 16, 40, 60, 135)) {
    const top = FEET - bd.h;
    R(c, bd.x, top, bd.w, bd.h, "#08121a"); R(c, bd.x, top, 1, bd.h, "#122230");
    if (h1(bd.s + 1) > 0.6) R(c, bd.x + 3, top - 6, 1, 6, "#122230");
    for (let wy = top + 4, iy = 0; wy < FEET - 6; wy += 5, iy++) for (let wx = bd.x + 2, ix = 0; wx < bd.x + bd.w - 2; wx += 4, ix++) {
      const r = h1(bd.s + ix * 7.1 + iy * 13.3);
      R(c, wx, wy, 2, 2, r < 0.16 ? "#e0973e" : r < 0.24 ? "#ffcc70" : r < 0.3 ? "#3fa496" : r < 0.32 ? "#c05a6a" : "#0c1822");
      if (r < 0.24) glow(c, wx + 1, wy + 1, 3, "255,170,80", 0.25);
    }
    if (h1(bd.s + 4) > 0.55) vines(c, bd.x, top + 10 + Math.floor(h1(bd.s + 5) * 30), bd.w, 4, bd.s);
    if (h1(bd.s + 9) > 0.7) {
      const col = h1(bd.s + 10) > 0.6 ? "#ffb04a" : h1(bd.s + 11) > 0.3 ? "#3df5d0" : "#ff6f9a";
      const hh = Math.min(28, bd.h - 16);
      glowRect(c, bd.x + bd.w - 4, top + 8, 2, hh, col, 0.6); R(c, bd.x + bd.w - 4, top + 8, 2, hh, col);
    }
  }
  c.save(); c.globalCompositeOperation = "source-atop";
  const g = c.createLinearGradient(0, 60, 0, FEET); g.addColorStop(0, "rgba(40,120,110,0)"); g.addColorStop(1, "rgba(50,150,135,0.35)");
  c.fillStyle = g; c.fillRect(0, 0, MW, H); c.restore();
}
function ground(c: Ctx, w: number, base: string): void {
  R(c, 0, FEET, w, 8, base); R(c, 0, FEET, w, 1, "#22323a");
  for (let x = 0; x < w; x += 16) R(c, x, FEET + 1, 1, 7, "#080e13");
  R(c, 0, FEET + 8, w, 1, "#26383e"); R(c, 0, FEET + 9, w, H - FEET - 9, "#060a0e");
  for (let x = 0; x < w; x += 28) R(c, x, 174, 14, 1, "#18262c");
  for (let k = 0; k < w / 6; k++) R(c, h1(k * 7.7) * w, FEET + 1 + Math.floor(h1(k * 3.3) * 18), 2, 1, h1(k * 1.1) > 0.5 ? "#24402c" : "#3a2a1c");
}

const DLAMPS = [124, 470, 800, 1092, 1304];
function bakeApt(c: Ctx): void {
  R(c, 0, 0, 360, FEET, "#15181b");
  for (let x = 0; x < 360; x += 8) R(c, x, 10, 1, FEET - 10, "#191d21");
  R(c, 0, 0, 360, 10, "#0a0b0d"); R(c, 0, 10, 360, 1, "#22282c");
  c.clearRect(190, 30, 100, 90);
  R(c, 186, 26, 108, 4, "#2a2420"); R(c, 184, 120, 112, 5, "#3a2e24"); R(c, 186, 26, 4, 96, "#2a2420"); R(c, 290, 26, 4, 96, "#2a2420");
  R(c, 239, 30, 2, 90, "#2a2420"); R(c, 190, 74, 100, 2, "#2a2420");
  vines(c, 190, 30, 100, 12, 3); plant(c, 194, 118, 22, 4); plant(c, 262, 118, 18, 5);
  R(c, 172, 40, 1, 20, "#1a1a1a"); R(c, 166, 60, 12, 6, "#5a3424");
  for (let k = 0; k < 12; k++) R(c, 166 + k, 66, 1, 4 + Math.floor(h1(k * 3.3) * 18), GREENS[k % 4] ?? "#245a32");
  R(c, 14, 70, 44, 2, "#3a2a1c"); R(c, 14, 92, 44, 2, "#3a2a1c");
  for (let k = 0; k < 10; k++) { R(c, 16 + k * 4, 61 + (k % 3), 3, 9 - (k % 3), ["#6a2a2a", "#2a4a5a", "#5a5a2a", "#3a2a4a"][k % 4] ?? "#444"); R(c, 16 + k * 4, 83 + (k % 2), 3, 9 - (k % 2), ["#2a4a3a", "#6a4a2a", "#3a3a5a"][k % 3] ?? "#444"); }
  R(c, 22, 30, 26, 20, "#0c1012"); R(c, 24, 32, 22, 16, "#2a4a4a"); R(c, 24, 42, 22, 6, "#1a2a2a");
  R(c, 50, 128, 96, 3, "#6a4428"); R(c, 50, 128, 96, 1, "#a87048"); R(c, 54, 131, 3, 29, "#3a2618"); R(c, 140, 131, 3, 29, "#3a2618");
  R(c, 60, 131, 30, 10, "#3a2618"); R(c, 74, 135, 3, 1, "#c8a060");
  R(c, 126, 100, 1, 28, "#2a2a2a"); R(c, 120, 98, 10, 3, "#3a3a3a"); R(c, 122, 126, 8, 2, "#3a3a3a");
  R(c, 132, 106, 28, 20, "#20262a"); R(c, 134, 108, 24, 15, "#061210"); R(c, 144, 126, 4, 2, "#20262a");
  R(c, 312, 66, 36, 94, "#2a1e16"); R(c, 316, 70, 28, 90, "#3a2a1e"); R(c, 338, 112, 3, 3, "#c8a060"); R(c, 322, 76, 16, 12, "#1a120c");
  ptext(c, "EXIT", 322, 58, "#5dff9a", 1); glowRect(c, 322, 58, 15, 5, "#5dff9a", 0.5);
  R(c, 260, 150, 1, 1, "#000");
  for (let row = 0, y = FEET; y < H; y += 3, row++) {
    R(c, 0, y, 360, 3, row % 2 === 0 ? "#2e2014" : "#24180e");
    for (let x = (row % 3) * 9; x < 360; x += 26) R(c, x, y, 1, 3, "#160e08");
  }
  R(c, 0, FEET, 360, 1, "#5a4028");
  R(c, 200, 150, 60, 10, "#1a2228"); R(c, 196, 146, 68, 4, "#2a3640");
}
function bakeDistrict(c: Ctx): void {
  bldg(c, 0, 132, 6, "#0b1219", 11, 100);
  R(c, 28, 116, 28, 44, "#1a140e"); R(c, 30, 118, 24, 42, "#2a1e16"); R(c, 41, 118, 1, 42, "#1a140e"); R(c, 24, 112, 36, 4, "#22303a");
  glow(c, 42, 120, 22, "255,170,90", 0.5);
  ptext(c, "KESSLER ST", 66, 108, "#8fa8b0", 1);
  bldg(c, 132, 272, 18, "#0d141c", 21, 84);
  R(c, 142, 102, 120, 58, "#1c0f0a");
  for (let x = 142; x < 262; x += 6) R(c, x, 102, 1, 58, "#24140c");
  glow(c, 202, 126, 70, "255,160,80", 0.6);
  R(c, 150, 114, 104, 1, "#4a2a18");
  for (let k = 0; k < 9; k++) R(c, 154 + k * 11, 109, 4, 5, k % 3 === 0 ? "#6a8a50" : "#c8a060");
  for (let k = 0; k < 4; k++) { R(c, 154 + k * 26, 118, 18, 9, "#d8c49a"); R(c, 156 + k * 26, 120, 14, 1, "#5a3a20"); R(c, 156 + k * 26, 123, 9, 1, "#5a3a20"); }
  for (let k = 0; k < 17; k++) R(c, 136 + k * 8, 95, 8, 7, k % 2 === 0 ? "#b5532c" : "#e8c88a");
  vines(c, 132, 94, 140, 10, 7); bulbs(c, 142, 262, 104, 4, 9);
  R(c, 180, 82, 42, 11, "#05080c");
  R(c, 272, 30, 108, 130, "#070a10");
  for (let yy = 34, r = 0; yy < FEET; yy += 6, r++) { R(c, 272, yy, 108, 1, "#0b1018"); for (let xx = (r % 2) * 6; xx < 108; xx += 12) R(c, 272 + xx, yy, 1, 6, "#0b1018"); }
  R(c, 340, 56, 14, 12, "#1a1420"); R(c, 341, 57, 12, 10, "#f0a64e"); glow(c, 347, 62, 22, "255,170,90", 0.5);
  vines(c, 272, 30, 108, 26, 31);
  R(c, 300, 146, 22, 14, "#3a2a1e"); R(c, 300, 151, 22, 1, "#2a1c14"); R(c, 310, 146, 1, 14, "#2a1c14");
  R(c, 326, 159, 12, 1, "#24303a");
  bldg(c, 380, 490, 26, "#0c1418", 33, 90);
  R(c, 390, 106, 90, 54, "#0a1416"); R(c, 396, 112, 50, 30, "#0f2a2c");
  for (let k = 0; k < 8; k++) { const col = k % 3 === 0 ? "#ffb04a" : "#3df5d0"; R(c, 398 + (k % 4) * 12, 114 + Math.floor(k / 4) * 13, 9, 7, col); glowRect(c, 398 + (k % 4) * 12, 114 + Math.floor(k / 4) * 13, 9, 7, col, 0.3); }
  R(c, 390, 142, 56, 18, "#1a2628"); R(c, 390, 142, 56, 1, "#3a5058"); R(c, 452, 112, 22, 48, "#081012"); R(c, 452, 112, 22, 1, "#3df5d0");
  for (let k = 0; k < 4; k++) for (let x = 0; x <= 40; x++) R(c, 392 + k * 22 + x, 104 + Math.round(Math.sin(Math.PI * x / 40) * (3 + k)), 1, 1, "#111");
  R(c, 396, 94, 44, 10, "#05080c");
  bldg(c, 490, 600, 0, "#0a1118", 41, 150);
  R(c, 494, 26, 102, 66, "#10161e"); R(c, 520, 92, 3, 68, "#141c26"); R(c, 568, 92, 3, 68, "#141c26");
  bulbs(c, 494, 596, 98, 5, 44);
  R(c, 600, 50, 40, 110, "#090e14"); vines(c, 600, 50, 40, 30, 47);
  bldg(c, 640, 770, 22, "#0d1318", 51, 96);
  R(c, 652, 110, 106, 50, "#2a2e30");
  for (let y = 112; y < 160; y += 3) R(c, 652, y, 106, 1, "#1e2224");
  for (let k = 0; k < 40; k++) R(c, 660 + h1(k * 2.2) * 90, 130 + Math.sin(k * 0.7) * 6, 2, 1, k % 2 ? "#e86a8a" : "#3df5d0");
  R(c, 674, 96, 32, 11, "#05080c");
  bldg(c, 770, 920, 0, "#0a1016", 61, 140);
  R(c, 820, 120, 24, 40, "#0c1012"); plant(c, 780, 156, 20, 63); plant(c, 890, 156, 20, 64);
  bldg(c, 920, 1080, 16, "#0c1418", 71, 92);
  R(c, 936, 104, 128, 56, "#08181a"); R(c, 944, 112, 60, 40, "#0e3436"); R(c, 1016, 108, 30, 52, "#0a2224"); R(c, 1016, 108, 30, 1, "#5ff0d8");
  glow(c, 1000, 130, 60, "80,240,210", 0.35);
  R(c, 956, 92, 40, 10, "#05080c");
  R(c, 1080, 40, 120, 120, "#0a0f0c");
  vines(c, 1080, 40, 120, 40, 81); vines(c, 1080, 80, 120, 30, 82); vines(c, 1080, 118, 120, 14, 83);
  R(c, 1120, 140, 40, 20, "#1f3a34"); R(c, 1118, 138, 44, 3, "#2c4d45");
  bldg(c, 1200, 1310, 30, "#0b1116", 91, 110);
  R(c, 1228, 128, 44, 32, "#06090a");
  for (let k = 0; k < 44; k += 4) R(c, 1228 + k, 128, 2, 32, "#1f5a3a");
  R(c, 1228, 128, 44, 2, "#2f7a4a"); R(c, 1228, 143, 44, 1, "#2f7a4a");
  for (let x = 1310; x < 1396; x += 4) for (let y = 110; y < 160; y += 4) R(c, x + ((y / 4) % 2) * 2, y, 1, 1, "#2a3640");
  R(c, 1310, 108, 86, 2, "#3a4650"); R(c, 1396, 0, 4, 160, "#04060a");
  for (const lx of DLAMPS) { R(c, lx, 112, 1, 48, "#1c242c"); R(c, lx, 112, 6, 1, "#1c242c"); R(c, lx + 4, 113, 3, 1, "#ffe0a0"); }
  ground(c, 1400, "#0c141a");
}
function stall(c: Ctx, x: number, w: number, roof: string, roof2: string, seed: number): void {
  R(c, x, 96, 2, 64, "#2a1a10"); R(c, x + w - 2, 96, 2, 64, "#2a1a10");
  for (let k = 0; k < w; k += 6) R(c, x + k, 90, 6, 6, (k / 6) % 2 === 0 ? roof : roof2);
  for (let k = 0; k < w; k += 3) R(c, x + k, 96, 2, 1, roof);
  R(c, x + 2, 97, w - 4, 39, "#140e0a");
  glow(c, x + w / 2, 116, w * 0.7, "255,160,80", 0.45);
  for (const sy of [108, 120]) {
    R(c, x + 6, sy, w - 12, 1, "#4a3020");
    for (let k = 0; k < (w - 14) / 4; k++) R(c, x + 8 + k * 4, sy - 4, 2, 4, h1(seed + k + sy) > 0.5 ? "#3df5d0" : h1(seed + k) > 0.5 ? "#ffb04a" : "#e86a8a");
  }
  vines(c, x, 90, w, 8, seed);
}
function bakeMarket(c: Ctx): void {
  const w = 900;
  R(c, 0, 0, w, 22, "#07090a"); R(c, 0, 22, w, 3, "#1c2a2c"); R(c, 0, 27, w, 2, "#2a2420");
  for (let x = 4; x < w; x += 20) R(c, x, 23, 1, 1, "#3a4a4c");
  vines(c, 0, 25, w, 20, 91);
  for (const px of [120, 440, 600]) { R(c, px, 25, 10, 135, "#141a1a"); R(c, px, 25, 1, 135, "#22302e"); vines(c, px, 60, 10, 30, px); }
  R(c, 0, 25, 64, 135, "#050607");
  for (let k = 0; k < 11; k++) R(c, 52 - k * 5, 154 - k * 8, 14, 2, "#2a3030");
  glow(c, 20, 50, 40, "80,200,180", 0.35);
  stall(c, 150, 80, "#2a5a4a", "#1a3a30", 11); stall(c, 310, 100, "#5a3a1a", "#3a2410", 22);
  stall(c, 470, 100, "#3a2a5a", "#241a3a", 33); stall(c, 700, 140, "#6a1a22", "#3a0e14", 44);
  for (let k = 0; k < 8; k++) R(c, 706 + k * 16, 98 + (k % 3) * 3, 1, 10, "#2a1a10");
  R(c, 622, 128, 22, 4, "#3a3030"); R(c, 640, 104, 4, 28, "#3a3030"); R(c, 630, 100, 18, 6, "#2a3a3a"); R(c, 626, 132, 3, 28, "#2a2020"); R(c, 638, 132, 3, 28, "#2a2020");
  bulbs(c, 64, 440, 40, 8, 5); bulbs(c, 450, 900, 42, 7, 6);
  R(c, 470, 146, 30, 14, "#3a2a1e"); R(c, 470, 151, 30, 1, "#2a1c14");
  plant(c, 240, 156, 18, 7); plant(c, 580, 156, 16, 8); plant(c, 860, 156, 22, 9);
  for (let row = 0, y = FEET; y < H; y += 4, row++) { R(c, 0, y, w, 4, row % 2 === 0 ? "#0e1110" : "#0b0e0d"); for (let x = (row % 2) * 8; x < w; x += 16) R(c, x, y, 1, 4, "#070908"); }
  R(c, 0, FEET, w, 1, "#2a3a36");
}
function bakeMarketBack(c: Ctx): void {
  R(c, 0, 0, KW, FEET, "#0a0e0d");
  for (let x = 0; x < KW; x += 60) { R(c, x, 30, 50, 130, "#0c1211"); R(c, x + 5, 40, 40, 4, "#101a18"); }
  for (let k = 0; k < 30; k++) {
    const x = h1(k * 3.7) * KW; const y = 60 + h1(k * 1.9) * 70;
    R(c, x, y, 14 + h1(k) * 20, 18, "#101614");
    R(c, x + 3, y + 4, 4, 3, h1(k * 2) > 0.5 ? "#c8803a" : "#3fa496"); glow(c, x + 5, y + 5, 10, "255,160,80", 0.25);
  }
  c.save(); c.globalCompositeOperation = "source-atop";
  const g = c.createLinearGradient(0, 20, 0, FEET); g.addColorStop(0, "rgba(40,110,100,0.1)"); g.addColorStop(1, "rgba(60,150,130,0.35)");
  c.fillStyle = g; c.fillRect(0, 0, KW, H); c.restore();
}

type Look = { coat: string; hair: string; skin: string; accent: string; rim: string; h: number; extra: string };
function drawPerson(c: Ctx, x: number, y: number, L: Look, f: number, ph: number, moving: boolean): void {
  const X = Math.round(x); const Y = Math.round(y);
  const top = Y - L.h + 6;
  const s = moving ? Math.round(Math.sin(ph) * 2) : 0;
  R(c, X - 2 + s, Y - 6, 1, 6, "#05080a"); R(c, X + 1 - s, Y - 6, 1, 6, "#05080a");
  R(c, X - 2 + s, Y - 1, 2, 1, "#020304"); R(c, X + 1 - s, Y - 1, 2, 1, "#020304");
  R(c, X - 3, top, 7, Y - 3 - top, L.coat);
  const bh = Y - 3 - top;
  R(c, f > 0 ? X - 3 : X + 3, top + 1, 1, bh - 1, "rgba(0,0,0,0.35)");
  if (L.rim) { c.globalAlpha = 0.8; R(c, f > 0 ? X + 3 : X - 3, top + 1, 1, bh - 2, L.rim); c.globalAlpha = 1; }
  R(c, X - 3, top - 1, 7, 2, L.accent);
  R(c, X - 2, top - 6, 4, 5, L.skin); R(c, X - 2, top - 7, 4, 2, L.hair);
  R(c, f > 0 ? X - 2 : X + 1, top - 6, 1, 4, L.hair); R(c, f > 0 ? X + 1 : X - 2, top - 4, 1, 1, "#140c10");
  const e = L.extra;
  if (e === "cap") { R(c, X - 3, top - 8, 6, 2, "#1a2a3a"); R(c, f > 0 ? X + 1 : X - 4, top - 7, 3, 1, "#1a2a3a"); R(c, X - 1, top - 8, 1, 1, "#d8c84a"); }
  if (e === "headband") R(c, X - 2, top - 6, 4, 1, "#c23a4e");
  if (e === "glasses") R(c, f > 0 ? X : X - 2, top - 4, 3, 1, "#7ac8ff");
  if (e === "visor") { R(c, f > 0 ? X - 1 : X - 2, top - 5, 4, 1, "#ffb04a"); glowRect(c, f > 0 ? X - 1 : X - 2, top - 5, 4, 1, "#ffb04a", 0.6); R(c, X - 3, top - 7, 1, 3, L.hair); }
  if (e === "basket") { R(c, f > 0 ? X + 3 : X - 6, Y - 10, 4, 3, "#8a5a30"); R(c, f > 0 ? X + 3 : X - 6, Y - 11, 1, 1, "#e86a8a"); R(c, f > 0 ? X + 5 : X - 4, Y - 11, 1, 1, "#ffd36b"); }
  if (e === "bag") R(c, f > 0 ? X - 5 : X + 3, top + 2, 3, 5, "#3a2a1a");
  if (e === "headset") { R(c, X - 3, top - 6, 1, 3, "#7affc0"); glowRect(c, X - 3, top - 6, 1, 3, "#7affc0", 0.5); }
}
function drawElias(c: Ctx, x: number, y: number, f: number, st: string, ph: number, t: number): void {
  const X = Math.round(x); const Y = Math.round(y);
  const coat = "#1c212a"; const hi = "#2e3644"; const boot = "#030304"; const skin = "#d6a88c"; const hair = "#141012";
  const sq = st === "land" ? 1 : 0;
  const bob = st === "idle" && Math.sin(t * 2.2) > 0.6 ? 1 : 0;
  const lean = st === "run" ? f : 0;
  const top = Y - 25 + sq + bob;
  let l1 = 0; let lift1 = 0; let lift2 = 0;
  if (st === "walk") l1 = Math.round(Math.sin(ph) * 2);
  if (st === "run") { l1 = Math.round(Math.sin(ph) * 3); lift1 = Math.max(0, Math.round(Math.cos(ph) * 2)); lift2 = Math.max(0, -Math.round(Math.cos(ph) * 2)); }
  if (st === "jump") { l1 = 1; lift1 = 3; lift2 = 1; }
  R(c, X - 2 + l1, Y - 8, 2, 7 - lift1, "#0c0e12"); R(c, X + 1 - l1, Y - 8, 2, 7 - lift2, "#0c0e12");
  R(c, X - 2 + l1 + (f > 0 ? 0 : -1), Y - 2 - lift1, 3, 2, boot); R(c, X + 1 - l1 + (f > 0 ? 0 : -1), Y - 2 - lift2, 3, 2, boot);
  const tail = st === "run" ? 3 : st === "jump" ? 2 : st === "walk" ? (Math.sin(ph) > 0 ? 1 : 0) : 0;
  R(c, X - 4 + lean, top + 7, 8, Y - 7 - (top + 7) + 1, coat);
  if (tail) R(c, f > 0 ? X - 4 - tail : X + 4, Y - 13 + (st === "jump" ? -2 : 0), tail, 6, coat);
  R(c, f > 0 ? X - 4 + lean : X + 3 + lean, top + 8, 1, Y - top - 16, "rgba(0,0,0,0.4)");
  c.globalAlpha = 0.85; R(c, f > 0 ? X + 3 + lean : X - 4 + lean, top + 8, 1, Y - top - 17, "#ffb860"); c.globalAlpha = 0.5;
  R(c, f > 0 ? X - 4 + lean : X + 3 + lean, top + 9, 1, Y - top - 20, "#5ff0d8"); c.globalAlpha = 1;
  R(c, f > 0 ? X + 1 + lean : X - 2 + lean, top + 7, 1, 4, "#9aa4a8");
  R(c, X - 1 + lean, Y - 13, 3, 1, "#0a0c10");
  const hx = X - 2 + lean + (st === "examine" ? f : 0); const hy = top + (st === "examine" ? 1 : 0);
  R(c, f > 0 ? X - 3 + lean : X + 2 + lean, top + 4, 2, 4, hi);
  R(c, hx, hy, 5, 6, skin); R(c, hx, hy - 1, 5, 2, hair); R(c, f > 0 ? hx : hx + 4, hy, 1, 4, hair);
  R(c, f > 0 ? hx + 3 : hx + 1, hy + 2, 1, 1, "#101018");
  c.globalAlpha = 0.7; R(c, f > 0 ? hx + 4 : hx, hy + 1, 1, 4, "#ffb860"); c.globalAlpha = 1;
  if (st === "interact") { R(c, f > 0 ? X + 3 : X - 8, top + 10, 5, 2, hi); R(c, f > 0 ? X + 8 : X - 9, top + 10, 1, 2, skin); }
  else if (st === "examine") { R(c, f > 0 ? X + 1 : X - 2, top + 8, 2, 4, hi); R(c, f > 0 ? hx + 3 : hx + 1, hy + 5, 2, 2, skin); }
  else { const sw = st === "walk" || st === "run" ? Math.round(Math.sin(ph) * (st === "run" ? 2 : 1)) : 0; R(c, X - 1 + lean + sw, top + 8, 2, 8, hi); R(c, X - 1 + lean + sw, top + 16, 2, 1, skin); }
}
function drawEliasSeated(c: Ctx, x: number, y: number, t: number, photo: boolean): void {
  const X = Math.round(x); const Y = Math.round(y);
  R(c, X - 6, Y - 12, 10, 2, "#3a2a1c"); R(c, X - 6, Y - 24, 2, 12, "#3a2a1c"); R(c, X - 5, Y - 10, 1, 10, "#2a1a10"); R(c, X + 2, Y - 10, 1, 10, "#2a1a10");
  R(c, X - 2, Y - 14, 8, 2, "#0c0e12"); R(c, X + 5, Y - 13, 2, 11, "#0c0e12"); R(c, X + 5, Y - 2, 4, 2, "#030304");
  R(c, X - 4, Y - 26, 8, 13, "#1c212a"); R(c, X - 4, Y - 28, 2, 4, "#2e3644");
  c.globalAlpha = 0.8; R(c, X + 3, Y - 25, 1, 11, "#ffb860"); c.globalAlpha = 1;
  const nod = Math.sin(t * 0.8) > 0.7 ? 1 : 0;
  R(c, X - 1, Y - 33 + nod + 1, 5, 6, "#d6a88c"); R(c, X - 1, Y - 34 + nod + 1, 5, 2, "#141012"); R(c, X - 1, Y - 33 + nod + 1, 1, 4, "#141012");
  R(c, X + 2, Y - 31 + nod + 1, 1, 1, "#101018");
  if (photo) { R(c, X + 3, Y - 21, 6, 2, "#2e3644"); R(c, X + 7, Y - 24, 4, 5, "#e8e0c8"); R(c, X + 8, Y - 23, 2, 2, "#8a6a5a"); glow(c, X + 9, Y - 22, 8, "255,230,190", 0.4); }
}

type Cat = "Memory chips" | "Photographs" | "Audio recordings" | "Documents" | "Access cards" | "Clues";
const CATS: Cat[] = ["Memory chips", "Photographs", "Audio recordings", "Documents", "Access cards", "Clues"];
type Item = { name: string; cat: Cat; desc: string; ev: boolean };
const ITEMS: Record<string, Item> = {
  photo: { name: "Old photograph", cat: "Photographs", ev: true, desc: "Mara and Elias on the pier, years ago. Her smile is the only warm thing in the frame. On the back: don't forget me." },
  badge: { name: "Expired precinct badge", cat: "Access cards", ev: false, desc: "ELIAS VOSS, INVESTIGATIONS. Revoked. The chip inside still talks to cheap doors." },
  kane: { name: "Kane's warning", cat: "Clues", ev: true, desc: "Det. Kane: Leave Mara buried, Elias. Some files are closed for a reason." },
  termclue: { name: "Recovered message", cat: "Clues", ev: true, desc: "A deleted fragment: memory market under Kessler Street. Ask for NOVA. Tell no one." },
  flyer: { name: "Wet flyer", cat: "Documents", ev: false, desc: "REMEMBER BETTER. Real feelings, cheap. Someone drew a little green grate in the corner." },
  tape: { name: "Street recording", cat: "Audio recordings", ev: true, desc: "Pulled off a patrol drone. A woman humming, and a man: Vale wants the M batch moved before the rain stops." },
  lullaby: { name: "Lullaby chip", cat: "Memory chips", ev: false, desc: "Someone's childhood: a kitchen, a song, a window full of sun. Who sells sunlight?" },
  chip: { name: "Unmarked memory chip", cat: "Memory chips", ev: true, desc: "Black casing, no label. A tiny ring with a rising sun is etched on the edge." },
};
const OBJ = ["Leave Elias's apartment", "Travel through the Lower District", "Find the underground memory market", "Speak to NOVA", "Investigate the mysterious memory chip"];
const MISSIONS = ["001 · GHOSTS IN THE RAIN", "002 · THE FORGOTTEN ONES", "003 · A CITY WITHOUT SUNLIGHT", "004 · AFTER RAIN"];

type Kind = "SPEAK" | "ENTER" | "ACCESS" | "EXAMINE" | "COLLECT";
type Line = { who: string; text: string; choices?: Choice[]; act?: () => void };
type Choice = { label: string; next: () => Line[] };
type Dlg = { lines: Line[]; i: number; chars: number; waiting: boolean; done: (() => void) | null; push: boolean; acted: number };
type Npc = { id: string; name: string; loc: LocId; x: number; y: number; x0: number; x1: number; dir: number; speed: number; wait: number; look: Look; met: boolean; bubble: string; bubbleT: number; react: string[] };
type Spot = { id: string; loc: LocId; x: number; y: number; kind: Kind; label: string; show: () => boolean; use: () => void };
type Target = { id: string; x: number; y: number; kind: Kind; label: string; use: () => void };
type Panel = "none" | "pause" | "bag" | "journal" | "settings" | "credits";
type Scene = "menu" | "cut" | "play" | "glitch" | "end";
type Drop = { x: number; y: number; v: number; l: number; g: number };
type Car = { x: number; y: number; speed: number; dir: number; layer: number };
type Chat = { a: Npc; b: Npc; l: string[]; t: number };
type Game = {
  scene: Scene; t: number; sceneT: number; loc: LocId;
  px: number; py: number; vx: number; vy: number; grounded: boolean; facing: number; walk: number; stepPh: number; landT: number; actT: number; actKind: string;
  cam: number; zoom: number; view: { sx: number; sy: number; z: number };
  fade: number; fadeTo: number; fadeCb: (() => void) | null;
  dlg: Dlg | null; flags: Record<string, number>; items: string[]; credits: number; obj: number; m2: boolean; notes: string[];
  left: boolean; right: boolean; jumpQ: boolean; actQ: boolean; run: boolean;
  panel: Panel; rev: number; near: string; toast: { text: string; t: number } | null; banner: { a: string; b: string; t: number } | null;
  npcs: Npc[]; chat: Chat | null; chatCd: number; drops: Drop[]; cars: Car[]; flash: number;
  music: number; sfx: number; textSpeed: number; saveNote: string; bagTab: string; openItem: string; ringing: boolean;
};

const LK: Record<string, Look> = {
  ines: { coat: "#5a3a5a", hair: "#d8d8e0", skin: "#b08a70", accent: "#e86a8a", rim: "#ffb04a", h: 18, extra: "basket" },
  dex: { coat: "#c8621f", hair: "#ff8a3d", skin: "#c09a80", accent: "#3df5d0", rim: "#5ff0d8", h: 20, extra: "bag" },
  bram: { coat: "#2a3a4a", hair: "#202830", skin: "#c8a088", accent: "#d8c84a", rim: "#7ac8ff", h: 23, extra: "cap" },
  lulu: { coat: "#e8c84a", hair: "#e86a8a", skin: "#d8a88c", accent: "#3a5a8a", rim: "#ffd36b", h: 15, extra: "" },
  hiro: { coat: "#e8e0d0", hair: "#202020", skin: "#c8a080", accent: "#c23a4e", rim: "#ffb04a", h: 21, extra: "headband" },
  pix: { coat: "#2a4a4a", hair: "#7ac8ff", skin: "#d0a890", accent: "#ffd36b", rim: "#3df5d0", h: 20, extra: "glasses" },
  oyelo: { coat: "#6a2a5a", hair: "#101010", skin: "#8a5a40", accent: "#ffb04a", rim: "#ffb04a", h: 22, extra: "" },
  tam: { coat: "#3a4a3a", hair: "#606060", skin: "#b88a70", accent: "#a0a060", rim: "#ffb04a", h: 20, extra: "" },
  rook: { coat: "#2a2a3a", hair: "#8a6aaa", skin: "#a8a0b0", accent: "#7affc0", rim: "#7affc0", h: 21, extra: "headset" },
  nova: { coat: "#e0e4e4", hair: "#5ff0d8", skin: "#c89a8a", accent: "#ffb04a", rim: "#ff6f9a", h: 21, extra: "visor" },
  ped: { coat: "#04080a", hair: "#04080a", skin: "#0c1416", accent: "#04080a", rim: "", h: 19, extra: "" },
};
function mkNpc(id: string, name: string, loc: LocId, x: number, y: number, x0: number, x1: number, speed: number, react: string[]): Npc {
  return { id, name, loc, x, y, x0, x1, dir: 1, speed, wait: 0, look: LK[id] ?? LK.ped ?? { coat: "#000", hair: "#000", skin: "#000", accent: "#000", rim: "", h: 19, extra: "" }, met: false, bubble: "", bubbleT: 0, react };
}
function makeNpcs(): Npc[] {
  return [
    mkNpc("ines", "Ines", "district", 300, FEET, 160, 720, 8, ["Mind the puddles. They remember faces.", "You look like a man chasing a ghost.", "Rain's softer tonight. Something is coming."]),
    mkNpc("dex", "Dex", "district", 700, FEET, 300, 1150, 22, ["Can't stop. Got a package that hums.", "AURELION vans everywhere tonight. Everywhere.", "You didn't see me. I didn't see you."]),
    mkNpc("bram", "Officer Bram", "district", 1000, FEET, 600, 1290, 10, ["Curfew's a suggestion down here.", "Kane's asking about you. I said nothing. Mostly.", "Synthetics or not, everybody gets wet."]),
    mkNpc("lulu", "Lulu", "district", 200, FEET, 100, 900, 26, ["Nice coat. I'll steal it later.", "Saw your face on an old poster once. Or a ghost of you.", "Hiro gives me the burnt noodles. Best ones."]),
    mkNpc("hiro", "Hiro", "district", 202, 146, 202, 202, 0, []),
    mkNpc("pix", "Pix", "district", 430, FEET, 430, 430, 0, []),
    mkNpc("oyelo", "Oyelo", "market", 360, 146, 360, 360, 0, []),
    mkNpc("tam", "Tam", "market", 520, 146, 520, 520, 0, ["Mm. On break. Forever.", "Recall stall. Your past, slightly used.", "Don't buy the cheap ones. They itch."]),
    mkNpc("rook", "Rook", "market", 300, FEET, 90, 860, 9, ["Last night I was a pilot. Tonight I'm a kid at the sea.", "Do you ever forget whose hands these are?", "Nova's chips are the real ones. Too real."]),
    mkNpc("nova", "NOVA", "market", 770, 146, 770, 770, 0, []),
  ];
}
function makeDrops(): Drop[] { const d: Drop[] = []; for (let i = 0; i < 150; i++) d.push({ x: Math.random() * 380, y: Math.random() * H, v: 160 + Math.random() * 120, l: 3 + Math.floor(Math.random() * 4), g: FEET + Math.random() * 20 }); return d; }
function makeCars(): Car[] { const o: Car[] = []; for (let i = 0; i < 5; i++) o.push({ x: h1(i * 6.1) * 600, y: 22 + Math.floor(h1(i * 2.9) * 50), speed: 25 + h1(i * 1.3) * 35, dir: i % 2 === 0 ? 1 : -1, layer: i < 2 ? 0.25 : 0.5 }); return o; }
function newGame(): Game {
  return {
    scene: "menu", t: 0, sceneT: 0, loc: "apt", px: 104, py: FEET, vx: 0, vy: 0, grounded: true, facing: 1, walk: 0, stepPh: 0, landT: 0, actT: 0, actKind: "interact",
    cam: 0, zoom: 1, view: { sx: 0, sy: 0, z: 1 }, fade: 0, fadeTo: 0, fadeCb: null,
    dlg: null, flags: {}, items: [], credits: 20, obj: 0, m2: false, notes: [],
    left: false, right: false, jumpQ: false, actQ: false, run: false,
    panel: "none", rev: 1, near: "", toast: null, banner: null,
    npcs: makeNpcs(), chat: null, chatCd: 6, drops: makeDrops(), cars: makeCars(), flash: 0,
    music: 0.6, sfx: 0.7, textSpeed: 1, saveNote: "", bagTab: "items", openItem: "", ringing: false,
  };
}
const G: Game = newGame();

// ---------- audio ----------
type Snd = { ctx: AudioContext; music: GainNode; sfx: GainNode; pads: Record<string, GainNode>; rain: GainNode; rainF: BiquadFilterNode; noise: AudioBuffer };
let SND: Snd | null = null;
let MOOD = "";
const CHORDS: Record<string, number[]> = { menu: [110, 130.8, 164.8], apt: [98, 116.5, 146.8], district: [110, 138.6, 164.8, 207.7], market: [92.5, 110, 138.6, 185], glitch: [103.8, 110, 155.6] };
function audioInit(): void {
  if (SND) { if (SND.ctx.state === "suspended") void SND.ctx.resume(); return; }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = new AC();
    const music = ctx.createGain(); music.gain.value = G.music * 0.5; music.connect(ctx.destination);
    const sfx = ctx.createGain(); sfx.gain.value = G.sfx; sfx.connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const rs = ctx.createBufferSource(); rs.buffer = noise; rs.loop = true;
    const rainF = ctx.createBiquadFilter(); rainF.type = "bandpass"; rainF.frequency.value = 2200; rainF.Q.value = 0.35;
    const rain = ctx.createGain(); rain.gain.value = 0;
    rs.connect(rainF); rainF.connect(rain); rain.connect(sfx); rs.start();
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = 2; lp.connect(music);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05; const lg = ctx.createGain(); lg.gain.value = 350; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    const drone = ctx.createOscillator(); drone.type = "sine"; drone.frequency.value = 41.2;
    const dg = ctx.createGain(); dg.gain.value = 0.3; drone.connect(dg); dg.connect(music); drone.start();
    const dl = ctx.createOscillator(); dl.frequency.value = 0.13; const dlg = ctx.createGain(); dlg.gain.value = 0.12; dl.connect(dlg); dlg.connect(dg.gain); dl.start();
    const pads: Record<string, GainNode> = {};
    for (const k of Object.keys(CHORDS)) {
      const pg = ctx.createGain(); pg.gain.value = 0; pg.connect(lp);
      for (const f of CHORDS[k] ?? []) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = (h1(f) - 0.5) * 14; const og = ctx.createGain(); og.gain.value = 0.05; o.connect(og); og.connect(pg); o.start(); }
      pads[k] = pg;
    }
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
    void ctx.resume();
    SND = { ctx, music, sfx, pads, rain, rainF, noise };
    const m = MOOD || "menu"; MOOD = ""; setMood(m);
  } catch { SND = null; }
}
function applyVol(): void { if (SND) { SND.music.gain.setTargetAtTime(G.music * 0.5, SND.ctx.currentTime, 0.05); SND.sfx.gain.setTargetAtTime(G.sfx, SND.ctx.currentTime, 0.05); } }
function setMood(m: string): void {
  if (m === MOOD) return; MOOD = m;
  if (!SND) return;
  const now = SND.ctx.currentTime;
  for (const k of Object.keys(SND.pads)) { const p = SND.pads[k]; if (p) p.gain.setTargetAtTime(k === m ? 1 : 0, now, 0.9); }
  const rv = m === "district" ? 0.35 : m === "menu" ? 0.3 : m === "apt" ? 0.12 : m === "market" ? 0.04 : 0;
  SND.rain.gain.setTargetAtTime(rv, now, 0.6);
  SND.rainF.frequency.setTargetAtTime(m === "apt" ? 900 : 2200, now, 0.5);
}
function tone(f: number, dur: number, type: OscillatorType, vol: number, at: number, slide: number): void {
  if (!SND) return;
  const c = SND.ctx; const t0 = c.currentTime + at;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.linearRampToValueAtTime(slide, t0 + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(SND.sfx); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noiseHit(dur: number, freq: number, vol: number): void {
  if (!SND) return;
  const c = SND.ctx; const t0 = c.currentTime;
  const s = c.createBufferSource(); s.buffer = SND.noise; const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(SND.sfx); s.start(t0, Math.random()); s.stop(t0 + dur + 0.02);
}
function siren(): void {
  if (!SND) return;
  const c = SND.ctx; const t0 = c.currentTime;
  const o = c.createOscillator(); o.type = "triangle";
  for (let k = 0; k < 6; k++) { o.frequency.setValueAtTime(620, t0 + k * 0.7); o.frequency.linearRampToValueAtTime(880, t0 + k * 0.7 + 0.35); o.frequency.linearRampToValueAtTime(620, t0 + k * 0.7 + 0.7); }
  const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1100;
  const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.035, t0 + 1.5); g.gain.linearRampToValueAtTime(0, t0 + 4.2);
  o.connect(f); f.connect(g); g.connect(SND.sfx); o.start(t0); o.stop(t0 + 4.3);
}
function blip(): void { tone(880, 0.06, "square", 0.04, 0, 0); }
function chime(): void { tone(660, 0.25, "sine", 0.08, 0, 0); tone(990, 0.4, "sine", 0.07, 0.12, 0); }
function ring(): void { for (let k = 0; k < 2; k++) for (let j = 0; j < 8; j++) { tone(440, 0.05, "square", 0.04, k * 1.6 + j * 0.1, 0); tone(480, 0.05, "square", 0.04, k * 1.6 + j * 0.1, 0); } }
function step(): void { noiseHit(0.07, G.loc === "apt" ? 500 : 900, 0.12); }

// ---------- save ----------
const SAVE_KEY = "after-rain-save-v1";
let MEM_SAVE: string | null = null;
type SaveData = { loc: LocId; px: number; flags: Record<string, number>; items: string[]; credits: number; obj: number; m2: boolean; notes: string[]; music: number; sfx: number; textSpeed: number };
function saveGame(): void {
  const d: SaveData = { loc: G.loc, px: G.px, flags: G.flags, items: G.items, credits: G.credits, obj: G.obj, m2: G.m2, notes: G.notes, music: G.music, sfx: G.sfx, textSpeed: G.textSpeed };
  const s = JSON.stringify(d); MEM_SAVE = s;
  try { localStorage.setItem(SAVE_KEY, s); G.saveNote = "Game saved."; } catch { G.saveNote = "Saved for this session only (this view blocks storage)."; }
  blip(); G.rev++;
}
function readSave(): string | null { try { const s = localStorage.getItem(SAVE_KEY); if (s) return s; } catch { /* storage blocked */ } return MEM_SAVE; }
function loadGame(): void {
  const s = readSave(); if (!s) return;
  try {
    const d = JSON.parse(s) as SaveData;
    const keep = { music: d.music, sfx: d.sfx, textSpeed: d.textSpeed };
    Object.assign(G, newGame(), keep);
    G.flags = d.flags; G.items = d.items; G.credits = d.credits; G.obj = d.obj; G.m2 = d.m2; G.notes = d.notes;
    G.scene = "play"; G.loc = d.loc; G.px = d.px; G.cam = clamp(d.px - W / 2, 0, LOCW[d.loc] - W); G.fade = 1;
    G.saveNote = "Game loaded."; setMood(d.loc); applyVol(); G.rev++;
  } catch { G.saveNote = "That save could not be read."; G.rev++; }
}

// ---------- story helpers ----------
function has(id: string): boolean { return G.items.includes(id); }
function toast(s: string): void { G.toast = { text: s, t: 0 }; G.rev++; }
function give(id: string): void {
  if (has(id)) return;
  G.items.push(id); const it = ITEMS[id];
  if (it) { toast("+ " + it.name + (it.ev ? "  (evidence)" : "")); if (it.ev) G.notes.push(it.name + ": " + it.desc); }
  chime();
}
function pay(n: number): boolean { if (G.credits < n) return false; G.credits -= n; tone(1200, 0.08, "square", 0.04, 0, 1600); G.rev++; return true; }
function complete(n: number): void { if (G.obj === n) { G.obj = n + 1; toast("✓ " + (OBJ[n] ?? "")); chime(); } }
function say(lines: Line[], done: (() => void) | null, push: boolean): void {
  if (lines.length === 0) return;
  G.dlg = { lines: lines.slice(), i: 0, chars: 0, waiting: false, done, push, acted: -1 }; G.rev++;
}
function go(loc: LocId, x: number): void {
  G.fadeTo = 1; G.left = false; G.right = false;
  G.fadeCb = () => {
    G.loc = loc; G.px = x; G.py = FEET; G.vx = 0; G.vy = 0; G.facing = x > LOCW[loc] / 2 ? -1 : 1;
    G.cam = clamp(x - W / 2, 0, LOCW[loc] - W); setMood(loc);
    if (loc === "district") complete(0);
    if (loc === "market") { if (G.obj === 1) complete(1); complete(2); }
    G.rev++;
  };
  noiseHit(0.3, 300, 0.15);
}
function pickR(a: string[]): string { return a[Math.floor(Math.random() * a.length)] ?? "..."; }
function E(text: string): Line { return { who: "ELIAS", text }; }

function termHub(): Line[] {
  return [{
    who: "TERMINAL", text: G.flags.termIn ? "Inbox: 3 messages." : "VOSS-HOME terminal. Inbox: 3 messages, 1 corrupted.", act: () => { G.flags.termIn = 1; },
    choices: [
      { label: "1 · Landlord", next: () => [{ who: "TERMINAL", text: "FROM KESSLER HOLDINGS: Rent is 41 days overdue. Water rationing on floors 6 to 12 continues." }, ...termHub()] },
      { label: "2 · Det. Kane", next: () => [{ who: "TERMINAL", text: "FROM DET. KANE: Leave Mara buried, Elias. For your own sake. Some files are closed for a reason." }, { who: "ELIAS", text: "Kane never writes. Kane calls. Unless he wants a record of warning me.", act: () => give("kane") }, ...termHub()] },
      { label: "3 · [corrupted]", next: () => [{ who: "TERMINAL", text: "RECOVERING... memory market under Kessler Street... ask for NOVA... tell no one..." }, { who: "ELIAS", text: "Someone wanted me to find this. And someone tried hard to erase it.", act: () => { give("termclue"); G.flags.knowNova = 1; } }, ...termHub()] },
      { label: "Log off", next: () => [{ who: "TERMINAL", text: "Session closed." }] },
    ],
  }];
}
function playTape(): void {
  say([{ who: "", text: "[Static. Rain. A woman humming an old song, slightly out of tune.]" }, { who: "", text: "MAN'S VOICE: Vale wants the M batch moved before the rain stops. No witnesses this time." }, { who: "", text: "[The humming stops. The recording ends.]" }, E("M batch. M for Mara?")], null, false);
}
function novaHub(): Line[] {
  const f = G.flags; const opts: Choice[] = [];
  if (has("photo") && !f.askMara) opts.push({ label: "Show her the photograph of Mara", next: () => { f.askMara = 1; return [E("Have you seen this woman?"), { who: "NOVA", text: "...I know this face. Not from the street. From a chip that came through here two weeks ago." }, E("Mara died six years ago."), { who: "NOVA", text: "Then somebody is very busy remembering her." }, ...novaHub()]; } });
  if (has("tape") && !f.askVale && opts.length < 2) opts.push({ label: "Who is Vale?", next: () => { f.askVale = 1; return [E("Who is Vale?"), { who: "NOVA", text: "Don't say that name down here. Dr. Vale writes the memories AURELION installs in synthetics. The sweet ones. And the other ones." }, ...novaHub()]; } });
  if (has("kane") && !f.askKane && opts.length < 2) opts.push({ label: "Kane warned me off.", next: () => { f.askKane = 1; return [E("Detective Kane told me to leave this alone."), { who: "NOVA", text: "Kane was down here last week asking about the same chip. He didn't buy. He didn't have to. He had a warrant and a smile." }, ...novaHub()]; } });
  opts.push({ label: "About the chip.", next: () => novaDeal() });
  const first = !f.hub; f.hub = 1;
  return [{ who: "NOVA", text: first ? "So. Everyone who comes down here is looking for someone. Who's yours?" : "What else, detective?", choices: opts }];
}
function giveChip(): void { give("chip"); complete(3); G.notes.push("NOVA gave up the chip. Investigate it at the memory reader, or from the BAG."); }
function novaDeal(): Line[] {
  const tone_ = G.flags.novaTone ?? 0;
  const price = tone_ > 0 ? 0 : tone_ < 0 ? 45 : 25;
  if (price === 0) return [{ who: "NOVA", text: "Take it. I don't charge for ghosts.", act: giveChip }, E("Why help me?"), { who: "NOVA", text: "Because you said sorry. Nobody says sorry down here. Read it at my reader, by the pillar." }];
  const ch: Choice[] = [];
  if (G.credits >= price) ch.push({ label: `Pay ${price} credits`, next: () => { pay(price); return [{ who: "NOVA", text: tone_ < 0 ? "Pleasure doing business. Don't come back angry." : "Fair trade. The reader's by the pillar.", act: giveChip }]; } });
  ch.push({ label: "Trade her a real memory", next: () => [E("The pier. Mara laughing. The day before she was gone."), { who: "NOVA", text: tone_ < 0 ? "...Huh. You do have a heart under that coat. Take the chip." : "That's a good one. Keep it. I'll take the copy. Here.", act: () => { G.flags.traded = 1; giveChip(); } }] });
  ch.push({ label: "Not yet.", next: () => [{ who: "NOVA", text: "It'll be here. Probably." }] });
  return [{ who: "NOVA", text: `The chip is ${price} credits. ${tone_ < 0 ? "That's the rude-customer rate." : "Friends and family rate. You're neither."}`, choices: ch }];
}
const TALK: Record<string, (n: Npc) => Line[]> = {
  nova: () => {
    const f = G.flags;
    if (has("chip")) return [{ who: "NOVA", text: f.novaTone === 1 ? "Go easy with that chip, Elias. Memories bite." : f.novaTone === -1 ? "We're done, detective. Shop's closed for you." : "Read it somewhere quiet. Or don't. Your call." }];
    if (!f.metNova) return [
      { who: "NOVA", text: "You're dripping on my merchandise, detective.", act: () => { f.metNova = 1; } },
      { who: "ELIAS", text: "(She knows what I was. Careful.)", choices: [
        { label: "Sorry. Rough night.", next: () => { f.novaTone = 1; return [E("Sorry. Rough night."), { who: "NOVA", text: "Every night is rough down here. At least you said sorry." }, ...novaHub()]; } },
        { label: "I'm not here to shop.", next: () => { f.novaTone = 0; return [E("I'm not here to shop."), { who: "NOVA", text: "Everybody shops. Some just don't know it yet." }, ...novaHub()]; } },
        { label: "Spare me. I know what you sell.", next: () => { f.novaTone = -1; return [E("Spare me. I know what you sell."), { who: "NOVA", text: "Then you know I can sell it to someone else. Careful, detective." }, ...novaHub()]; } },
      ] },
    ];
    return [{ who: "NOVA", text: f.novaTone === -1 ? "You again." : "Back already?" }, ...novaHub()];
  },
  hiro: (n: Npc) => [{
    who: "HIRO", text: n.met ? "Back for more? This broth has been going since before the blackout." : "Hiro's Bowl never closes. Rain makes the broth better. What'll it be?",
    choices: [
      { label: "Noodles (6 credits)", next: () => pay(6) ? [{ who: "HIRO", text: "Extra scallion. On me.", act: () => { G.flags.ate = 1; } }, E("Warm. First good thing all week.")] : [{ who: "HIRO", text: "Six credits, detective. Not five. Not a sad story." }] },
      { label: "Heard of a memory market?", next: () => [{ who: "HIRO", text: "Never heard of it. ...Fine. Ask Ines, with the flowers. She sells to the people downstairs." }] },
      { label: "Just passing.", next: () => [{ who: "HIRO", text: "Everybody's just passing. Come back hungry." }] },
    ],
  }],
  pix: () => {
    const ch: Choice[] = [];
    if (!has("tape")) ch.push({ label: "Street recording (15 credits)", next: () => pay(15) ? [{ who: "PIX", text: "Scraped it off a downed patrol drone. Weird stuff. Enjoy.", act: () => give("tape") }] : [{ who: "PIX", text: "Fifteen. I fix things, I don't do charity." }] });
    ch.push({ label: "What is AURELION?", next: () => [{ who: "PIX", text: "Memory company. They sell the pasts synthetics wake up with. Birthday parties, first kisses, sunlight. The good stuff costs extra." }] });
    ch.push({ label: "Never mind.", next: () => [{ who: "PIX", text: "That's what everyone says before they come back." }] });
    return [{ who: "PIX", text: "Pix Repair. I fix anything except people.", choices: ch }];
  },
  oyelo: () => {
    const ch: Choice[] = [];
    if (!has("lullaby")) ch.push({ label: "Lullaby chip (10 credits)", next: () => pay(10) ? [{ who: "OYELO", text: "A childhood! Barely used. Sun included.", act: () => give("lullaby") }] : [{ who: "OYELO", text: "Ten credits, friend. Memories aren't free. Well, mine aren't." }] });
    ch.push({ label: "Where can I find Nova?", next: () => [{ who: "OYELO", text: "Back stall, under the red lantern. Be polite. She remembers rudeness longer than birthdays." }] });
    ch.push({ label: "Just looking.", next: () => [{ who: "OYELO", text: "Looking is free. Remembering costs." }] });
    return [{ who: "OYELO", text: "Memories! Fresh, warm, barely used!", choices: ch }];
  },
  lulu: (n: Npc) => {
    if (n.met) return [{ who: "LULU", text: pickR(n.react) }];
    return [{ who: "LULU", text: "Spare five credits, coat man? I know secrets.", choices: [
      { label: "Give her 5 credits", next: () => pay(5) ? [{ who: "LULU", text: "Pleasure! Secret: the green grate past the clinic isn't for drains. Music comes out of it.", act: () => { G.flags.knowGrate = 1; } }] : [{ who: "LULU", text: "You're broker than me. Respect." }] },
      { label: "Not tonight.", next: () => [{ who: "LULU", text: "Your loss. Secrets go up in price after midnight." }] },
    ] }];
  },
  ines: (n: Npc) => {
    if (!G.flags.market && G.obj >= 1) return [{ who: "INES", text: n.met ? "The green grate, love. East, past the clinic." : "Flowers, detective? Real petals. Well, mostly real." }, { who: "INES", text: "Looking for the market below? The green grate, east, past the clinic. Hum something sad and they'll let you in.", act: () => { G.flags.knowGrate = 1; } }];
    return [{ who: "INES", text: n.met ? pickR(n.react) : "Flowers, detective? Real petals. Well, mostly real." }];
  },
  dex: (n: Npc) => [{ who: "DEX", text: n.met ? pickR(n.react) : "Don't look at the cameras. They count your blinks. I'm serious." }],
  bram: (n: Npc) => [{ who: "BRAM", text: n.met ? pickR(n.react) : "Voss. Kane told me to keep an eye on you. Consider yourself eyed. Go home." }],
  tam: (n: Npc) => [{ who: "TAM", text: pickR(n.react) }],
  rook: (n: Npc) => [{ who: "ROOK", text: n.met ? pickR(n.react) : "Want to know who I was this morning? Me neither." }],
};
const CHATS = [["Third siren tonight.", "City's restless."], ["You hear about the AURELION vans?", "Heard nothing. Saw nothing."], ["Rain's warm today.", "Rain is never warm."], ["Got a light?", "Got a curfew."], ["Nova's back in business.", "Nova never left."]];

const SPOTS: Spot[] = [
  { id: "drawer", loc: "apt", x: 72, y: 118, kind: "EXAMINE", label: "Desk drawer", show: () => !has("badge"), use: () => say([E("My old badge. Revoked, but the chip inside still talks to cheap doors.")], () => give("badge"), false) },
  { id: "photo", loc: "apt", x: 98, y: 112, kind: "EXAMINE", label: "Old photograph", show: () => !G.flags.photoSeen, use: () => say([E("Mara. The pier, the summer before the blackout. She made me promise to keep this."), E("Six years. And now a stranger says her name like it's nothing.")], () => { G.flags.photoSeen = 1; G.rev++; }, true) },
  { id: "photo2", loc: "apt", x: 98, y: 112, kind: "COLLECT", label: "Old photograph", show: () => !!G.flags.photoSeen && !has("photo"), use: () => give("photo") },
  { id: "term", loc: "apt", x: 146, y: 96, kind: "ACCESS", label: "", show: () => true, use: () => say(termHub(), null, false) },
  { id: "window", loc: "apt", x: 240, y: 92, kind: "EXAMINE", label: "Window", show: () => true, use: () => say([E("Rain on the glass. Down there a billboard sells sunlight to people who have never seen it.")], null, false) },
  { id: "door", loc: "apt", x: 334, y: 100, kind: "ENTER", label: "Street", show: () => true, use: () => go("district", 46) },
  { id: "home", loc: "district", x: 42, y: 106, kind: "ENTER", label: "Apartment", show: () => true, use: () => go("apt", 326) },
  { id: "ad", loc: "district", x: 545, y: 92, kind: "EXAMINE", label: "Holo-ad", show: () => true, use: () => say([{ who: "", text: "AURELION. YOUR PAST, PERFECTED. A smiling family that has never existed waves at the rain." }, E("They sell childhoods by the gigabyte. Mara used to laugh at these ads.")], null, false) },
  { id: "cr1", loc: "district", x: 612, y: 146, kind: "COLLECT", label: "Credit chip", show: () => !G.flags.cr1, use: () => { G.flags.cr1 = 1; G.credits += 15; toast("+15 credits"); chime(); } },
  { id: "pawn", loc: "district", x: 705, y: 102, kind: "EXAMINE", label: "Lucky 9 shutter", show: () => true, use: () => say([E("Lucky 9 Pawn. Closed. A sticker on the shutter: precinct seal, signed KANE.")], null, false) },
  { id: "flyer", loc: "district", x: 868, y: 146, kind: "COLLECT", label: "Wet flyer", show: () => !has("flyer"), use: () => say([E("A soaked flyer. REMEMBER BETTER. Real feelings, cheap. Someone drew a green grate in the corner.")], () => { give("flyer"); G.flags.knowGrate = 1; }, false) },
  { id: "clinic", loc: "district", x: 1030, y: 100, kind: "EXAMINE", label: "Clinic 24", show: () => true, use: () => say([E(has("badge") ? "Synthetics treated, no questions asked. My badge blinks red at the precinct lock. Not tonight." : "Synthetics treated, no questions asked. Sealed with a precinct lock.")], null, false) },
  { id: "grate", loc: "district", x: 1250, y: 120, kind: "EXAMINE", label: "Green grate", show: () => !G.flags.market, use: () => say([E(G.flags.knowGrate ? "The green grate. Warm air and a melody drift up. This is it." : "A rusted grate, painted green. Warm air and a faint melody drift up through it."), { who: "", text: "The latch is only a twist of wire. Behind it, stairs lead down into amber light." }], () => { G.flags.market = 1; complete(1); G.rev++; }, false) },
  { id: "stairs", loc: "district", x: 1250, y: 120, kind: "ENTER", label: "Stairs down", show: () => !!G.flags.market, use: () => go("market", 52) },
  { id: "up", loc: "market", x: 34, y: 104, kind: "ENTER", label: "Stairs up", show: () => true, use: () => go("district", 1236) },
  { id: "cr2", loc: "market", x: 262, y: 146, kind: "COLLECT", label: "Credit chip", show: () => !G.flags.cr2, use: () => { G.flags.cr2 = 1; G.credits += 10; toast("+10 credits"); chime(); } },
  { id: "reader", loc: "market", x: 636, y: 100, kind: "ACCESS", label: "Memory reader", show: () => has("chip"), use: () => { if (G.obj === 4) startGlitch(); else say([E("The reader hums. I've seen enough for one night.")], null, false); } },
];
const PLATS: Record<LocId, { x0: number; x1: number; y: number }[]> = {
  apt: [{ x0: 198, x1: 262, y: 146 }], district: [{ x0: 300, x1: 322, y: 146 }, { x0: 1118, x1: 1162, y: 138 }], market: [{ x0: 470, x1: 500, y: 146 }],
};

function targets(): Target[] {
  const out: Target[] = [];
  for (const s of SPOTS) if (s.loc === G.loc && s.show()) out.push({ id: s.id, x: s.x, y: s.y, kind: s.kind, label: s.label, use: s.use });
  for (const n of G.npcs) if (n.loc === G.loc) out.push({ id: n.id, x: n.x, y: n.y - n.look.h - 14, kind: "SPEAK", label: n.name, use: () => talkNpc(n) });
  return out;
}
function nearest(): Target | null {
  let best: Target | null = null; let bd = 16;
  for (const t of targets()) { const d = Math.abs(t.x - G.px); if (d < bd) { bd = d; best = t; } }
  return best;
}
function talkNpc(n: Npc): void {
  if (G.chat && (G.chat.a === n || G.chat.b === n)) G.chat = null;
  n.wait = 4; n.dir = G.px > n.x ? 1 : -1;
  const f = TALK[n.id]; if (!f) return;
  const lines = f(n); n.met = true;
  say(lines, null, n.id === "nova");
}
function startGlitch(): void {
  G.scene = "glitch"; G.sceneT = 0; G.dlg = null; setMood("glitch"); G.rev++;
  for (let k = 0; k < 6; k++) setTimeout(() => noiseHit(0.25, 3000, 0.2), k * 400 + Math.random() * 300);
}
function endGlitch(): void {
  G.scene = "end"; G.sceneT = 0; complete(4); G.m2 = true; setMood("market");
  G.banner = { a: "MISSION 002: THE FORGOTTEN ONES", b: "unlocked", t: 0 }; G.notes.push("The chip showed AURELION labs, Dr. Vale, and Mara in the rain. Mission 002 unlocked."); chime(); G.rev++;
}
const CALL: Line[] = [
  { who: "UNKNOWN CALLER", text: "We found something." },
  { who: "ELIAS", text: "Who is this?" },
  { who: "UNKNOWN CALLER", text: "Her name is Mara." },
  { who: "ELIAS", text: "Don't say that name." },
  { who: "UNKNOWN CALLER", text: "She's alive." },
  { who: "", text: "[The call disconnects.]", act: () => { tone(480, 0.6, "sine", 0.05, 0, 0); G.ringing = false; } },
];
function endCut(): void {
  G.scene = "play"; G.dlg = null; G.loc = "apt"; G.px = 104; G.facing = 1; G.cam = 0; G.zoom = 1; G.ringing = false; G.fade = 1; G.flags.called = 1;
  G.banner = { a: "MISSION 001", b: "GHOSTS IN THE RAIN", t: 0 }; setMood("apt"); chime(); G.rev++;
}
function newGameStart(): void {
  const keep = { music: G.music, sfx: G.sfx, textSpeed: G.textSpeed };
  Object.assign(G, newGame(), keep);
  G.scene = "cut"; G.sceneT = 0; setMood("menu"); siren(); G.rev++;
}
function toMenu(): void { G.scene = "menu"; G.panel = "none"; G.dlg = null; G.fade = 1; setMood("menu"); G.rev++; }

// ---------- update ----------
const SPEEDS = [22, 45, 110];
function dlgTick(dt: number): void {
  const d = G.dlg; if (!d) return;
  const line = d.lines[d.i];
  if (!line) { G.dlg = null; G.rev++; return; }
  if (d.acted !== d.i) { d.acted = d.i; if (line.act) line.act(); }
  const before = Math.floor(d.chars);
  d.chars = Math.min(line.text.length, d.chars + dt * (SPEEDS[G.textSpeed] ?? 45));
  if (Math.floor(d.chars) !== before && Math.floor(d.chars) % 3 === 0 && line.text.charAt(Math.floor(d.chars)) !== " ") tone(line.who === "ELIAS" ? 180 : 320, 0.03, "square", 0.012, 0, 0);
  if (line.choices && d.chars >= line.text.length && !d.waiting) { d.waiting = true; G.rev++; }
  if ((G.actQ || G.jumpQ) && !d.waiting) {
    if (d.chars < line.text.length) d.chars = line.text.length;
    else { d.i++; d.chars = 0; blip(); if (d.i >= d.lines.length) { const cb = d.done; G.dlg = null; G.rev++; if (cb) cb(); } }
  }
  G.actQ = false; G.jumpQ = false;
}
function choose(i: number): void {
  const d = G.dlg; if (!d) return;
  const line = d.lines[d.i]; if (!line || !line.choices) return;
  const ch = line.choices[i]; if (!ch) return;
  blip();
  d.lines = [...d.lines.slice(0, d.i + 1), ...ch.next(), ...d.lines.slice(d.i + 1)];
  d.i++; d.chars = 0; d.waiting = false; G.rev++;
  if (d.i >= d.lines.length) { const cb = d.done; G.dlg = null; if (cb) cb(); }
}
function update(dt: number): void {
  const g = G;
  if (g.panel !== "none") return;
  g.t += dt; g.sceneT += dt;
  if (g.fadeTo > 0) { g.fade = Math.min(1, g.fade + dt * 3); if (g.fade >= 1) { const cb = g.fadeCb; g.fadeCb = null; g.fadeTo = 0; if (cb) cb(); } }
  else g.fade = Math.max(0, g.fade - dt * 2);
  for (const d of g.drops) {
    d.y += d.v * dt; d.x -= d.v * 0.22 * dt;
    if (d.y > d.g) { d.y = -Math.random() * 30; d.x = Math.random() * (W + 60); d.g = FEET + Math.random() * 20; }
  }
  for (const c of g.cars) c.x += c.speed * c.dir * dt;
  if (Math.random() < dt * 0.03) g.flash = 1;
  g.flash = Math.max(0, g.flash - dt * 2.5);
  if (g.toast) { g.toast.t += dt; if (g.toast.t > 3) { g.toast = null; g.rev++; } }
  if (g.banner) { g.banner.t += dt; if (g.banner.t > 4.5) g.banner = null; }
  if ((g.scene === "menu" || (g.scene === "play" && g.loc === "district")) && Math.random() < dt / 28) siren();
  if (g.scene === "menu") { g.jumpQ = false; g.actQ = false; return; }
  if (g.scene === "cut") {
    const T = g.sceneT;
    g.zoom = T > 8.5 && T < 13 ? 1.3 - clamp((T - 8.5) / 4, 0, 1) * 0.3 : g.dlg ? 1.12 : 1;
    if (T > 13 && !g.ringing && !g.flags.rang) { g.ringing = true; g.flags.rang = 1; ring(); }
    if (T > 15.5 && !g.dlg && !g.flags.called) { g.flags.called = 1; say(CALL, endCut, true); }
    if (g.dlg) { dlgTick(dt); return; }
    if (g.actQ && T < 12.5) { g.sceneT = 12.6; }
    g.actQ = false; g.jumpQ = false; return;
  }
  if (g.scene === "glitch") {
    if (g.sceneT > 12.5 || (g.actQ && g.sceneT > 1.5)) endGlitch();
    g.actQ = false; g.jumpQ = false; return;
  }
  // npcs
  for (const n of g.npcs) {
    if (n.bubbleT > 0) n.bubbleT -= dt;
    if (n.speed === 0 || n.loc !== g.loc) continue;
    if (n.wait > 0) { n.wait -= dt; continue; }
    n.x += n.dir * n.speed * dt;
    if (n.x > n.x1) { n.x = n.x1; n.dir = -1; n.wait = 1 + Math.random() * 2; }
    if (n.x < n.x0) { n.x = n.x0; n.dir = 1; n.wait = 1 + Math.random() * 2; }
    if (Math.random() < dt * 0.06) n.wait = 1 + Math.random() * 3;
  }
  if (g.chat) {
    const c = g.chat; c.t += dt;
    if (c.t < 3) { c.a.bubble = c.l[0] ?? ""; c.a.bubbleT = 0.1; } else if (c.t < 6) { c.b.bubble = c.l[1] ?? ""; c.b.bubbleT = 0.1; } else { g.chat = null; g.chatCd = 12; }
  } else {
    g.chatCd -= dt;
    if (g.chatCd <= 0) {
      const w = g.npcs.filter((n: Npc) => n.loc === g.loc && n.speed > 0);
      for (let i = 0; i < w.length && !g.chat; i++) for (let j = i + 1; j < w.length; j++) {
        const a = w[i]; const b = w[j];
        if (a && b && Math.abs(a.x - b.x) < 18) { a.wait = 6.5; b.wait = 6.5; a.dir = b.x > a.x ? 1 : -1; b.dir = -a.dir; g.chat = { a, b, l: CHATS[Math.floor(Math.random() * CHATS.length)] ?? ["...", "..."], t: 0 }; break; }
      }
      if (!g.chat) g.chatCd = 1;
    }
  }
  g.zoom += ((g.dlg && g.dlg.push ? 1.14 : 1) - g.zoom) * Math.min(1, dt * 2.5);
  const LW = LOCW[g.loc];
  g.cam += (clamp(g.px - W / 2, 0, LW - W) - g.cam) * Math.min(1, dt * 5);
  if (g.scene === "end") { g.actQ = false; g.jumpQ = false; return; }
  if (g.dlg) { dlgTick(dt); g.vx = 0; return; }
  if (g.fadeTo > 0) { g.actQ = false; g.jumpQ = false; return; }
  const dir = (g.right ? 1 : 0) - (g.left ? 1 : 0);
  const tv = dir * (g.run ? 104 : 56);
  const acc = g.grounded ? (dir !== 0 ? 420 : 560) : 260;
  g.vx = g.vx < tv ? Math.min(tv, g.vx + acc * dt) : Math.max(tv, g.vx - acc * dt);
  if (dir !== 0) g.facing = dir;
  if (g.jumpQ && g.grounded) { g.vy = -178; g.grounded = false; tone(220, 0.1, "triangle", 0.04, 0, 330); }
  g.jumpQ = false;
  const wasAir = !g.grounded;
  g.vy += 560 * dt;
  const prevY = g.py;
  g.px = clamp(g.px + g.vx * dt, 8, LW - 8);
  g.py += g.vy * dt; g.grounded = false;
  if (g.py >= FEET) { g.py = FEET; g.vy = 0; g.grounded = true; }
  else if (g.vy > 0) for (const p of PLATS[g.loc]) if (g.px >= p.x0 && g.px <= p.x1 && prevY <= p.y + 0.01 && g.py >= p.y) { g.py = p.y; g.vy = 0; g.grounded = true; }
  if (wasAir && g.grounded) { g.landT = 0.14; step(); }
  if (g.grounded && Math.abs(g.vx) > 8) {
    g.walk += dt * (Math.abs(g.vx) / 56) * 9;
    const sp = Math.floor(g.walk / Math.PI); if (sp !== g.stepPh) { g.stepPh = sp; step(); }
  }
  g.landT = Math.max(0, g.landT - dt); g.actT = Math.max(0, g.actT - dt);
  if (g.loc === "district" && g.obj === 1 && g.px > 1000) complete(1);
  const n = nearest(); const nid = n ? n.id : "";
  if (nid !== g.near) { g.near = nid; g.rev++; }
  if (g.actQ) {
    g.actQ = false;
    if (n) { g.actT = 0.4; g.actKind = n.kind === "EXAMINE" ? "examine" : "interact"; g.facing = n.x >= g.px ? 1 : -1; blip(); n.use(); }
    else { g.actT = 0.6; g.actKind = "examine"; toast("Nothing to use here."); }
  }
}

// ---------- render ----------
type Caches = { far: HTMLCanvasElement; mid: HTMLCanvasElement; apt: HTMLCanvasElement; dist: HTMLCanvasElement; mkt: HTMLCanvasElement; mktB: HTMLCanvasElement };
function city(b: Ctx, cc: Caches, farX: number, midX: number, t: number, camC: number): void {
  const sky = b.createLinearGradient(0, 0, 0, FEET);
  sky.addColorStop(0, "#02060a"); sky.addColorStop(0.5, "#082026"); sky.addColorStop(1, "#164a46");
  b.fillStyle = sky; b.fillRect(0, 0, W, FEET + 1);
  if (G.flash > 0) { b.globalAlpha = G.flash * 0.3; R(b, 0, 0, W, FEET, "#c8f0e8"); b.globalAlpha = 1; }
  glow(b, W * 0.7, 28, 40, "120,220,200", 0.35);
  for (let k = 0; k < 4; k++) { b.globalAlpha = 0.4; R(b, ((k * 97 + t * 3) % (W + 120)) - 60, 18 + k * 11, 70 + k * 10, 3, "#03090c"); b.globalAlpha = 1; }
  b.drawImage(cc.far, Math.round(farX), 0, W, H, 0, 0, W, H);
  for (const c of G.cars) {
    const span = W + 60; const raw = c.x - camC * c.layer;
    const sx = Math.round((((raw % span) + span) % span) - 30);
    const y = c.y + Math.round(Math.sin(t * 2 + c.x * 0.01) * 0.6);
    R(b, sx, y, 12, 2, "#1a2830"); R(b, sx + 3, y - 2, 6, 2, "#14202a"); R(b, sx + 4, y - 2, 4, 1, "#ffd08a");
    b.globalAlpha = 0.7; R(b, sx + 1, y + 2, 10, 1, "#3df5d0"); b.globalAlpha = 1;
    const fx = c.dir > 0 ? sx + 12 : sx - 1; const bx = c.dir > 0 ? sx - 1 : sx + 12;
    R(b, fx, y, 1, 1, "#fff6d0"); R(b, bx, y, 1, 1, "#ff5a5a");
    glow(b, fx, y, 7, "255,246,208", 0.7); glow(b, bx, y, 5, "255,80,80", 0.7);
  }
  b.drawImage(cc.mid, Math.round(midX), 0, W, H, 0, 0, W, H);
  const fog = b.createLinearGradient(0, 70, 0, FEET); fog.addColorStop(0, "rgba(60,160,140,0)"); fog.addColorStop(1, "rgba(60,160,140,0.3)");
  b.fillStyle = fog; b.fillRect(0, 70, W, FEET - 70);
}
function rain(b: Ctx, a: number): void {
  b.fillStyle = `rgba(180,230,220,${0.4 * a})`;
  for (const d of G.drops) for (let k = 0; k < d.l; k++) b.fillRect(Math.round(d.x - 30 + k * 0.22), Math.round(d.y - k), 1, 1);
}
function reflect(b: Ctx, rc: Ctx, buf: HTMLCanvasElement, rbuf: HTMLCanvasElement, a: number, puddles: number[], cam: number): void {
  rc.clearRect(0, 0, W, H); rc.drawImage(buf, 0, 0);
  b.save(); b.beginPath(); b.rect(0, FEET + 1, W, H - FEET); b.clip();
  b.globalAlpha = a; b.setTransform(1, 0, 0, -0.25, 0, FEET * 1.25); b.drawImage(rbuf, 0, 0); b.restore();
  for (const px of puddles) {
    const sx = Math.round(px - cam); const w = 26 + (px % 3) * 8;
    if (sx > W || sx + w < 0) continue;
    const py = px % 2 === 0 ? FEET + 2 : FEET + 11;
    b.save(); b.beginPath(); b.rect(sx + 4, py, w - 8, 1); b.rect(sx, py + 1, w, 3); b.rect(sx + 3, py + 4, w - 6, 1); b.clip();
    R(b, sx, py, w, 5, "#02060a");
    b.globalAlpha = 0.85; b.setTransform(1, 0, 0, -0.25, Math.round(Math.sin(G.t * 1.7 + px) * 0.6), FEET * 1.25); b.drawImage(rbuf, 0, 0); b.restore();
    const ph = (G.t * 1.6 + px * 0.013) % 1; const rr = Math.round(ph * 4);
    b.globalAlpha = 0.4 * (1 - ph); R(b, sx + w / 2 - rr, py + 2, rr * 2 + 1, 1, "#c8f0e8"); b.globalAlpha = 1;
  }
}
function eliasState(): string {
  const g = G;
  if (!g.grounded) return "jump";
  if (g.landT > 0) return "land";
  if (g.actT > 0) return g.actKind;
  const v = Math.abs(g.vx);
  return v > 70 ? "run" : v > 5 ? "walk" : "idle";
}
function drawNpcs(b: Ctx, cam: number): void {
  for (const n of G.npcs) {
    if (n.loc !== G.loc) continue;
    const sx = n.x - cam; if (sx < -20 || sx > W + 20) continue;
    const moving = n.speed > 0 && n.wait <= 0;
    const f = n.speed === 0 ? (G.px > n.x ? 1 : -1) : n.dir;
    drawPerson(b, sx, n.y, n.look, f, G.t * n.speed * 0.4, moving);
  }
}
function drawApt(b: Ctx, cc: Caches, cam: number, seated: boolean): void {
  const t = G.t;
  const wx = 190 - cam;
  b.save(); b.beginPath(); b.rect(wx, 30, 100, 90); b.clip();
  const sky = b.createLinearGradient(0, 30, 0, 120); sky.addColorStop(0, "#03080c"); sky.addColorStop(1, "#1a4a46");
  b.fillStyle = sky; b.fillRect(wx, 30, 100, 90);
  b.drawImage(cc.far, 60 + t * 1.5 % 200, 40, 160, 130, wx, 30, 100, 82);
  b.drawImage(cc.mid, 300, 60, 140, 110, wx, 52, 100, 78);
  for (const c of G.cars) { const x = wx + ((c.x * 0.3 % 120) + 120) % 120 - 10; R(b, x, 40 + c.y * 0.4, 5, 1, "#ffd08a"); glow(b, x, 40 + c.y * 0.4, 4, "255,210,140", 0.6); }
  b.fillStyle = "rgba(180,230,220,0.35)";
  for (let k = 0; k < 40; k++) { const x = wx + h1(k * 1.3) * 100; const y = 30 + ((h1(k * 2.1) * 90 + t * (40 + h1(k) * 30)) % 90); b.fillRect(Math.round(x), Math.round(y), 1, 3); }
  b.fillStyle = "rgba(200,240,235,0.25)";
  for (let k = 0; k < 10; k++) { const x = wx + h1(k * 7.7) * 98; const y = 30 + ((t * (4 + k) + k * 13) % 90); b.fillRect(Math.round(x), Math.round(y), 1, 2); }
  b.restore();
  b.drawImage(cc.apt, cam, 0, W, H, 0, 0, W, H);
  b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.06; b.fillStyle = "#5ff0d8";
  b.beginPath(); b.moveTo(wx, 30); b.lineTo(wx + 100, 30); b.lineTo(wx + 150, FEET + 10); b.lineTo(wx - 20, FEET + 10); b.closePath(); b.fill(); b.restore();
  glow(b, 125 - cam, 102, 40, "255,180,100", 0.6);
  R(b, 121 - cam, 100, 9, 2, "#ffe0a0");
  const sx = 134 - cam;
  for (let k = 0; k < 5; k++) if (h1(k + Math.floor(t * 2)) > 0.25) R(b, sx + 2, 110 + k * 3, 6 + Math.floor(h1(k * 3 + Math.floor(t)) * 14), 1, "#5dff9a");
  glowRect(b, sx, 108, 24, 15, "#5dff9a", 0.25);
  if (!has("photo") && !seated) { R(b, 94 - cam, 126, 7, 2, "#e8e0c8"); if (Math.sin(t * 3) > 0.6) glow(b, 97 - cam, 126, 5, "255,240,200", 0.5); }
  const ringOn = G.ringing && Math.sin(t * 20) > 0;
  R(b, 106 - cam, 125, 6, 3, "#1a1a1e"); R(b, 107 - cam, 125, 2, 1, ringOn ? "#ff5a5a" : "#3a1a1a");
  if (ringOn) glow(b, 108 - cam, 125, 10, "255,80,80", 0.7);
  if (seated) drawEliasSeated(b, 92 - cam, FEET, t, true);
}
function drawDistrictDyn(b: Ctx, cam: number): void {
  const t = G.t; const S = (x: number): number => Math.round(x - cam);
  neon(b, "HIRO BOWL", S(183), 85, "#ff8a6a", t, 3, 1);
  neon(b, "PIX REPAIR", S(399), 96, "#5ff0d8", t, 5, 1);
  neon(b, "LUCKY 9", S(677), 99, "#ffb04a", t, 7, 1);
  neon(b, "CLINIC 24", S(959), 94, "#5ff0d8", t, 9, 1);
  const cx = S(1040); const on = flick(t, 21);
  if (on) { R(b, cx - 1, 76, 3, 9, "#5ff0d8"); R(b, cx - 4, 79, 9, 3, "#5ff0d8"); glow(b, cx, 80, 14, "95,240,216", 0.7); }
  const bx = S(496);
  if (bx > -110 && bx < W + 10) {
    R(b, bx, 28, 98, 62, "#03141a");
    for (let xx = 0; xx < 98; xx++) R(b, bx + xx, Math.round(76 + Math.sin(xx * 0.09 + t * 2) * 6), 1, 1, "#1fb8a8");
    const cxr = bx + 49; const cyr = 46;
    for (let a = 0; a < 40; a++) R(b, cxr + Math.cos(a / 40 * Math.PI * 2) * 9, cyr + Math.sin(a / 40 * Math.PI * 2) * 9, 1, 1, "#ffd27a");
    for (let k = 0; k < 7; k++) R(b, cxr - k, cyr + 4 - k, k * 2 + 1, 1, "#ffb04a");
    const msgs = ["AURELION", "REMEMBER BETTER", "PAST PERFECTED"];
    const m = msgs[Math.floor(t / 3) % 3] ?? "";
    const gl = h1(Math.floor(t * 8)) > 0.9;
    ptext(b, m, bx + 49 - (m.length * 4 - 1) / 2 + (gl ? 2 : 0), 62, gl ? "#5ff0d8" : "#ffe0b0", 1);
    for (let yy = 28; yy < 90; yy += 2) R(b, bx, yy, 98, 1, "rgba(0,0,0,0.25)");
    glowRect(b, bx, 28, 98, 62, "#2ef2d0", 0.3); glow(b, bx + 49, 130, 80, "60,220,190", 0.18);
  }
  for (const vx of [332, 846]) for (let i = 0; i < 8; i++) {
    const p = (t * 12 + i * 6) % 50; b.globalAlpha = 0.22 * (1 - p / 50);
    R(b, S(vx) + Math.round(Math.sin(t + i) * 3), FEET - p, 4, 3, "#a8d0c8"); b.globalAlpha = 1;
  }
  if (G.flags.market) { R(b, S(1228), 128, 44, 32, "#020304"); for (let k = 0; k < 6; k++) R(b, S(1232 + k * 2), 134 + k * 4, 36 - k * 4, 1, "#3a3020"); glow(b, S(1250), 156, 20, "255,170,90", 0.5); }
  if (!G.flags.cr1) { R(b, S(610), 156, 4, 2, "#ffd36b"); glow(b, S(612), 157, 6 + Math.sin(t * 4) * 2, "255,210,110", 0.7); }
  if (!has("flyer")) { R(b, S(864), 157, 8, 3, "#d8d0c0"); R(b, S(866), 158, 3, 1, "#2f7a4a"); }
  DLAMPS.forEach((lx: number, i: number) => {
    const sx = S(lx); if (sx < -50 || sx > W + 50) return;
    const on2 = i === 2 ? flick(t, 99) : true;
    if (!on2) { R(b, sx + 4, 113, 3, 1, "#3a3020"); return; }
    glow(b, sx + 5, 114, 38, "255,190,110", 0.6);
    b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.08; b.fillStyle = "#ffd8a0";
    b.beginPath(); b.moveTo(sx + 4, 114); b.lineTo(sx + 18, FEET); b.lineTo(sx - 10, FEET); b.closePath(); b.fill(); b.restore();
  });
}
function drawDistrictFront(b: Ctx, cam: number): void {
  const S = (x: number): number => Math.round(x - cam);
  R(b, S(146), 136, 112, 2, "#8a5a36"); R(b, S(146), 136, 112, 1, "#e0a868"); R(b, S(148), 138, 108, 22, "#2a1810");
  for (let k = 0; k < 5; k++) R(b, S(158 + k * 24), 142, 1, 18, "#1e100c");
  for (let k = 0; k < 4; k++) { const ph = (G.t * 8 + k * 7) % 24; b.globalAlpha = 0.3 * (1 - ph / 24); R(b, S(190 + k * 5), 132 - ph, 2, 2, "#e8e0d0"); b.globalAlpha = 1; }
  for (const lx of [150, 254]) { const ly = 105 + Math.round(Math.sin(G.t * 1.5 + lx)); R(b, S(lx) - 2, ly, 5, 7, "#ff5a3a"); glow(b, S(lx), ly + 3, 18, "255,110,60", 0.7); }
}
function drawMarketDyn(b: Ctx, cam: number): void {
  const t = G.t; const S = (x: number): number => Math.round(x - cam);
  neon(b, "TEA", S(178), 80, "#ffb04a", t, 2, 2);
  neon(b, "CHIPS", S(341), 80, "#5ff0d8", t, 4, 2);
  neon(b, "RECALL", S(497), 80, "#ff6f9a", t, 6, 2);
  neon(b, "NOVA", S(755), 78, "#ff5a5a", t, 8, 2);
  const ly = 64 + Math.round(Math.sin(t * 1.2) * 1);
  R(b, S(800), 40, 1, ly - 40, "#1a1008"); R(b, S(796), ly, 9, 12, "#d8322a"); R(b, S(796), ly + 4, 9, 1, "#8a1a14"); glow(b, S(800), ly + 6, 40, "255,80,60", 0.6);
  for (const lx of [190, 360, 520]) glow(b, S(lx), 100, 26, "255,170,90", 0.45);
  for (let k = 0; k < 8; k++) { const on = Math.sin(t * 3 + k) > 0.3; R(b, S(706 + k * 16), 108 + (k % 3) * 3, 2, 3, on ? "#7affc0" : "#1a3a30"); if (on) glow(b, S(707 + k * 16), 110 + (k % 3) * 3, 5, "122,255,192", 0.5); }
  const rOn = has("chip") && G.obj === 4;
  R(b, S(632), 102, 14, 2, rOn && Math.sin(t * 6) > 0 ? "#5dff9a" : "#1a3a2a"); if (rOn) glow(b, S(639), 103, 16, "93,255,154", 0.6);
  for (let k = 0; k < 6; k++) { const x = 90 + k * 140 + (k % 2) * 30; const y = 30 + ((t * 60 + k * 37) % 130); R(b, S(x), y, 1, 2, "rgba(180,230,220,0.6)"); }
  if (!G.flags.cr2) { R(b, S(260), 156, 4, 2, "#ffd36b"); glow(b, S(262), 157, 6 + Math.sin(t * 4) * 2, "255,210,110", 0.7); }
  for (let k = 0; k < 4; k++) { const x = ((k * 260 - cam * 0.8 + t * 5) % (W + 160) + W + 160) % (W + 160) - 80; glow(b, x, 120 + k * 8, 60, "70,170,150", 0.1); }
}
function drawMarketFront(b: Ctx, cam: number): void {
  const S = (x: number): number => Math.round(x - cam);
  for (const [x, w] of [[154, 72], [314, 92], [474, 92], [706, 128]] as [number, number][]) {
    R(b, S(x), 136, w, 2, "#a87a46"); R(b, S(x), 136, w, 1, "#ffd090"); R(b, S(x) + 2, 138, w - 4, 22, "#3a2414");
    for (let k = 0; k < w; k += 16) R(b, S(x) + k + 4, 141, 1, 19, "#24160c");
  }
}
function render(b: Ctx, rc: Ctx, buf: HTMLCanvasElement, rbuf: HTMLCanvasElement, cc: Caches): void {
  const g = G; const t = g.t;
  if (g.scene === "menu") { const c = t * 22; city(b, cc, tri(c * 0.15, FW - W - 2), tri(c * 0.45, MW - W - 2), t, c); rain(b, 1); return; }
  if (g.scene === "glitch") { renderGlitch(b, g.sceneT); return; }
  if (g.scene === "cut" && g.sceneT < 8.5) {
    if (g.sceneT < 3) { R(b, 0, 0, W, H, "#000"); rain(b, 0.5); return; }
    const c = (g.sceneT - 3) * 18; city(b, cc, c * 0.15 + 40, c * 0.45 + 120, t, c); rain(b, 1);
    const fadeA = clamp((4 - g.sceneT), 0, 1) + clamp((g.sceneT - 7.6) / 0.9, 0, 1);
    if (fadeA > 0) { b.globalAlpha = fadeA; R(b, 0, 0, W, H, "#000"); b.globalAlpha = 1; }
    return;
  }
  const cam = Math.round(g.cam);
  const seated = g.scene === "cut";
  if (g.loc === "apt") {
    drawApt(b, cc, cam, seated);
    drawNpcs(b, cam);
    if (!seated) drawElias(b, g.px - cam, g.py, g.facing, eliasState(), g.walk, t);
    reflect(b, rc, buf, rbuf, 0.1, [], cam);
    if (seated && g.sceneT < 9.4) { b.globalAlpha = clamp(1 - (g.sceneT - 8.5) / 0.9, 0, 1); R(b, 0, 0, W, H, "#000"); b.globalAlpha = 1; }
  } else if (g.loc === "district") {
    city(b, cc, cam * 0.15, cam * 0.45, t, cam);
    b.drawImage(cc.dist, cam, 0, W, H, 0, 0, W, H);
    drawDistrictDyn(b, cam);
    drawNpcs(b, cam);
    drawDistrictFront(b, cam);
    for (let k = 0; k < 5; k++) { const x = ((k * 130 - cam * 0.8 + t * (4 + k)) % (W + 160) + W + 160) % (W + 160) - 80; glow(b, x, 130 + (k % 3) * 10, 60, "70,170,150", 0.1); }
    glow(b, g.px - cam, g.py - 12, 18, "255,190,120", 0.16);
    drawElias(b, g.px - cam, g.py, g.facing, eliasState(), g.walk, t);
    reflect(b, rc, buf, rbuf, 0.26, [96, 334, 520, 700, 874, 1010, 1180], cam);
    const lf = b.createLinearGradient(0, FEET - 30, 0, H); lf.addColorStop(0, "rgba(70,170,150,0)"); lf.addColorStop(1, "rgba(70,170,150,0.16)");
    b.fillStyle = lf; b.fillRect(0, FEET - 30, W, H - FEET + 30);
    rain(b, 1);
  } else {
    const bg = b.createLinearGradient(0, 0, 0, FEET); bg.addColorStop(0, "#050807"); bg.addColorStop(1, "#14302a");
    b.fillStyle = bg; b.fillRect(0, 0, W, H);
    b.drawImage(cc.mktB, Math.round(cam * 0.6), 0, W, H, 0, 0, W, H);
    b.drawImage(cc.mkt, cam, 0, W, H, 0, 0, W, H);
    drawMarketDyn(b, cam);
    drawNpcs(b, cam);
    drawMarketFront(b, cam);
    glow(b, g.px - cam, g.py - 12, 18, "255,190,120", 0.18);
    drawElias(b, g.px - cam, g.py, g.facing, eliasState(), g.walk, t);
    reflect(b, rc, buf, rbuf, 0.2, [210, 420, 660], cam);
  }
  const vg = b.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.65);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,4,10,0.6)");
  b.fillStyle = vg; b.fillRect(0, 0, W, H);
}
function renderGlitch(b: Ctx, T: number): void {
  R(b, 0, 0, W, H, "#020304");
  const cx = W / 2;
  if (T < 1.5 || T > 10) {
    for (let k = 0; k < 300; k++) { b.globalAlpha = Math.random(); R(b, Math.random() * W, Math.random() * H, 1 + Math.random() * 8, 1, Math.random() > 0.5 ? "#5ff0d8" : "#e8e8e8"); }
    b.globalAlpha = 1;
  } else if (T < 4.5) {
    for (let k = 0; k < 8; k++) { const s = 1 - k * 0.11; R(b, cx - 120 * s, 90 - 70 * s, 240 * s, 1, "#2a3a3a"); R(b, cx - 6 * s * 4, 20 + k * 4, 12 * s * 4, 2, "#e8fff8"); glow(b, cx, 22 + k * 4, 20 * s, "220,255,250", 0.3); }
    R(b, cx - 160, 140, 320, 40, "#0c1416");
    R(b, cx - 8, 112, 16, 3, "#3a4a4a"); R(b, cx - 3, 96, 6, 16, "#d8dcd8"); R(b, cx - 2, 90, 4, 5, "#c8a088"); R(b, cx - 8, 115, 2, 25, "#2a3a3a"); R(b, cx + 6, 115, 2, 25, "#2a3a3a");
    R(b, cx - 6, 86, 12, 2, "#5ff0d8"); glowRect(b, cx - 6, 86, 12, 2, "#5ff0d8", 0.8);
    for (let a = 0; a < 60; a++) R(b, cx + Math.cos(a / 60 * Math.PI * 2) * 14, 40 + Math.sin(a / 60 * Math.PI * 2) * 14, 1, 1, "#ffd27a");
    for (let k = 0; k < 10; k++) R(b, cx - k, 46 - k, k * 2 + 1, 1, "#ffb04a");
    ptext(b, "AURELION", cx - 31 + (h1(Math.floor(T * 10)) > 0.8 ? 3 : 0), 60, "#ffe0b0", 2);
  } else if (T < 7.2) {
    for (let k = 0; k < 7; k++) { const x = 30 + k * ((W - 60) / 6); R(b, x - 6, 70, 12, 60, "#0a2a28"); R(b, x - 4, 74, 8, 52, "#0e3a36"); R(b, x - 1, 90, 2, 20, "#2a5a50"); glow(b, x, 100, 16, "80,240,210", 0.25); }
    R(b, cx - 5, 80, 10, 60, "#d8dcd8"); R(b, cx - 3, 70, 6, 9, "#c09a88"); R(b, cx - 3, 69, 6, 2, "#3a3a3a"); R(b, cx - 2, 73, 4, 1, "#7ac8ff"); glowRect(b, cx - 2, 73, 4, 1, "#7ac8ff", 0.8);
    R(b, cx - 5, 140, 4, 10, "#2a2a2a"); R(b, cx + 1, 140, 4, 10, "#2a2a2a");
    glow(b, cx, 60, 80, "220,255,250", 0.2);
  } else {
    const sky = b.createLinearGradient(0, 0, 0, 130); sky.addColorStop(0, "#02060a"); sky.addColorStop(1, "#1a3a40"); b.fillStyle = sky; b.fillRect(0, 0, W, 130);
    R(b, 0, 130, W, 50, "#041216"); R(b, 0, 128, W, 3, "#2e2018");
    for (let k = 0; k < 20; k++) { b.globalAlpha = 0.4; R(b, h1(k) * W, 134 + (k % 8) * 5, 8, 1, "#ffb860"); } b.globalAlpha = 1;
    R(b, cx - 3, 104, 6, 24, "#3a2a3a"); R(b, cx - 2, 97, 4, 6, "#d8b0a0"); R(b, cx - 3, 96, 6, 3, "#5a2a1a"); R(b, cx + 3, 98 + Math.round(Math.sin(T * 6)), 4, 2, "#5a2a1a");
    glow(b, cx + 30, 100, 30, "255,180,100", 0.5);
    b.fillStyle = "rgba(180,230,220,0.5)"; for (let k = 0; k < 80; k++) b.fillRect(Math.round(h1(k * 1.7) * W), Math.round((h1(k * 2.3) * H + T * 140) % H), 1, 3);
  }
  for (let k = 0; k < 4; k++) if (Math.random() < 0.5) { const y = Math.floor(Math.random() * H); const hh = 2 + Math.floor(Math.random() * 10); b.drawImage(b.canvas, 0, y, W, hh, (Math.random() - 0.5) * 20, y, W, hh); }
  for (let y = 0; y < H; y += 2) R(b, 0, y, W, 1, "rgba(0,0,0,0.25)");
}

// ---------- hi-res overlay ----------
type Port = { bg: string; skin: string; hair: string; coat: string; eye: string; st: number; ex: string };
const PORTS: Record<string, Port> = {
  ELIAS: { bg: "#1a2a30", skin: "#d6a88c", hair: "#141012", coat: "#1c212a", eye: "#8ab0c0", st: 0, ex: "collar" },
  NOVA: { bg: "#2a1420", skin: "#c89a8a", hair: "#5ff0d8", coat: "#e0e4e4", eye: "#ffb04a", st: 1, ex: "visor" },
  "UNKNOWN CALLER": { bg: "#101010", skin: "", hair: "", coat: "", eye: "", st: -1, ex: "" },
  TERMINAL: { bg: "#06100c", skin: "", hair: "", coat: "", eye: "", st: -2, ex: "" },
  INES: { bg: "#2a1a2a", skin: "#b08a70", hair: "#d8d8e0", coat: "#5a3a5a", eye: "#3a2a20", st: 2, ex: "shawl" },
  DEX: { bg: "#2a1a10", skin: "#c09a80", hair: "#ff8a3d", coat: "#c8621f", eye: "#202020", st: 3, ex: "goggles" },
  BRAM: { bg: "#101a2a", skin: "#c8a088", hair: "#202830", coat: "#2a3a4a", eye: "#202020", st: 5, ex: "cap" },
  LULU: { bg: "#2a2410", skin: "#d8a88c", hair: "#e86a8a", coat: "#e8c84a", eye: "#202020", st: 4, ex: "" },
  HIRO: { bg: "#2a1810", skin: "#c8a080", hair: "#202020", coat: "#e8e0d0", eye: "#202020", st: 5, ex: "headband" },
  PIX: { bg: "#102a2a", skin: "#d0a890", hair: "#7ac8ff", coat: "#2a4a4a", eye: "#202020", st: 3, ex: "glasses" },
  OYELO: { bg: "#2a1028", skin: "#8a5a40", hair: "#101010", coat: "#6a2a5a", eye: "#f0e0c0", st: 5, ex: "beard" },
  TAM: { bg: "#1a2a1a", skin: "#b88a70", hair: "#606060", coat: "#3a4a3a", eye: "#202020", st: 2, ex: "" },
  ROOK: { bg: "#1a1a2a", skin: "#a8a0b0", hair: "#8a6aaa", coat: "#2a2a3a", eye: "#7affc0", st: 0, ex: "headset" },
};
function portrait(c: Ctx, x: number, y: number, s: number, who: string, t: number): void {
  const p = PORTS[who]; if (!p) return;
  const P = (i: number, j: number, w: number, h: number, col: string): void => { c.fillStyle = col; c.fillRect(x + i * s, y + j * s, w * s, h * s); };
  P(0, 0, 12, 12, p.bg);
  if (p.st === -2) { P(2, 2, 8, 7, "#1a2a24"); P(3, 3, 6, 5, "#0a1a12"); P(4, 4, 4, 1, "#5dff9a"); if (Math.sin(t * 6) > 0) P(4, 6, 3, 1, "#5dff9a"); P(5, 9, 2, 1, "#2a3a34"); P(3, 10, 6, 1, "#2a3a34"); return; }
  if (p.st === -1) { for (let k = 0; k < 40; k++) P(Math.floor(h1(k + Math.floor(t * 12)) * 12), Math.floor(h1(k * 3.1 + Math.floor(t * 12)) * 12), 1, 1, "#3a3a3a"); P(4, 3, 4, 5, "#050505"); P(3, 8, 6, 4, "#050505"); return; }
  P(2, 9, 8, 3, p.coat); P(5, 8, 2, 1, p.skin); P(3, 3, 6, 6, p.skin);
  P(4, 5, 1, 1, p.eye); P(7, 5, 1, 1, p.eye); P(5, 7, 2, 1, "rgba(80,30,30,0.7)");
  if (p.st === 0) { P(3, 2, 6, 2, p.hair); P(2, 3, 1, 3, p.hair); P(8, 3, 1, 1, p.hair); }
  if (p.st === 1) { P(2, 2, 7, 2, p.hair); P(2, 4, 2, 4, p.hair); P(9, 3, 1, 2, "#3a2a2a"); }
  if (p.st === 2) { P(3, 2, 6, 1, p.hair); P(5, 1, 2, 1, p.hair); P(2, 3, 1, 4, p.hair); P(9, 3, 1, 4, p.hair); }
  if (p.st === 3) { P(3, 2, 6, 1, p.hair); P(3, 1, 1, 1, p.hair); P(5, 1, 1, 1, p.hair); P(7, 1, 1, 1, p.hair); }
  if (p.st === 4) { P(3, 2, 6, 1, p.hair); P(1, 4, 2, 3, p.hair); P(9, 4, 2, 3, p.hair); }
  if (p.st === 5) P(3, 2, 6, 1, p.hair);
  if (p.ex === "visor") P(3, 5, 6, 1, "#ffb04a");
  if (p.ex === "collar") { P(1, 8, 2, 3, "#2e3644"); P(9, 8, 2, 3, "#2e3644"); }
  if (p.ex === "cap") { P(2, 1, 8, 2, "#1a2a3a"); P(2, 3, 9, 1, "#24384a"); P(5, 1, 1, 1, "#d8c84a"); }
  if (p.ex === "goggles") P(3, 3, 6, 1, "#3df5d0");
  if (p.ex === "headband") P(3, 3, 6, 1, "#c23a4e");
  if (p.ex === "glasses") { P(3, 5, 2, 1, "#7ac8ff"); P(6, 5, 2, 1, "#7ac8ff"); }
  if (p.ex === "beard") P(3, 7, 6, 2, p.hair);
  if (p.ex === "shawl") P(1, 8, 10, 4, "#5a3a5a");
  if (p.ex === "headset") P(2, 4, 1, 3, "#7affc0");
  P(8, 3, 1, 6, "rgba(255,190,110,0.35)");
}
const SPK: Record<string, string> = { ELIAS: "#9fd8ff", NOVA: "#ff8fb5", "UNKNOWN CALLER": "#c8c8c8", INES: "#e8b0d8", DEX: "#ff9a4d", BRAM: "#9fc0ff", LULU: "#ffd36b", HIRO: "#ffb35c", PIX: "#7ae8ff", OYELO: "#ffcf7a", TAM: "#b8d0a0", ROOK: "#c8a8ff", TERMINAL: "#5dff9a" };
function wrapText(c: Ctx, text: string, maxW: number): string[] {
  const out: string[] = []; let cur = "";
  for (const w of text.split(" ")) { const tt = cur ? cur + " " + w : w; if (c.measureText(tt).width > maxW && cur) { out.push(cur); cur = w; } else cur = tt; }
  if (cur) out.push(cur);
  return out;
}
function tag(c: Ctx, text: string, cx: number, y: number, fs: number, col: string, mono: string): void {
  c.font = `bold ${fs}px ${mono}`; c.textAlign = "center"; c.textBaseline = "middle";
  const w = c.measureText(text).width + fs * 1.2; const x = clamp(cx - w / 2, 4, c.canvas.width - w - 4);
  c.fillStyle = "rgba(2,10,12,0.88)"; c.fillRect(x, y, w, fs * 1.8);
  c.strokeStyle = col; c.lineWidth = Math.max(2, fs / 8); c.strokeRect(x, y, w, fs * 1.8);
  c.fillStyle = col; c.fillText(text, x + w / 2, y + fs * 0.95); c.textAlign = "left";
}
function overlayHi(c: Ctx, cw: number, ch: number, dpr: number, mono: string, inset: number, top: boolean): void {
  const g = G; const cssH = ch / dpr;
  const fsB = Math.round(clamp(cssH * 0.055, 14, 19) * dpr);
  const fsS = Math.round(clamp(cssH * 0.045, 12, 15) * dpr);
  c.textAlign = "left"; c.textBaseline = "alphabetic"; c.shadowBlur = 0;
  const v = g.view; const cam = Math.round(g.cam);
  const toX = (wx: number): number => ((wx - cam - v.sx) * v.z / W) * cw;
  const toY = (wy: number): number => ((wy - v.sy) * v.z / H) * ch;
  if (g.scene === "menu") {
    c.fillStyle = "rgba(2,8,10,0.35)"; c.fillRect(0, 0, cw, ch);
    const ts = Math.round(clamp(cssH * 0.14, 30, 70) * dpr);
    c.font = `bold ${ts}px ${mono}`; c.textBaseline = "middle";
    const title = "AFTER RAIN"; const tw = c.measureText(title).width; let x = cw / 2 - tw / 2;
    for (let i = 0; i < title.length; i++) {
      const chr = title.charAt(i); const w = c.measureText(chr).width;
      const dy = Math.sin(g.t * 1.4 + i * 0.6) * ts * 0.03; const gl = h1(i + Math.floor(g.t * 6)) > 0.96;
      c.fillStyle = "rgba(95,240,216,0.6)"; c.fillText(chr, x - ts * 0.04 + (gl ? ts * 0.08 : 0), ch * 0.3 + dy);
      c.shadowColor = "#ffb04a"; c.shadowBlur = ts * 0.3; c.fillStyle = flick(g.t, i + 40) ? "#fff0d8" : "#a89880"; c.fillText(chr, x, ch * 0.3 + dy); c.shadowBlur = 0;
      x += w;
    }
    c.textAlign = "center"; c.font = `italic ${fsS}px ${mono}`; c.fillStyle = "#ffd8a0";
    const tl = "Some memories are manufactured. Some feelings are not.";
    const lines = wrapText(c, tl, cw * 0.9); lines.forEach((ln: string, i: number) => c.fillText(ln, cw / 2, ch * 0.45 + i * fsS * 1.4));
    c.textAlign = "left";
  }
  if (g.scene === "cut") {
    const T = g.sceneT;
    if (T > 3.8 && T < 8) {
      const a = clamp((T - 3.8) / 0.8, 0, 1) * clamp((8 - T) / 0.6, 0, 1);
      c.globalAlpha = a; c.textAlign = "center"; c.textBaseline = "middle";
      const s1 = "LOS ANGELES"; const n1 = Math.floor(clamp((T - 3.8) * 8, 0, s1.length));
      c.font = `bold ${Math.round(clamp(cssH * 0.08, 20, 40) * dpr)}px ${mono}`; c.fillStyle = "#fff0d8"; c.shadowColor = "#5ff0d8"; c.shadowBlur = 8 * dpr;
      c.fillText(s1.slice(0, n1), cw / 2, ch * 0.42);
      if (T > 5.4) { c.font = `${fsB}px ${mono}`; c.fillStyle = "#ffb04a"; c.fillText("2049".slice(0, Math.floor((T - 5.4) * 6)), cw / 2, ch * 0.54); }
      c.shadowBlur = 0; c.globalAlpha = 1; c.textAlign = "left";
    }
    if (!g.dlg && T < 12.5) { c.font = `${fsS}px ${mono}`; c.fillStyle = "rgba(220,240,235,0.7)"; c.textAlign = "right"; c.textBaseline = "bottom"; c.fillText("tap to skip", cw - 10 * dpr, ch - 10 * dpr); c.textAlign = "left"; }
    if (g.ringing && !g.dlg) tag(c, "☎ RING", toX(108), toY(104), fsS, "#ff8a8a", mono);
  }
  if (g.scene === "glitch") {
    const T = g.sceneT; let sub = "";
    if (T > 1.5 && T < 4.5) sub = "[AURELION · MEMORY DIVISION · LAB 7]";
    else if (T >= 4.5 && T < 7.2) sub = "DR. VALE: Subject M still retains attachment. Schedule the wipe. Then make more.";
    else if (T >= 7.2 && T < 10) sub = "MARA: Elias... they're making more of me. Don't trust the rain.";
    if (sub) {
      c.font = `${fsB}px ${mono}`; const ls = wrapText(c, sub, cw * 0.86); c.textAlign = "center"; c.textBaseline = "middle";
      ls.forEach((ln: string, i: number) => { const y = ch * 0.82 + i * fsB * 1.4; c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(cw * 0.05, y - fsB * 0.75, cw * 0.9, fsB * 1.5); c.fillStyle = h1(Math.floor(T * 9) + i) > 0.92 ? "#5ff0d8" : "#f0f0e8"; c.fillText(ln, cw / 2 + (h1(Math.floor(T * 20)) > 0.9 ? 4 * dpr : 0), y); });
      c.textAlign = "left";
    }
  }
  if (g.scene === "play" || g.scene === "end") {
    if (!g.dlg && g.scene === "play") {
      c.font = `${fsS}px ${mono}`; c.textBaseline = "middle";
      const txt = g.obj < 5 ? "» " + (OBJ[g.obj] ?? "") : "» Explore freely";
      const tw = c.measureText(txt).width; const m = 8 * dpr;
      c.fillStyle = "rgba(2,10,12,0.65)"; c.fillRect(m, m, tw + fsS, fsS * 1.9);
      c.fillStyle = "#ffd8a0"; c.fillText(txt, m + fsS / 2, m + fsS * 0.95);
      const cr = "¤ " + g.credits; const cwd = c.measureText(cr).width;
      c.fillStyle = "rgba(2,10,12,0.65)"; c.fillRect(m, m + fsS * 2.1, cwd + fsS, fsS * 1.7); c.fillStyle = "#ffd36b"; c.fillText(cr, m + fsS / 2, m + fsS * 2.95);
      const n = nearest();
      if (n && g.fadeTo === 0) {
        const lab = n.kind === "ACCESS" ? (n.label ? "Access " + n.label.toLowerCase() : "Access terminal") : (KL[n.kind] + (n.label ? " · " + n.label : ""));
        tag(c, lab, toX(n.x), toY(n.y) + Math.sin(g.t * 4) * 2 * dpr, fsS, "#ffb04a", mono);
      }
      for (const np of g.npcs) if (np.loc === g.loc && np.bubbleT > 0 && np.bubble) {
        c.font = `${fsS}px ${mono}`;
        const ls = wrapText(c, np.bubble, 150 * dpr); const bw = Math.max(...ls.map((l: string) => c.measureText(l).width)) + fsS;
        const bx = clamp(toX(np.x) - bw / 2, 4, cw - bw - 4); const by = toY(np.y - np.look.h - 6) - ls.length * fsS * 1.3 - fsS;
        c.fillStyle = "rgba(240,236,224,0.92)"; c.fillRect(bx, by, bw, ls.length * fsS * 1.3 + fsS * 0.6);
        c.fillStyle = "#101418"; c.textBaseline = "top"; ls.forEach((l: string, i: number) => c.fillText(l, bx + fsS / 2, by + fsS * 0.3 + i * fsS * 1.3));
        c.font = `bold ${Math.round(fsS * 0.8)}px ${mono}`; c.fillStyle = "#e8e0d0"; c.fillText(np.name, bx, by - fsS * 1.1);
      }
    }
  }
  if (g.toast) {
    c.globalAlpha = Math.min(1, (3 - g.toast.t) * 2); c.font = `bold ${fsS}px ${mono}`; c.textAlign = "center"; c.textBaseline = "middle";
    const tw = c.measureText(g.toast.text).width + fsS * 2; const y = ch * 0.22;
    c.fillStyle = "rgba(40,24,6,0.92)"; c.fillRect(cw / 2 - tw / 2, y, tw, fsS * 2); c.fillStyle = "#ffd08a"; c.fillText(g.toast.text, cw / 2, y + fsS);
    c.globalAlpha = 1; c.textAlign = "left";
  }
  if (g.banner) {
    const bt = g.banner.t; const a = clamp(bt / 0.6, 0, 1) * clamp((4.5 - bt) / 0.8, 0, 1);
    c.globalAlpha = a; c.fillStyle = "rgba(0,0,0,0.7)"; c.fillRect(0, ch * 0.32, cw, fsB * 4.2);
    c.fillStyle = "#ffb04a"; c.fillRect(0, ch * 0.32, cw, 2 * dpr); c.fillRect(0, ch * 0.32 + fsB * 4.2 - 2 * dpr, cw, 2 * dpr);
    c.textAlign = "center"; c.textBaseline = "middle"; c.font = `bold ${fsB}px ${mono}`; c.fillStyle = "#fff0d8"; c.fillText(g.banner.a, cw / 2, ch * 0.32 + fsB * 1.4);
    c.font = `${fsS}px ${mono}`; c.fillStyle = "#9ff0d8"; c.fillText(g.banner.b, cw / 2, ch * 0.32 + fsB * 2.9);
    c.globalAlpha = 1; c.textAlign = "left";
  }
  if (g.dlg) {
    const d = g.dlg; const line = d.lines[d.i];
    if (line) {
      const pad = Math.round(fsB * 0.7);
      const bx = inset * dpr + pad; const bw = cw - bx * 2;
      const hasP = !!PORTS[line.who]; const ps = hasP ? Math.round(fsB * 3.2 / 12) * 12 : 0;
      c.font = `${fsB}px ${mono}`;
      const lines = wrapText(c, line.text, bw - pad * 3 - ps);
      const nameH = line.who ? fsB * 1.4 : 0;
      const bh = Math.max(ps + pad * 2, pad * 2 + nameH + lines.length * fsB * 1.35);
      const by = top ? pad : ch - bh - pad;
      const col = SPK[line.who] ?? "#c8d8d0";
      c.fillStyle = "rgba(2,8,10,0.93)"; c.fillRect(bx, by, bw, bh);
      c.strokeStyle = col; c.lineWidth = 2 * dpr; c.strokeRect(bx, by, bw, bh);
      if (hasP) { portrait(c, bx + pad, by + pad, ps / 12, line.who, g.t); c.strokeRect(bx + pad, by + pad, ps, ps); }
      const tx = bx + pad * (hasP ? 2 : 1) + ps;
      c.textBaseline = "top";
      if (line.who) { c.font = `bold ${fsB}px ${mono}`; c.fillStyle = col; c.fillText(line.who, tx, by + pad); c.font = `${fsB}px ${mono}`; }
      let rem = Math.floor(d.chars);
      c.fillStyle = line.who ? "#eef6f2" : "#b8d0c8";
      lines.forEach((ln: string, i: number) => { if (rem <= 0) return; c.fillText(ln.slice(0, rem), tx, by + pad + nameH + i * fsB * 1.35); rem -= ln.length + 1; });
      if (!line.choices && d.chars >= line.text.length && Math.sin(g.t * 6) > 0) { c.fillStyle = col; c.textAlign = "right"; c.fillText("▼ tap", bx + bw - pad, by + bh - pad - fsB); c.textAlign = "left"; }
      if (line.choices && d.waiting) { c.fillStyle = col; c.textAlign = "right"; c.font = `${fsS}px ${mono}`; c.fillText("choose ▸", bx + bw - pad, by + bh - pad - fsS); c.textAlign = "left"; }
    }
  }
  if (g.scene === "end") {
    c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(0, 0, cw, ch); c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `bold ${Math.round(clamp(cssH * 0.08, 20, 40) * dpr)}px ${mono}`; c.shadowColor = "#ffb04a"; c.shadowBlur = 10 * dpr; c.fillStyle = "#fff0d8";
    c.fillText("TO BE CONTINUED", cw / 2, ch * 0.2); c.shadowBlur = 0;
    c.font = `${fsS}px ${mono}`; c.fillStyle = "#9ff0d8"; c.fillText("MISSION 001 COMPLETE · MISSION 002 UNLOCKED", cw / 2, ch * 0.3);
    c.textAlign = "left";
  }
  if (g.fade > 0) { c.globalAlpha = g.fade; c.fillStyle = "#000"; c.fillRect(0, 0, cw, ch); c.globalAlpha = 1; }
}
const KL: Record<Kind, string> = { SPEAK: "Speak", ENTER: "Enter", ACCESS: "Access terminal", EXAMINE: "Examine", COLLECT: "Collect" };

// ---------- component ----------
export default function AfterRain() {
  const theme = useGrokTheme();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const monoRef = useRef<string>(theme.font.mono);
  monoRef.current = theme.font.mono;
  const [, setRev] = useState<number>(0);
  const [ov, setOv] = useState<boolean>(false);
  const g = G;
  const bump = (): void => { g.rev++; setRev(g.rev); };

  useEffect(() => {
    const cv = canvasRef.current; const wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const ctx = cv.getContext("2d");
    const mk = (w: number): HTMLCanvasElement => { const e = document.createElement("canvas"); e.width = w; e.height = H; return e; };
    const buf = mk(W); const rbuf = mk(W);
    const cc: Caches = { far: mk(FW), mid: mk(MW), apt: mk(360), dist: mk(1400), mkt: mk(900), mktB: mk(KW) };
    const b = buf.getContext("2d"); const rc = rbuf.getContext("2d");
    const c1 = cc.far.getContext("2d"); const c2 = cc.mid.getContext("2d"); const c3 = cc.apt.getContext("2d");
    const c4 = cc.dist.getContext("2d"); const c5 = cc.mkt.getContext("2d"); const c6 = cc.mktB.getContext("2d");
    if (!ctx || !b || !rc || !c1 || !c2 || !c3 || !c4 || !c5 || !c6) return;
    bakeFar(c1); bakeMid(c2); bakeApt(c3); bakeDistrict(c4); bakeMarket(c5); bakeMarketBack(c6);
    let raf = 0; let last = performance.now(); let seen = -1; let ovNow = false;
    const loop = (now: number): void => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      const vv = window.visualViewport;
      const shell = document.getElementById("root");
      const shellCs = shell ? getComputedStyle(shell) : null;
      const padY = shellCs ? (parseFloat(shellCs.paddingTop) || 0) + (parseFloat(shellCs.paddingBottom) || 0) : 0;
      const vh = Math.max(240, (vv ? vv.height : window.innerHeight) - padY); const vw = vv ? vv.width : window.innerWidth;
      const coarse = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
      const isOv = vw > vh && vh < 600 && (coarse || vh < 480);
      const avail = Math.max(240, wrap.clientWidth);
      let dw = 0; let dh = 0; let lw = 320;
      if (isOv) { dh = Math.max(170, Math.floor(vh - 10)); dw = Math.floor(Math.min(avail, dh * 16 / 9)); dh = Math.floor(dw * 9 / 16); }
      else if (avail < 560) { lw = 240; dw = Math.floor(avail); dh = Math.floor(dw * 3 / 4); }
      else { dw = Math.floor(Math.min(avail, Math.max(480, vh * 0.66 * 16 / 9))); dh = Math.floor(dw * 9 / 16); }
      if (lw !== W) { W = lw; buf.width = W; rbuf.width = W; b.imageSmoothingEnabled = false; rc.imageSmoothingEnabled = false; }
      if (isOv !== ovNow) { ovNow = isOv; setOv(isOv); }
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const pw = Math.floor(dw * dpr); const ph = Math.floor(dh * dpr);
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; cv.style.width = dw + "px"; cv.style.height = dh + "px"; }
      update(dt);
      b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = "source-over";
      render(b, rc, buf, rbuf, cc);
      const z = G.scene === "play" || G.scene === "cut" ? Math.max(1, G.zoom) : 1;
      const sw = W / z; const sh = H / z;
      const fx = G.scene === "cut" ? 100 - Math.round(G.cam) : G.px - Math.round(G.cam);
      const sx = clamp(fx - sw / 2, 0, W - sw); const sy = clamp(FEET - 24 - sh * 0.55, 0, H - sh);
      G.view = { sx, sy, z };
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      const dd = G.dlg; const dl = dd ? dd.lines[dd.i] : undefined;
      const choosing = !!(dd && dd.waiting && dl && dl.choices);
      const inset = isOv && dw >= 640 && !choosing ? 190 : 0;
      overlayHi(ctx, cv.width, cv.height, dpr, monoRef.current, inset, isOv && inset === 0);
      if (G.rev !== seen) { seen = G.rev; setRev(G.rev); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const kd = (e: KeyboardEvent): void => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown" || k === " " || k === "Tab") e.preventDefault();
      audioInit();
      if (G.scene !== "play" && G.scene !== "cut") { if ((k === "e" || k === "E" || k === "Enter" || k === " ") && G.scene === "glitch") G.actQ = true; return; }
      if (k === "Escape") { G.panel = G.panel === "none" ? "pause" : "none"; G.rev++; return; }
      if (k === "Tab") { G.panel = G.panel === "bag" ? "none" : "bag"; G.rev++; return; }
      if (k === "j" || k === "J") { G.panel = G.panel === "journal" ? "none" : "journal"; G.rev++; return; }
      if (G.panel !== "none") return;
      if (k === "ArrowLeft" || k === "a" || k === "A") G.left = true;
      if (k === "ArrowRight" || k === "d" || k === "D") G.right = true;
      if (k === "Shift") { G.run = true; G.rev++; }
      if ((k === " " || k === "ArrowUp" || k === "w" || k === "W") && !e.repeat) G.jumpQ = true;
      if ((k === "e" || k === "E" || k === "Enter") && !e.repeat) G.actQ = true;
      const d = G.dlg; const ln = d ? d.lines[d.i] : undefined;
      if (d && d.waiting && ln && ln.choices && k >= "1" && k <= "9") choose(Number(k) - 1);
    };
    const ku = (e: KeyboardEvent): void => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") G.left = false;
      if (k === "ArrowRight" || k === "d" || k === "D") G.right = false;
      if (k === "Shift") { G.run = false; G.rev++; }
    };
    const bl = (): void => { G.left = false; G.right = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); window.addEventListener("blur", bl);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("blur", bl); };
  }, []);

  const noCtx = (e: MouseEvent<HTMLElement>): void => { e.preventDefault(); };
  const tapCanvas = (e: PointerEvent<HTMLCanvasElement>): void => { e.preventDefault(); audioInit(); if ((g.scene === "play" && g.dlg) || g.scene === "cut" || g.scene === "glitch") g.actQ = true; };
  const noSel: CSSProperties = { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "none", WebkitTapHighlightColor: "transparent" };
  const big: CSSProperties = { ...noSel, minWidth: 72, height: 64, padding: "0 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.border.default}`, background: theme.bg.elevated, color: theme.text.primary, fontFamily: theme.font.mono, fontSize: 17, fontWeight: theme.weight.semibold, cursor: "pointer", opacity: ov ? 0.82 : 1 };
  const small: CSSProperties = { ...noSel, minHeight: 46, padding: "0 12px", borderRadius: theme.radius.md, border: `1px solid ${theme.border.default}`, background: theme.bg.elevated, color: theme.text.primary, fontFamily: theme.font.mono, fontSize: 13, cursor: "pointer", opacity: ov ? 0.85 : 1 };
  const active: CSSProperties = { background: theme.fill.accent, color: theme.text.onColor, border: `1px solid ${theme.fill.accent}` };
  const wide: CSSProperties = { ...small, width: "100%", minHeight: 52, fontSize: 15, marginTop: 8, textAlign: "left", opacity: 1 };
  const dis: CSSProperties = { opacity: 0.4, cursor: "default" };

  const hold = (label: string, side: "left" | "right") => {
    const set = (v: boolean): void => { g[side] = v; };
    return (
      <button key={side} aria-label={side === "left" ? "Walk left" : "Walk right"} style={{ ...big, minWidth: 78, fontSize: 24 }} onContextMenu={noCtx}
        onPointerDown={(e: PointerEvent<HTMLButtonElement>) => { e.preventDefault(); audioInit(); set(true); }}
        onPointerUp={() => set(false)} onPointerLeave={() => set(false)} onPointerCancel={() => set(false)}>{label}</button>
    );
  };
  const nearT = g.scene === "play" && !g.dlg ? nearest() : null;
  const actLabel = g.dlg ? "NEXT" : nearT ? nearT.kind : "ACT";
  const actBtn = (
    <button key="act" style={{ ...big, minWidth: 104, fontSize: 15, ...(g.dlg || nearT ? active : {}) }} onContextMenu={noCtx}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => { e.preventDefault(); audioInit(); if (g.panel === "none") g.actQ = true; }}>{actLabel}</button>
  );
  const jumpBtn = (
    <button key="jump" style={big} onContextMenu={noCtx}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => { e.preventDefault(); audioInit(); if (g.panel === "none") { if (g.dlg) g.actQ = true; else g.jumpQ = true; } }}>JUMP</button>
  );
  const openPanel = (p: Panel): void => { audioInit(); blip(); g.left = false; g.right = false; g.panel = g.panel === p ? "none" : p; g.saveNote = ""; bump(); };
  const sysBtns = (
    <>
      <button style={small} onContextMenu={noCtx} onClick={() => openPanel("pause")}>❚❚ PAUSE</button>
      <button style={small} onContextMenu={noCtx} onClick={() => openPanel("bag")}>BAG</button>
      <button style={small} onContextMenu={noCtx} onClick={() => openPanel("journal")}>JOURNAL</button>
      <button style={{ ...small, ...(g.run ? active : {}) }} onContextMenu={noCtx} onClick={() => { g.run = !g.run; blip(); bump(); }}>{g.run ? "RUN: ON" : "RUN: OFF"}</button>
    </>
  );
  const dlg = g.dlg; const curLine = dlg ? dlg.lines[dlg.i] : undefined;
  const choices = dlg && dlg.waiting && curLine && curLine.choices ? curLine.choices : null;
  const choiceBtns = choices ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {choices.map((ch: Choice, i: number) => (
        <button key={ch.label + i} style={{ ...small, minHeight: 54, fontSize: 15, textAlign: "left", opacity: 1, border: `2px solid ${theme.fill.accent}` }} onContextMenu={noCtx}
          onClick={() => { audioInit(); choose(i); bump(); }}>{i + 1}. {ch.label}</button>
      ))}
    </div>
  ) : null;
  const hasSave = !!readSave();
  const menuBtns = (
    <div style={{ display: "grid", gridTemplateColumns: ov ? "1fr" : "1fr 1fr", gap: 8, width: "100%" }}>
      <button style={{ ...wide, marginTop: 0, textAlign: "center", ...active }} onClick={() => { audioInit(); blip(); newGameStart(); bump(); }}>NEW GAME</button>
      <button style={{ ...wide, marginTop: 0, textAlign: "center", ...(hasSave ? {} : dis) }} disabled={!hasSave} onClick={() => { audioInit(); loadGame(); bump(); }}>CONTINUE</button>
      <button style={{ ...wide, marginTop: 0, textAlign: "center" }} onClick={() => openPanel("settings")}>SETTINGS</button>
      <button style={{ ...wide, marginTop: 0, textAlign: "center" }} onClick={() => openPanel("credits")}>CREDITS</button>
    </div>
  );
  const sceneBtns = g.scene === "cut" ? (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
      <button style={big} onContextMenu={noCtx} onClick={() => { audioInit(); endCut(); bump(); }}>SKIP ▸▸</button>
      <button style={{ ...big, ...active }} onContextMenu={noCtx} onPointerDown={(e: PointerEvent<HTMLButtonElement>) => { e.preventDefault(); audioInit(); g.actQ = true; }}>{g.dlg ? "NEXT" : "TAP"}</button>
    </div>
  ) : g.scene === "glitch" ? (
    <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}><button style={big} onClick={() => { endGlitch(); bump(); }}>SKIP ▸▸</button></div>
  ) : g.scene === "end" ? (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: "100%" }}>
      <button style={{ ...big, ...active, flex: 1 }} onClick={() => { g.scene = "play"; blip(); bump(); }}>KEEP EXPLORING</button>
      <button style={{ ...big, flex: 1 }} onClick={() => { blip(); toMenu(); bump(); }}>MAIN MENU</button>
    </div>
  ) : null;

  const card: CSSProperties = { width: "100%", maxWidth: 460, maxHeight: "100%", overflowY: "auto", background: theme.bg.elevated, color: theme.text.primary, border: `1px solid ${theme.border.default}`, borderRadius: theme.radius.lg, padding: 14, boxSizing: "border-box", fontFamily: theme.font.family, touchAction: "pan-y", WebkitUserSelect: "none", userSelect: "none" };
  const head: CSSProperties = { fontSize: 18, fontWeight: theme.weight.semibold, marginBottom: 6 };
  const sub: CSSProperties = { color: theme.text.secondary, fontSize: 14, lineHeight: "20px" };
  const rowS: CSSProperties = { padding: "9px 0", borderTop: `1px solid ${theme.border.subtle}`, fontSize: 15, lineHeight: "21px" };
  const close = (): void => { blip(); g.panel = "none"; bump(); };
  const back = (): void => { blip(); g.panel = g.scene === "menu" ? "none" : "pause"; bump(); };
  const volRow = (label: string, key: "music" | "sfx") => (
    <div style={{ ...rowS, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 120px" }}>{label}</div>
      <button style={{ ...small, minWidth: 52, fontSize: 20 }} onClick={() => { g[key] = Math.max(0, Math.round((g[key] - 0.1) * 10) / 10); applyVol(); blip(); bump(); }}>−</button>
      <div style={{ width: 90, height: 10, borderRadius: 5, background: theme.fill.secondary, overflow: "hidden" }}><div style={{ width: `${g[key] * 100}%`, height: "100%", background: theme.fill.accent }} /></div>
      <button style={{ ...small, minWidth: 52, fontSize: 20 }} onClick={() => { g[key] = Math.min(1, Math.round((g[key] + 0.1) * 10) / 10); applyVol(); blip(); bump(); }}>+</button>
    </div>
  );
  const evid = g.items.filter((id: string) => ITEMS[id]?.ev);
  const itemRow = (id: string) => {
    const it = ITEMS[id]; if (!it) return null;
    const open = g.openItem === id;
    return (
      <div key={id} style={rowS}>
        <button style={{ ...wide, marginTop: 0, minHeight: 46 }} onClick={() => { g.openItem = open ? "" : id; blip(); bump(); }}>{(open ? "▾ " : "▸ ") + it.name + (it.ev ? "  ◆" : "")}</button>
        {open && <div style={{ ...sub, marginTop: 6 }}>{it.desc}</div>}
        {open && id === "tape" && <button style={{ ...wide, ...active }} onClick={() => { g.panel = "none"; playTape(); bump(); }}>▶ PLAY RECORDING</button>}
        {open && id === "photo" && <button style={wide} onClick={() => { g.panel = "none"; say([E("Mara on the pier. If she's alive, who have I been mourning for six years?")], null, true); bump(); }}>EXAMINE PHOTO</button>}
        {open && id === "chip" && g.obj === 4 && g.scene === "play" && <button style={{ ...wide, ...active }} onClick={() => { g.panel = "none"; startGlitch(); bump(); }}>INVESTIGATE CHIP</button>}
      </div>
    );
  };

  const panel = g.panel === "none" ? null : (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10, boxSizing: "border-box", zIndex: 5, touchAction: "pan-y" }}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) close(); }}>
      <div style={card}>
        {g.panel === "pause" && (
          <>
            <div style={head}>Paused</div>
            <div style={sub}>{g.obj < 5 ? "Objective: " + (OBJ[g.obj] ?? "") : "Mission 001 complete."}</div>
            <button style={{ ...wide, ...active }} onClick={close}>▶ Resume</button>
            <button style={wide} onClick={() => { saveGame(); bump(); }}>Save</button>
            <button style={{ ...wide, ...(hasSave ? {} : dis) }} disabled={!hasSave} onClick={() => { loadGame(); g.panel = "none"; bump(); }}>Load</button>
            <button style={wide} onClick={() => { g.panel = "settings"; blip(); bump(); }}>Settings</button>
            <button style={wide} onClick={() => { blip(); toMenu(); bump(); }}>Quit to menu</button>
            {g.saveNote && <div style={{ ...sub, marginTop: 8 }}>{g.saveNote}</div>}
          </>
        )}
        {g.panel === "settings" && (
          <>
            <div style={head}>Settings</div>
            {volRow("Music volume", "music")}
            {volRow("SFX volume", "sfx")}
            <div style={rowS}>
              <div style={{ marginBottom: 6 }}>Text speed</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Slow", "Normal", "Fast"].map((l: string, i: number) => (
                  <button key={l} style={{ ...small, flex: "1 1 80px", ...(g.textSpeed === i ? active : {}) }} onClick={() => { g.textSpeed = i; blip(); bump(); }}>{l}</button>
                ))}
              </div>
            </div>
            <button style={{ ...wide, ...active, textAlign: "center" }} onClick={back}>Back</button>
          </>
        )}
        {g.panel === "credits" && (
          <>
            <div style={head}>Credits</div>
            <div style={rowS}>AFTER RAIN · story, characters and opening dialogue by the creator.</div>
            <div style={rowS}><div style={sub}>Elias Voss, Nova, Mara, Detective Kane, Dr. Vale and AURELION are the creator's own. All pixel art, signs, music and sound are generated in code for this build.</div></div>
            <div style={rowS}><div style={sub}>First playable section: Mission 001, Ghosts in the Rain.</div></div>
            <button style={{ ...wide, ...active, textAlign: "center" }} onClick={back}>Back</button>
          </>
        )}
        {g.panel === "bag" && (
          <>
            <div style={head}>Bag</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...small, flex: 1, ...(g.bagTab === "items" ? active : {}) }} onClick={() => { g.bagTab = "items"; blip(); bump(); }}>ITEMS</button>
              <button style={{ ...small, flex: 1, ...(g.bagTab === "evidence" ? active : {}) }} onClick={() => { g.bagTab = "evidence"; blip(); bump(); }}>EVIDENCE ({evid.length})</button>
            </div>
            {g.bagTab === "items" && CATS.map((cat: Cat) => {
              const ids = g.items.filter((id: string) => ITEMS[id]?.cat === cat);
              return (
                <div key={cat} style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: theme.weight.semibold, color: theme.text.secondary }}>{cat.toUpperCase()}</div>
                  {ids.length === 0 ? <div style={{ ...sub, padding: "6px 0" }}>None yet.</div> : ids.map((id: string) => itemRow(id))}
                </div>
              );
            })}
            {g.bagTab === "items" && <div style={{ marginTop: 10, ...rowS }}><b>Credits</b>: {g.credits}</div>}
            {g.bagTab === "evidence" && (evid.length === 0 ? <div style={{ ...sub, marginTop: 10 }}>No evidence yet. Examine things, read terminals, talk to people.</div> : evid.map((id: string) => itemRow(id)))}
            <button style={{ ...wide, ...active, textAlign: "center" }} onClick={close}>Close</button>
          </>
        )}
        {g.panel === "journal" && (
          <>
            <div style={head}>Journal</div>
            {MISSIONS.map((m: string, mi: number) => {
              const unlocked = mi === 0 || (mi === 1 && g.m2);
              return (
                <div key={m} style={rowS}>
                  <div style={{ fontWeight: theme.weight.semibold, color: unlocked ? theme.text.primary : theme.text.tertiary }}>{(unlocked ? "MISSION " : "🔒 MISSION ") + m}</div>
                  {mi === 0 && OBJ.map((o: string, oi: number) => (
                    <div key={o} style={{ ...sub, color: oi === g.obj ? theme.text.primary : theme.text.secondary }}>{(oi < g.obj ? "✓ " : oi === g.obj ? "▸ " : "· ") + (oi + 1) + ". " + o}</div>
                  ))}
                  {mi === 1 && g.m2 && <div style={sub}>Unlocked. Coming in the next chapter.</div>}
                  {!unlocked && <div style={sub}>Locked</div>}
                </div>
              );
            })}
            <div style={{ ...head, fontSize: 15, marginTop: 12 }}>Notes</div>
            <div style={rowS}><div style={sub}>A caller said Mara is alive. Mara died six years ago. Or so I was told.</div></div>
            {g.notes.map((n: string, i: number) => <div key={i} style={rowS}><div style={sub}>{n}</div></div>)}
            <button style={{ ...wide, ...active, textAlign: "center" }} onClick={close}>Close</button>
          </>
        )}
      </div>
    </div>
  );

  const playing = g.scene === "play";
  const moveRow = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", gap: 8 }}>{hold("◀", "left")}{hold("▶", "right")}</div>
      <div style={{ display: "flex", gap: 8 }}>{jumpBtn}{actBtn}</div>
    </div>
  );
  const rootS: CSSProperties = { ...noSel, touchAction: "manipulation", position: "relative", background: theme.bg.base, color: theme.text.primary, fontFamily: theme.font.family, padding: ov ? 4 : 10, boxSizing: "border-box", width: "100%", minHeight: 420 };
  const below = g.scene === "menu" ? menuBtns : sceneBtns ? sceneBtns : choiceBtns ? choiceBtns : moveRow;

  return (
    <div onContextMenu={noCtx} onPointerDown={() => audioInit()} onPointerUp={() => audioInit()} onClick={() => audioInit()} style={rootS}>
      {!ov && playing && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>{sysBtns}</div>}
      <div ref={wrapRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", lineHeight: 0 }}>
          <canvas ref={canvasRef} onPointerDown={tapCanvas} onContextMenu={noCtx} style={{ ...noSel, display: "block", imageRendering: "pixelated", borderRadius: theme.radius.md, border: `1px solid ${theme.border.default}`, cursor: "pointer" }} />
          {ov && playing && !g.dlg && <div style={{ position: "absolute", top: 6, right: 6, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: "62%", lineHeight: "normal" }}>{sysBtns}</div>}
          {ov && (
            <div style={{ position: "absolute", left: 8, right: 8, bottom: 8, display: "flex", justifyContent: g.scene === "menu" ? "flex-end" : "space-between", lineHeight: "normal" }}>
              {g.scene === "menu" ? <div style={{ width: 220 }}>{menuBtns}</div> : sceneBtns ? sceneBtns : choiceBtns ? <div style={{ width: "min(70%, 420px)", margin: "0 auto" }}>{choiceBtns}</div> : moveRow}
            </div>
          )}
        </div>
      </div>
      {!ov && <div style={{ marginTop: 10, lineHeight: "normal" }}>{below}</div>}
      {!ov && g.scene === "menu" && <div style={{ ...sub, marginTop: 8 }}>Best on iPhone. Hold the arrows to walk and tap JUMP with another finger. Rotate for a bigger view. Sound starts on your first tap.</div>}
      {panel}
    </div>
  );
}
