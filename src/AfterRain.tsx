import { useEffect, useRef, useState, useGrokTheme, type CSSProperties, type PointerEvent, type MouseEvent } from "grok/canvas";

type Ctx = CanvasRenderingContext2D;
let W = 320;
const H = 180;
const FEET = 160;
let YO = 0;
let SC = 2;
let PG = 0.5;
let SIL: HTMLCanvasElement | null = null;
const BLOOM = { n: 2, a0: 0.7, a1: 0.55 };
type LocId = "apt" | "district" | "market" | "pier" | "lab";
const LOCW: Record<LocId, number> = { apt: 360, district: 1400, market: 900, pier: 1100, lab: 520 };
// holo-ads only make sound out here; the apartment and Lab 7 are indoors
function outside(l: LocId): boolean { return l === "district" || l === "market" || l === "pier"; }
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
  const px = x0 + 2 + Math.floor(h1(seed + 41) * Math.max(1, w - 6));
  R(c, px, top + 2, 2, winBottom - top, "#0e1820"); R(c, px, top + 2, 1, winBottom - top, "#1c2c38");
  for (let yy = top + 14; yy < winBottom - 6; yy += 22) {
    if (h1(seed + yy * 0.7) > 0.45) { const ax = x0 + 4 + Math.floor(h1(seed + yy) * Math.max(1, w - 16)); R(c, ax, yy, 8, 5, "#26323a"); R(c, ax + 1, yy + 1, 6, 1, "#3a4a52"); R(c, ax + 2, yy + 5, 1, 3, "#0a1218"); }
    if (h1(seed + yy * 1.9) > 0.6) { const bx = x0 + 3 + Math.floor(h1(seed + yy * 3) * Math.max(1, w - 24)); R(c, bx, yy + 9, 18, 1, "#2a3a44"); for (let k = 0; k < 18; k += 3) R(c, bx + k, yy + 6, 1, 3, "#1a2630"); }
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
const HW = Math.ceil(340 + 1400 * 0.06);
function bakeHaze(c: Ctx): void {
  for (const bd of genLayer(7, HW, 14, 34, 70, 140)) {
    const top = FEET - 18 - bd.h;
    R(c, bd.x, top, bd.w, bd.h + 18, "#1e3a4a");
    if (h1(bd.s + 3) > 0.6) R(c, bd.x + Math.floor(bd.w / 2), top - 14, 1, 14, "#1e3a4a");
    for (let wy = top + 4, iy = 0; wy < FEET - 20; wy += 4, iy++) for (let wx = bd.x + 2, ix = 0; wx < bd.x + bd.w - 2; wx += 3, ix++) if (h1(bd.s + ix * 3.1 + iy * 7.7) < 0.1) R(c, wx, wy, 1, 1, "#8fc0cc");
  }
  c.save(); c.globalCompositeOperation = "source-atop";
  const g = c.createLinearGradient(0, 0, 0, FEET); g.addColorStop(0, "rgba(90,140,170,0.1)"); g.addColorStop(1, "rgba(150,200,215,0.7)");
  c.fillStyle = g; c.fillRect(0, 0, HW, H); c.restore();
}
const BPOOL = ["255,176,74", "95,240,216", "255,111,154", "255,210,122", "122,200,255"];
type BL = [number, string];
const BOK_D: BL[] = [[150, "255,110,60"], [200, "255,138,106"], [254, "255,110,60"], [124, "255,190,110"], [420, "95,240,216"], [470, "255,190,110"], [520, "255,210,122"], [545, "60,220,190"], [690, "255,176,74"], [800, "255,190,110"], [820, "255,140,90"], [990, "95,240,216"], [1040, "95,240,216"], [1092, "255,190,110"], [1250, "255,170,90"], [1258, "255,176,74"], [1030, "255,111,154"], [96, "95,240,216"]];
const BOK_M: BL[] = [[178, "255,176,74"], [190, "255,170,90"], [341, "95,240,216"], [360, "255,170,90"], [497, "255,111,154"], [520, "255,170,90"], [755, "255,90,90"], [800, "255,80,60"], [636, "93,255,154"], [270, "184,200,255"], [870, "255,111,154"]];
const BOK_A: BL[] = [[125, "255,180,100"], [146, "93,255,154"], [215, "95,240,216"], [260, "95,240,216"], [330, "93,255,154"]];
const DISCS = new Map<string, HTMLCanvasElement>();
function disc(rgb: string): HTMLCanvasElement {
  const have = DISCS.get(rgb); if (have) return have;
  const s = document.createElement("canvas"); s.width = 32; s.height = 32; const x = s.getContext("2d");
  if (x) { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, `rgba(${rgb},0.45)`); g.addColorStop(0.72, `rgba(${rgb},0.55)`); g.addColorStop(0.86, `rgba(${rgb},0.85)`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.fillRect(0, 0, 32, 32); }
  DISCS.set(rgb, s); return s;
}
function bakeBokeh(c: Ctx, lights: BL[], seed: number): void {
  const span = (c.canvas.width - 400) / 1.3;
  const all: BL[] = lights.slice();
  for (let i = 0; i < Math.floor(span / 28); i++) all.push([h1(seed + i * 3.7) * span, BPOOL[i % BPOOL.length] ?? "255,176,74"]);
  c.save(); c.globalCompositeOperation = "lighter";
  all.forEach((l: BL, i: number) => {
    const hh = c.canvas.height; const r = (3 + h1(seed + i * 1.7) * 6) * Math.sqrt(hh / 28); const px = l[0] * 1.3 - 30 + (h1(seed + i * 9.1) - 0.5) * 24; const py = hh * 0.43 + (h1(seed + i * 5.3) - 0.5) * hh * 0.5;
    c.globalAlpha = 0.35 + h1(seed + i * 2.9) * 0.5; c.drawImage(disc(l[1]), px - r, py - r, r * 2, r * 2);
  });
  c.restore();
}
function bakeTop(c: Ctx, seed: number): void {
  const w = c.canvas.width;
  for (let k = 0; k < w / 110; k++) {
    const x0 = k * 110 + h1(seed + k) * 40; const x1 = x0 + 90 + h1(seed + k * 2) * 90; const y = 1 + h1(seed + k * 3) * 8; const sag = 6 + h1(seed + k * 4) * 16;
    for (let x = Math.floor(x0); x <= x1; x++) R(c, x, y + Math.sin(Math.PI * (x - x0) / (x1 - x0)) * sag, 1, 1, "#04070a");
  }
  for (let k = 0; k < w / 80; k++) {
    const x0 = k * 80 + h1(seed + k * 5) * 50; const cw = 8 + Math.floor(h1(seed + k * 6) * 24); const mx = 10 + h1(seed + k) * 28;
    R(c, x0 - 2, 0, cw + 4, 3, "#050b07");
    for (let i = 0; i < cw; i++) {
      const len = 3 + Math.floor(h1(seed + k * 7 + i * 1.3) * mx);
      R(c, x0 + i, 0, 1, len, i % 3 === 0 ? "#0a170d" : "#06100a");
      if (h1(seed + i * 2.1 + k * 11) > 0.75) R(c, x0 + i - 1, len - 2, 3, 2, "#0c1f10");
    }
  }
  for (let k = 0; k < w / 170; k++) {
    const x = k * 170 + 50 + h1(seed + k * 13) * 70; const len = 10 + h1(seed + k * 14) * 16;
    R(c, x, 0, 1, len, "#04070a"); R(c, x - 1, len, 3, 3, "#ffcf7a");
    c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.8; c.drawImage(glowSprite("255,200,120"), x - 9, len - 8, 20, 20); c.restore();
  }
}
const ADC: Record<string, string> = { sun: "#ffb04a", koi: "#ff8a6a", eye: "#5ff0d8", heart: "#ff6f9a", moon: "#a8b8ff" };
const ADT: Record<string, [string, string]> = { sun: ["HALCYON", "BOTTLED SUN"], koi: ["KOI KOI", "NOODLE"], eye: ["SENTRY", "WE SEE YOU SAFE"], heart: ["MERIDIAN", "FEEL AGAIN"], moon: ["DREAMLINE", "SLEEP DEEPER"] };
const HEART = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
function holoAd(b: Ctx, x: number, y: number, w: number, h: number, kind: string, t: number, seed: number): void {
  if (x < -w - 20 || x > W + 20) return;
  const col = ADC[kind] ?? "#5ff0d8"; const txt = ADT[kind] ?? ["", ""];
  const on = flick(t, seed); const jx = h1(Math.floor(t * 10) + seed) > 0.93 ? 2 : 0;
  const cx = x + Math.floor(w / 2); const cy = y + Math.floor(h * 0.4);
  b.save(); b.globalAlpha = 0.5; R(b, x, y, w, h, "#021014"); b.restore();
  R(b, x + Math.floor(w / 2), y + h, 1, 160 - y - h, "#0a1418");
  if (on) {
    b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.85;
    if (kind === "sun") { for (let a = 0; a < 30; a++) { const an = Math.PI + (a / 29) * Math.PI; R(b, cx + Math.cos(an) * 9 + jx, cy + 4 + Math.sin(an) * 9, 1, 1, col); } for (let k = 0; k < 5; k++) { const an = Math.PI + (k + 0.5) / 5 * Math.PI + t * 0.3; R(b, cx + Math.cos(an) * 13 + jx, cy + 4 + Math.sin(an) * 13, 1, 1, "#ffe0a0"); } R(b, cx - 12 + jx, cy + 4, 25, 1, col); }
    else if (kind === "koi") { const sw = Math.round(Math.sin(t * 3) * 2); for (let i = 0; i < 12; i++) R(b, cx - 6 + i + jx, cy + Math.round(Math.sin(t * 3 - i * 0.5) * (i * 0.2)) - (i > 2 && i < 9 ? 2 : 1), 1, i > 2 && i < 9 ? 4 : 2, i % 4 === 1 ? "#ffffff" : col); R(b, cx + 6 + jx, cy - 2 + sw, 2, 1, col); R(b, cx + 6 + jx, cy + 2 - sw, 2, 1, col); }
    else if (kind === "eye") { const bl = Math.sin(t * 0.9 + seed) > 0.95; for (let i = -10; i <= 10; i++) { const e = Math.round((1 - (i * i) / 100) * (bl ? 1 : 5)); R(b, cx + i + jx, cy - e, 1, 1, col); R(b, cx + i + jx, cy + e, 1, 1, col); } if (!bl) { const lx = Math.round(Math.sin(t * 0.6) * 4); R(b, cx - 2 + lx + jx, cy - 2, 5, 5, col); R(b, cx + lx + jx, cy, 1, 1, "#021014"); } }
    else if (kind === "heart") { const pu = Math.sin(t * 4) > 0.5 ? 1 : 0; HEART.forEach((row: string, ry: number) => { for (let rx = 0; rx < row.length; rx++) if (row.charAt(rx) === "1") R(b, cx - 7 - pu + rx * 2 + jx, cy - 6 + ry * 2, 2 + pu, 2, col); }); }
    else { for (let a = 0; a < 26; a++) { const an = (a / 25) * Math.PI * 1.4 + 2.2; R(b, cx + Math.cos(an) * 7 + jx, cy + Math.sin(an) * 7, 1, 1, col); } for (let a = 0; a < 18; a++) { const an = (a / 17) * Math.PI * 1.4 + 2.2; R(b, cx + 3 + Math.cos(an) * 6 + jx, cy - 1 + Math.sin(an) * 6, 1, 1, "#021014"); } R(b, cx + 8, cy - 7, 1, 1, "#ffffff"); }
    b.restore();
    const t0 = txt[0]; const t1 = txt[1];
    const show = Math.floor(t / 2.5 + seed) % 2 === 0 ? t0 : t1;
    ptext(b, show, cx - Math.floor((show.length * 4 - 1) / 2) + jx, y + h - 8, col, 1);
    for (let yy = y; yy < y + h; yy += 2) R(b, x, yy, w, 1, "rgba(0,0,0,0.22)");
    glowRect(b, x, y, w, h, col, 0.28); glow(b, cx, cy, Math.max(w, h) * 0.9, kind === "moon" ? "168,184,255" : kind === "eye" ? "95,240,216" : kind === "heart" ? "255,111,154" : "255,170,90", 0.22);
  } else { b.save(); b.globalAlpha = 0.3; R(b, x + 2, y + 2, w - 4, h - 4, col); b.restore(); }
}
function vneon(b: Ctx, s: string, x: number, y: number, col: string, t: number, seed: number): void {
  if (x < -20 || x > W + 20) return;
  const on = flick(t, seed);
  R(b, x - 2, y - 2, 8, s.length * 7 + 2, "#071014");
  for (let i = 0; i < s.length; i++) ptext(b, s.charAt(i), x + 1, y + i * 7, on ? col : "#1e2a2c", 1);
  if (on) glowRect(b, x, y, 4, s.length * 7 - 2, col, 0.8);
}
const MADS = [{ x: 140, y: 52, w: 10, h: 22, c: "255,111,154" }, { x: 330, y: 40, w: 18, h: 10, c: "95,240,216" }, { x: 520, y: 60, w: 9, h: 26, c: "255,176,74" }, { x: 700, y: 46, w: 20, h: 12, c: "122,200,255" }, { x: 880, y: 58, w: 10, h: 20, c: "255,111,154" }];
function midAds(b: Ctx, midX: number, t: number): void {
  for (const a of MADS) {
    const x = Math.round(a.x - midX); if (x < -30 || x > W + 10) continue;
    const on = flick(t, a.x);
    R(b, x, a.y, a.w, a.h, on ? `rgba(${a.c},0.7)` : "#0a1418");
    if (on) { glow(b, x + a.w / 2, a.y + a.h / 2, a.w + 12, a.c, 0.35); for (let k = 1; k < a.h - 1; k += 3) R(b, x + 1, a.y + k, Math.max(1, a.w - 2 - ((k * 7 + Math.floor(t * 2)) % 5)), 1, "rgba(255,255,255,0.4)"); }
  }
}
function holoKoi(b: Ctx, t: number, cam: number): void {
  const span = W + 240; const x0 = ((((t * 5 - cam * 0.08) % span) + span) % span) - 90; const y0 = 50 + Math.sin(t * 0.3) * 6;
  glow(b, x0 - 22, y0, 34, "255,150,90", 0.14);
  b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.24;
  for (let i = 0; i < 28; i++) { const wv = Math.sin(t * 1.8 - i * 0.3) * (i * 0.18); const th = Math.max(1, Math.round(6 - Math.abs(i - 7) * 0.32)); R(b, x0 - i * 2, y0 + wv - th, 2, th * 2, i % 6 === 2 ? "#ff8a4a" : "#ffd6b0"); }
  const tw = Math.sin(t * 1.8 - 8.4) * 5;
  for (let k = 0; k < 8; k++) { R(b, x0 - 56 - k, y0 + tw - 1 - k, 1, 2, "#ff7a4a"); R(b, x0 - 56 - k, y0 + tw + k, 1, 2, "#ff7a4a"); }
  for (let k = 0; k < 4; k++) R(b, x0 - 10 - k, y0 + 5 + k, 1, 1, "#ffb08a");
  b.restore();
}
function drawFly(b: Ctx, cam: number, t: number): void {
  const f = G.fly; if (!f) return;
  const X = Math.round(f.x - cam); const Y = Math.round(f.y + Math.sin(t * 3) * 1.5); const d = f.dir;
  if (X < -120 || X > W + 120) return;
  const hx = d > 0 ? X + 14 : X - 14;
  b.save(); b.globalCompositeOperation = "lighter";
  const cg = b.createLinearGradient(hx, Y, hx + d * 50, FEET); cg.addColorStop(0, "rgba(255,244,210,0.32)"); cg.addColorStop(1, "rgba(255,244,210,0)");
  b.fillStyle = cg; b.beginPath(); b.moveTo(hx, Y + 1); b.lineTo(hx + d * 70, FEET + 4); b.lineTo(hx + d * 18, FEET + 4); b.closePath(); b.fill();
  b.fillStyle = "rgba(255,248,225,0.5)";
  for (let i = 0; i < 14; i++) { const p = h1(i * 3.3 + Math.floor(t * 6)); const yy = Y + 4 + p * (FEET - Y - 6); const span = 18 + (yy - Y) * 0.8; b.fillRect(Math.round(hx + d * (10 + h1(i * 7.1 + Math.floor(t * 6)) * span)), Math.round(yy), 1, 3); }
  b.restore();
  glow(b, hx + d * 44, FEET + 2, 26, "255,240,200", 0.35 * clamp(1 - Math.abs(Y - 106) / 40, 0.3, 1));
  R(b, X - 13, Y - 2, 26, 4, "#1c2630"); R(b, X - 7, Y - 5, 12, 3, "#26323e"); R(b, X - 5, Y - 4, 8, 1, "#5ff0d8");
  R(b, X - 11, Y + 2, 22, 1, "#0a1016"); R(b, X - 9, Y + 3, 4, 1, "#3df5d0"); R(b, X + 5, Y + 3, 4, 1, "#3df5d0");
  glow(b, X - 7, Y + 4, 8, "61,245,208", 0.6); glow(b, X + 7, Y + 4, 8, "61,245,208", 0.6);
  R(b, hx - (d > 0 ? 1 : 0), Y - 1, 2, 2, "#fff6d0"); glow(b, hx, Y, 12, "255,246,208", 0.9);
  R(b, d > 0 ? X - 14 : X + 13, Y - 1, 1, 2, "#ff4a4a"); glow(b, d > 0 ? X - 14 : X + 13, Y, 6, "255,74,74", 0.7);
}
function drawParts(b: Ctx, cam: number): void {
  for (const p of G.parts) { b.globalAlpha = clamp(p.l / p.m, 0, 1) * 0.6; R(b, p.x - cam, p.y, 1, 1, p.c); }
  b.globalAlpha = 1;
}
function drawFg(f: Ctx, cc: Caches): void {
  const g = G; const cam = g.cam; const L = g.loc;
  f.setTransform(1, 0, 0, 1, 0, 0); f.globalAlpha = 1; f.globalCompositeOperation = "source-over";
  f.clearRect(0, 0, W, H);
  const top = L === "district" ? cc.topD : L === "market" ? cc.topM : null;
  if (top) f.drawImage(top, Math.round(cam * 1.2), 0, W, top.height, 0, 0, W, top.height);
  if (!SIL) { SIL = document.createElement("canvas"); SIL.width = 100; SIL.height = 45; }
  const sc = SIL.getContext("2d");
  if (sc) {
    sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, 100, 45); let any = false;
    for (const p of g.peds) {
      if (p.loc !== L || p.lane !== 2 || (!g.gfx && p.half)) continue;
      const span = W + 160; const sx = ((((p.x - cam) * 1.6) % span) + span) % span - 80;
      if (sx < -40 || sx > W + 40) continue; any = true;
      sc.save(); sc.translate(sx / 4, 47); sc.scale(0.4, 0.4);
      drawPerson(sc, 0, 0, p.look, p.dir, (p.x * p.dir) / (strideK(p.sp / (p.look.h / 31)) * p.look.h / 31), true, p.sp / (p.look.h / 31));
      if (p.kind === "umb") umbrella(sc, p.dir * 2, -p.look.h - 2, 10, "#030507", "");
      sc.restore();
    }
    if (any) { f.save(); f.imageSmoothingEnabled = true; f.globalAlpha = 0.82; f.drawImage(SIL, 0, 0, 100, 45, 0, 0, 400, 180); f.restore(); }
  }
  if (!g.gfx) return;
  const bk = L === "district" ? cc.bokD : L === "market" ? cc.bokM : L === "pier" ? cc.bokP : cc.bokA; const bh = bk.height;
  const gy = H - Math.round(bh * 0.6);
  const gr = f.createLinearGradient(0, gy, 0, H); gr.addColorStop(0, "rgba(2,6,8,0)"); gr.addColorStop(1, "rgba(2,6,8,0.6)");
  f.fillStyle = gr; f.fillRect(0, gy, W, H - gy);
  f.globalCompositeOperation = "lighter"; f.globalAlpha = L === "apt" || L === "lab" ? 0.4 : 0.75 + Math.sin(g.t * 0.7) * 0.08;
  f.drawImage(bk, Math.round(cam * 1.3), 0, W, bh, 0, H - bh, W, bh);
  f.globalAlpha = 1; f.globalCompositeOperation = "source-over";
  if (L === "district" || L === "pier") {
    f.fillStyle = "rgba(210,240,235,0.2)"; const span = W + 60;
    for (let i = 0; i < 22; i++) { const x = ((((h1(i * 4.1) * span - cam * 1.5 - g.t * 40) % span) + span) % span) - 30; const y = ((h1(i * 2.7) * (H + 20) + g.t * (300 + h1(i) * 90)) % (H + 20)) - 10; f.fillRect(Math.round(x), Math.round(y), 1, 10); }
  }
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
  const g = c.createLinearGradient(0, 30, 0, FEET); g.addColorStop(0, "rgba(40,90,120,0.2)"); g.addColorStop(1, "rgba(70,140,160,0.6)");
  c.fillStyle = g; c.fillRect(0, 0, FW, H); c.restore();
}
function bakeMid(c: Ctx): void {
  for (const bd of genLayer(50, MW, 16, 40, 60, 135)) {
    const top = FEET - bd.h;
    R(c, bd.x, top, bd.w, bd.h, "#08121a"); R(c, bd.x, top, 1, bd.h, "#122230");
    if (h1(bd.s + 1) > 0.6) R(c, bd.x + 3, top - 6, 1, 6, "#122230");
    if (h1(bd.s + 21) > 0.65 && bd.w > 20) { R(c, bd.x + bd.w - 12, top - 7, 8, 6, "#0c1820"); R(c, bd.x + bd.w - 11, top - 1, 1, 1, "#0c1820"); R(c, bd.x + bd.w - 6, top - 1, 1, 1, "#0c1820"); }
    if (h1(bd.s + 23) > 0.7) { R(c, bd.x + 3, top - 7, 1, 1, "#ff4a4a"); glow(c, bd.x + 3, top - 7, 4, "255,74,74", 0.6); }
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
// apartment, scaled to Elias (31 px): desk 14, door 36, chair seat 8
function bakeApt(c: Ctx): void {
  R(c, 0, 0, 360, FEET, "#15181b");
  for (let x = 0; x < 360; x += 8) R(c, x, 80, 1, FEET - 80, "#191d21");
  R(c, 0, 0, 360, 78, "#0a0b0d"); R(c, 0, 78, 360, 2, "#22282c"); R(c, 0, 80, 360, 1, "#101315");
  R(c, 0, 71, 360, 2, "#1c2226"); R(c, 0, 71, 360, 1, "#2a3238"); for (let x = 30; x < 360; x += 70) R(c, x, 70, 3, 4, "#2a3238");
  R(c, 0, 152, 360, 8, "#121518"); R(c, 0, 152, 360, 1, "#1e2428");
  // window
  c.clearRect(196, 96, 80, 46);
  R(c, 193, 93, 86, 3, "#2a2420"); R(c, 193, 93, 3, 50, "#2a2420"); R(c, 276, 93, 3, 50, "#2a2420");
  R(c, 191, 142, 90, 3, "#3a2e24"); R(c, 191, 142, 90, 1, "#5a4634");
  R(c, 235, 96, 2, 46, "#2a2420"); R(c, 196, 118, 80, 2, "#2a2420");
  vines(c, 196, 96, 80, 9, 3); plant(c, 199, 141, 14, 4); plant(c, 262, 141, 12, 5);
  // hanging plant
  R(c, 172, 80, 1, 16, "#1a1a1a"); R(c, 168, 96, 9, 5, "#5a3424"); R(c, 168, 96, 9, 1, "#7a4a30");
  for (let k = 0; k < 9; k++) R(c, 168 + k, 101, 1, 3 + Math.floor(h1(k * 3.3) * 11), GREENS[k % 4] ?? "#245a32");
  // bed + shelf + picture
  R(c, 22, 96, 18, 13, "#0c1012"); R(c, 23, 97, 16, 11, "#2a4a4a"); R(c, 23, 104, 16, 4, "#1a2a2a"); R(c, 27, 100, 3, 3, "#c8a060");
  R(c, 6, 120, 46, 2, "#3a2a1c"); R(c, 6, 120, 46, 1, "#5a4028");
  for (let k = 0; k < 9; k++) R(c, 8 + k * 4 + (k > 5 ? 3 : 0), 113 + (k % 3), 3, 7 - (k % 3), ["#6a2a2a", "#2a4a5a", "#5a5a2a", "#3a2a4a"][k % 4] ?? "#444");
  R(c, 3, 138, 4, 22, "#3a2618"); R(c, 3, 138, 4, 1, "#5a3a22");
  R(c, 7, 151, 48, 6, "#2a2030"); R(c, 7, 150, 48, 1, "#4a3a52"); R(c, 7, 149, 12, 3, "#c8c0b0"); R(c, 7, 149, 12, 1, "#e8e0d0");
  R(c, 20, 150, 35, 5, "#3a2a48"); R(c, 20, 150, 35, 1, "#5a4a6a"); R(c, 7, 157, 48, 3, "#2a1a10"); R(c, 52, 148, 3, 12, "#3a2618");
  // desk: top 146, legs to the floor, drawer unit at x70
  R(c, 66, 146, 92, 2, "#6a4428"); R(c, 66, 146, 92, 1, "#a87048"); R(c, 67, 148, 2, 12, "#3a2618"); R(c, 155, 148, 2, 12, "#3a2618");
  R(c, 70, 148, 16, 11, "#3a2618"); R(c, 70, 153, 16, 1, "#2a1a10"); R(c, 76, 150, 4, 1, "#c8a060"); R(c, 76, 156, 4, 1, "#8a6a40");
  // lamp
  R(c, 118, 144, 8, 2, "#3a3a3a"); R(c, 121, 137, 1, 7, "#2a2a2a"); R(c, 117, 134, 8, 3, "#3a3a3a"); R(c, 117, 134, 8, 1, "#4a4a4a");
  // terminal
  R(c, 136, 131, 22, 12, "#20262a"); R(c, 137, 132, 20, 10, "#061210"); R(c, 145, 143, 4, 3, "#20262a"); R(c, 138, 145, 14, 1, "#2a3034");
  // door + EXIT
  R(c, 322, 121, 24, 39, "#2a1e16"); R(c, 325, 124, 18, 36, "#3a2a1e"); R(c, 329, 128, 10, 8, "#2a1e14"); R(c, 329, 140, 10, 14, "#33251a"); R(c, 340, 142, 2, 2, "#c8a060");
  ptext(c, "EXIT", 327, 114, "#5dff9a", 1); glowRect(c, 327, 114, 15, 5, "#5dff9a", 0.5);
  for (let row = 0, y = FEET; y < H; y += 3, row++) {
    R(c, 0, y, 360, 3, row % 2 === 0 ? "#2e2014" : "#24180e");
    for (let x = (row % 3) * 9; x < 360; x += 26) R(c, x, y, 1, 3, "#160e08");
  }
  R(c, 0, FEET, 360, 1, "#5a4028");
  R(c, 200, 150, 60, 10, "#1a2228"); R(c, 196, 146, 68, 4, "#2a3640"); R(c, 196, 146, 68, 1, "#3a4a56");
}
function bakeDistrict(c: Ctx): void {
  bldg(c, 0, 132, 6, "#0b1219", 11, 100);
  R(c, 30, 122, 24, 38, "#1a140e"); R(c, 32, 124, 20, 36, "#2a1e16"); R(c, 41, 124, 1, 36, "#1a140e"); R(c, 34, 128, 5, 6, "#22180f"); R(c, 44, 128, 5, 6, "#22180f"); R(c, 39, 142, 1, 2, "#c8a060"); R(c, 43, 142, 1, 2, "#c8a060");
  R(c, 26, 118, 32, 4, "#22303a"); R(c, 26, 118, 32, 1, "#3a4a56");
  glow(c, 42, 126, 20, "255,170,90", 0.5);
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

// ---------- Mission 002: Tidewater Pier (exterior) and Lab 7 (interior) ----------
const PLAMPS = [130, 450, 780, 980];
const BOK_P: BL[] = [[150, "255,150,60"], [360, "255,176,74"], [586, "255,111,154"], [612, "255,240,220"], [863, "255,176,74"], [1010, "95,240,216"], [1072, "93,255,154"], [130, "255,190,110"], [450, "255,190,110"], [780, "255,190,110"], [980, "255,190,110"]];
// lit container windows on the pier (x, y, seed) for the moving silhouettes
const PWINS: number[][] = [[478, 120, 0.11], [492, 120, 0.37], [520, 120, 0.21], [572, 106, 0.43], [588, 106, 0.29], [618, 106, 0.07], [636, 124, 0.33], [512, 80, 0.47], [540, 80, 0.19]];
function bakePier(c: Ctx): void {
  // seawall + open gate
  R(c, 0, 62, 24, 98, "#1a2426"); R(c, 0, 62, 24, 2, "#2e3c40"); for (let y = 70; y < 160; y += 9) R(c, 0, y, 24, 1, "#141c1e");
  ptext(c, "SEA", 4, 74, "#4a6a6a", 1); ptext(c, "WALL", 3, 82, "#4a6a6a", 1);
  for (let x = 24; x < 30; x++) for (let y = 110; y < 158; y += 2) R(c, x + (y % 4 === 0 ? 1 : 0), y, 1, 1, "#3a4a4e");
  R(c, 24, 108, 2, 52, "#2a3436");
  R(c, 34, 92, 52, 12, "#2a2018"); R(c, 34, 92, 52, 1, "#5a4630"); ptext(c, "TIDEWATER", 37, 95, "#d8c8a0", 1); R(c, 44, 104, 1, 56, "#1a140e"); R(c, 76, 104, 1, 56, "#1a140e");
  // boardwalk deck + rail behind the walkway
  R(c, 0, FEET - 3, 1100, 3, "#3a2a1c"); R(c, 0, FEET - 3, 1100, 1, "#6a5236");
  R(c, 30, FEET - 15, 1070, 1, "#4a4038"); R(c, 30, FEET - 9, 1070, 1, "#2a241e");
  for (let x = 30; x < 1100; x += 14) R(c, x, FEET - 15, 1, 12, "#2a241e");
  // Sol's camp: tarp lean-to, crates, tally board
  for (let x = 96; x < 226; x++) { const y = Math.round(104 + (x - 96) * 0.08); R(c, x, y, 1, 3, (Math.floor(x / 9) % 3 === 0) ? "#3a5a6a" : (Math.floor(x / 9) % 3 === 1) ? "#2a4a5a" : "#5a4a3a"); }
  R(c, 96, 104, 2, 56, "#2a1e14"); R(c, 224, 114, 2, 46, "#2a1e14");
  R(c, 104, 140, 16, 20, "#3a2a1a"); R(c, 104, 140, 16, 1, "#6a5030"); R(c, 120, 146, 12, 14, "#2e2416");
  R(c, 144, 144, 12, 16, "#2a2a2a"); R(c, 144, 144, 12, 2, "#4a4a44"); R(c, 144, 150, 12, 1, "#1a1a1a");
  R(c, 196, 118, 22, 16, "#3a3022"); R(c, 196, 118, 22, 1, "#5a4a32");
  for (let k = 0; k < 14; k++) R(c, 198 + (k % 7) * 3, 121 + Math.floor(k / 7) * 6, 1, 4, "#d8d0b0");
  for (let k = 0; k < 2; k++) R(c, 197 + k * 10, 123 + k * 6, 9, 1, "#d8d0b0");
  // Juno's grill
  stall(c, 310, 110, "#8a2a1a", "#5a1a10", 61);
  R(c, 330, 132, 70, 4, "#2a2a2a"); R(c, 330, 132, 70, 1, "#5a5a5a");
  // container shanty of the Forgotten
  const cont = (x: number, y: number, w: number, h: number, col: string): void => { R(c, x, y, w, h, col); R(c, x, y, w, 1, mixHex(col, "#ffffff", 0.2)); for (let k = 2; k < w; k += 3) R(c, x + k, y + 1, 1, h - 1, mixHex(col, "#000000", 0.25)); };
  cont(470, 114, 90, 46, "#2a3a3a"); cont(560, 100, 100, 60, "#4a2a22"); cont(500, 74, 72, 40, "#1e2e3a");
  for (const w of PWINS) { const x = w[0] ?? 0; const y = w[1] ?? 0; R(c, x, y, 8, 6, (w[2] ?? 0) > 0.3 ? "#f0a64e" : "#ffd27a"); R(c, x, y + 4, 8, 2, "rgba(0,0,0,0.3)"); glowRect(c, x, y, 8, 6, "#f0a64e", 0.35); }
  for (let x = 568; x < 652; x++) R(c, x, 96 + Math.round(Math.sin(Math.PI * (x - 568) / 84) * 4), 1, 1, "#141414");
  for (let k = 0; k < 7; k++) R(c, 574 + k * 11, 98 + Math.round(Math.sin(Math.PI * (k * 11 + 6) / 84) * 4), 4, 6, ["#c8c0b0", "#6a2a3a", "#2a4a6a", "#d8b040"][k % 4] ?? "#888");
  R(c, 600, 140, 30, 20, "#1a1010"); R(c, 602, 142, 26, 18, "#2a1814"); glow(c, 615, 150, 26, "255,170,90", 0.5);
  plant(c, 476, 112, 14, 71); plant(c, 640, 98, 16, 72);
  // crane + AURELION crates
  R(c, 800, 40, 4, 120, "#2a2e30"); for (let y = 44; y < 160; y += 8) { R(c, 800, y, 4, 1, "#3a4044"); R(c, 801, y + 2, 2, 1, "#1a1e20"); }
  R(c, 790, 40, 150, 3, "#2a2e30"); for (let x = 790; x < 940; x += 6) R(c, x, 41, 1, 2, "#1a1e20");
  R(c, 900, 43, 1, 50, "#141818"); R(c, 897, 93, 7, 3, "#3a3a3a");
  R(c, 852, 146, 40, 14, "#c8c0b0"); R(c, 852, 146, 40, 1, "#e8e0d0"); R(c, 852, 152, 40, 1, "#a8a090"); ptext(c, "M-BATCH", 858, 150, "#5a2a1a", 1);
  R(c, 896, 136, 30, 24, "#a8a090"); R(c, 896, 136, 30, 1, "#d8d0c0"); R(c, 908, 141, 6, 6, "#ffb04a");
  // pump house (Lab 7 above ground)
  R(c, 956, 80, 144, 4, "#3a4244"); R(c, 960, 84, 140, 76, "#2a3030");
  for (let y = 88; y < 160; y += 6) R(c, 960, y, 140, 1, "#242a2a");
  for (let k = 0; k < 9; k++) R(c, 966 + k * 15, 84, 2, 14 + Math.floor(h1(k * 3.7) * 30), "#4a2e1e");
  R(c, 964, 88, 62, 9, "#1a2020"); ptext(c, "PUMP STATION 7", 966, 90, "#c8b890", 1);
  R(c, 1010, 114, 44, 46, "#3a2a20"); for (let y = 116; y < 160; y += 4) R(c, 1010, y, 44, 1, "#2a1e16"); R(c, 1031, 114, 2, 46, "#8a6a40");
  for (let y = 116; y < 158; y += 5) R(c, 1030, y, 4, 2, "#c89a50");
  R(c, 1078, 132, 8, 10, "#1a2024"); R(c, 1078, 132, 8, 1, "#3a4448"); R(c, 1080, 142, 2, 16, "#1a2024");
  R(c, 1062, 157, 22, 3, "#151515"); R(c, 1062, 157, 22, 1, "#3a3a34");
  for (const lx of PLAMPS) { R(c, lx, 112, 1, 46, "#1c242c"); R(c, lx, 112, 6, 1, "#1c242c"); R(c, lx + 4, 113, 3, 1, "#ffe0a0"); }
  R(c, 248, 112, 1, 34, "#2a2418"); R(c, 248, 112, 12, 1, "#2a2418");
}
function bakeLab(c: Ctx): void {
  R(c, 0, 0, 520, FEET, "#0a1416");
  for (let x = 0; x < 520; x += 26) R(c, x, 22, 1, FEET - 22, "#0e1c1e");
  for (let y = 40; y < FEET; y += 30) R(c, 0, y, 520, 1, "#0c191b");
  R(c, 0, 0, 520, 20, "#05090a"); R(c, 0, 20, 520, 3, "#1a2a2a"); R(c, 0, 26, 520, 2, "#142224");
  for (let k = 0; k < 9; k++) { const x = 60 + k * 54; for (let y = 28; y < 40 + (k % 3) * 8; y++) R(c, x + Math.round(Math.sin(y * 0.3 + k) * 1.5), y, 1, 1, "#081012"); }
  R(c, 18, 0, 26, 20, "#020304"); R(c, 24, 20, 2, 140, "#3a4448"); R(c, 36, 20, 2, 140, "#3a4448"); for (let y = 26; y < 160; y += 8) R(c, 24, y, 14, 1, "#4a5458");
  ptext(c, "AURELION", 262, 32, "#c8b890", 2); ptext(c, "MEMORY DIVISION LAB 7", 262, 46, "#5a7a78", 1);
  for (let i = 0; i < 6; i++) {
    const x = 84 + i * 26;
    R(c, x - 1, 96, 20, 4, "#2a3436"); R(c, x, 100, 18, 56, "#1a2a2c"); R(c, x + 2, 104, 14, 50, "#0c3234"); R(c, x + 2, 104, 1, 50, "#2a5a5a");
    R(c, x - 1, 154, 20, 6, "#2a3436"); R(c, x + 4, 156, 10, 1, "#5ff0d8");
    ptext(c, "M-0" + (i + 1), x + 1, 88, i === 5 ? "#ff8a6a" : "#5a8a88", 1);
    for (let k = 0; k < 3; k++) R(c, x + 5 + k * 4, 20, 1, 76, "#0a1416");
  }
  R(c, 84 + 5 * 26 + 14, 104, 6, 50, "#123a3c");
  R(c, 256, 60, 156, 96, "#0c1618"); for (let y = 70; y < 156; y += 10) R(c, 256, y, 156, 1, "#1a2628");
  R(c, 316, 132, 34, 3, "#2a3436"); R(c, 320, 114, 26, 18, "#141c1e"); R(c, 322, 116, 22, 14, "#04100c"); R(c, 318, 135, 2, 25, "#1a2224"); R(c, 346, 135, 2, 25, "#1a2224");
  R(c, 368, 112, 38, 48, "#3a3a32"); R(c, 368, 112, 38, 1, "#5a5a4a");
  for (let r = 0; r < 5; r++) for (let q2 = 0; q2 < 4; q2++) { R(c, 370 + q2 * 9, 115 + r * 9, 8, 8, "#2e2e28"); R(c, 373 + q2 * 9, 118 + r * 9, 2, 1, "#a89a6a"); }
  R(c, 436, 146, 54, 6, "#3a3430"); R(c, 438, 143, 50, 4, "#5a3a3a"); R(c, 438, 143, 12, 3, "#c8c0b0"); R(c, 436, 152, 2, 8, "#2a2420"); R(c, 488, 152, 2, 8, "#2a2420");
  R(c, 496, 136, 18, 24, "#3a2a1e"); R(c, 496, 136, 18, 1, "#6a5030"); R(c, 500, 130, 6, 6, "#5a5a5a"); R(c, 507, 132, 5, 4, "#6a2a2a"); R(c, 507, 128, 5, 4, "#2a4a6a");
  plant(c, 440, 130, 12, 81); R(c, 440, 130, 12, 2, "#5a3424");
  for (let k = 0; k < 5; k++) { R(c, 452 + k * 9, 100, 1, 8 + (k % 2) * 4, "#2a2a2a"); R(c, 450 + k * 9, 108 + (k % 2) * 4, 5, 2, "#e8e4dc"); }
  R(c, 476, 116, 1, 20, "#1a1a1a"); R(c, 472, 112, 9, 4, "#5a5030");
  for (let row = 0, y = FEET; y < H; y += 3, row++) R(c, 0, y, 520, 3, row % 2 === 0 ? "#08100f" : "#060c0c");
  R(c, 0, FEET, 520, 1, "#2a4a48");
}
// Halcyon Tower across the bay: the only place in the city where the sun still reaches
function tower(b: Ctx, camC: number, t: number): void {
  const x = Math.round(W * 0.66 - camC * 0.04);
  b.globalAlpha = 0.9;
  R(b, x - 10, 96, 20, FEET - 96, "#0a1820"); R(b, x - 6, 62, 12, FEET - 62, "#0b1c26"); R(b, x - 3, 50, 6, 12, "#0d2230"); R(b, x, 44, 1, 6, "#0d2230");
  b.globalAlpha = 1;
  for (let y = 66; y < FEET - 10; y += 5) if (h1(y * 1.3) > 0.4) R(b, x - 4 + (y % 3) * 3, y, 1, 1, "#ffd27a");
  glow(b, x, 52, 34, "255,200,110", 0.5 + 0.08 * Math.sin(t * 0.8)); R(b, x - 1, 51, 3, 2, "#fff0c0");
  for (let k = 0; k < 6; k++) { b.globalAlpha = 0.4; R(b, x - 44 + k * 15 + Math.round(Math.sin(t * 0.15 + k) * 3), 58 + (k % 2), 18, 2, "#8aa8b0"); }
  b.globalAlpha = 1;
  if (Math.sin(t * 3) > 0.6) { R(b, x, 44, 1, 1, "#ff5a5a"); glow(b, x, 44, 5, "255,90,90", 0.8); }
}
function pierBack(b: Ctx, cam: number, t: number): void {
  const top = 124;
  const gw = b.createLinearGradient(0, top, 0, FEET); gw.addColorStop(0, "#0c2a2e"); gw.addColorStop(1, "#04141a");
  b.fillStyle = gw; b.fillRect(0, top, W, FEET - top); R(b, 0, top, W, 1, "#3a7a7a");
  for (let i = 0; i < 30; i++) { const x = ((h1(i * 3.1) * (W + 60) - cam * 0.5 + Math.sin(t * 0.6 + i) * 3) % (W + 60) + W + 60) % (W + 60) - 30; const y = top + 2 + (i % 7) * 5; b.globalAlpha = 0.22 + 0.16 * Math.sin(t * 2.2 + i); R(b, x, y, 3 + (i % 4) * 3, 1, i % 5 === 0 ? "#5ff0d8" : i % 3 === 0 ? "#ff8fb5" : "#ffcf7a"); }
  b.globalAlpha = 1;
  for (let k = 0; k < 3; k++) {
    const x = Math.round(((k * 380 + 120 - cam * 0.6) % 1000 + 1000) % 1000 - 200); if (x < -60 || x > W + 20) continue;
    const y = top + 3 + k * 2 + Math.round(Math.sin(t * 0.9 + k) * 1);
    R(b, x, y, 40, 4, "#06100f"); R(b, x + 8, y - 6, 16, 6, "#06100f"); R(b, x + 14, y - 22, 1, 16, "#06100f");
    R(b, x + 10, y - 4, 2, 2, "#ffcf7a"); glow(b, x + 11, y - 3, 8, "255,200,120", 0.6); R(b, x + 14, y - 23, 1, 1, "#ff5a5a");
  }
  if (G.gfx) { const lx = Math.round(30 - cam * 0.35); const a = t * 0.5; b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.07 + 0.05 * Math.max(0, Math.cos(a)); b.fillStyle = "#fff0d0"; b.beginPath(); b.moveTo(lx, 108); b.lineTo(lx + Math.cos(a) * 300, 100 + Math.sin(a) * 14 - 8); b.lineTo(lx + Math.cos(a) * 300, 100 + Math.sin(a) * 14 + 8); b.closePath(); b.fill(); b.restore(); R(b, lx - 2, 108, 5, 16, "#0a1618"); R(b, lx - 1, 106, 3, 2, "#fff0d0"); glow(b, lx, 107, 10, "255,240,210", 0.8); }
}
function vents(b: Ctx, cam: number, xs: number[], t: number): void {
  for (const vx of xs) { const sx = Math.round(vx - cam); if (sx < -20 || sx > W + 20) continue; R(b, sx - 1, FEET - 1, 7, 1, "#1a2224"); for (let i = 0; i < 8; i++) { const p = (t * 12 + i * 6) % 50; b.globalAlpha = 0.22 * (1 - p / 50); R(b, sx + Math.round(Math.sin(t + i) * 3), FEET - p, 4, 3, "#a8d0c8"); b.globalAlpha = 1; } }
}
function hangSign(b: Ctx, x: number, y: number, s: string, col: string, t: number, seed: number): void {
  if (x < -30 || x > W + 30) return;
  const sw = Math.round(Math.sin(t * 1.7 + seed) * (1 + windK(t)) * 1.2); const w = s.length * 4 + 3;
  R(b, x, y, 1, 4, "#1a1a1a"); R(b, x + w - 1, y, 1, 4, "#1a1a1a");
  R(b, x + sw, y + 4, w, 9, "#0a1014"); neon(b, s, x + sw + 2, y + 6, col, t, seed, 1);
}
function windK(t: number): number { return 0.5 + 0.5 * Math.sin(t * 0.23) * Math.sin(t * 0.07 + 1); }
function drawPierDyn(b: Ctx, cam: number): void {
  const t = G.t; const S = (x: number): number => Math.round(x - cam); const f = G.flags;
  winLife(b, cam, t, PWINS);
  neon(b, "JUNO GRILL", S(326), 84, "#ffb04a", t, 63, 1);
  holoAd(b, S(560), 34, 52, 34, "heart", t, 65);
  holoAd(b, S(840), 2 + 44, 46, 30, "sun", t, 67);
  holoAd(b, S(990), 46, 40, 28, "eye", t, 69);
  hangSign(b, S(252), 113, "BAIT", "#7affc0", t, 71);
  // barrel fire at Sol's camp
  { const sx = S(150); const fl = 0.7 + 0.3 * h1(Math.floor(t * 12)); glow(b, sx, 140, 28, "255,140,60", 0.7 * fl); for (let k = 0; k < 6; k++) { const p = (t * 1.4 + k / 6) % 1; R(b, sx - 4 + Math.round(h1(k + Math.floor(t * 3)) * 8), 143 - p * 14, 1, 2, p < 0.5 ? "#ffd06a" : "#ff6a3a"); } for (let k = 0; k < 3; k++) { const p = (t * 0.3 + k / 3) % 1; b.globalAlpha = 0.25 * (1 - p); R(b, sx - 2 + Math.round(Math.sin(t + k) * 3), 128 - p * 30, 3, 2, "#a8a8a0"); b.globalAlpha = 1; } }
  // grill smoke and steam over Juno's skewers
  for (let k = 0; k < 6; k++) { const p = (t * 0.5 + k / 6) % 1; b.globalAlpha = 0.3 * (1 - p); R(b, S(336 + k * 10) + Math.round(Math.sin(t * 1.5 + k) * 2 + p * 6 * windK(t)), 130 - p * 26, 3, 2, "#e8e0d0"); } b.globalAlpha = 1;
  for (let k = 0; k < 9; k++) { const on = h1(k + Math.floor(t * 4)) > 0.3; R(b, S(334 + k * 7), 131, 3, 1, on ? "#ff7a3a" : "#8a3a1a"); }
  // Wren's paper birds on strings
  for (let k = 0; k < 9; k++) { const x = S(560 + k * 9); const y = 100 + Math.round(Math.sin(Math.PI * (k * 9) / 84) * 4) + 6 + (k % 3) * 4; const sw = Math.round(Math.sin(t * 2 + k) * windK(t) * 2); R(b, x, y - 5 - (k % 3) * 4, 1, 5 + (k % 3) * 4, "#2a2a2a"); R(b, x - 2 + sw, y, 5, 1, "#e8e4dc"); R(b, x + sw, y - 1, 1, 1, "#e8e4dc"); }
  PLAMPS.forEach((lx: number, i: number) => { const sx = S(lx); if (sx < -50 || sx > W + 50) return; if (i === 1 && !flick(t, 97)) return; glow(b, sx + 5, 114, 36, "255,190,110", 0.55); b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.08; b.fillStyle = "#ffd8a0"; b.beginPath(); b.moveTo(sx + 4, 114); b.lineTo(sx + 18, FEET); b.lineTo(sx - 10, FEET); b.closePath(); b.fill(); b.restore(); });
  // coolant trail: faint synthetic-blue spots leading to the hatch
  for (let k = 0; k < 24; k++) { const x = 740 + k * 14 + Math.round(h1(k * 3.3) * 6); const a = 0.35 + 0.35 * Math.sin(t * 2 + k); b.globalAlpha = f.coolant ? a : a * 0.8; R(b, S(x), FEET - 2, 3, 1, "#3df5ff"); b.globalAlpha = 1; if (k % 4 === 0) glow(b, S(x) + 1, FEET - 2, 4, "61,245,255", 0.3); }
  const kp = Math.sin(t * 5) > 0; R(b, S(1080), 134, 4, 2, f.codeOk ? "#5dff9a" : kp ? "#ff4a4a" : "#5a1a1a"); glow(b, S(1082), 135, 6, f.codeOk ? "93,255,154" : "255,74,74", 0.6);
  if (f.codeOk) { R(b, S(1062), 154, 22, 3, "#020304"); glow(b, S(1073), 156, 14, "95,240,216", 0.6); }
  vents(b, cam, [480, 940], t);
}
function drawPierFront(b: Ctx, cam: number): void {
  const S = (x: number): number => Math.round(x - cam);
  for (const [x, w] of [[300, 30], [700, 22], [1090, 10]] as [number, number][]) { R(b, S(x), FEET - 6, w, 6, "#2a1e14"); R(b, S(x), FEET - 6, w, 1, "#5a4228"); }
}
function drawLabDyn(b: Ctx, cam: number): void {
  const t = G.t; const S = (x: number): number => Math.round(x - cam);
  { const sx = S(31); b.save(); b.globalCompositeOperation = "lighter"; const gr = b.createLinearGradient(0, 0, 0, FEET); gr.addColorStop(0, "rgba(150,200,230,0.22)"); gr.addColorStop(1, "rgba(150,200,230,0)"); b.fillStyle = gr; b.beginPath(); b.moveTo(sx - 12, 0); b.lineTo(sx + 12, 0); b.lineTo(sx + 30, FEET); b.lineTo(sx - 30, FEET); b.closePath(); b.fill(); b.restore(); }
  for (let i = 0; i < 6; i++) {
    const x = S(84 + i * 26); if (x < -24 || x > W + 4) continue;
    const pu = 0.5 + 0.5 * Math.sin(t * 1.1 + i * 0.7); const empty = i === 5;
    glow(b, x + 9, 128, 20, "80,240,210", 0.18 + 0.12 * pu);
    if (!empty) { R(b, x + 6, 110, 6, 3, "#3a2a2a"); R(b, x + 6, 113, 6, 6, "#4a8a82"); R(b, x + 5, 120, 8, 30, "#2a6a64"); R(b, x + 8, 116, 1, 1, "#0c3234"); }
    else { R(b, x + 4, 108, 1, 12, "#5ff0d8"); R(b, x + 5, 120, 1, 9, "#5ff0d8"); R(b, x + 3, 129, 1, 6, "#5ff0d8"); }
    for (let k = 0; k < 3; k++) { const p = (t * 0.3 + k / 3 + i * 0.17) % 1; b.globalAlpha = 0.6 * (1 - p); R(b, x + 4 + ((k * 5 + i) % 10), 152 - p * 44, 1, 1, "#9ff0e0"); } b.globalAlpha = 1;
    const on = empty ? Math.sin(t * 6) > 0 : true; R(b, x + 8, 98, 2, 1, empty ? (on ? "#ff4a4a" : "#4a1010") : "#5dff9a");
  }
  const col = Math.floor(t * 5) % 19;
  for (let iy = 0; iy < 8; iy++) for (let ix = 0; ix < 19; ix++) {
    const h = h1(ix * 3.1 + iy * 7.7); if (h < 0.25) continue; const x = S(260 + ix * 8); if (x < -4 || x > W + 4) continue;
    const lit = ix === col ? 1 : 0.35 + 0.3 * Math.sin(t * (0.4 + h) + ix);
    R(b, x, 62 + iy * 10, 3, 7, h > 0.7 ? `rgba(255,176,74,${lit})` : h > 0.45 ? `rgba(95,240,216,${lit})` : `rgba(255,111,154,${lit})`);
  }
  glow(b, S(260 + col * 8), 100, 18, "95,240,216", 0.25);
  { const sx = S(322); for (let k = 0; k < 5; k++) if (h1(k + Math.floor(t * 2)) > 0.2) R(b, sx + 2, 118 + k * 2, 4 + Math.floor(h1(k * 3 + Math.floor(t)) * 14), 1, "#5dff9a"); glowRect(b, sx, 116, 22, 14, "#5dff9a", 0.3); }
  glow(b, S(477), 118, 30, "255,190,110", 0.55);
  { const a = Math.sin(t * 3); glow(b, S(258), 30, 16, "255,60,50", 0.25 + 0.35 * Math.max(0, a)); R(b, S(256), 28, 4, 3, a > 0 ? "#ff4a3a" : "#5a1a10"); }
  for (const dx of [150, 300, 420]) { const p = (t * 0.6 + dx * 0.01) % 1; const sx = S(dx); if (p < 0.8) R(b, sx, 28 + p * 165, 1, 2, "#9fd0e0"); else { const r = Math.round((p - 0.8) * 30); b.globalAlpha = 0.5 * (1 - (p - 0.8) * 5); R(b, sx - r, FEET + 3, r * 2 + 1, 1, "#9fd0e0"); b.globalAlpha = 1; } }
}
// ---------- ambient life: stray cats, birds and bats, drones, litter, splashes, lit windows ----------
type Kit = { loc: LocId; x: number; dir: number; st: number; t: number; s: number; x0: number; x1: number };
type Bird = { loc: LocId; x: number; y: number; px: number; py: number; vx: number; vy: number; st: number; t: number; s: number; bat: boolean };
function makeLife(): { kits: Kit[]; birds: Bird[] } {
  const kits: Kit[] = []; const birds: Bird[] = [];
  const K = (loc: LocId, x: number, x0: number, x1: number, s: number): void => { kits.push({ loc, x, dir: 1, st: 0, t: 2 + h1(s) * 4, s, x0, x1 }); };
  K("district", 250, 140, 420, 1); K("district", 760, 620, 900, 2); K("district", 1180, 1100, 1320, 3);
  K("market", 420, 300, 600, 4); K("market", 820, 700, 880, 5);
  K("pier", 140, 60, 300, 6); K("pier", 520, 440, 740, 7); K("pier", 900, 780, 960, 8);
  const B = (loc: LocId, x: number, y: number, bat: boolean): void => { birds.push({ loc, x, y, px: x, py: y, vx: 0, vy: 0, st: 0, t: 0, s: x * 0.37 + y, bat }); };
  for (const [x, y] of [[150, 94], [158, 94], [236, 94], [610, 49], [618, 49], [960, 91], [968, 91], [1314, 107], [1322, 107]] as number[][]) B("district", x ?? 0, y ?? 0, false);
  for (const [x, y] of [[262, 145], [270, 145], [284, 145], [702, 145], [716, 145], [984, 79], [1000, 79], [820, 39], [836, 39], [852, 39]] as number[][]) B("pier", x ?? 0, y ?? 0, false);
  for (const x of [300, 312, 640, 652]) B("market", x, 30, true);
  return { kits, birds };
}
function meow(): void { tone(720, 0.16, "triangle", 0.012, 0, 520); }
function flutter(bat: boolean): void { for (let k = 0; k < 5; k++) noiseHit(0.03, bat ? 1800 : 1200, 0.03, "bandpass", true, k * 0.05); if (!bat && G.loc === "pier" && Math.random() < 0.6) tone(1500, 0.22, "triangle", 0.012, 0.1, 1000); }
function updLife(dt: number): void {
  const g = G; const lw = LOCW[g.loc];
  for (const k of g.kits) {
    if (k.loc !== g.loc) continue;
    const d = g.px - k.x; k.t -= dt;
    if (Math.abs(d) < 24 && k.st !== 2 && g.scene === "play" && Math.abs(g.vx) > 20) { k.st = 2; k.dir = d > 0 ? -1 : 1; k.t = 1.3; if (Math.random() < 0.5) meow(); }
    if (k.t <= 0) { if (k.st !== 0) { k.st = 0; k.t = 3 + Math.random() * 6; } else { k.st = 1; k.dir = Math.random() < 0.5 ? -1 : 1; k.t = 2 + Math.random() * 3; } }
    k.x += k.dir * (k.st === 2 ? 75 : k.st === 1 ? 11 : 0) * dt;
    if (k.st === 1) { if (k.x < k.x0) k.dir = 1; if (k.x > k.x1) k.dir = -1; }
    k.x = clamp(k.x, 4, lw - 4);
  }
  for (const bd of g.birds) {
    if (bd.loc !== g.loc) continue;
    if (bd.st === 0) {
      if (g.scene === "play" && Math.abs(g.px - bd.x) < (bd.bat ? 40 : 30) && (Math.abs(g.vx) > 30 || !g.grounded || Math.random() < dt * 0.3)) { bd.st = 1; bd.vx = (bd.x > g.px ? 1 : -1) * (40 + h1(bd.s) * 30); bd.vy = -30 - h1(bd.s + 1) * 25; bd.t = 0; if (Math.random() < 0.6) flutter(bd.bat); }
    } else {
      bd.t += dt; bd.x += bd.vx * dt; bd.y += bd.vy * dt; bd.vy += (bd.bat ? Math.sin(g.t * 8 + bd.s) * 60 : -4) * dt;
      if (bd.t > 9) { const sx = bd.px - g.cam; if (sx < -20 || sx > W + 20) { bd.st = 0; bd.x = bd.px; bd.y = bd.py; } }
    }
  }
}
const KITC = ["#2a2420", "#c88a4a", "#5a5a5e", "#e8e0d4"];
function drawKit(b: Ctx, k: Kit, sx: number, t: number): void {
  const y = FEET; const f = k.dir; const col = KITC[Math.floor(k.s) % KITC.length] ?? "#2a2420";
  const X = (dx: number, w: number): number => f > 0 ? sx + dx : sx - dx - w + 1;
  shade(b, sx, y, 4, 0.6);
  if (k.st === 0) {
    R(b, X(-2, 5), y - 4, 5, 4, col); R(b, X(1, 3), y - 7, 3, 3, col); R(b, X(1, 1), y - 8, 1, 1, col); R(b, X(3, 1), y - 8, 1, 1, col);
    const tw = Math.round(Math.sin(t * 1.5 + k.s) * 1); R(b, X(-4, 2), y - 1 + tw, 2, 1, col); R(b, X(-5, 1), y - 2 + tw, 1, 1, col);
    if ((t + k.s) % 5 > 0.15) { R(b, X(3, 1), y - 6, 1, 1, "#c8ff6a"); glow(b, X(3, 1), y - 6, 3, "200,255,106", 0.35); }
  } else {
    const ph = Math.sin(k.x * (k.st === 2 ? 0.9 : 0.6)) > 0;
    R(b, X(-3, 7), y - 5, 7, 3, col); R(b, X(3, 3), y - 7, 3, 3, col); R(b, X(3, 1), y - 8, 1, 1, col); R(b, X(5, 1), y - 8, 1, 1, col);
    R(b, X(ph ? -3 : -2, 1), y - 2, 1, 2, col); R(b, X(ph ? 2 : 3, 1), y - 2, 1, 2, col);
    R(b, X(-5, 2), y - 6 - (k.st === 2 ? 1 : 0), 2, 1, col);
  }
}
function drawBird(b: Ctx, bd: Bird, sx: number, y: number, t: number): void {
  const col = bd.bat ? "#07080c" : bd.loc === "pier" ? "#c8ccd0" : "#3a4048";
  if (bd.st === 0) { if (bd.bat) { R(b, sx, y, 2, 3, col); R(b, sx - 1, y, 1, 1, col); R(b, sx + 2, y, 1, 1, col); return; } R(b, sx, y - 2, 3, 2, col); R(b, sx + (Math.sin(t * 0.7 + bd.s) > 0 ? 2 : -1), y - 3, 2, 1, col); R(b, sx + 1, y, 1, 1, "#d8a040"); return; }
  const up = Math.sin(t * (bd.bat ? 26 : 16) + bd.s) > 0;
  R(b, sx, y, 2, 1, col);
  if (up) { R(b, sx - 2, y - 1, 2, 1, col); R(b, sx + 2, y - 1, 2, 1, col); } else { R(b, sx - 2, y + 1, 2, 1, col); R(b, sx + 2, y + 1, 2, 1, col); }
}
// lit windows: a few have someone moving past, a TV flicker, or a light switching off and on
const DWINS: number[][] = [];
(function initWins(): void {
  const B = [[0, 132, 6, 11, 100], [132, 272, 18, 21, 84], [380, 490, 26, 33, 90], [490, 600, 0, 41, 150], [640, 770, 22, 51, 96], [770, 920, 0, 61, 140], [920, 1080, 16, 71, 92], [1200, 1310, 30, 91, 110]];
  for (const bb of B) {
    const x0 = bb[0] ?? 0; const x1 = bb[1] ?? 0; const top = bb[2] ?? 0; const seed = bb[3] ?? 0; const wb = bb[4] ?? 0;
    for (let wy = top + 8, iy = 0; wy < wb; wy += 11, iy++) for (let wx = x0 + 6, ix = 0; wx < x1 - 8; wx += 12, ix++) { const r = h1(seed + ix * 3.3 + iy * 9.1); if (r < 0.5 && !(x0 === 490 && wy < 92) && !(x0 === 132 && wy > 78)) DWINS.push([wx, wy, r]); }
  }
})();
function winLife(b: Ctx, cam: number, t: number, wins: number[][]): void {
  const pw = wins === PWINS ? 8 : 6; const ph2 = wins === PWINS ? 6 : 7;
  for (const w of wins) {
    const wx = w[0] ?? 0; const wy = w[1] ?? 0; const r = w[2] ?? 0; const sx = Math.round(wx - cam); if (sx < -8 || sx > W + 2) continue;
    if (h1(Math.floor(t * 0.2) + r * 50) > 0.94) { R(b, sx, wy, pw, ph2, "#060a10"); continue; }
    if (h1(r * 17) > 0.82) { b.globalAlpha = 0.12 + 0.28 * h1(Math.floor(t * 8) + r * 9); R(b, sx, wy, pw, ph2, "#7aa8ff"); b.globalAlpha = 1; }
    if (!G.gfx || h1(r * 31) < 0.4) continue;
    const ph = (t * (0.04 + h1(r * 7) * 0.06) + h1(r * 13)) % 1;
    if (ph < 0.45) { const o = Math.round(-2 + (ph / 0.45) * (pw + 3)); const a0 = Math.max(sx, sx + o); const a1 = Math.min(sx + pw, sx + o + 2); if (a1 > a0) { R(b, a0, wy + 2, a1 - a0, ph2 - 2, "#1a1008"); if (o >= 0 && o < pw) R(b, sx + o, wy + 1, Math.min(2, pw - o), 1, "#1a1008"); } }
  }
}
function drawLife(b: Ctx, cam: number, t: number, front: boolean): void {
  const g = G; const L = g.loc; const lw = LOCW[L]; const hi = g.gfx > 0;
  if (!front) {
    if (L !== "market") {
      const nd = hi ? 3 : 1;
      for (let i = 0; i < nd; i++) {
        const dir = i % 2 ? -1 : 1; const span = lw + 200; const wx = (((h1(i * 5.7 + 1) * span + t * (22 + i * 7) * dir) % span) + span) % span - 100;
        const sx = Math.round(wx - cam); if (sx < -10 || sx > W + 10) continue;
        const y = 68 + i * 9 + Math.round(Math.sin(t * 2 + i) * 2); const rf = Math.floor(t * 20 + i) % 2;
        R(b, sx - 3, y, 7, 2, "#141c22"); R(b, sx - 5, y - 1, 3, 1, rf ? "#6a7a80" : "#2a3a40"); R(b, sx + 3, y - 1, 3, 1, rf ? "#2a3a40" : "#6a7a80");
        R(b, sx, y + 2, 1, 3, "#0a0e12"); R(b, sx - 1, y + 5, 3, 3, i === 1 ? "#5ff0d8" : "#8a6a3a");
        if (Math.sin(t * 6 + i) > 0) { R(b, sx - 3, y + 1, 1, 1, "#ff4a4a"); glow(b, sx - 3, y + 1, 4, "255,74,74", 0.6); }
        R(b, sx + 3, y + 1, 1, 1, "#5ff0d8"); glow(b, sx + 3, y + 1, 4, "95,240,216", 0.5);
      }
      if (hi) {
        const cyc = 34; const p = ((t + (L === "pier" ? 11 : 0)) % cyc) / cyc;
        if (p < 0.5) { const x0 = -30 + (p / 0.5) * (W + 60); for (let k = 0; k < 7; k++) { const fx = Math.round(x0 - (k % 4) * 7 - Math.floor(k / 4) * 3); const fy = Math.round(48 + (k % 4) * 3 + Math.floor(k / 4) * 6 + Math.sin(t * 2 + k) * 1.5); const up = Math.sin(t * 14 + k) > 0; R(b, fx, fy, 2, 1, "#10181e"); R(b, fx - 2, fy + (up ? -1 : 1), 2, 1, "#10181e"); R(b, fx + 2, fy + (up ? -1 : 1), 2, 1, "#10181e"); } }
        if (L === "pier") for (let k = 0; k < 3; k++) { const fx = Math.round(((k * 260 + 160 - cam * 0.6) % 900 + 900) % 900 - 100 + Math.cos(t * 0.4 + k * 2) * 40); const fy = Math.round(64 + k * 6 + Math.sin(t * 0.4 + k * 2) * 10); const up = Math.sin(t * 5 + k) > 0.6; R(b, fx, fy, 2, 1, "#d8dcdc"); R(b, fx - 3, fy + (up ? -1 : 0), 3, 1, "#d8dcdc"); R(b, fx + 2, fy + (up ? -1 : 0), 3, 1, "#d8dcdc"); }
      }
    }
    for (const bd of g.birds) { if (bd.loc !== L) continue; const sx = Math.round(bd.x - cam); if (sx < -6 || sx > W + 6 || bd.y < -10) continue; drawBird(b, bd, sx, Math.round(bd.y), t); }
    return;
  }
  for (const k of g.kits) { if (k.loc !== L) continue; const sx = Math.round(k.x - cam); if (sx < -10 || sx > W + 10) continue; drawKit(b, k, sx, t); }
  if (L !== "market") {
    const n = hi ? 7 : 3; const wd = windK(t); const span = lw + 60;
    for (let i = 0; i < n; i++) {
      const wx = ((h1(i * 7.3) * span + t * (10 + h1(i) * 16) * (0.3 + wd)) % span) - 30; const sx = Math.round(wx - cam); if (sx < -4 || sx > W + 4) continue;
      const air = i % 3 === 0; const y = air ? FEET - 10 - Math.abs(Math.sin(t * 1.3 + i)) * 16 * wd : FEET - 1 - Math.abs(Math.sin(t * 4 + i * 2)) * 3;
      const fl = Math.sin(t * 9 + i) > 0; R(b, sx, Math.round(y), fl ? 2 : 1, fl ? 1 : 2, i % 4 === 0 ? "#ff8fb5" : i % 4 === 1 ? "#d8d0c0" : "#a8a090");
    }
  }
  const ns = L === "market" ? 2 : hi ? 6 : 2;
  for (let k = 0; k < ns; k++) {
    const r = t * 2.2 + k * 0.618; const slot = Math.floor(r); const ph = r - slot; if (ph > 0.35) continue;
    const x = L === "market" ? Math.round([330, 585, 690][(slot + k) % 3] ?? 330) - cam + Math.round(h1(slot) * 16) : Math.floor(h1(slot * 3.1 + k * 17) * W);
    const u = ph / 0.35; const hgt = Math.sin(u * Math.PI); b.globalAlpha = 0.75 * (1 - u);
    R(b, x - 1 - Math.round(u * 3), FEET - 1 - Math.round(hgt * 3), 1, 1, "#cfeff0"); R(b, x + 1 + Math.round(u * 3), FEET - 1 - Math.round(hgt * 3), 1, 1, "#cfeff0"); R(b, x, FEET - 2 - Math.round(hgt * 5), 1, 1, "#e8fffa"); R(b, x - Math.round(u * 4), FEET, Math.round(u * 8) + 1, 1, "#8fc8c8");
    b.globalAlpha = 1;
  }
}

type Look = { coat: string; hair: string; skin: string; accent: string; rim: string; h: number; extra: string; b?: string; cl?: number; hs?: string; sh?: string; pa?: string; shoe?: string; open?: boolean; cool?: string };
type Pose = { lean: number; hx: number; lift: number; t0: number; k0: number; f0: number; t1: number; k1: number; f1: number; s0: number; e0: number; s1: number; e1: number; tilt: number; sway: number; br: number; fix: number; ik: number; ax0: number; ay0: number; ax1: number; ay1: number; sr: number; hl: number; hr: number; sq: number };
type Joints = { hx: number; hy: number; fx: number; fy: number; ex: number; ey: number; top: number; sx: number; sy: number; foot: number };
type Pal = { coatD: string; coatH: string; coatF: string; paD: string; skinD: string; hairH: string; sh: string; pa: string; shoe: string; cool: string; warm: string };
const PALS = new WeakMap<Look, Pal>();
const BODY: Record<string, number[]> = { m: [1.5, 1.45, 1.15, 1.35, 1, 1, 0], f: [1.3, 1.2, 0.95, 1.4, 0.85, 0.97, 0], broad: [1.85, 1.75, 1.6, 1.5, 1.2, 1.04, 0], thin: [1.3, 1.2, 0.95, 1.1, 0.85, 0.97, 0], kid: [1.35, 1.25, 1.1, 1.25, 0.95, 1.28, 0], old: [1.4, 1.5, 1.2, 1.35, 0.95, 1, 0.16] };
function hasX(L: Look, k: string): boolean { return L.extra === k || (" " + L.extra + " ").indexOf(" " + k + " ") >= 0; }
function palOf(L: Look): Pal {
  const o = PALS.get(L); if (o) return o;
  const sh = L.sh ?? L.accent; const pa = L.pa ?? mixHex(L.coat, "#05070a", 0.55);
  const p: Pal = { coatD: mixHex(L.coat, "#04060a", 0.42), coatH: mixHex(L.coat, "#c8e0e0", 0.13), coatF: mixHex(L.coat, "#04060a", 0.22), paD: mixHex(pa, "#020304", 0.45), skinD: mixHex(L.skin, "#2a1830", 0.38), hairH: mixHex(L.hair, "#ffd0a0", 0.18), sh, pa, shoe: L.shoe ?? "#07080a", cool: mixHex(L.cool ?? mixHex(L.coat, "#4ab8c0", 0.55), L.coat, 0.4), warm: L.rim ? mixHex(L.rim, L.coat, 0.3) : mixHex(L.coat, "#c08050", 0.45) };
  PALS.set(L, p); return p;
}
function pose0(): Pose { return { lean: 0.03, hx: 0, lift: 0, t0: 0.05, k0: 0.08, f0: 0, t1: -0.05, k1: 0.1, f1: 0, s0: 0.06, e0: 0.18, s1: -0.05, e1: 0.22, tilt: 0, sway: 0, br: 0, fix: 0, ik: 0, ax0: 0, ay0: 0, ax1: 0, ay1: 0, sr: 0, hl: 0, hr: 0, sq: 1 }; }
function q(v: number, n: number): number { return Math.floor((((v % 1) + 1) % 1) * n) / n; }
function idleP(t: number, sd: number): Pose {
  const P = pose0(); const w = Math.sin(t * 0.45 + sd); const br = Math.sin(t * 1.7 + sd) * 0.5 + 0.5;
  P.br = br; P.hx = 0.35 * w; P.t0 = 0.05 + 0.05 * w; P.k0 = 0.06 + Math.max(0, -w) * 0.22; P.t1 = -0.05 + 0.05 * w; P.k1 = 0.06 + Math.max(0, w) * 0.22;
  P.s0 = 0.06 + 0.03 * br; P.s1 = -0.05 - 0.02 * br; P.sway = 0.15 * w;
  return P;
}
// stride length (in body units, k=1) for a speed given in body units per second
function strideK(v: number): number { return clamp(8.5 + 0.26 * v, 14, 36); }
function sstep(u: number): number { const v = clamp(u, 0, 1); return v * v * (3 - 2 * v); }
// running foot path, ground coords in body units: [s, x, y, footAngle] keys through the swing (toe-off -> heel kick -> knee drive -> reach -> claw back)
function runSwing(s: number, xP: number, yP: number, xL: number): number[] {
  const K = [[0, xP, yP, -1.0], [0.3, xP * 0.55, 7.6, -1.25], [0.56, 0.4, 7.1, -0.55], [0.8, xL + 2.3, 4.0, 0.12], [1, xL, 1.19, 0.06]];
  let i = 0; while (i < K.length - 2 && s > (K[i + 1]?.[0] ?? 1)) i++;
  const k0 = K[Math.max(0, i - 1)] ?? []; const k1 = K[i] ?? []; const k2 = K[i + 1] ?? []; const k3 = K[Math.min(K.length - 1, i + 2)] ?? [];
  const u = clamp((s - (k1[0] ?? 0)) / Math.max(1e-4, (k2[0] ?? 1) - (k1[0] ?? 0)), 0, 1); const u2 = u * u; const u3 = u2 * u;
  const cr = (j: number): number => { const p0 = k0[j] ?? 0; const p1 = k1[j] ?? 0; const p2 = k2[j] ?? 0; const p3 = k3[j] ?? 0; return 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (3 * p1 - p0 - 3 * p2 + p3) * u3); };
  return [cr(1), cr(2), cr(3)];
}
// procedural IK gait: feet are planted targets (no sliding), hip bob / arms / shoulders derive from the same phase.
// r blends the walk into a run with a flight phase (both feet briefly off the ground)
function gaitIK(p: number, w: number, r: number, D: number, t: number, sd: number): Pose {
  const P = idleP(t, sd); const T = Math.PI * 2;
  P.ik = 1;
  const pp = ((p % 1) + 1) % 1;
  // walk
  const beta = 0.54; const Ls = D * beta; const c0 = -1.2;
  const lift = 2.0; const strike = 0.3; const off = -0.8;
  const foot = (u0: number): number[] => {
    const u = ((u0 % 1) + 1) % 1;
    if (u < beta) {
      const s = u / beta; const x = Ls * (0.5 - s) + c0;
      const fa = s < 0.2 ? strike * (1 - s / 0.2) : s > 0.6 ? off * sstep((s - 0.6) / 0.4) : 0;
      return [x, 1.19 + (fa < 0 ? -Math.sin(fa) * 1.7 : 0), fa];
    }
    const s = (u - beta) / (1 - beta); const e = sstep(s);
    const hg = lift * Math.sin(Math.PI * s);
    const x = Ls * (-0.5 + e) + c0;
    return [x, 1.19 + -Math.sin(off) * 1.7 * (1 - sstep(s * 2.5)) + hg, off + (strike - off) * e];
  };
  // run: stance covers exactly duty*D so the planted foot never slides
  const duty = clamp(9.2 / D, 0.24, 0.5); const S = D * duty; const xL = 1.5;
  const rfoot = (u0: number): number[] => {
    const u = ((u0 % 1) + 1) % 1;
    if (u < duty) {
      const s = u / duty; const x = xL - S * s;
      const fa = s < 0.15 ? 0.06 * (1 - s / 0.15) : s > 0.45 ? -1.0 * sstep((s - 0.45) / 0.55) : 0;
      return [x, Math.max(1.19, 1.04 - Math.sin(fa) * 2.4), fa];
    }
    return runSwing((u - duty) / (1 - duty), xL - S, 1.04 + Math.sin(1.0) * 2.4, xL);
  };
  const wa = foot(pp); const wb = foot(pp + 0.5);
  const ra = r > 0 ? rfoot(pp) : wa; const rb = r > 0 ? rfoot(pp + 0.5) : wb;
  const mx = (m: number[], n: number[], i: number): number => (m[i] ?? 0) * (1 - r) + (n[i] ?? 0) * r;
  const a = [mx(wa, ra, 0), mx(wa, ra, 1), mx(wa, ra, 2)]; const b = [mx(wb, rb, 0), mx(wb, rb, 1), mx(wb, rb, 2)];
  const iw = 1 - w;
  P.ax0 = 1.0 * iw + (a[0] ?? 0) * w; P.ay0 = 1.19 * iw + (a[1] ?? 1.19) * w; P.f0 = (a[2] ?? 0) * w;
  P.ax1 = -1.1 * iw + (b[0] ?? 0) * w; P.ay1 = 1.19 * iw + (b[1] ?? 1.19) * w; P.f1 = (b[2] ?? 0) * w;
  // walk hip: as high as the legs allow (stance leg ~straight), capped near standing height -> small natural bob
  const RL = 0.99 * 14.4; const cap = 15.4;
  const av = (f: number[]): number => (f[1] ?? 1.19) + Math.sqrt(Math.max(0, RL * RL - (f[0] ?? 0) * (f[0] ?? 0)));
  const whip = Math.min(cap, av(wa), av(wb));
  // run hip: lowest at mid-stance (knee absorbs), highest mid-flight
  const psi = 2 * (pp - duty / 2); const rhip = 14.45 - 0.5 * Math.cos(T * psi);
  const hip = whip * (1 - r) + rhip * r;
  P.fix = (15.15 + P.br * 0.12) * iw + hip * w;
  // flight: lift the body by the lowest sole's clearance so neither foot is pressed into the ground
  const clr = (f: number[]): number => Math.min((f[1] ?? 1.19) - 1.19, (f[1] ?? 1.19) - 1.04 + Math.sin(f[2] ?? 0) * 2.4);
  P.lift = r > 0 ? w * Math.max(0, Math.min(clr(a), clr(b))) : 0;
  P.hl = ((whip - cap) * 0.3 * (1 - r) - 0.32 * Math.cos(T * (psi - 0.12)) * r) * w;
  P.hx = P.hx * iw + 0.5 * r * w;
  // arms: walk swings loosely; the run pumps forward/back with elbows near 90 degrees
  const ac = -Math.cos(T * (pp - 0.04 + 0.02 * r));
  const sw = (sg: number): number => { const v = ac * sg; return (0.48 * (1 - r) + (v > 0 ? 0.78 : 0.9) * r) * v; };
  const s0 = sw(1); const s1 = sw(-1);
  const ew = (v: number): number => (0.22 + 0.4 * Math.max(0, v)) * (1 - r) + (1.4 + 0.42 * Math.max(0, v) - 0.08 * Math.max(0, -v)) * r;
  P.s0 = P.s0 * iw + s0 * w; P.s1 = P.s1 * iw + s1 * w;
  P.e0 = P.e0 * iw + ew(ac) * w; P.e1 = P.e1 * iw + ew(-ac) * w;
  P.sr = s0 * (0.7 - 0.25 * r) * w;
  P.sway = P.sway * iw + (0.6 + 0.35 * Math.sin(T * 2 * pp + 0.8) + 1.5 * r) * w;
  P.lean = 0.02 + (0.02 + 0.08 * r) * w;
  return P;
}
function figure(c: Ctx, x: number, y: number, L: Look, f: number, P: Pose, rims: boolean): Joints {
  const X = Math.round(x); const Y = Math.round(y); const pal = palOf(L);
  const bt = BODY[L.b ?? "m"] ?? BODY.m ?? [1.5, 1.45, 1.15, 1.35, 1, 1, 0];
  const kid = L.b === "kid"; const hsc = bt[5] ?? 1; const k = L.h / (31 * (kid ? 1.08 : 1));
  const lw = bt[4] ?? 1; const lean = P.lean + (bt[6] ?? 0);
  const wd = 1.22; const g = PG; const qq = (v: number): number => Math.round(v / g) * g;
  let ox = 0; let mono = "";
  const sq = P.sq; const xs = 1 + (1 - sq) * 0.6;
  const F = (lx: number, ly: number, w: number, h: number, col: string): void => {
    const x0 = qq((f > 0 ? lx : -lx - w) * xs); const x1 = qq((f > 0 ? lx + w : -lx) * xs); const y0 = qq((-ly - h) * sq); const y1 = qq(-ly * sq);
    c.fillStyle = mono || col; c.fillRect(X + x0 + ox, Y + y0, Math.max(g, x1 - x0), Math.max(g, y1 - y0));
  };
  const seg = (x1: number, y1: number, x2: number, y2: number, w1: number, w2: number, col: string): void => {
    const dx = x2 - x1; const dy = y2 - y1; const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / g));
    for (let i = 0; i <= n; i++) { const u = i / n; const w = w1 + (w2 - w1) * u; F(x1 + dx * u - w / 2, y1 + dy * u - w / 2, w, w, col); }
  };
  const TH = 7.4 * k * (kid ? 0.92 : 1); const SH = 7.0 * k * (kid ? 0.92 : 1); const AN = 0.9 * k; const FT = 2.4 * k * lw;
  const legEnd = (ta: number, kb: number): number[] => { const kx = Math.sin(ta) * TH; const ky = -Math.cos(ta) * TH; const sa = ta - kb; return [kx, ky, kx + Math.sin(sa) * SH, ky - Math.cos(sa) * SH]; };
  // two-bone IK: knee always bends forward, reach clamped just short of full extension
  const ikLeg = (tx: number, ty: number): number[] => {
    let dx = tx; let dy = ty; let d = Math.hypot(dx, dy); const mx = (TH + SH) * 0.999;
    if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
    d = Math.max(d, Math.abs(TH - SH) + 0.05);
    const ta = Math.atan2(dx, -dy) + Math.acos(clamp((TH * TH + d * d - SH * SH) / (2 * TH * d), -1, 1));
    const kx = Math.sin(ta) * TH; const ky = -Math.cos(ta) * TH; return [kx, ky, dx, dy];
  };
  // lowest drawn pixel of the foot (heel block or toe tip) relative to the hip
  const sole = (e: number[], fa: number): number => Math.min((e[3] ?? 0) - 1.19 * k, (e[3] ?? 0) - 1.04 * k + Math.sin(fa) * FT);
  const hx = P.hx * k;
  let A: number[]; let B: number[]; let hipY: number;
  if (P.ik > 0) {
    const h0 = P.fix * k;
    A = ikLeg(P.ax0 * k - hx, P.ay0 * k - h0); B = ikLeg(P.ax1 * k - hx, P.ay1 * k - h0);
    hipY = P.lift * k - Math.min(sole(A, P.f0), sole(B, P.f1));
  } else {
    A = legEnd(P.t0, P.k0); B = legEnd(P.t1, P.k1);
    hipY = P.fix > 0 ? P.fix * k : -Math.min(sole(A, P.f0), sole(B, P.f1)) + P.lift * k;
  }
  const TR = 9.6 * k * (kid ? 0.82 : 1);
  const shx = hx + Math.sin(lean) * TR; const shy = hipY + Math.cos(lean) * TR + P.br * 0.3 * k;
  const cl = L.cl ?? 1; const UA = 5.4 * k * (kid ? 0.88 : 1); const FA = 5.0 * k * (kid ? 0.88 : 1);
  const hs = L.hs ?? "short";
  const hw = 3.5 * k * hsc; const hh = 4.4 * k * hsc;
  const hlag = clamp(P.hl, -0.9, 0.3);
  const hcx = shx + 0.35 * k + Math.sin(lean) * 1.0 * k + P.tilt * 1.3 * k; const hcy = shy + 0.7 * k + hh / 2 - Math.abs(P.tilt) * 0.9 * k + hlag * k;
  const ht = hcy + hh / 2; const hb = hcy - hh / 2; const hf = hcx + hw / 2; const hbk = hcx - hw / 2;
  const asx = shx - 0.25 * k; const asy = shy - 0.9 * k;
  const arm = (sa: number, ea: number, so: number): number[] => { const ex = asx + so + Math.sin(sa) * UA; const ey = asy - Math.cos(sa) * UA; const fa = sa + ea; return [ex, ey, ex + Math.sin(fa) * FA, ey - Math.cos(fa) * FA, asx + so]; };
  const AR0 = arm(P.s0 + lean * 0.5, P.e0, P.sr * 0.55 * k); const AR1 = arm(P.s1 + lean * 0.5, P.e1, -P.sr * 0.55 * k);
  const cx = (ly: number): number => hx + (ly - hipY) * Math.tan(lean);
  const legD = (e: number[], fa: number, col: string, colS: string): void => {
    const kx = hx + (e[0] ?? 0); const ky = hipY + (e[1] ?? 0); const ax = hx + (e[2] ?? 0); const ay = hipY + (e[3] ?? 0);
    seg(hx, hipY - 0.6 * k, kx, ky, 2.3 * k * lw, 1.8 * k * lw, col); seg(kx, ky, ax, ay, 1.7 * k * lw, 1.3 * k * lw, col);
    const fx2 = ax + Math.cos(fa) * FT; const fy2 = ay - AN * 0.6 + Math.sin(fa) * FT;
    seg(ax - 0.3 * k, ay - AN * 0.6, fx2, fy2, 1.3 * k, 1.0 * k, colS);
    if (hasX(L, "boots")) seg(kx * 0.3 + ax * 0.7, ky * 0.3 + ay * 0.7, ax, ay - AN * 0.4, 1.6 * k, 1.5 * k, colS);
  };
  const armD = (e: number[], col: string, sk: string): void => {
    const ex = e[0] ?? 0; const ey = e[1] ?? 0; const wx = e[2] ?? 0; const wy = e[3] ?? 0;
    seg(e[4] ?? asx, asy, ex, ey, 1.7 * k * lw, 1.4 * k * lw, col); seg(ex, ey, wx, wy, 1.4 * k * lw, 1.15 * k * lw, col);
    F(wx - 0.5 * k, wy - 0.9 * k, 1.0 * k, 1.1 * k, sk);
  };
  const sleeve = cl === 0 && !L.open ? L.coat : L.coat;
  const body = (): void => {
    const coatD = pal.coatD;
    armD(AR1, mono ? coatD : mixed(coatD), pal.skinD);
    if (cl < 3) legD(B, P.f1, pal.paD, pal.shoe);
    if (hasX(L, "pack")) { F(shx - 3.6 * k, shy - 6.8 * k, 3.0 * k, 6.4 * k, "#2a2622"); F(shx - 3.4 * k, shy - 6.2 * k, 2.4 * k, 0.6 * k, L.accent); F(shx - 3.8 * k, shy - 6.9 * k, 3.4 * k, 0.6 * k, "#14120f"); }
    if (hasX(L, "bag")) F(shx - 2.6 * k, shy - 5.6 * k, 1.6 * k, 4.2 * k, "#2e2418");
    if (hs === "long" || hs === "pig") F(hbk - 0.4 * k - P.hr * 0.8 * k, shy - 2.6 * k, 1.9 * k, hh * 0.6 + 2.4 * k, L.hair);
    for (let ly = hipY - 1.2 * k; ly < shy + 0.1; ly += g) {
      const s = clamp((ly - hipY) / (shy - hipY), 0, 1); const c0 = cx(ly);
      const fr = (s < 0.4 ? 1.25 : 1.25 + (s - 0.4) * 0.6) * k * wd * (bt[2] ?? 1) / 1.15 + (s > 0.5 ? P.br * 0.18 * k : 0);
      const bk = (s < 0.15 ? bt[3] ?? 1.35 : s < 0.55 ? 1.15 : bt[1] ?? 1.45) * k * wd;
      F(c0 - bk, ly, bk + fr, g, s < 0.12 && cl === 0 ? pal.pa : pal.sh);
    }
    if (cl < 3) legD(A, P.f0, pal.pa, pal.shoe);
    else { legD(B, P.f1, pal.paD, pal.shoe); legD(A, P.f0, pal.pa, pal.shoe); }
    const hemY = cl === 0 ? hipY + 0.8 * k : cl === 1 ? hipY - 1.9 * k : cl === 2 ? 8.6 * k * (kid ? 0.95 : 1) : 2.0 * k;
    const ax = hx + (A[0] ?? 0); const bx2 = hx + (B[0] ?? 0); const ax2 = hx + (A[2] ?? 0); const bx3 = hx + (B[2] ?? 0);
    const kmax = Math.max(ax, bx2); const kmin = Math.min(ax, bx2); const fmax = Math.max(ax2, bx3); const fmin = Math.min(ax2, bx3);
    const hemF = cl === 3 ? Math.max(fmax + 0.6 * k, hx + 2 * k) : cl === 2 ? Math.max(kmax + 1.1 * k, hx + 1.7 * k) : cx(hemY) + 1.55 * k;
    const hemB = (cl === 3 ? Math.min(fmin - 0.8 * k, hx - 2.2 * k) : cl === 2 ? Math.min(kmin - 1.2 * k, hx - 1.9 * k) : cx(hemY) - 1.6 * k) - P.sway * k * (cl >= 2 ? 1 : 0.3);
    const wide = (bt[1] ?? 1.45) * k + 0.35 * k;
    for (let ly = hemY; ly < shy + 0.5 * k; ly += g) {
      let fr = 0; let bk = 0;
      if (ly < hipY) { const u = (ly - hemY) / Math.max(0.01, hipY - hemY); fr = hemF + (cx(hipY) + 1.65 * k * wd - hemF) * u; bk = hemB + (cx(hipY) - 1.75 * k * wd - hemB) * Math.pow(u, 0.8); }
      else { const s = clamp((ly - hipY) / (shy - hipY), 0, 1); const c0 = cx(ly); fr = c0 + (1.6 + s * 0.35) * k * wd * (bt[0] ?? 1.5) / 1.5 + (s > 0.5 ? P.br * 0.18 * k : 0); bk = c0 - (s < 0.5 ? 1.55 * k * wd : wide * wd); }
      F(bk, ly, fr - bk, g, L.coat);
      F(bk, ly, g, g, pal.coatD);
      if (ly < hipY && cl >= 2) F((fr + bk) / 2 - 0.2 * k + P.sway * 0.25 * k, ly, g, g, pal.coatF);
      if (L.open && ly > hipY - 0.4 * k && ly < shy - 0.4 * k) { const s = (ly - hipY) / (shy - hipY); const ww = 0.5 * k + s * 0.7 * k; F(fr - ww, ly, ww - g, g, pal.sh); F(fr - ww - g, ly, g, g, s > 0.55 ? pal.coatH : pal.coatF); }
      else if (!L.open && ly > hemY && ly < shy - 0.6 * k && cl > 0) F(fr - g, ly, g, g, pal.coatF);
    }
    F(cx(shy) - 1.6 * k, shy, 2.6 * k, g, pal.coatH);
    if (!L.open && cl > 0) for (let i = 0; i < 3; i++) F(cx(hipY + (i + 0.5) * 2.4 * k) + 1.55 * k, hipY + (i + 0.5) * 2.4 * k, g, g, pal.coatD);
    if (hasX(L, "belt")) F(cx(hipY) - 1.7 * k, hipY - 0.2 * k, 3.4 * k, 0.6 * k, "#14181c");
    if (hasX(L, "apron")) for (let ly = hipY - 5 * k; ly < shy - 3 * k; ly += g) F(cx(ly) - 0.3 * k, ly, 1.9 * k, g, "#f0ece0");
    if (hasX(L, "collar") || hasX(L, "shawl")) { F(cx(shy) - 1.5 * k, shy - 0.4 * k, 1.8 * k, 1.6 * k, hasX(L, "shawl") ? L.accent : pal.coatH); }
    if (hasX(L, "shawl")) for (let ly = shy - 3.6 * k; ly < shy + 0.2 * k; ly += g) { const u = (shy - ly) / (3.6 * k); F(cx(ly) - 1.9 * k, ly, 3.6 * k + u * 0.2 * k, g, u > 0.8 ? mixHex(L.accent, "#000", 0.3) : L.accent); }
    // neck + head
    F(shx - 0.4 * k, shy - 0.3 * k, 1.1 * k, 1.3 * k + Math.max(0, hlag) * k, pal.skinD);
    if (hs === "hood") { F(hbk - 0.7 * k, hb - 0.5 * k, hw + 1.0 * k, hh + 1.3 * k, L.coat); F(hbk - 0.7 * k, hb - 0.5 * k, 0.8 * k, hh, pal.coatD); }
    for (let ly = hb; ly < ht; ly += g) {
      const r = (ly - hb) / hh;
      const bk = hbk + (r < 0.3 ? 0.35 * k : r > 0.82 ? 0.4 * k : 0); const fr = hf - (r < 0.22 ? 0.65 * k * (1 - r / 0.22) + 0.2 * k : r > 0.86 ? 0.45 * k : 0);
      if (hs === "hood" && r > 0.15) { F(hcx + 0.2 * k, ly, fr - hcx - 0.2 * k, g, L.skin); continue; }
      F(bk, ly, fr - bk, g, L.skin); F(bk, ly, Math.min(hw * 0.4, fr - bk), g, pal.skinD);
    }
    F(hf, hcy - 0.45 * k, g, 0.7 * k, L.skin);
    F(hf - 1.0 * k, hcy + 0.1 * k, Math.max(g, 0.45 * k), g, "#0a0a10");
    F(hf - 1.3 * k, hcy + 0.65 * k, 0.9 * k, g, mixHex(L.hair, "#000", 0.3));
    F(hf - 0.75 * k, hb + 0.95 * k, 0.5 * k, g, mixHex(L.skin, "#401818", 0.45));
    if (hs !== "hood") F(hcx - 0.4 * k, hcy - 0.5 * k, 0.6 * k, 0.9 * k, pal.skinD);
    if (hasX(L, "beard")) { F(hcx - 0.3 * k, hb - 0.4 * k, hf - hcx + 0.1 * k, 1.5 * k, L.hair); F(hf - 0.9 * k, hb + 0.8 * k, 0.6 * k, g, L.skin); }
    if (hasX(L, "stubble")) F(hcx, hb + 0.1 * k, hf - hcx - 0.5 * k, 0.9 * k, mixHex(L.skin, L.hair, 0.4));
    hair();
    armD(AR0, sleeve, L.skin);
    if (hasX(L, "basket")) { const wx = AR0[2] ?? 0; const wy = AR0[3] ?? 0; F(wx - 1.2 * k, wy - 3.0 * k, 2.8 * k, 2.2 * k, "#7a4e2a"); F(wx - 1.2 * k, wy - 0.9 * k, 2.8 * k, 0.4 * k, "#a06a3a"); F(wx - 0.9 * k, wy - 0.6 * k, 0.6 * k, 0.6 * k, "#e86a8a"); F(wx + 0.3 * k, wy - 0.4 * k, 0.6 * k, 0.6 * k, "#ffd36b"); F(wx + 0.9 * k, wy - 0.7 * k, 0.5 * k, 0.5 * k, "#e86a8a"); }
  };
  const mixed = (s: string): string => s;
  const hair = (): void => {
    const hc = L.hair; const hl = pal.hairH;
    if (hs === "bald") { F(hbk + 0.4 * k, ht - 0.5 * k, hw - 1.0 * k, 0.5 * k, mixHex(L.skin, "#ffffff", 0.15)); }
    else if (hs === "hood") { F(hbk - 0.6 * k, ht - 0.2 * k, hw + 0.6 * k, 0.9 * k, L.coat); F(hf - 0.3 * k, hcy + 0.9 * k, 0.6 * k, 1.4 * k, L.coat); }
    else {
      const thick = hs === "buzz" ? 0.55 : hs === "short" ? 0.9 : 1.2;
      F(hbk - 0.2 * k, ht - 0.9 * k, hw + 0.1 * k, thick * k + 0.6 * k, hc);
      F(hbk - 0.35 * k, hcy - (hs === "long" || hs === "bob" ? 1.6 : 0.3) * k, 1.4 * k, ht - hcy + (hs === "long" || hs === "bob" ? 1.0 : 0) * k, hc);
      if (hs !== "buzz") F(hbk + 0.6 * k, ht + thick * k - 0.6 * k, hw * 0.55, 0.5 * k, hl);
      if (hs === "tousle") { F(hf - 1.4 * k, ht - 1.5 * k, 1.3 * k, 0.9 * k, hc); F(hf - 0.6 * k, ht - 1.9 * k, 0.6 * k, 1.1 * k, hc); F(hbk + 0.3 * k, ht + 0.5 * k, 0.7 * k, 0.6 * k, hc); F(hbk + 1.6 * k, ht + 0.6 * k, 0.7 * k, 0.5 * k, hc); F(hcx + 0.6 * k, ht + 0.45 * k, 0.6 * k, 0.5 * k, hl); F(hbk - 0.6 * k - P.hr * 0.6 * k, hcy + 0.4 * k, 0.6 * k, 1.0 * k, hc); if (P.hr > 0.25) F(hbk - 0.5 * k - P.hr * k, ht - 0.6 * k, 0.5 * k + P.hr * 0.6 * k, 0.6 * k, hc); }
      if (hs === "spiky") for (let i = 0; i < 4; i++) F(hbk + i * 0.95 * k, ht + 0.2 * k, 0.6 * k, (1.0 + (i % 2) * 0.6) * k, hc);
      if (hs === "bob") { F(hf - 1.3 * k, ht - 1.6 * k, 1.1 * k, 1.0 * k, hc); F(hbk - 0.5 * k, hb + 0.2 * k, 1.2 * k, hh * 0.6, hc); }
      if (hs === "bun") { F(hbk - 1.0 * k, ht - 1.0 * k, 1.5 * k, 1.5 * k, hc); F(hbk - 0.8 * k, ht - 0.2 * k, 0.6 * k, 0.6 * k, hl); }
      if (hs === "pig") { F(hbk - 1.4 * k, hcy - 0.6 * k, 1.2 * k, 2.0 * k, hc); F(hbk - 1.7 * k, hcy - 1.6 * k, 0.9 * k, 1.2 * k, hc); F(hbk - 0.2 * k, hcy + 0.3 * k, 0.5 * k, 0.5 * k, L.accent); }
    }
    if (hasX(L, "cap")) { F(hbk - 0.3 * k, ht - 0.7 * k, hw + 0.4 * k, 1.5 * k, "#1a2636"); F(hf - 0.2 * k, ht - 0.8 * k, 1.4 * k, 0.5 * k, "#101820"); F(hcx + 0.6 * k, ht - 0.1 * k, 0.6 * k, 0.6 * k, "#d8c84a"); }
    if (hasX(L, "beanie")) { F(hbk - 0.3 * k, ht - 1.0 * k, hw + 0.3 * k, 1.9 * k, L.accent); F(hbk - 0.3 * k, ht - 1.0 * k, hw + 0.3 * k, 0.5 * k, mixHex(L.accent, "#000", 0.35)); }
    if (hasX(L, "hat")) { F(hbk - 1.0 * k, ht - 0.2 * k, hw + 2.0 * k, 0.5 * k, "#14161a"); F(hbk, ht + 0.2 * k, hw - 0.2 * k, 1.4 * k, "#1c1e24"); }
    if (hasX(L, "headband")) F(hbk - 0.2 * k, ht - 1.4 * k, hw + 0.3 * k, 0.55 * k, "#c23a4e");
    if (hasX(L, "goggles")) { F(hbk - 0.2 * k, ht - 1.0 * k, hw + 0.2 * k, 0.5 * k, "#1a1a1a"); F(hf - 1.4 * k, ht - 1.1 * k, 1.3 * k, 0.8 * k, "#3df5d0"); }
    if (hasX(L, "glasses")) F(hf - 1.5 * k, hcy - 0.05 * k, 1.5 * k, 0.55 * k, "#7ac8ff");
    if (hasX(L, "visor")) F(hf - 2.0 * k, hcy - 0.05 * k, 2.2 * k, 0.6 * k, "#ffb04a");
    if (hasX(L, "headset")) { F(hcx - 0.6 * k, hcy - 0.4 * k, 0.9 * k, 1.3 * k, "#7affc0"); F(hcx - 0.4 * k, ht - 0.3 * k, 0.5 * k, 0.6 * k, "#2a3a34"); }
  };
  if (rims) {
    ox = -g; mono = pal.cool; body();
    ox = g; mono = pal.warm; body();
    ox = 0; mono = "";
  }
  body();
  const S = (lx: number, ly: number): number[] => [X + f * lx * xs, Y - ly * sq];
  const h0 = S(AR0[2] ?? 0, AR0[3] ?? 0); const h1v = S(AR1[2] ?? 0, AR1[3] ?? 0); const ee = S(hf - 1.0 * k, hcy + 0.1 * k); const sh0 = S(shx, shy);
  const low = hipY + Math.min(sole(A, P.f0), sole(B, P.f1));
  return { hx: h0[0] ?? X, hy: h0[1] ?? Y, fx: h1v[0] ?? X, fy: h1v[1] ?? Y, ex: ee[0] ?? X, ey: ee[1] ?? Y, top: Y - ht * sq - k, sx: sh0[0] ?? X, sy: sh0[1] ?? Y, foot: Y + qq(-low * sq) };
}
function drawPerson(c: Ctx, x: number, y: number, L: Look, f: number, ph: number, moving: boolean, v: number): void {
  const P = moving ? gaitIK(q(ph, 16), 1, 0, strideK(v), 0, L.h) : idleP(G.t, ph + L.h);
  figure(c, x, y, L, f, P, G.gfx > 0);
}
// soft contact shadow under a character's feet (ground row y)
function shade(b: Ctx, x: number, y: number, w: number, a: number): void {
  const X = Math.round(x); const hw = Math.max(2, Math.round(w / 2)); const ga = b.globalAlpha;
  b.globalAlpha = ga * a;
  b.fillStyle = "rgba(0,0,0,0.16)"; b.fillRect(X - hw - 2, y - 1, hw * 2 + 4, 3);
  b.fillStyle = "rgba(0,0,0,0.3)"; b.fillRect(X - hw, y - 1, hw * 2, 2);
  b.fillStyle = "rgba(0,0,0,0.28)"; b.fillRect(X - hw + 1, y, hw * 2 - 2, 1);
  b.globalAlpha = ga;
}
// debug: when set, every drawn character logs [footY, groundY, airborne]
const DBG: { foot: number[][] | null } = { foot: null };
function npcPose(n: Npc, moving: boolean, t: number): Pose {
  if (moving) { const k = n.look.h / 31; const D = strideK(n.speed / k); return gaitIK((n.x * n.dir) / (D * k) + n.x0 * 0.013, 1, 0, D, t, n.x0); }
  const P = idleP(t, n.x0);
  const id = n.idle;
  if (id === "stir") { const a = Math.sin(t * 3); P.s0 = 0.9 + 0.1 * a; P.e0 = 0.9; P.s1 = 0.7; P.e1 = 0.8; P.lean = 0.1; }
  else if (id === "tinker") { P.s0 = 0.7 + 0.08 * Math.sin(t * 9); P.e0 = 1.0; P.s1 = 0.55; P.e1 = 1.0; P.lean = 0.22; P.tilt = 0.35; }
  else if (id === "wave" && Math.sin(t * 1.4) > 0.3) { P.s0 = 2.6; P.e0 = 0.4 + 0.35 * Math.sin(t * 9); }
  else if (id === "doze") { P.tilt = 0.55 + 0.05 * Math.sin(t * 0.8); P.lean = -0.02; P.s0 = 0.1; P.s1 = 0.0; }
  else if (id === "smoke") { const on = Math.sin(t * 0.8) > 0.4; P.s0 = on ? 0.35 : 0.1; P.e0 = on ? 2.55 : 0.9; P.s1 = 0.4; P.e1 = 1.5; }
  else if (id === "scan" && n.wait > 0) { P.s0 = 1.35; P.e0 = 0.15; }
  else if (id === "wrist" && n.wait > 0) { P.s0 = 0.5; P.e0 = 1.6; P.tilt = 0.3; }
  else if (id === "fold") { const a = Math.sin(t * 2.2); P.s0 = 0.8 + 0.08 * a; P.e0 = 1.35; P.s1 = 0.72 - 0.08 * a; P.e1 = 1.35; P.tilt = 0.32; P.lean = 0.06; }
  else if (id === "warm") { const a = Math.sin(t * 0.9); P.s0 = 0.95 + 0.05 * a; P.e0 = 0.45; P.s1 = 0.85; P.e1 = 0.5; P.lean = 0.1; P.tilt = 0.1; }
  return P;
}
const ELOOK: Look = { coat: "#1a1f29", hair: "#2c1c14", skin: "#d6a88c", accent: "#a8a48e", rim: "#ffb466", h: 31, extra: "collar stubble", b: "m", cl: 2, hs: "tousle", sh: "#a6a28a", pa: "#13151b", shoe: "#060607", open: true, cool: "#5fd8d0" };
// Elias's procedural animation state (module level, never saved)
const EA = { ph: 0, spd: 0, w: 0, r: 0, lean: 0.03, pvx: 0, sway: 0, swayV: 0, hr: 0, hrV: 0, hl: 0, hlV: 0, dip: 0, dipV: 0, turn: 0, f: 1, pre: 0, sk: 0, skA: 1 };
const PRE = 0.06; const TURN = 0.13;
function animTick(dt: number): void {
  const g = G; const a = EA; const v = Math.abs(g.vx); const gr = g.grounded;
  if (dt <= 0) return;
  a.spd += (v - a.spd) * Math.min(1, dt * 12);
  a.w += ((gr ? clamp((a.spd - 3) / 24, 0, 1) : a.w) - a.w) * Math.min(1, dt * 10);
  a.r += ((gr ? clamp((a.spd - 64) / 34, 0, 1) : a.r) - a.r) * Math.min(1, dt * 6);
  if (gr && a.w > 0.02) {
    const prev = a.ph; a.ph += a.spd * dt / strideK(Math.max(a.spd, 1));
    if (Math.floor(prev * 2) !== Math.floor(a.ph * 2) && a.w > 0.35) {
      step(); if (a.spd > 80) puff(g.px - g.facing * 3, g.py, 1);
      // contact: hair and coat hem bounce a little harder at a run
      a.hrV += 2.6 * a.r; a.swayV += 5 * a.r; a.hlV -= 1.2 * a.r;
    }
  } else if (gr) a.ph = Math.round(a.ph * 2) / 2;
  g.walk = a.ph * Math.PI * 2;
  const acc = clamp(((g.vx - a.pvx) / dt) * g.facing / 600, -1, 1); a.pvx = g.vx;
  const lt = gr ? 0.02 + 0.02 * a.w + 0.09 * a.r + acc * 0.05 : 0.06;
  a.lean += (lt - a.lean) * Math.min(1, dt * 7);
  // stopping from a run: a short skid and settle (knees give, coat and hair swing forward)
  if (gr && a.skA > 0 && a.r > 0.3 && acc < -0.7 && !g.left && !g.right) { a.sk = 0.14; a.skA = 0; a.dipV += 7; a.swayV -= 22; a.hrV -= 6; a.hlV += 1.5; }
  if (a.spd < 6 || acc > 0.2) a.skA = 1;
  a.sk = Math.max(0, a.sk - dt);
  if (g.facing !== a.f) { a.f = g.facing; a.turn = TURN; a.swayV -= 16; a.hrV -= 7; }
  a.turn = Math.max(0, a.turn - dt);
  const sw = 0.2 + 0.8 * a.w + 1.4 * a.r - acc * 0.7 + (gr ? 0 : clamp(g.vy / 180, -1, 1) * -0.9);
  a.swayV += ((sw - a.sway) * 75 - a.swayV * 7) * dt; a.sway += a.swayV * dt;
  const ht = 0.1 + 0.45 * a.w + 0.6 * a.r + (gr ? 0 : 0.3);
  a.hrV += ((ht - a.hr) * 120 - a.hrV * 9) * dt; a.hr += a.hrV * dt;
  a.hlV += (-a.hl * 160 - a.hlV * 13) * dt; a.hl = clamp(a.hl + a.hlV * dt, -1.2, 0.4);
  a.dipV += (-a.dip * 170 - a.dipV * 19) * dt; a.dip = clamp(a.dip + a.dipV * dt, -0.3, 1.3);
}
// landing: knees absorb the impact, head and coat follow through
function animLand(fallV: number): void { const s = clamp(fallV / 180, 0.35, 1.6); EA.dipV += 13 * s; EA.hlV -= 4 * s; EA.swayV -= 10 * s; }
function airPose(): Pose {
  const g = G; const P = pose0(); const u = sstep((g.vy + 182) / 364);
  // keyframes: launch stretch -> apex tuck -> reach for the ground
  const K = [[0.55, 0.9, -0.35, 0.25, -0.4, -0.9, 1.3, 0.5, -0.7, 0.4, 16.2, 1.05, 0.06], [1.0, 1.5, 0.25, 1.2, -0.3, -0.4, 0.8, 1.0, 0.2, 0.8, 15.3, 1.0, 0.1], [0.5, 0.6, 0.05, 0.45, 0.1, -0.2, 1.4, 0.6, 0.9, 0.5, 15.8, 1.03, 0.04]];
  const lo = u < 0.5 ? K[0] : K[1]; const hi = u < 0.5 ? K[1] : K[2]; const e = u < 0.5 ? u * 2 : (u - 0.5) * 2;
  const v = (i: number): number => ((lo?.[i] ?? 0) * (1 - e) + (hi?.[i] ?? 0) * e);
  const sp = EA.r * 0.3;
  P.t0 = v(0) + sp; P.k0 = v(1); P.t1 = v(2) - sp; P.k1 = v(3); P.f0 = v(4); P.f1 = v(5); P.s0 = v(6); P.e0 = v(7); P.s1 = v(8); P.e1 = v(9); P.fix = v(10); P.sq = v(11); P.lean = v(12) + EA.r * 0.08;
  P.sr = (P.s0 - P.s1) * 0.2;
  return P;
}
function eliasLoco(t: number): Pose {
  const g = G; const a = EA;
  const P = g.grounded ? gaitIK(a.ph, a.w, a.r, strideK(Math.max(a.spd, 1)), t, 0) : airPose();
  if (g.grounded) {
    const pre = a.pre > 0 ? Math.sin((1 - a.pre / PRE) * Math.PI * 0.5) : 0;
    const c = clamp(a.dip, -0.2, 1.2) + pre * 0.9;
    P.fix -= c * 2.4; P.lean = a.lean + Math.max(0, c) * 0.16; P.s0 += c * 0.35; P.s1 -= c * 0.3; P.e0 += c * 0.25;
    P.sq = 1 - clamp(c, -0.3, 1) * 0.07;
    if (a.w < 0.1 && Math.sin(t * 0.23) > 0.85) P.tilt = -0.18;
    if (a.sk > 0) { const u = Math.sin((a.sk / 0.14) * Math.PI); P.lean -= 0.1 * u; P.hx -= 0.6 * u; P.s0 -= 0.35 * u; P.s1 += 0.25 * u; }
  } else P.lean += a.lean * 0.3;
  P.sway = a.sway + (g.grounded ? 0.35 * Math.sin(Math.PI * 4 * a.ph + 0.8) * a.w : 0);
  P.hr = a.hr; P.hl += a.hl;
  if (a.turn > 0) {
    const u = a.turn / TURN;
    P.s0 *= 1 - u; P.s1 *= 1 - u; P.sr *= 1 - u; P.lean -= 0.1 * u; P.hx -= 0.5 * u;
    if (P.ik > 0) { P.ax0 *= 1 - 0.4 * u; P.ax1 *= 1 - 0.4 * u; }
  }
  return P;
}
function eliasPose(st: string, ph: number, t: number): Pose {
  const g = G;
  if (st === "interact") { const u = 1 - clamp(g.actT / 0.4, 0, 1); const r = Math.round(Math.sin(Math.PI * Math.min(1, u * 1.4)) * 6) / 6; const P = idleP(t, 0); P.s0 = 0.15 + 1.3 * r; P.e0 = 0.6 * (1 - r) + 0.08; P.lean = 0.04 + 0.08 * r; P.t0 = 0.05 + 0.25 * r; P.k0 = 0.15 + 0.2 * r; P.t1 = -0.12 * r; P.hx = 0.6 * r; return P; }
  if (st === "examine") { const u = 1 - clamp(g.actT / 0.5, 0, 1); const d = Math.round(Math.sin(Math.PI * Math.min(1, u * 1.25)) * 6) / 6; const P = idleP(t, 0); P.t0 = 0.75 * d + 0.05; P.k0 = 1.25 * d + 0.06; P.t1 = 0.25 * d - 0.05; P.k1 = 1.1 * d + 0.06; P.lean = 0.38 * d + 0.03; P.tilt = 0.45 * d; P.s0 = 0.06 + 0.75 * d; P.e0 = 0.2 + 0.7 * d; P.s1 = 0.3 * d; P.e1 = 1.4 * d + 0.2; return P; }
  return eliasLoco(t + ph * 0);
}
function groundUnder(x: number, y: number): number { let gy = FEET; for (const p of PLATS[G.loc]) if (x >= p.x0 && x <= p.x1 && p.y >= y - 0.01 && p.y < gy) gy = p.y; return gy; }
function drawElias(c: Ctx, x: number, y: number, f: number, st: string, ph: number, t: number): void {
  const gy = groundUnder(G.px, y); const air = clamp((gy - y) / 40, 0, 0.75);
  shade(c, x, gy, 11 * (1 - air), 1 - air);
  const P = eliasPose(st, ph, t);
  const j = figure(c, x, y, ELOOK, f, P, true);
  if (DBG.foot) DBG.foot.push([j.foot, y, !G.grounded || P.lift > 0.01 ? 1 : 0]);
}
function drawChair(c: Ctx, x: number, y: number): void {
  const X = Math.round(x); const Y = Math.round(y);
  R(c, X - 8, Y - 21, 2, 14, "#3a2a1c"); R(c, X - 7, Y - 21, 1, 13, "#4a3624"); R(c, X - 9, Y - 21, 4, 1, "#4a3624");
  R(c, X - 8, Y - 8, 12, 2, "#3a2a1c"); R(c, X - 8, Y - 8, 12, 1, "#5a4028"); R(c, X - 7, Y - 6, 1, 6, "#2a1a10"); R(c, X + 2, Y - 6, 1, 6, "#2a1a10");
}
function drawEliasSeated(c: Ctx, x: number, y: number, t: number, photo: boolean): void {
  const X = Math.round(x); const Y = Math.round(y);
  const P = pose0(); const nod = Math.sin(t * 0.8) > 0.7 ? 1 : 0;
  P.fix = 8.4; P.t0 = 1.42; P.k0 = 1.5; P.t1 = 1.32; P.k1 = 1.36; P.lean = -0.04 + (photo ? 0.12 : 0); P.tilt = photo ? 0.3 + nod * 0.1 : 0.05 * nod; P.hx = -1.2;
  if (photo) { P.s0 = 0.9; P.e0 = 1.25; P.s1 = 0.7; P.e1 = 1.35; } else { P.s0 = 0.3; P.e0 = 2.65; P.s1 = 0.6; P.e1 = 1.0; }
  const j = figure(c, X, Y, ELOOK, 1, P, true);
  if (photo) { const px = Math.round(j.hx); const py = Math.round(j.hy - 3); R(c, px, py, 3, 4, "#e8e0c8"); R(c, px + 1, py + 1, 1, 2, "#8a6a5a"); glow(c, px + 1.5, py + 2, 7, "255,230,190", 0.35); }
  else { R(c, j.hx, j.hy - 3, 1, 3, "#1a1a1e"); R(c, j.hx, j.hy - 2, 1, 1, "#5ff0d8"); glow(c, j.hx, j.hy - 2, 5, "95,240,216", 0.5); }
}
const PCACHE = new WeakMap<Look, Map<number, HTMLCanvasElement>>();
const PFOOT = new WeakMap<HTMLCanvasElement, number>();
let BAKE = 0;
const NWF = 16;
// cached ped frame; returns the world y of the lowest drawn foot pixel
function pedFrame(b: Ctx, L: Look, x: number, y: number, f: number, fr: number, mk: () => Pose): number {
  let m = PCACHE.get(L); if (!m) { m = new Map<number, HTMLCanvasElement>(); PCACHE.set(L, m); }
  const key = SC * 1000 + fr;
  let cv = m.get(key);
  const hh = Math.ceil(L.h) + 8;
  if (!cv) {
    if (BAKE <= 0) return figure(b, x, y, L, f, mk(), false).foot;
    BAKE--; cv = document.createElement("canvas"); cv.width = 34 * SC; cv.height = hh * SC;
    const cx = cv.getContext("2d"); if (!cx) return y;
    cx.setTransform(SC, 0, 0, SC, 0, 0); const j = figure(cx, 17, hh - 2, L, 1, mk(), true); m.set(key, cv); PFOOT.set(cv, j.foot - (hh - 2));
  }
  if (f > 0) b.drawImage(cv, Math.round(x) - 17, Math.round(y) - hh + 2, 34, hh);
  else { b.save(); b.translate(Math.round(x), 0); b.scale(-1, 1); b.drawImage(cv, -17, Math.round(y) - hh + 2, 34, hh); b.restore(); }
  return Math.round(y) + (PFOOT.get(cv) ?? 0);
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
  bead: { name: "Nova's glass bead", cat: "Clues", ev: false, desc: "A green glass bead from Nova's first stall. The Forgotten on Tidewater Pier know it." },
  bird: { name: "Paper bird (M-06)", cat: "Documents", ev: true, desc: "Wren folded it from an old AURELION intake form. Still legible on one wing: LAB 7 / UNIT M-06." },
  manifest: { name: "Crate manifest", cat: "Documents", ev: true, desc: "Stencilled on an AURELION crate: M BATCH, 6 UNITS. SERVICE ACCESS = LAB NO. + UNIT NO." },
  ribbon: { name: "Red ribbon", cat: "Clues", ev: true, desc: "Caught in the seal of pod M-06. Mara wore one exactly like it on the pier." },
  valelog: { name: "Vale's voice memo", cat: "Audio recordings", ev: true, desc: "Dr. V. Vale, personal log: they want M-06 wiped again. She keeps asking for someone called Elias." },
  indexcard: { name: "Archive index card", cat: "Documents", ev: true, desc: "AURELION archive card: VOSS, ELIAS. TEMPLATE E-01. STATUS: ACTIVE. Elias has never seen this card before." },
};
const OBJ = ["Leave Elias's apartment", "Travel through the Lower District", "Find the underground memory market", "Speak to NOVA", "Investigate the mysterious memory chip", "Locate the abandoned laboratory", "Find the entrance", "Investigate the memory archive", "Discover the AURELION experiment"];
const MISSIONS = ["001 · GHOSTS IN THE RAIN", "002 · THE FORGOTTEN ONES", "003 · A CITY WITHOUT SUNLIGHT", "004 · AFTER RAIN"];

type Kind = "SPEAK" | "ENTER" | "ACCESS" | "EXAMINE" | "COLLECT";
type Line = { who: string; text: string; choices?: Choice[]; act?: () => void };
type Choice = { label: string; next: () => Line[] };
type Dlg = { lines: Line[]; i: number; chars: number; waiting: boolean; done: (() => void) | null; push: boolean; acted: number };
type Npc = { id: string; name: string; loc: LocId; x: number; y: number; x0: number; x1: number; dir: number; speed: number; wait: number; look: Look; met: boolean; bubble: string; bubbleT: number; react: string[]; idle: string; stops: number[]; barks: string[]; barkCd: number; peek: number };
type Spot = { id: string; loc: LocId; x: number; y: number; kind: Kind; label: string; show: () => boolean; use: () => void };
type Target = { id: string; x: number; y: number; kind: Kind; label: string; use: () => void; walker?: boolean };
type Panel = "none" | "pause" | "bag" | "journal" | "settings" | "credits";
type Scene = "menu" | "cut" | "play" | "glitch" | "vis" | "end";
type Drop = { x: number; y: number; v: number; l: number; g: number };
type Car = { x: number; y: number; speed: number; dir: number; layer: number };
type Ped = { loc: LocId; x: number; lane: number; dir: number; sp: number; look: Look; look2: Look; kind: string; st: string; base: string; stT: number; seed: number; bubT: number; dy: number; gl: number; half: boolean };
const PCOAT = ["#2a2f3a", "#3a2a2a", "#1e3a34", "#3a3428", "#2a2238", "#40302a", "#1c2a3a", "#4a2030", "#2c3a2a", "#1a1e26"];
const PHAIR = ["#141012", "#3a2a1c", "#c8c0b0", "#6a2a3a", "#1a1a2a", "#2a1a10"];
const PSKIN = ["#d6a88c", "#a87458", "#7a5040", "#e0c0a0", "#5a3a2a", "#c08a6a"];
const PACC = ["#5ff0d8", "#ff6f9a", "#ffb04a", "#7ac8ff", "#c8ff6a", "#3a4450", "#5a3a4a"];
const PRIM = ["#5ff0d8", "#ff6f9a", "#ffb04a", "#9a8cff"];
const PEXTRA = ["", "", "", "glasses", "bag", "headset", "beanie", "hat", "", "bag", "collar", "pack", "cap", ""];
const PKINDS = ["coat", "umb", "neon", "hood", "umb", "kid", "couple", "worker", "rider", "dog", "synth", "coat", "hood", "neon", "coat", "umb"];
const NEONS = ["#ff6f9a", "#5ff0d8", "#ffb04a", "#9a8cff"];
const PSTOP: Record<LocId, [number, string][]> = { apt: [], lab: [], pier: [[176, "look"], [362, "shop"], [614, "look"], [880, "look"]], district: [[183, "shop"], [399, "shop"], [677, "shop"], [959, "shop"], [96, "look"], [545, "look"], [721, "look"], [1110, "look"], [1258, "look"]], market: [[190, "shop"], [360, "shop"], [520, "shop"], [770, "shop"], [266, "look"], [864, "look"]] };
function mixHex(a: string, b: string, k: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(a)) return a;
  const p = (s: string, i: number): number => parseInt(s.slice(i, i + 2), 16);
  const m = (i: number): string => Math.round(p(a, i) * (1 - k) + p(b, i) * k).toString(16).padStart(2, "0");
  return "#" + m(1) + m(3) + m(5);
}
const PBODY = ["m", "m", "f", "f", "thin", "broad", "m", "f", "old", "thin"];
const PHS = ["short", "tousle", "long", "bob", "bun", "buzz", "spiky", "bald", "short", "long", "bob", "tousle"];
const PSH = ["#a8a490", "#c8c8c0", "#6a7480", "#8a3a3a", "#d0c0a0", "#3a4a5a", "#b0a0b8"];
const PPA = ["#14161c", "#1c1a18", "#22262e", "#101418", "#2a2420", "#1a1e2a"];
function pedLook(s: number, kind: string, lane: number): Look {
  const pk = (a: string[], k: number): string => a[Math.floor(h1(s + k) * a.length)] ?? "#222222";
  const pn = (a: number[], k: number): number => a[Math.floor(h1(s + k) * a.length)] ?? 1;
  const kid = kind === "kid"; const syn = kind === "synth";
  const bd = kid ? "kid" : pk(PBODY, 11);
  const hgt = kid ? 20 + Math.floor(h1(s + 7) * 3) : (bd === "f" || bd === "thin" || bd === "old" ? 27 : 28) + Math.floor(h1(s + 7) * 5);
  let hs = kind === "hood" ? "hood" : syn ? pk(["short", "bob", "buzz"], 12) : kid ? pk(["short", "pig", "bob", "tousle"], 12) : pk(PHS, 12);
  if (bd === "old" && hs === "spiky") hs = "short";
  if (lane === 2) return { coat: "#020406", hair: "#020406", skin: "#05080a", accent: "#04070a", rim: "#071014", cool: "#060c10", h: hgt, extra: h1(s + 8) > 0.6 ? "hat" : "", b: bd, cl: pn([1, 2, 2, 3], 13), hs, sh: "#030507", pa: "#020304", shoe: "#010203" };
  const L: Look = {
    coat: kind === "worker" ? "#3a3a20" : pk(PCOAT, 1), hair: bd === "old" ? pk(["#c8c0b0", "#8a8a8a", "#e0dcd4"], 2) : pk(PHAIR, 2), skin: syn ? "#e6dcd4" : pk(PSKIN, 3),
    accent: kind === "worker" ? "#d8c020" : pk(PACC, 4), rim: syn ? "#5ff0d8" : h1(s + 5) > 0.45 ? pk(PRIM, 6) : "",
    h: Math.round(hgt * (lane === 0 ? 0.94 : 1)),
    extra: kind === "worker" ? "cap belt" : kind === "rider" ? "visor pack" : kind === "hood" ? (h1(s + 8) > 0.5 ? "bag" : "") : kid ? (h1(s + 8) > 0.5 ? "boots" : "") : pk(PEXTRA, 8),
    b: bd, cl: kind === "worker" ? 1 : kind === "rider" ? 1 : kid ? pn([1, 2], 13) : pn([0, 1, 1, 2, 2, 2, 3], 13), hs,
    sh: syn ? "#dfe6e6" : pk(PSH, 9), pa: pk(PPA, 10), open: h1(s + 14) > 0.5,
  };
  if (lane === 0) { const hz = "#1e4a4a"; L.coat = mixHex(L.coat, hz, 0.45); L.hair = mixHex(L.hair, hz, 0.45); L.skin = mixHex(L.skin, hz, 0.5); L.accent = mixHex(L.accent, hz, 0.4); L.sh = mixHex(L.sh ?? L.accent, hz, 0.5); L.pa = mixHex(L.pa ?? "#14161c", hz, 0.4); L.cool = "#2a6a6a"; }
  return L;
}
function pedKind(p: Ped, kind0: string): void {
  const kind = p.loc === "market" && (kind0 === "umb" || kind0 === "rider") ? "coat" : kind0;
  p.kind = kind; p.look = pedLook(p.seed, kind, p.lane); p.look2 = pedLook(p.seed + 50, "coat", p.lane);
  p.sp = p.base !== "walk" ? 0 : p.lane === 2 ? 18 + h1(p.seed) * 14 : kind === "rider" ? 62 + h1(p.seed) * 26 : kind === "kid" ? 26 + h1(p.seed) * 14 : 11 + h1(p.seed + 1) * 20;
}
function mkPed(loc: LocId, x: number, lane: number, kind: string, st: string, seed: number, half: boolean): Ped {
  const L = pedLook(seed, kind, lane);
  const p: Ped = { loc, x, lane, dir: h1(seed + 9) > 0.5 ? 1 : -1, sp: 0, look: L, look2: L, kind, st, base: st, stT: 0, seed, bubT: h1(seed + 4) * 3, dy: 0, gl: 0, half };
  pedKind(p, kind); return p;
}
function makePeds(): Ped[] {
  const o: Ped[] = [];
  const add = (loc: LocId, list: [number, number, string, string][], s0: number): void => list.forEach((d: [number, number, string, string], i: number) => { const p = mkPed(loc, d[0], d[1], d[2], d[3], s0 + i * 13, i % 2 === 1); if (d[3] === "chat") p.dir = i % 2 === 0 ? 1 : -1; o.push(p); });
  for (let i = 0; i < 26; i++) o.push(mkPed("district", h1(i * 3.7 + 1) * 1400, i % 3 === 0 ? 0 : 1, PKINDS[i % PKINDS.length] ?? "coat", "walk", 100 + i * 7, i % 2 === 1));
  for (let i = 0; i < 4; i++) o.push(mkPed("district", i * 360 + 90, 2, i % 2 ? "umb" : "coat", "walk", 400 + i * 11, i % 2 === 1));
  add("district", [[112, 1, "vendor", "vendor"], [70, 0, "coat", "look"], [78, 0, "kid", "look"], [300, 0, "coat", "shelter"], [314, 0, "neon", "shelter"], [556, 0, "coat", "chat"], [564, 0, "hood", "chat"], [572, 0, "synth", "chat"], [718, 0, "worker", "smoke"], [790, 0, "dog", "look"], [866, 0, "hood", "smoke"], [1010, 0, "coat", "chat"], [1018, 0, "umb", "chat"], [1160, 0, "synth", "smoke"], [1296, 0, "couple", "shelter"], [1330, 0, "coat", "chat"], [1338, 0, "kid", "chat"]], 300);
  for (let i = 0; i < 14; i++) o.push(mkPed("market", h1(i * 5.3 + 2) * 900, i % 3 === 0 ? 0 : 1, PKINDS[(i + 3) % PKINDS.length] ?? "coat", "walk", 700 + i * 7, i % 2 === 1));
  for (let i = 0; i < 2; i++) o.push(mkPed("market", i * 450 + 200, 2, "coat", "walk", 900 + i * 11, i === 1));
  add("district", [[690, 1, "coat", "wave"]], 1300);
  add("market", [[150, 1, "coat", "wave"]], 1310);
  for (let i = 0; i < 9; i++) o.push(mkPed("pier", h1(i * 4.9 + 3) * 1100, i % 3 === 0 ? 0 : 1, ["coat", "umb", "synth", "hood", "synth", "worker", "umb", "kid", "coat"][i] ?? "coat", "walk", 1400 + i * 7, i % 2 === 1));
  add("pier", [[112, 0, "synth", "shelter"], [130, 0, "synth", "smoke"], [212, 0, "kid", "look"], [330, 0, "coat", "shop"], [398, 0, "synth", "shop"], [500, 0, "synth", "chat"], [508, 0, "hood", "chat"], [700, 0, "synth", "shelter"], [740, 0, "dog", "look"], [930, 0, "synth", "look"]], 1500);
  add("market", [[176, 0, "coat", "shop"], [204, 0, "kid", "shop"], [292, 0, "hood", "chat"], [300, 0, "coat", "chat"], [452, 0, "synth", "shop"], [600, 0, "worker", "smoke"], [640, 0, "coat", "chat"], [648, 0, "neon", "chat"], [748, 0, "coat", "shop"], [850, 0, "couple", "look"]], 1000);
  return o;
}
function mumble(): void {
  if (!SND) return;
  const n = 2 + Math.floor(Math.random() * 3); const b0 = 150 + Math.random() * 120;
  for (let k = 0; k < n; k++) tone(b0 + Math.random() * 60, 0.09, "triangle", 0.01, k * 0.11, b0 + (Math.random() - 0.5) * 80);
}
function updPeds(dt: number): void {
  const g = G; const lw = LOCW[g.loc];
  for (const p of g.peds) {
    if (p.loc !== g.loc) continue;
    if (p.bubT > 0) p.bubT -= dt;
    if (p.gl > 0) p.gl -= dt;
    const near = p.lane === 1 && Math.abs(p.x - g.px) < 15 && g.scene === "play";
    p.dy = 0;
    if (near && p.st !== "walk" && p.gl <= 0 && Math.random() < dt * 1.5) p.gl = 1.4;
    if (p.st === "walk") {
      const ox = p.x; p.x += p.dir * p.sp * dt * (near ? 0.55 : 1);
      if (p.lane < 2 && p.kind !== "rider") for (const s of PSTOP[g.loc]) if ((ox - s[0]) * (p.x - s[0]) < 0 && Math.random() < 0.22) { p.st = s[1]; p.stT = 2 + Math.random() * 4; }
      if (p.x < -40 || p.x > lw + 40) { p.seed += 37; p.dir = h1(p.seed) > 0.5 ? 1 : -1; p.x = p.dir > 0 ? -30 : lw + 30; if (p.lane < 2) pedKind(p, PKINDS[Math.floor(h1(p.seed + 2) * PKINDS.length)] ?? "coat"); }
    } else if (p.base === "walk") { p.stT -= dt; if (p.stT <= 0) p.st = "walk"; }
    if (p.st === "chat" && p.bubT <= 0 && Math.random() < dt * 0.35) { p.bubT = 1.4 + Math.random(); const sx = p.x - g.cam; if (sx > 0 && sx < W && (g.gfx || !p.half)) mumble(); }
  }
}
// waves under the pier boards, the odd gull; a cold drip and server hum in Lab 7
function pierAmb(): void {
  const g = G; if (!SND || g.scene !== "play") return;
  g.ambT -= 0.25; if (g.ambT > 0) return;
  if (g.loc === "pier") { g.ambT = 2.5 + Math.random() * 3; noiseHit(1.8, 260, 0.06 * g.amb, "lowpass", true); if (Math.random() < 0.25) tone(1300 + Math.random() * 300, 0.3, "triangle", 0.008, 0, 900); }
  else if (g.loc === "lab") { g.ambT = 1.5 + Math.random() * 3; tone(1700 + Math.random() * 500, 0.08, "sine", 0.012, 0, 900); }
  else g.ambT = 2;
}
function pedAudio(): void {
  if (!SND) return;
  const g = G; let near = 0; let steps = 0;
  for (const p of g.peds) {
    if (p.loc !== g.loc || p.lane === 2 || (!g.gfx && p.half)) continue;
    const d = Math.abs(p.x - g.px); if (d < 160) near += 1 - d / 160;
    if (p.st === "walk" && d < 70 && p.kind !== "rider" && Math.random() < 0.5) steps = Math.max(steps, 1 - d / 70);
  }
  const base = g.loc === "market" ? 0.1 : g.loc === "district" ? 0.02 : g.loc === "pier" ? 0.03 : 0;
  SND.murmur.gain.setTargetAtTime(g.loc === "apt" || g.loc === "lab" || g.scene !== "play" ? 0 : Math.min(0.2, base + near * 0.012), SND.ctx.currentTime, 0.5);
  if (steps > 0) noiseHit(0.04, g.loc === "district" ? 2200 : 1100, 0.035 * steps, g.loc === "district" ? "highpass" : "bandpass", false, Math.random() * 0.2);
  if (g.loc === "district") { const tx = tramX(g.t, g.cam * 0.45); const on = tx > -170 && tx < W; if (on && !g.tramOn) noiseHit(5, 140, 0.16, "lowpass", true); g.tramOn = on; }
}
function umbrella(b: Ctx, cx: number, y: number, r: number, col: string, rim: string): void {
  for (let i = -r; i <= r; i++) { const hh = Math.round(Math.sqrt(Math.max(0, r * r - i * i)) * 0.5); R(b, cx + i, y - hh, 1, hh + 1, col); if (rim) R(b, cx + i, y - hh, 1, 1, rim); }
  if (rim) { R(b, cx - r, y, 2 * r + 1, 1, rim); glowRect(b, cx - r, y - Math.round(r * 0.5), 2 * r + 1, Math.round(r * 0.5) + 1, rim, 0.4); }
  R(b, cx, y + 1, 1, 7, "#0a0c10");
}
function pedPose(fr: number, sd: number, D: number): Pose {
  if (fr < NWF) return gaitIK(fr / NWF, 1, 0, D, 0, sd);
  const P = pose0();
  if (fr === 20 || fr === 21) { P.br = fr === 20 ? 1 : 0; P.s0 = 0.06 + 0.03 * P.br; P.s1 = -0.06; P.hx = 0.2 * Math.sin(sd); P.k0 = 0.12; }
  else if (fr === 22) { P.s0 = 0.35; P.e0 = 2.55; P.s1 = 0.4; P.e1 = 1.5; P.k1 = 0.25; }
  else if (fr === 23) { P.s0 = 0.55; P.e0 = 1.9; P.s1 = 0.1; P.tilt = 0.35; }
  else if (fr === 25 || fr === 26) { P.s0 = 2.6; P.e0 = fr === 25 ? 0.25 : 0.85; P.s1 = 0.08; P.tilt = -0.05; }
  else if (fr === 24) { P.s0 = 1.15; P.e0 = 0.25; P.s1 = 1.05; P.e1 = 0.3; P.lean = 0.16; P.t0 = 0.18; P.k0 = 0.2; P.t1 = -0.12; P.k1 = 0.12; }
  return P;
}
function drawPed(b: Ctx, p: Ped, x: number, y: number, t: number): void {
  const L = p.look; const mv = p.st === "walk"; let f = p.dir;
  if (p.gl > 0 && !mv) f = G.px > p.x ? 1 : -1;
  const kk = L.h / 31; const D = strideK(p.sp / kk);
  const ph = (p.x * p.dir) / (D * kk) + p.seed * 0.17;
  const wf = Math.floor(q(ph, NWF) * NWF + 0.001) % NWF;
  const sd = p.seed * 0.37;
  const idf = Math.sin(t * 1.7 + sd) > 0 ? 20 : 21;
  const fig = (L2: Look, xx: number, fr: number, yy: number): void => {
    if (p.lane < 2) shade(b, xx, yy, L2.h * 0.3, p.lane === 0 ? 0.7 : 1);
    const ft = pedFrame(b, L2, xx, yy, f, fr, (): Pose => pedPose(fr, sd, D));
    if (DBG.foot) DBG.foot.push([ft, yy, 0]);
  };
  const top = y - L.h;
  if (p.kind === "rider") {
    const dy = y - 3;
    shade(b, x, y, 18, 1);
    R(b, x - 8, dy, 17, 1, "#1a2228"); R(b, x - 8, dy + 1, 17, 1, "#0c1216"); R(b, x - 9, y - 2, 3, 2, "#05080a"); R(b, x + 6, y - 2, 3, 2, "#05080a");
    R(b, x + f * 8, dy - 15, 1, 15, "#2a3238"); R(b, x + f * 6, dy - 16, 4, 1, "#3a444a");
    { const ft = pedFrame(b, L, x - f, dy, f, 24, (): Pose => pedPose(24, sd, D)); if (DBG.foot) DBG.foot.push([ft, dy, 0]); }
    R(b, x + f * 8, dy - 12, 1, 1, "#fff2c0"); glow(b, x + f * 10, dy - 12, 12, "255,240,200", 0.8); glow(b, x - f * 8, dy, 5, "255,80,80", 0.6);
    return;
  }
  if (p.kind === "couple") { fig(L, x - 4, mv ? wf : idf, y); fig(p.look2, x + 4, mv ? (wf + NWF / 2) % NWF : idf, y); umbrella(b, x, top - 3, 13, "#1a1420", "#ff6f9a"); return; }
  if (p.kind === "vendor") {
    R(b, x + 5, y - 14, 20, 11, "#3a2616"); R(b, x + 5, y - 15, 20, 1, "#c85a2a"); R(b, x + 5, y - 9, 20, 1, "#2a1a10"); R(b, x + 7, y - 3, 3, 3, "#05080a"); R(b, x + 20, y - 3, 3, 3, "#05080a");
    R(b, x + 15, y - 38, 1, 23, "#1a1a1a");
    for (let i = -14; i <= 14; i++) R(b, x + 15 + i, y - 39 - Math.round(Math.sqrt(196 - i * i) * 0.35), 1, 2, ((i + 14) % 7) < 3 ? "#d8402a" : "#e8d0a0");
    glow(b, x + 15, y - 17, 16, "255,170,90", 0.6);
    for (let k = 0; k < 3; k++) { const qq = (t * 0.6 + k / 3) % 1; b.globalAlpha = 0.35 * (1 - qq); R(b, x + 9 + k * 4 + Math.sin(t * 2 + k) * 1.5, y - 16 - qq * 12, 2, 2, "#e8e0d0"); b.globalAlpha = 1; }
    f = 1; fig(L, x, idf, y); return;
  }
  const fr = mv ? wf : p.st === "smoke" ? 22 : p.st === "look" ? 23 : p.st === "wave" && (p.gl > 0 || Math.sin(t * 0.7 + p.seed) > 0.8) ? (Math.sin(t * 9) > 0 ? 25 : 26) : idf;
  if (p.kind === "dog") {
    const dx = x + f * 11; const dp = ph * Math.PI * 4; const bb = mv ? Math.round(Math.abs(Math.sin(dp))) : 0; const lg = mv ? Math.round(Math.sin(dp)) : 0;
    shade(b, dx, y, 8, 0.8);
    R(b, dx - 4, y - 6 - bb, 8, 3, "#4a3220"); R(b, dx - 4, y - 6 - bb, 8, 1, "#5a4230"); R(b, f > 0 ? dx + 3 : dx - 5, y - 8 - bb, 2, 3, "#4a3220"); R(b, f > 0 ? dx + 4 : dx - 6, y - 7 - bb, 2, 1, "#3a2414"); R(b, f > 0 ? dx - 6 : dx + 4, y - 7 - bb, 2, 1, "#4a3220");
    R(b, dx - 3 + lg, y - 3, 1, 3, "#3a2414"); R(b, dx + 2 - lg, y - 3, 1, 3, "#3a2414");
  }
  fig(L, x, fr, y);
  const j = { ex: x + f * Math.round(L.h * 0.05), ey: y - Math.round(L.h * 0.885), hx: x + f * Math.round(L.h * 0.12), hy: y - Math.round(L.h * 0.52) };
  if (p.kind === "dog") { const dx = x + f * 11; for (let k = 0; k < 6; k++) R(b, j.hx + (dx - f * 3 - j.hx) * k / 6, j.hy + (y - 7 - j.hy) * k / 6, 1, 1, "#0a0c10"); }
  if (p.kind === "umb" || p.kind === "neon") { R(b, x + f * 2, top + 7, 1, Math.round(L.h * 0.32), "#0a0c10"); umbrella(b, x + f * 2, top - 2, 10, p.lane === 0 ? "#141a20" : "#181c24", p.kind === "neon" ? NEONS[p.seed % 4] ?? "#5ff0d8" : ""); }
  if (p.kind === "synth" && Math.sin(t * 0.9 + p.seed) > 0.75) { R(b, j.ex, j.ey, 1, 1, "#5ff0d8"); glow(b, j.ex, j.ey, 4, "95,240,216", 0.6); }
  if (p.st === "smoke") { const hx = j.ex + f * 2; const hy = j.ey + 3; R(b, hx, hy, 1, 1, "#ff6a3a"); glow(b, hx, hy, 3, "255,120,60", 0.5); for (let k = 0; k < 4; k++) { const qq = (t * 0.45 + k / 4 + p.seed * 0.1) % 1; b.globalAlpha = 0.4 * (1 - qq); R(b, hx + Math.sin(t + k * 2) * 2 + qq * f * 4, hy - 2 - qq * 14, 2 + Math.round(qq * 2), 2, "#cfe8e4"); } b.globalAlpha = 1; }
  if (p.st === "look") { R(b, j.ex + f * 2, j.ey + 5, 1, 2, "#ffd0e0"); glow(b, j.ex + f * 2, j.ey + 4, 7, "255,111,154", 0.45); }
  if (p.bubT > 0 && p.st === "chat") { const by = top - 9; R(b, x - 4, by, 9, 5, "#dfe9e8"); R(b, x - 1, by + 5, 1, 1, "#dfe9e8"); const n = Math.floor(t * 4) % 4; for (let k = 0; k < 3; k++) if (k < n) R(b, x - 2 + k * 2, by + 2, 1, 1, "#203038"); }
}
function drawPeds(b: Ctx, cam: number, lane: number): void {
  const t = G.t; const ly = FEET;
  for (const p of G.peds) {
    if (p.loc !== G.loc || p.lane !== lane || (!G.gfx && p.half)) continue;
    const sx = Math.round(p.x - cam); if (sx < -34 || sx > W + 34) continue;
    drawPed(b, p, sx, ly, t);
  }
}
type Chat = { a: Npc; b: Npc; l: string[]; t: number };
type Part = { x: number; y: number; vx: number; vy: number; l: number; m: number; c: string };
type Fly = { x: number; y: number; dir: number; speed: number; snd: boolean };
type Game = {
  scene: Scene; t: number; sceneT: number; loc: LocId;
  px: number; py: number; vx: number; vy: number; grounded: boolean; facing: number; walk: number; stepPh: number; landT: number; actT: number; actKind: string;
  cam: number; zoom: number; view: { sx: number; sy: number; z: number };
  fade: number; fadeTo: number; fadeCb: (() => void) | null;
  dlg: Dlg | null; flags: Record<string, number>; items: string[]; credits: number; obj: number; m2: boolean; notes: string[];
  left: boolean; right: boolean; jumpQ: boolean; actQ: boolean; run: boolean;
  panel: Panel; rev: number; near: string; toast: { text: string; t: number } | null; banner: { a: string; b: string; t: number } | null;
  npcs: Npc[]; chat: Chat | null; chatCd: number; drops: Drop[]; cars: Car[]; flash: number;
  music: number; sfx: number; amb: number; gfx: number; textSpeed: number; saveNote: string; bagTab: string; openItem: string; ringing: boolean;
  coyote: number; jbuf: number; jumpHeld: boolean; parts: Part[]; fly: Fly | null; flyCd: number; beat: number; sweep: number; sndT: number; lookX: number; peds: Ped[]; tramOn: boolean; kits: Kit[]; birds: Bird[]; ambT: number;
};

const LK: Record<string, Look> = {
  ines: { coat: "#5a3a5a", hair: "#d8d8e0", skin: "#b08a70", accent: "#e86a8a", rim: "#ffb04a", h: 27, extra: "basket shawl", b: "old", cl: 3, hs: "bun", sh: "#8a5a7a", pa: "#2a1e2a", open: false },
  dex: { coat: "#c8621f", hair: "#ff8a3d", skin: "#c09a80", accent: "#3df5d0", rim: "#5ff0d8", h: 30, extra: "goggles pack", b: "thin", cl: 1, hs: "spiky", sh: "#2a2a30", pa: "#1a1c22", open: true },
  bram: { coat: "#2a3a4a", hair: "#202830", skin: "#c8a088", accent: "#d8c84a", rim: "#7ac8ff", h: 33, extra: "cap belt", b: "broad", cl: 2, hs: "buzz", sh: "#3a4a5a", pa: "#141c26", open: false },
  lulu: { coat: "#e8c84a", hair: "#e86a8a", skin: "#d8a88c", accent: "#3a5a8a", rim: "#ffd36b", h: 22, extra: "boots", b: "kid", cl: 2, hs: "pig", sh: "#3a5a8a", pa: "#2a3a5a", shoe: "#c8a83a", open: false },
  hiro: { coat: "#e8e0d0", hair: "#202020", skin: "#c8a080", accent: "#c23a4e", rim: "#ffb04a", h: 30, extra: "headband", b: "m", cl: 1, hs: "short", sh: "#d8d0c0", pa: "#202024", open: false },
  pix: { coat: "#2a4a4a", hair: "#7ac8ff", skin: "#d0a890", accent: "#ffd36b", rim: "#3df5d0", h: 28, extra: "glasses bag", b: "f", cl: 0, hs: "bob", sh: "#ffd36b", pa: "#1a2a2e", open: true },
  oyelo: { coat: "#6a2a5a", hair: "#101010", skin: "#8a5a40", accent: "#ffb04a", rim: "#ffb04a", h: 32, extra: "beard", b: "broad", cl: 3, hs: "bald", sh: "#ffb04a", pa: "#2a1028", open: false },
  tam: { coat: "#3a4a3a", hair: "#909090", skin: "#b88a70", accent: "#a0a060", rim: "#ffb04a", h: 28, extra: "", b: "old", cl: 1, hs: "short", sh: "#a0a060", pa: "#22261e", open: true },
  rook: { coat: "#2a2a3a", hair: "#8a6aaa", skin: "#a8a0b0", accent: "#7affc0", rim: "#7affc0", h: 33, extra: "headset", b: "thin", cl: 2, hs: "long", sh: "#3a3a50", pa: "#14141e", open: true },
  nova: { coat: "#e0e4e4", hair: "#5ff0d8", skin: "#c89a8a", accent: "#ffb04a", rim: "#ff6f9a", h: 30, extra: "visor", b: "f", cl: 2, hs: "bob", sh: "#ff6f9a", pa: "#2a2a34", open: false },
  sol: { coat: "#3a3428", hair: "#c8c0b0", skin: "#e0d4cc", accent: "#5ff0d8", rim: "#5ff0d8", h: 30, extra: "beanie beard", b: "old", cl: 3, hs: "short", sh: "#5a4a3a", pa: "#1e1a16", open: true, cool: "#5ff0d8" },
  juno: { coat: "#6a3a2a", hair: "#1a1010", skin: "#a87458", accent: "#ffb04a", rim: "#ffb04a", h: 29, extra: "headband apron", b: "f", cl: 1, hs: "bun", sh: "#c85a2a", pa: "#221612" },
  wren: { coat: "#e8e4dc", hair: "#2a1a20", skin: "#e6dcd4", accent: "#ff6f9a", rim: "#ff6f9a", h: 27, extra: "", b: "thin", cl: 1, hs: "bob", sh: "#dfe6e6", pa: "#3a3a40", cool: "#5ff0d8" },
  vale: { coat: "#dcdcd4", hair: "#a8a8a8", skin: "#d8b8a0", accent: "#7ac8ff", rim: "#7ac8ff", h: 29, extra: "glasses", b: "f", cl: 3, hs: "bun", sh: "#5a6a7a", pa: "#24262c", open: true },
  ped: { coat: "#04080a", hair: "#04080a", skin: "#0c1416", accent: "#04080a", rim: "", h: 29, extra: "" },
};
const NPCX: Record<string, { idle: string; stops: number[]; barks: string[] }> = {
  ines: { idle: "", stops: [210, 560], barks: ["Flowers! Real petals!", "Mind the puddles, detective."] },
  dex: { idle: "wrist", stops: [520], barks: ["Late, late, late.", "Package hums. Don't ask."] },
  bram: { idle: "scan", stops: [470, 800, 1092], barks: ["Move along, Voss.", "Curfew's at two. Allegedly."] },
  lulu: { idle: "", stops: [200, 868], barks: ["Psst. Secrets, cheap!", "Coat man!"] },
  hiro: { idle: "stir", stops: [], barks: ["Noodles! Hot noodles!", "Broth's been going six years!"] },
  pix: { idle: "tinker", stops: [], barks: ["Hold still, you little... ow.", "Fixed it. Mostly."] },
  oyelo: { idle: "wave", stops: [], barks: ["Memories! Fresh, warm, barely used!", "Childhoods, half price!"] },
  tam: { idle: "doze", stops: [], barks: ["Zzz...", "Mm... five more minutes..."] },
  rook: { idle: "", stops: [190, 360, 520], barks: ["Was I here yesterday?", "Smells like somebody's summer."] },
  nova: { idle: "smoke", stops: [], barks: ["Mm.", "Don't touch the glass."] },
  sol: { idle: "warm", stops: [], barks: ["Six years of tide. Counting.", "Fire's free. Questions cost."] },
  juno: { idle: "stir", stops: [], barks: ["Skewers! Hot, mostly protein!", "Four credits, warm hands!"] },
  wren: { idle: "fold", stops: [], barks: ["Fold, crease, fly.", "Mind the gulls."] },
  vale: { idle: "", stops: [], barks: [] },
};
// Dr. Vale stays hidden until Elias has gone through her archive
function onNpc(n: Npc): boolean { return n.loc === G.loc && (n.id !== "vale" || G.obj >= 8 || !!G.flags.valeIn); }
function mkNpc(id: string, name: string, loc: LocId, x: number, y: number, x0: number, x1: number, speed: number, react: string[]): Npc {
  const ex = NPCX[id] ?? { idle: "", stops: [], barks: [] };
  return { id, name, loc, x, y, x0, x1, dir: 1, speed, wait: 0, look: LK[id] ?? LK.ped ?? { coat: "#000", hair: "#000", skin: "#000", accent: "#000", rim: "", h: 19, extra: "" }, met: false, bubble: "", bubbleT: 0, react, idle: ex.idle, stops: ex.stops, barks: ex.barks, barkCd: 2 + Math.random() * 5, peek: 0 };
}
function makeNpcs(): Npc[] {
  return [
    mkNpc("ines", "Ines", "district", 300, FEET, 160, 720, 8, ["Mind the puddles. They remember faces.", "You look like a man chasing a ghost.", "Rain's softer tonight. Something is coming."]),
    mkNpc("dex", "Dex", "district", 700, FEET, 300, 1150, 22, ["Can't stop. Got a package that hums.", "AURELION vans everywhere tonight. Everywhere.", "You didn't see me. I didn't see you."]),
    mkNpc("bram", "Officer Bram", "district", 1000, FEET, 600, 1290, 10, ["Curfew's a suggestion down here.", "Kane's asking about you. I said nothing. Mostly.", "Synthetics or not, everybody gets wet."]),
    mkNpc("lulu", "Lulu", "district", 200, FEET, 100, 900, 26, ["Nice coat. I'll steal it later.", "Saw your face on an old poster once. Or a ghost of you.", "Hiro gives me the burnt noodles. Best ones."]),
    mkNpc("hiro", "Hiro", "district", 202, FEET, 202, 202, 0, []),
    mkNpc("pix", "Pix", "district", 430, FEET, 430, 430, 0, []),
    mkNpc("oyelo", "Oyelo", "market", 360, FEET, 360, 360, 0, []),
    mkNpc("tam", "Tam", "market", 520, FEET, 520, 520, 0, ["Mm. On break. Forever.", "Recall stall. Your past, slightly used.", "Don't buy the cheap ones. They itch."]),
    mkNpc("rook", "Rook", "market", 300, FEET, 90, 860, 9, ["Last night I was a pilot. Tonight I'm a kid at the sea.", "Do you ever forget whose hands these are?", "Nova's chips are the real ones. Too real."]),
    mkNpc("nova", "NOVA", "market", 770, FEET, 770, 770, 0, []),
    mkNpc("sol", "Sol", "pier", 176, FEET, 176, 176, 0, []),
    mkNpc("juno", "Juno", "pier", 362, FEET, 362, 362, 0, []),
    mkNpc("wren", "Wren", "pier", 614, FEET, 614, 614, 0, []),
    mkNpc("vale", "Dr. Vale", "lab", 470, FEET, 470, 470, 0, []),
  ];
}
function makeDrops(): Drop[] { const d: Drop[] = []; for (let i = 0; i < 150; i++) d.push({ x: Math.random() * 380, y: Math.random() * H, v: 160 + Math.random() * 120, l: 3 + Math.floor(Math.random() * 4), g: FEET + Math.random() * 20 }); return d; }
function makeCars(): Car[] { const o: Car[] = []; for (let i = 0; i < 11; i++) o.push({ x: h1(i * 6.1) * 600, y: 34 + Math.floor(h1(i * 2.9) * 62), speed: 25 + h1(i * 1.3) * 35, dir: i % 2 === 0 ? 1 : -1, layer: i < 4 ? 0.25 : i < 8 ? 0.5 : 0.7 }); return o; }
function newGame(): Game {
  return {
    scene: "menu", t: 0, sceneT: 0, loc: "apt", px: 104, py: FEET, vx: 0, vy: 0, grounded: true, facing: 1, walk: 0, stepPh: 0, landT: 0, actT: 0, actKind: "interact",
    cam: 0, zoom: 1, view: { sx: 0, sy: 0, z: 1 }, fade: 0, fadeTo: 0, fadeCb: null,
    dlg: null, flags: {}, items: [], credits: 20, obj: 0, m2: false, notes: [],
    left: false, right: false, jumpQ: false, actQ: false, run: false,
    panel: "none", rev: 1, near: "", toast: null, banner: null,
    npcs: makeNpcs(), chat: null, chatCd: 6, drops: makeDrops(), cars: makeCars(), flash: 0,
    music: 0.6, sfx: 0.7, amb: 0.7, gfx: 1, textSpeed: 1, saveNote: "", bagTab: "items", openItem: "", ringing: false,
    coyote: 0, jbuf: 0, jumpHeld: false, parts: [], fly: null, flyCd: 4, beat: -1, sweep: 6, sndT: 0, lookX: 0, peds: makePeds(), tramOn: false, ...makeLife(), ambT: 0,
  };
}
const G: Game = newGame();
const PADS = new Map<number, "left" | "right">();
const KEYS = { left: false, right: false };
let JUMP_ID = -1;
function syncDir(): void {
  let l = KEYS.left; let r = KEYS.right;
  PADS.forEach((v: "left" | "right") => { if (v === "left") l = true; else r = true; });
  G.left = l; G.right = r;
}

// ---------- audio ----------
type Snd = { ctx: AudioContext; music: GainNode; sfx: GainNode; pads: Record<string, GainNode>; rain: GainNode; rainF: BiquadFilterNode; noise: AudioBuffer; amb: GainNode; hum: GainNode; murmur: GainNode; steam: GainNode; buzz: GainNode };
let SND: Snd | null = null;
let MOOD = "";
const CHORDS: Record<string, number[]> = { menu: [110, 130.8, 164.8], apt: [98, 116.5, 146.8], district: [110, 138.6, 164.8, 207.7], market: [92.5, 110, 138.6, 185], glitch: [103.8, 110, 155.6], pier: [87.3, 110, 130.8, 174.6], lab: [77.8, 92.5, 116.5], vision: [110, 138.6, 164.8, 220] };
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
    const amb = ctx.createGain(); amb.gain.value = G.amb; amb.connect(ctx.destination);
    const rain = ctx.createGain(); rain.gain.value = 0;
    rs.connect(rainF); rainF.connect(rain); rain.connect(amb); rs.start();
    const mkN = (type: BiquadFilterType, f: number, q: number): GainNode => { const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gn = ctx.createGain(); gn.gain.value = 0; src.connect(fl); fl.connect(gn); gn.connect(amb); src.start(0, Math.random()); return gn; };
    const hum = mkN("lowpass", 140, 0.7); const murmur = mkN("bandpass", 480, 0.9); const steam = mkN("highpass", 3200, 0.5);
    const bo = ctx.createOscillator(); bo.type = "sawtooth"; bo.frequency.value = 120; const bf = ctx.createBiquadFilter(); bf.type = "bandpass"; bf.frequency.value = 480; bf.Q.value = 3;
    const buzz = ctx.createGain(); buzz.gain.value = 0; bo.connect(bf); bf.connect(buzz); buzz.connect(amb); bo.start();
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
    SND = { ctx, music, sfx, pads, rain, rainF, noise, amb, hum, murmur, steam, buzz };
    // iOS: speech only works after a call made inside a user gesture, so prime it silently here
    if (speechOk()) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } catch { /* no speech */ } }
    const m = MOOD || "menu"; MOOD = ""; setMood(m);
  } catch { SND = null; }
}
function applyVol(): void { if (SND) { SND.music.gain.setTargetAtTime(G.music * 0.5, SND.ctx.currentTime, 0.05); SND.sfx.gain.setTargetAtTime(G.sfx, SND.ctx.currentTime, 0.05); SND.amb.gain.setTargetAtTime(G.amb, SND.ctx.currentTime, 0.05); } }
function setMood(m: string): void {
  if (m === MOOD) return; MOOD = m;
  if (!SND) return;
  const now = SND.ctx.currentTime;
  for (const k of Object.keys(SND.pads)) { const p = SND.pads[k]; if (p) p.gain.setTargetAtTime(k === m ? 1 : 0, now, 0.9); }
  const rv = m === "district" ? 0.16 : m === "pier" ? 0.13 : m === "menu" ? 0.14 : m === "apt" ? 0.045 : m === "market" ? 0.015 : m === "lab" ? 0.02 : 0;
  SND.rain.gain.setTargetAtTime(rv, now, 0.6);
  SND.rainF.frequency.setTargetAtTime(m === "apt" || m === "lab" ? 900 : m === "pier" ? 1700 : 2200, now, 0.5);
  const ag = (n: GainNode, v: number): void => { n.gain.setTargetAtTime(v, now, 0.8); };
  ag(SND.hum, m === "district" ? 0.5 : m === "pier" ? 0.42 : m === "lab" ? 0.3 : m === "menu" ? 0.35 : m === "market" ? 0.25 : m === "apt" ? 0.14 : 0.05);
  ag(SND.murmur, m === "market" ? 0.16 : 0);
  ag(SND.buzz, m === "district" ? 0.01 : m === "market" ? 0.008 : 0);
  ag(SND.steam, 0);
  if (ADV.n && m !== "district" && m !== "market" && m !== "pier") ADV.n.bus.gain.setTargetAtTime(0, now, 0.3);
}
function tone(f: number, dur: number, type: OscillatorType, vol: number, at: number, slide: number): void {
  if (!SND) return;
  const c = SND.ctx; const t0 = c.currentTime + at;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.linearRampToValueAtTime(slide, t0 + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(SND.sfx); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noiseHit(dur: number, freq: number, vol: number, type: BiquadFilterType = "lowpass", toAmb = false, at = 0): void {
  if (!SND) return;
  const c = SND.ctx; const t0 = c.currentTime + at;
  const s = c.createBufferSource(); s.buffer = SND.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(toAmb ? SND.amb : SND.sfx); s.start(t0, Math.random()); s.stop(t0 + dur + 0.02);
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
function step(): void {
  const r = G.run ? 1.3 : 1;
  if (G.loc === "apt") { noiseHit(0.06, 420, 0.12 * r); tone(95, 0.06, "sine", 0.04 * r, 0, 70); }
  else if (G.loc === "district") { noiseHit(0.08, 2400, 0.06 * r, "highpass"); noiseHit(0.06, 600, 0.09 * r); }
  else if (G.loc === "pier") { noiseHit(0.07, 320, 0.13 * r); tone(140, 0.05, "triangle", 0.03 * r, 0, 110); }
  else if (G.loc === "lab") { noiseHit(0.1, 1800, 0.07 * r, "bandpass"); noiseHit(0.05, 500, 0.06 * r); }
  else { noiseHit(0.05, 900, 0.09 * r); tone(1700, 0.02, "square", 0.012 * r, 0, 0); }
}
function land(): void { step(); noiseHit(0.12, 380, 0.16); if (G.loc === "district" || G.loc === "lab") noiseHit(0.18, 3000, 0.06, "highpass"); }
function coin(): void { tone(1320, 0.06, "square", 0.035, 0, 0); tone(1980, 0.12, "square", 0.03, 0.06, 0); }
function thunder(): void { noiseHit(2.8, 140, 0.4, "lowpass", true, 0.4 + Math.random() * 0.8); }
function whoosh(dir: number): void {
  if (!SND) return;
  const c = SND.ctx; const t0 = c.currentTime;
  const s = c.createBufferSource(); s.buffer = SND.noise; s.loop = true;
  const f = c.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t0); f.frequency.linearRampToValueAtTime(1400, t0 + 1.1); f.frequency.linearRampToValueAtTime(350, t0 + 2.4);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.2, t0 + 1.1); g.gain.linearRampToValueAtTime(0.0001, t0 + 2.4);
  s.connect(f); f.connect(g);
  let out: AudioNode = g;
  try { const p = c.createStereoPanner(); p.pan.setValueAtTime(-0.8 * dir, t0); p.pan.linearRampToValueAtTime(0.8 * dir, t0 + 2.4); g.connect(p); out = p; } catch { out = g; }
  out.connect(SND.sfx); s.start(t0); s.stop(t0 + 2.5);
}
// ---------- holo-ad audio: brand jingles, a soft pad, and a low announcer, only outdoors ----------
type AdDef = { n: number[]; f: number; w: OscillatorType; pad: number[]; say: string[] };
const ADSND: Record<string, AdDef> = {
  aur: { n: [0, 4, 7, 12, 7], f: 392, w: "sine", pad: [196, 293.7, 392], say: ["Aurelion. Your past, perfected.", "Remember better. Aurelion."] },
  sun: { n: [0, 2, 4, 9], f: 523.3, w: "triangle", pad: [261.6, 329.6, 392], say: ["Halcyon. Bottled sun, for cloudy hearts.", "Feel the sun again. Halcyon."] },
  koi: { n: [7, 4, 7, 12, 9], f: 440, w: "square", pad: [220, 277.2, 329.6], say: ["Koi Koi noodles. Slurp the rain away."] },
  eye: { n: [0, 0, -5], f: 329.6, w: "sine", pad: [110, 164.8, 220], say: ["Sentry. We see you. Safely.", "Stay in the light. Sentry is watching over you."] },
  heart: { n: [0, 3, 7, 10, 7], f: 349.2, w: "triangle", pad: [174.6, 207.7, 261.6], say: ["Meridian. Feel again.", "Lonely? Meridian. Feelings, on demand."] },
  moon: { n: [12, 7, 3, 0], f: 466.2, w: "sine", pad: [116.5, 138.6, 174.6], say: ["Dreamline. Sleep deeper tonight."] },
};
const ADS: Partial<Record<LocId, [number, string][]>> = {
  district: [[86, "eye"], [545, "aur"], [820, "koi"], [962, "heart"], [1254, "sun"]],
  market: [[271, "moon"], [873, "heart"]],
  pier: [[586, "heart"], [863, "sun"], [1010, "eye"]],
};
type AdNodes = { bus: GainNode; padG: GainNode; pan: StereoPannerNode | null; oscs: OscillatorNode[] };
const ADV: { n: AdNodes | null; cd: number; spk: number; last: string; pad: string; voice: boolean } = { n: null, cd: 4, spk: 8, last: "", pad: "", voice: false };
function speechOk(): boolean { return typeof window !== "undefined" && typeof (window as unknown as { speechSynthesis?: unknown }).speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined"; }
function adHush(): void { if (ADV.voice && speechOk()) { try { window.speechSynthesis.cancel(); } catch { /* no speech */ } } ADV.voice = false; }
function adNodes(): AdNodes | null {
  if (ADV.n || !SND) return ADV.n;
  try {
    const c = SND.ctx; const bus = c.createGain(); bus.gain.value = 0; bus.connect(SND.amb);
    const padG = c.createGain(); padG.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100;
    let pan: StereoPannerNode | null = null;
    try { pan = c.createStereoPanner(); padG.connect(lp); lp.connect(pan); pan.connect(bus); } catch { pan = null; padG.connect(lp); lp.connect(bus); }
    const oscs: OscillatorNode[] = [];
    for (let k = 0; k < 3; k++) { const o = c.createOscillator(); o.type = k === 2 ? "triangle" : "sine"; o.frequency.value = 220; o.detune.value = (k - 1) * 6; const og = c.createGain(); og.gain.value = 0.33; o.connect(og); og.connect(padG); o.start(); oscs.push(o); }
    ADV.n = { bus, padG, pan, oscs };
  } catch { ADV.n = null; }
  return ADV.n;
}
function adJingle(key: string, vol: number, pan: number): void {
  const d = ADSND[key]; const n = adNodes(); if (!d || !n || !SND) return;
  const c = SND.ctx; const t0 = c.currentTime + 0.05;
  const g = c.createGain(); g.gain.value = vol;
  let out: AudioNode = g;
  try { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); out = p; } catch { out = g; }
  out.connect(n.bus);
  d.n.forEach((st: number, i: number) => {
    const f = d.f * Math.pow(2, st / 12); const at = t0 + i * 0.16; const o = c.createOscillator(); o.type = d.w; o.frequency.setValueAtTime(f, at);
    const e = c.createGain(); e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(d.w === "square" ? 0.25 : 0.6, at + 0.015); e.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
    o.connect(e); e.connect(g); o.start(at); o.stop(at + 0.45);
    const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.setValueAtTime(f * 2, at); const e2 = c.createGain(); e2.gain.setValueAtTime(0, at); e2.gain.linearRampToValueAtTime(0.12, at + 0.01); e2.gain.exponentialRampToValueAtTime(0.0001, at + 0.6); o2.connect(e2); e2.connect(g); o2.start(at); o2.stop(at + 0.62);
  });
}
// synth announcer fallback: a buzzy formant murmur, one blip per syllable
function adMurmur(text: string, vol: number, pan: number): void {
  const n = adNodes(); if (!n || !SND) return;
  const c = SND.ctx; const t0 = c.currentTime + 0.8; const syl = Math.min(14, Math.max(3, Math.round(text.length / 4)));
  const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(96, t0);
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 4; const g = c.createGain(); g.gain.setValueAtTime(0, t0);
  for (let k = 0; k < syl; k++) { const at = t0 + k * 0.17; bp.frequency.setValueAtTime(500 + h1(k + text.length) * 900, at); o.frequency.setValueAtTime(92 + h1(k * 3) * 14 - k * 0.8, at); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.03); g.gain.linearRampToValueAtTime(vol * 0.2, at + 0.14); }
  g.gain.linearRampToValueAtTime(0, t0 + syl * 0.17 + 0.05);
  let out: AudioNode = g;
  try { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); out = p; } catch { out = g; }
  o.connect(bp); bp.connect(g); out.connect(n.bus); o.start(t0); o.stop(t0 + syl * 0.17 + 0.1);
}
function adSpeak(text: string, vol: number, pan: number): void {
  if (speechOk()) {
    try {
      const u = new SpeechSynthesisUtterance(text); u.pitch = 0.6; u.rate = 0.92; u.volume = clamp(vol, 0, 0.25); u.lang = "en-US";
      u.onend = () => { ADV.voice = false; }; u.onerror = () => { ADV.voice = false; };
      setTimeout(() => { if (!G.dlg && outside(G.loc) && G.scene === "play" && G.fadeTo === 0) { ADV.voice = true; window.speechSynthesis.speak(u); } }, 900);
      return;
    } catch { /* fall through to the synth voice */ }
  }
  adMurmur(text, vol * 0.25, pan);
}
function adTick(step: number): void {
  if (!SND) return;
  const n = adNodes(); if (!n) return;
  const g = G; const now = SND.ctx.currentTime;
  const ext = outside(g.loc) && g.scene === "play" && g.fadeTo === 0 && g.panel === "none";
  n.bus.gain.setTargetAtTime(ext ? (g.dlg ? 0.22 : 1) : 0, now, ext ? 0.8 : 0.3);
  if (!ext || g.dlg) adHush();
  if (!ext) { n.padG.gain.setTargetAtTime(0, now, 0.4); return; }
  const list = ADS[g.loc] ?? []; let best: [number, string] | null = null; let bd = 1e9;
  for (const a of list) { const d = Math.abs(a[0] - g.px); if (d < bd) { bd = d; best = a; } }
  if (!best) return;
  const prox = clamp(1 - bd / 220, 0, 1); const pan = clamp((best[0] - g.cam - W / 2) / (W / 2), -1, 1) * 0.8;
  const def = ADSND[best[1]];
  if (def && ADV.pad !== best[1]) { ADV.pad = best[1]; n.oscs.forEach((o: OscillatorNode, i: number) => o.frequency.setTargetAtTime(def.pad[i] ?? (def.pad[0] ?? 220) * 2, now, 0.6)); }
  n.padG.gain.setTargetAtTime(0.05 * Math.pow(prox, 1.5), now, 0.5);
  if (n.pan) n.pan.pan.setTargetAtTime(pan, now, 0.3);
  ADV.cd -= step; ADV.spk -= step;
  if (ADV.cd > 0 || g.dlg) return;
  const near = list.filter((a: [number, string]) => Math.abs(a[0] - g.px) < 260);
  if (near.length === 0) { ADV.cd = 2; return; }
  const pick = near.find((a: [number, string]) => a[1] !== ADV.last && Math.random() < 0.6) ?? near[0];
  if (!pick) return;
  const pp = clamp(1 - Math.abs(pick[0] - g.px) / 260, 0, 1); const ppan = clamp((pick[0] - g.cam - W / 2) / (W / 2), -1, 1) * 0.85;
  adJingle(pick[1], 0.07 * (0.25 + 0.75 * pp), ppan); ADV.last = pick[1]; ADV.cd = 6 + Math.random() * 5;
  const d = ADSND[pick[1]];
  if (d && ADV.spk <= 0 && pp > 0.3 && g.amb > 0.05 && Math.random() < 0.45) { ADV.spk = 18 + Math.random() * 10; adSpeak(pickR(d.say), 0.25 * g.amb * (0.4 + 0.6 * pp), ppan); }
}
function puff(x: number, y: number, n: number): void {
  if (G.parts.length > 60) return;
  const col = G.loc === "district" ? "#9fd0c8" : G.loc === "apt" ? "#8a7a68" : "#a89880";
  for (let i = 0; i < n; i++) G.parts.push({ x: x + (Math.random() - 0.5) * 6, y: y - Math.random() * 2, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 18, l: 0.5, m: 0.5, c: col });
}

// ---------- save ----------
const SAVE_KEY = "after-rain-save-v1";
let MEM_SAVE: string | null = null;
type SaveData = { loc: LocId; px: number; flags: Record<string, number>; items: string[]; credits: number; obj: number; m2: boolean; notes: string[]; music: number; sfx: number; textSpeed: number; amb?: number; gfx?: number };
const SET_KEY = "after-rain-settings-v1";
function saveSettings(): void { try { localStorage.setItem(SET_KEY, JSON.stringify({ music: G.music, sfx: G.sfx, amb: G.amb, textSpeed: G.textSpeed, gfx: G.gfx })); } catch { /* storage blocked */ } }
function loadSettings(): void {
  try {
    const s = localStorage.getItem(SET_KEY); if (!s) return;
    const d = JSON.parse(s) as Record<string, unknown>;
    for (const k of ["music", "sfx", "amb", "textSpeed", "gfx"] as const) { const v = d[k]; if (typeof v === "number" && isFinite(v)) G[k] = v; }
  } catch { /* storage blocked */ }
}
loadSettings();
function saveGame(quiet?: boolean): void {
  const d: SaveData = { loc: G.loc, px: G.px, flags: G.flags, items: G.items, credits: G.credits, obj: G.obj, m2: G.m2, notes: G.notes, music: G.music, sfx: G.sfx, textSpeed: G.textSpeed, amb: G.amb, gfx: G.gfx };
  const s = JSON.stringify(d); MEM_SAVE = s;
  try { localStorage.setItem(SAVE_KEY, s); G.saveNote = quiet ? "Checkpoint saved." : "Game saved."; } catch { G.saveNote = "Saved for this session only (this view blocks storage)."; }
  if (!quiet) blip();
  G.rev++;
}
function readSave(): string | null { try { const s = localStorage.getItem(SAVE_KEY); if (s) return s; } catch { /* storage blocked */ } return MEM_SAVE; }
function loadGame(): void {
  const s = readSave(); if (!s) return;
  try {
    const d = JSON.parse(s) as Partial<SaveData>;
    const keep = { music: G.music, sfx: G.sfx, amb: G.amb, gfx: G.gfx, textSpeed: G.textSpeed };
    Object.assign(G, newGame(), keep);
    G.flags = d.flags && typeof d.flags === "object" ? { ...d.flags } : {};
    G.items = Array.isArray(d.items) ? d.items.filter((id: string) => !!ITEMS[id]) : [];
    G.credits = typeof d.credits === "number" ? d.credits : 20;
    G.obj = typeof d.obj === "number" ? clamp(Math.floor(d.obj), 0, OBJ.length) : 0;
    G.m2 = !!d.m2 || G.obj >= 5;
    G.notes = Array.isArray(d.notes) ? d.notes.slice() : [];
    const loc: LocId = d.loc === "district" || d.loc === "market" || d.loc === "pier" || d.loc === "lab" ? d.loc : "apt";
    G.flags.called = 1; G.flags.rang = 1;
    G.scene = "play"; G.loc = loc; G.px = clamp(typeof d.px === "number" ? d.px : 104, 8, LOCW[loc] - 8); G.cam = clamp(G.px - W / 2, 0, LOCW[loc] - W); G.fade = 1;
    if (G.obj === 8 && !G.flags.valeIn) G.flags.valeIn = 1;
    syncObj(true); G.saveNote = "Game loaded."; setMood(loc); applyVol(); G.rev++;
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
// objectives follow where you are and what you carry, so the HUD never lags behind (also repairs stale saves)
function syncObj(quiet: boolean): void {
  const need = Math.max(G.obj, G.loc !== "apt" ? 1 : 0, G.flags.market ? 2 : 0, G.loc === "market" ? 3 : 0, has("chip") ? 4 : 0);
  if (G.obj >= need || G.obj >= 5) return;
  if (quiet) { G.obj = need; return; }
  while (G.obj < need) complete(G.obj);
}
function say(lines: Line[], done: (() => void) | null, push: boolean): void {
  if (lines.length === 0) return;
  G.dlg = { lines: lines.slice(), i: 0, chars: 0, waiting: false, done, push, acted: -1 }; G.rev++;
}
function go(loc: LocId, x: number): void {
  G.fadeTo = 1; adHush();
  G.fadeCb = () => {
    G.loc = loc; G.px = x; G.py = FEET; G.vx = 0; G.vy = 0; G.facing = x > LOCW[loc] / 2 ? -1 : 1;
    G.cam = clamp(x - W / 2, 0, LOCW[loc] - W); setMood(loc);
    if (loc === "district") complete(0);
    if (loc === "market") { if (G.obj === 1) complete(1); complete(2); }
    if (loc === "lab") complete(6);
    saveGame(true);
    G.rev++;
  };
  noiseHit(0.3, 300, 0.15);
  if (G.loc === "apt" || loc === "apt") tone(190, 0.45, "sawtooth", 0.015, 0, 120);
  else for (let k = 0; k < 4; k++) noiseHit(0.06, 700, 0.1, "lowpass", false, 0.12 + k * 0.16);
}
function pickR(a: string[]): string { return a[Math.floor(Math.random() * a.length)] ?? "..."; }
function E(text: string): Line { return { who: "ELIAS", text }; }
type ObjI = { text: string; hint: string; loc: LocId | ""; x: number };
function objInfo(): ObjI {
  const o = G.obj; const f = G.flags; const text = OBJ[o] ?? "Explore freely";
  if (o === 0) return { text, hint: has("photo") ? "Take the door on the right, under the green EXIT sign." : "Look around: the photo on the desk, the terminal. Then the door on the right.", loc: "apt", x: 334 };
  if (o === 1) return { text, hint: "Head east (right) along Kessler St. Locals may know about a market.", loc: "district", x: 1250 };
  if (o === 2) return { text, hint: f.market ? "Take the stairs down at the green grate." : f.knowGrate ? "The green grate is east, past Clinic 24. Examine it." : "Ask around (Ines, Lulu, Hiro) or search east past Clinic 24.", loc: "district", x: 1250 };
  if (o === 3) return { text, hint: f.metNova ? "Talk to NOVA again and ask about the chip." : "NOVA's stall is at the back (east), under the red lantern.", loc: "market", x: 770 };
  if (o === 4) return { text, hint: "Use the memory reader by the pillar, or BAG > chip > Investigate.", loc: "market", x: 636 };
  if (o === 5) {
    if (!f.knowLab) return { text, hint: "Ask NOVA in the memory market what the chip showed you.", loc: "market", x: 770 };
    if (G.loc !== "pier") return { text, hint: "Tidewater Pier: through the seawall gate at the east end of Kessler Street.", loc: "district", x: 1340 };
    return { text, hint: "The pump house is at the far end of the pier. The Forgotten live along the way.", loc: "pier", x: 1000 };
  }
  if (o === 6) return { text, hint: f.hatch ? (f.codeOk ? "The hatch is open. Climb down." : "Hatch keypad: lab number, then unit number." + (has("manifest") ? "" : " Check the crates.")) : "The front door is welded. Ask the Forgotten, or follow the blue coolant drips.", loc: "pier", x: f.hatch ? 1072 : 614 };
  if (o === 7 && has("ribbon") && !has("valelog") && !(has("tape") || f.askVale || has("manifest"))) return { text, hint: "The memo is encrypted. The AURELION crates up on the pier carry a manifest that could unlock it.", loc: "pier", x: 872 };
  if (o === 7) { const x = !has("ribbon") ? 218 : !has("valelog") ? 330 : 386; return { text, hint: !has("ribbon") ? "Look at the pods. One of them is empty." : !has("valelog") ? "Read the archive terminal. Evidence you carry may unlock more." : "Search the index drawers.", loc: "lab", x }; }
  if (o === 8) return { text, hint: "Talk to Dr. Vale.", loc: "lab", x: 470 };
  if (o >= OBJ.length) return { text: "Mission 002 complete", hint: "Mission 003: A CITY WITHOUT SUNLIGHT is next. Replay chapters from the JOURNAL.", loc: "", x: 0 };
  return { text: "Explore freely", hint: "Mission 002 is unlocked in your JOURNAL.", loc: "", x: 0 };
}
function objTargetX(): number | null {
  const o = objInfo(); if (!o.loc) return null;
  if (o.loc === G.loc) return o.x;
  if (G.loc === "apt") return 334;
  if (G.loc === "market") return 34;
  if (G.loc === "lab") return 30;
  if (G.loc === "pier") return o.loc === "lab" ? 1072 : 22;
  return o.loc === "market" ? 1250 : o.loc === "pier" || o.loc === "lab" ? 1340 : 42;
}

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
// ---------- Mission 002: THE FORGOTTEN ONES ----------
const M1N = 5;
const M2ITEMS = ["bead", "bird", "manifest", "ribbon", "valelog", "indexcard"];
const M2FLAGS = ["knowLab", "novaM2", "paidLab", "kaneRang", "kaneCall", "solMet", "wrenTold", "wrenPromise", "junoVans", "hatch", "coolant", "sign", "doorSeen", "tally", "codeOk", "codeTry", "podsSeen", "arch1", "arch2", "valeIn", "valeMet0", "valeMet", "vTape", "vRib", "vCard", "vKane", "vCall", "vPhoto", "valeTrust", "m2done", "skewer", "wrenBirds", "solTally", "junoAsk"];
function V(text: string): Line { return { who: "DR. VALE", text }; }
function novaM2(): Line[] {
  const f = G.flags; const tn = f.novaTone ?? 0;
  if (f.knowLab) return [{ who: "NOVA", text: tn === -1 ? "Tidewater Pier. Pump house. Now go and be rude to the sea." : "Tidewater Pier, Elias. The pump house at the far end. Bring me back a good story." }];
  const tell = (bead: boolean): Line[] => [
    { who: "NOVA", text: "Lab 7 never closed. AURELION just stopped admitting it existed. It's under the old pump house on Tidewater Pier, past the seawall gate at the east end of Kessler Street." },
    { who: "NOVA", text: "The pier belongs to the Forgotten now. Synthetics AURELION wiped and dumped when their memories went out of fashion." },
    ...(bead ? [{ who: "NOVA", text: "Take this. A bead from my first stall. The Forgotten know it. They'll know I sent you.", act: () => { give("bead"); } } as Line] : []),
    { who: "NOVA", text: "Go on. Before I change my mind.", act: () => { f.knowLab = 1; G.notes.push("NOVA: Lab 7 is under the pump house on Tidewater Pier, through the seawall gate at the east end of Kessler Street."); G.rev++; } },
  ];
  const open: Line[] = [
    { who: "NOVA", text: tn === 1 ? "You came out of my reader white as rice paper. ...What did you see?" : tn === -1 ? "Still here, detective? My reader doesn't do refunds." : "That look. The chip bit you, didn't it?", act: () => { f.novaM2 = 1; } },
    E("AURELION. Lab 7. Dr. Vale. And Mara, in the rain, telling me not to trust it."),
  ];
  if (f.traded) open.push({ who: "NOVA", text: "The pier memory you traded me... I watched it last night. There's a pump house at the end of that pier. Same rust. Same rain." });
  else if (f.paid === 45) open.push({ who: "NOVA", text: "You paid the rude-customer rate for that chip. Lucky for you, rude money spends the same." });
  else if (f.paid === 25) open.push({ who: "NOVA", text: "Twenty-five credits and a ghost. Best deal you'll get all year." });
  if (f.askMara) open.push({ who: "NOVA", text: "The woman in your photo. I told you somebody was busy remembering her. Now you know who." });
  if (f.askVale) open.push({ who: "NOVA", text: "And Vale. I told you not to say that name down here. Now you're going to go and find it, aren't you." });
  if (tn === -1 && !f.traded) {
    const ch: Choice[] = [
      { label: "I was out of line before. I'm sorry.", next: () => { f.novaTone = 0; return [E("I was out of line before. I'm sorry."), { who: "NOVA", text: "...Took you long enough. Fine." }, ...tell(true)]; } },
    ];
    if (G.credits >= 10) ch.push({ label: "Pay 10 credits for directions", next: () => { pay(10); f.paidLab = 1; return [{ who: "NOVA", text: "Rude-customer rate. You're consistent, I'll give you that." }, ...tell(true)]; } });
    ch.push({ label: "I'll find it myself.", next: () => [E("I'll find it myself."), { who: "NOVA", text: "Then you'll drown looking. ...Fine. Free of charge, and free of help." }, ...tell(false)] });
    return [...open, { who: "NOVA", text: "Where is Lab 7? That's what you want. Information costs extra for people who were rude to me.", choices: ch }];
  }
  return [...open, { who: "NOVA", text: "You want to know where Lab 7 is.", choices: [
    { label: "Please, Nova.", next: () => [E("Please, Nova."), ...tell(true)] },
    { label: "Come with me.", next: () => [E("Come with me."), { who: "NOVA", text: tn === 1 ? "Sweet. No. Somebody has to stay down here and remember where everyone went." : "I don't leave the market. The market doesn't leave me." }, ...tell(true)] },
  ] }];
}
function kaneCallLines(): Line[] {
  const f = G.flags;
  return [
    { who: "", text: "[Elias's phone buzzes. CALLER: DET. KANE.]", act: () => { f.kaneRang = 1; G.ringing = false; } },
    { who: "KANE", text: "Bram says you walked east past the seawall. There's nothing east of the seawall but water and things nobody wants, Elias." },
    ...(has("kane") ? [E("You wrote me a warning, Kane. Now you call. Which one is for the record?")] : []),
    ...(f.askKane ? [E("Nova says you were in the market last week. With a warrant and a smile.")] : []),
    { who: "KANE", text: "Go home. ...Please.", choices: [
      { label: "Just walking, Kane.", next: () => { f.kaneCall = 1; return [E("Just walking, Kane."), { who: "KANE", text: "Sure. Walk somewhere dry." }]; } },
      { label: "I know about Lab 7.", next: () => { f.kaneCall = 2; return [E("I know about Lab 7."), { who: "KANE", text: "...Then you know enough to get yourself erased. Don't trust the rain, Elias." }, E("That's what she said.")]; } },
      { label: "[Hang up]", next: () => { f.kaneCall = 3; return [{ who: "", text: "[Elias ends the call. The rain keeps talking.]" }]; } },
    ] },
  ];
}
function wrenHub(): Line[] {
  const f = G.flags; const ch: Choice[] = [];
  const hatch = (): Line[] => [{ who: "WREN", text: "The front of the pump house is welded. The vans come at low tide and go in through the hatch at the end of the pier, under the boards." }, { who: "WREN", text: "Take a bird. This one has a number I like.", act: () => { f.hatch = 1; f.wrenTold = 1; give("bird"); } }, ...wrenPromise()];
  if (has("photo") && !f.wrenTold) ch.push({ label: "Show her Mara's photograph", next: () => { f.vPhoto = 1; return [E("Have you seen this woman?"), { who: "WREN", text: "...The singing lady. She was in the pod next to mine, before they let me go. She hummed so we wouldn't be scared." }, { who: "WREN", text: "They took her down again. Last week. She was still humming." }, ...hatch()]; } });
  if (!f.wrenTold) ch.push({ label: "I'm looking for Lab 7.", next: () => [E("I'm looking for Lab 7."), { who: "WREN", text: "Everybody here came out of Lab 7. Nobody goes back in on purpose." }, ...hatch()] });
  if (!f.wrenBirds) ch.push({ label: "What are the birds?", next: () => { f.wrenBirds = 1; return [{ who: "WREN", text: "Old forms from the lab. Intake papers. I fold them so they fly instead of filing." }, ...wrenHub()]; } });
  ch.push({ label: "I should go.", next: () => [{ who: "WREN", text: "Mind the gulls. They steal names." }] });
  return [{ who: "WREN", text: f.wrenTold ? "Back again? Sit. Mind the birds." : "You walk like someone who remembers things. Sit. Mind the birds.", choices: ch }];
}
function wrenPromise(): Line[] {
  const f = G.flags;
  return [{ who: "WREN", text: "Will you remember me? After?", choices: [
    { label: "I promise.", next: () => { f.wrenPromise = 1; return [E("I promise."), { who: "WREN", text: "Nobody's promised me anything since my first birthday. I was nine minutes old." }]; } },
    { label: "I don't make promises anymore.", next: () => { f.wrenPromise = -1; return [E("I don't make promises anymore."), { who: "WREN", text: "That's alright. I'll remember you instead. I'm good at it now." }]; } },
  ] }];
}
function keypad(): Line[] {
  const f = G.flags;
  const tryC = (c: string): Line[] => {
    if (c === "0706") return [{ who: "", text: "[The keypad chirps. Bolts thunk under the boards. The hatch lifts on a breath of cold air.]", act: () => { f.codeOk = 1; tone(880, 0.12, "sine", 0.05, 0, 0); tone(1320, 0.2, "sine", 0.05, 0.12, 0); noiseHit(0.5, 200, 0.2); } }, E("Lab 7. Unit 6. Mara.")];
    const hint = !has("manifest") ? "I'm guessing. Something on this pier must give the code away." : !has("bird") ? "Lab number, then unit number. But which unit?" : "Lab 07. And the unit on Wren's bird... M-06.";
    return [{ who: "", text: "[BZZT. ACCESS DENIED.]", act: () => { f.codeTry = (f.codeTry ?? 0) + 1; tone(140, 0.3, "square", 0.05, 0, 0); } }, E(hint)];
  };
  return [{ who: "KEYPAD", text: "AURELION SERVICE ACCESS. ENTER 4-DIGIT CODE.", choices: [
    { label: "0706", next: () => tryC("0706") }, { label: "0607", next: () => tryC("0607") }, { label: "2190", next: () => tryC("2190") }, { label: "Step back", next: () => [] },
  ] }];
}
function archHub(): Line[] {
  const f = G.flags; const ch: Choice[] = [];
  ch.push({ label: "Log: Project Sunlight", next: () => { f.arch1 = 1; return [{ who: "ARCHIVE", text: "PROJECT SUNLIGHT. Status: ACTIVE. Clients: Halcyon Tower residences. Product: companion synthetics with continuous donor memory." }, E("Donor memory. Whose?"), ...archHub()]; } });
  ch.push({ label: "Log: M batch", next: () => { f.arch2 = 1; return [{ who: "ARCHIVE", text: "M BATCH: 6 units. M-01 to M-05 dormant. M-06: RECALL. Note: unit repeatedly attempts to leave. Destination always Tidewater Pier." }, E(has("tape") ? "'Move the M batch before the rain stops.' The drone recording. This is what they meant." : "Always the pier. Our pier."), ...archHub()]; } });
  if (has("tape") || f.askVale || has("manifest")) {
    if (!has("valelog")) ch.push({ label: "Voice memo [V. VALE]", next: () => [{ who: "ARCHIVE", text: "Decrypting with matching evidence... memo unlocked." }, ...valeLog(), { who: "", text: "[Elias copies the memo to his phone.]", act: () => { give("valelog"); } }, ...archHub()] });
  } else ch.push({ label: "Voice memo [ENCRYPTED]", next: () => [{ who: "ARCHIVE", text: "ENCRYPTED. Key phrase required." }, E("I don't know enough yet. Somebody up there mentioned Vale... I should have listened."), ...archHub()] });
  ch.push({ label: "Log off", next: () => [] });
  return [{ who: "ARCHIVE", text: "AURELION MEMORY ARCHIVE · LAB 7. 41,906 records.", choices: ch }];
}
function valeLog(): Line[] {
  return [{ who: "", text: "[Recording. A tired woman's voice, close to the mic.]" }, V("Personal log. They want M-06 wiped again. Fourth time. She keeps asking for someone called Elias."), V("I told the board memories aren't wallpaper. You can't paint over a person and call it a new room."), V("If anyone finds this: the archive keeps everything. Even the parts of us we sold.")];
}
function archCheck(): void {
  if (G.obj === 7 && has("ribbon") && has("valelog") && has("indexcard")) {
    complete(7); G.flags.valeIn = 1;
    say([{ who: "", text: "[Footsteps in the water behind him. A lamp clicks on.]" }, V("Put the card back, Mr. Voss. Some of what's in that drawer is you.")], null, false);
  }
}
function valeHub(): Line[] {
  const f = G.flags; const o: Choice[] = [];
  if (has("tape") && !f.vTape) o.push({ label: "Your voice is on a patrol drone.", next: () => { f.vTape = 1; return [E("'Vale wants the M batch moved before the rain stops.' That was about you."), V("I was ordered to move them. I moved them here, where AURELION had forgotten to look. Five of them. They found the sixth."), ...valeHub()]; } });
  if (has("ribbon") && !f.vRib) o.push({ label: "This was caught in pod M-06.", next: () => { f.vRib = 1; return [E("A red ribbon. Caught in the seal of pod M-06."), V("Mara's. The original's. AURELION archived everything she owned, so the copies would feel right in their own skin."), ...valeHub()]; } });
  if (has("indexcard") && !f.vCard) o.push({ label: "Why is my name in your archive?", next: () => { f.vCard = 1; return [E("Why does your archive have a card with my name on it?"), V("Because you were the first thing she remembered, and the last thing we could erase. Template E-01."), E("What does that mean?"), V("Not here. Not tonight. Ask Kane what he signed six years ago."), ...valeHub()]; } });
  if (has("kane") && !f.vKane) o.push({ label: "Detective Kane warned me off.", next: () => { f.vKane = 1; return [E("Detective Kane warned me off."), V("Kane closed Mara's file himself, the night of the flood. If he's warning you now, he's frightened. Kane is never frightened."), ...valeHub()]; } });
  if (f.kaneCall && !f.vCall) o.push({ label: "Kane called me on the way here.", next: () => { f.vCall = 1; return [E("Kane called me on the pier."), V(f.kaneCall === 2 ? "You told him about Lab 7? Then AURELION knows too. We have less time than I hoped." : f.kaneCall === 3 ? "And you hung up on him. Good. He'd only have lied to you kindly." : "Whatever you told him, it wasn't the truth. Good."), ...valeHub()]; } });
  o.push({ label: "What is the AURELION experiment?", next: () => [E("No more pieces, Doctor. What did AURELION do here?"), V("Better if you see it. The archive can still play my old reels."), { who: "", text: "[Vale turns the archive projector toward the pods.]", act: () => { f.valeMet = 1; } }] });
  const first = !f.valeMet0; f.valeMet0 = 1;
  return [{ who: "DR. VALE", text: first ? "Dr. Vale. Former AURELION, Memory Division. I've been living down here with my work since the flood. Ask what you came to ask." : "What else, Mr. Voss?", choices: o }];
}
function valeDone(): void { if (G.flags.valeMet && G.obj === 8 && G.scene === "play") startVision(); }
function startVision(): void { G.scene = "vis"; G.sceneT = 0; G.dlg = null; setMood("vision"); G.rev++; noiseHit(0.6, 2400, 0.12); }
function endVision(): void {
  const f = G.flags;
  G.scene = "play"; G.sceneT = 0; G.fade = 1; setMood("lab"); complete(8); G.notes.push("THE AURELION EXPERIMENT: Project Sunlight. Mara's memories poured into the M batch synthetics and sold to Halcyon Tower. Every copy remembers Elias, so AURELION wipes them, again and again."); G.rev++;
  say([
    V("That's the experiment. Project Sunlight. When Mara died, AURELION kept her memories and poured them into synthetics, the M batch. Gentle, loyal companions for the towers above the cloud line, where there's still sun."),
    V("But every copy wakes up remembering you. Every one of them tries to come home to the pier. So they wipe her. Again and again."),
    { who: "", text: "[Overhead, the pier groans. Rotor noise. A searchlight leaks through the hatch.]", act: () => { siren(); noiseHit(1.2, 120, 0.25); } },
    V("AURELION surveillance. They've seen the hatch open. You need to get out of the light, Mr. Voss."),
    { who: "DR. VALE", text: "Go. Now.", choices: [
      { label: "Come with me, Vale.", next: () => { f.valeTrust = 1; return [E("Come with me, Vale."), V("I'll follow when the drones pass. Find Kane before they do. He knows what you are.")]; } },
      { label: "You did this to her.", next: () => { f.valeTrust = -1; return [E("You did this to her."), V("Yes. And I'll spend whatever is left of me undoing it. Go.")]; } },
    ] },
  ], finishM2, true);
}
function finishM2(): void {
  const f = G.flags; f.m2done = 1; G.scene = "end"; G.sceneT = 0; setMood("glitch");
  G.banner = { a: "MISSION 003: A CITY WITHOUT SUNLIGHT", b: "unlocked", t: 0 };
  G.notes.push("Mission 002 complete. AURELION drones are sweeping the pier. Next: escape the surveillance, find Detective Kane, and find out who Elias really is." + (f.wrenPromise === 1 ? " (You promised Wren you'd remember her.)" : ""));
  chime(); saveGame(true); G.rev++;
}
function startM2(): void {
  const keepItems = G.items.filter((id: string) => !M2ITEMS.includes(id));
  for (const k of M2FLAGS) delete G.flags[k];
  G.items = keepItems; if (!has("chip")) G.items.push("chip");
  G.obj = M1N; G.m2 = true; G.panel = "none"; G.dlg = null; G.scene = "play";
  G.banner = { a: "MISSION 002: THE FORGOTTEN ONES", b: OBJ[M1N] ?? "", t: 0 };
  go("market", 700); G.rev++;
}
function visionText(T: number): string {
  const L = ["PROJECT SUNLIGHT · AURELION MEMORY DIVISION · LAB 7", "VALE: When Mara died, we kept everything. Every laugh. Every song.", "VALE: We poured her into synthetics. Six of them. The M batch.", "VALE: Sold to the towers above the clouds. Where there's still sun.", "VALE: But she kept remembering one man. She kept walking home to the pier.", "VALE: To you, Elias."];
  return L[clamp(Math.floor(T / 2.6), 0, L.length - 1)] ?? "";
}
function renderVision(b: Ctx, T: number): void {
  const t = G.t;
  R(b, 0, 0, W, H, "#020809");
  const g = b.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7); g.addColorStop(0, "rgba(40,120,110,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)"); b.fillStyle = g; b.fillRect(0, 0, W, H);
  const ph = Math.floor(T / 2.6);
  for (let y = 0; y < H; y += 2) R(b, 0, y, W, 1, "rgba(0,0,0,0.25)");
  const fig = (x: number, y: number, s: number, a: number, col: string): void => { b.globalAlpha = a; R(b, x - 3 * s, y - 22 * s, 6 * s, 6 * s, col); R(b, x - 4 * s, y - 16 * s, 8 * s, 16 * s, col); R(b, x - 4 * s, y - 23 * s, 8 * s, 3 * s, "#3a1a1a"); R(b, x + 3 * s, y - 20 * s, 2 * s, 6 * s, "#ff3a4a"); b.globalAlpha = 1; };
  if (ph <= 1) { const a = clamp(T / 2, 0, 1); fig(W / 2, 128, 2, a, "#e8d8c8"); for (let k = 0; k < 40; k++) { const p = (t * 0.4 + k / 40) % 1; R(b, W / 2 + Math.sin(k * 2.3) * 60 * (1 - p), 40 + p * 90, 1, 1, "#ffd27a"); } }
  if (ph === 2) for (let i = 0; i < 6; i++) { const x = 40 + i * 48; R(b, x - 10, 60, 22, 80, "#0c3234"); R(b, x - 10, 60, 22, 1, "#5ff0d8"); fig(x, 134, 1.6, clamp((T - 5.2) * 2 - i * 0.3, 0, 1) * 0.8, "#7ae0d0"); }
  if (ph === 3) { R(b, 0, 0, W, 50, "#0a1418"); glow(b, W / 2, 20, 90, "255,200,110", 0.9); for (let k = 0; k < 8; k++) R(b, k * 44 - 10 + Math.sin(t + k) * 4, 50 + (k % 2) * 3, 50, 4, "#6a8a90"); R(b, W / 2 - 14, 54, 28, 126, "#0a1820"); for (let k = 0; k < 6; k++) fig(W / 2 - 50 + k * 20, 70 + (k % 2) * 4, 0.6, 0.7, "#e8d8c8"); }
  if (ph === 4) { R(b, 0, 130, W, 50, "#06141a"); R(b, 0, 128, W, 2, "#3a2a1c"); const x = 30 + ((T - 10.4) / 2.6) * (W - 60); for (let k = 0; k < 6; k++) fig(x - k * 14, 128, 1.2, 0.8 - k * 0.12, "#7ae0d0"); }
  if (ph >= 5) { fig(W / 2 - 30, 128, 2, 0.9, "#7ae0d0"); b.globalAlpha = 0.9; R(b, W / 2 + 24, 86, 12, 12, "#d8b8a0"); R(b, W / 2 + 22, 98, 16, 32, "#2a2a30"); R(b, W / 2 + 22, 84, 16, 4, "#2a2018"); b.globalAlpha = 1; glow(b, W / 2, 110, 60, "255,111,154", 0.25 + 0.15 * Math.sin(t * 2)); }
  if (h1(Math.floor(t * 14)) > 0.85) { b.globalAlpha = 0.35; R(b, 0, Math.floor(h1(t) * H), W, 6, "#5ff0d8"); b.globalAlpha = 1; }
}

const TALK: Record<string, (n: Npc) => Line[]> = {
  sol: () => {
    const f = G.flags; const first = !f.solMet; f.solMet = 1;
    const o: Line[] = first ? [{ who: "SOL", text: "Warm your hands or walk on, stranger. The pier doesn't do visitors." }] : [{ who: "SOL", text: "Still dry? Then you're not looking hard enough." }];
    if (first && has("bead")) o.push(E("Nova sent me."), { who: "SOL", text: "Her bead. ...Alright. Nova's word is good down here. Sit, if you like the smoke." });
    else if (first) o.push({ who: "SOL", text: "Coat like that, walk like that. Police, once. We don't talk to police. Not anymore." });
    return [...o, { who: "SOL", text: "What do you want?", choices: [
      { label: "The tally board. What are you counting?", next: () => { f.solTally = 1; return [E("What are you counting?"), { who: "SOL", text: "Days since they wiped me and left me on these boards. Two thousand one hundred and ninety. The flood was the same week." }, { who: "SOL", text: "Six years. Funny. Everybody down here starts counting from the same week." }]; } },
      { label: "Who are the Forgotten?", next: () => [E("Who are the Forgotten?"), { who: "SOL", text: "Synthetics nobody remembers buying. AURELION took back what we knew and kept the bodies cheap. We keep each other." }] },
      { label: "Where's the old pump house?", next: () => [E("Where's the old pump house?"), { who: "SOL", text: "End of the pier. Front's welded. Ask Wren, with the paper birds. She sees everything that comes and goes." }] },
    ] }];
  },
  juno: () => {
    const f = G.flags; const o: Choice[] = [];
    if (!f.skewer) o.push({ label: "One skewer. (4 credits)", next: () => { if (!pay(4)) return [{ who: "JUNO", text: "Four credits, love. I don't run a charity, I run a grill." }]; f.skewer = 1; return [{ who: "JUNO", text: "Mostly protein. Don't ask which kind. Eat it while it's warm." }, E("...It's actually good."), { who: "JUNO", text: "Course it is. Now. You want gossip as well, or just the stick?" }]; } });
    if (!f.junoVans) o.push({ label: "Seen any AURELION vans?", next: () => { f.junoVans = 1; return [E("Seen any AURELION vans?"), { who: "JUNO", text: "White ones, no plates, low tide. They park by the crates and go down under the boards. The pump house end." }, { who: "JUNO", text: "And they leave a trail. Blue drips. Coolant. Synthetic blood, if you're being poetic." }]; } });
    o.push({ label: "Just warming up.", next: () => [{ who: "JUNO", text: "Warm all you like. Smell's free." }] });
    return [{ who: "JUNO", text: f.junoAsk ? "Back for seconds?" : "Skewers! You look like a man who forgot dinner a few years running.", act: () => { f.junoAsk = 1; }, choices: o }];
  },
  wren: () => wrenHub(),
  vale: () => valeHub(),
  nova: () => {
    const f = G.flags;
    if (G.obj >= M1N) return novaM2();
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
  { id: "drawer", loc: "apt", x: 72, y: 144, kind: "EXAMINE", label: "Desk drawer", show: () => !has("badge"), use: () => say([E("My old badge. Revoked, but the chip inside still talks to cheap doors.")], () => give("badge"), false) },
  { id: "photo", loc: "apt", x: 98, y: 136, kind: "EXAMINE", label: "Old photograph", show: () => !G.flags.photoSeen, use: () => say([E("Mara. The pier, the summer before the blackout. She made me promise to keep this."), E("Six years. And now a stranger says her name like it's nothing.")], () => { G.flags.photoSeen = 1; G.rev++; }, true) },
  { id: "photo2", loc: "apt", x: 98, y: 136, kind: "COLLECT", label: "Old photograph", show: () => !!G.flags.photoSeen && !has("photo"), use: () => give("photo") },
  { id: "term", loc: "apt", x: 146, y: 124, kind: "ACCESS", label: "", show: () => true, use: () => say(termHub(), null, false) },
  { id: "window", loc: "apt", x: 236, y: 92, kind: "EXAMINE", label: "Window", show: () => true, use: () => say([E("Rain on the glass. Down there a billboard sells sunlight to people who have never seen it."), E(G.flags.lookAds ? "The holo-koi is still out there, swimming laps through the smog." : "Ad blimps drift between the towers. A koi the size of a tram swims through the haze, selling calm.")], () => { G.flags.lookAds = 1; }, false) },
  { id: "door", loc: "apt", x: 334, y: 114, kind: "ENTER", label: "Street", show: () => true, use: () => go("district", 46) },
  { id: "home", loc: "district", x: 42, y: 112, kind: "ENTER", label: "Apartment", show: () => true, use: () => go("apt", 326) },
  { id: "ad", loc: "district", x: 545, y: 92, kind: "EXAMINE", label: "Holo-ad", show: () => true, use: () => say([{ who: "", text: "AURELION. YOUR PAST, PERFECTED. A smiling family that has never existed waves at the rain." }, E("They sell childhoods by the gigabyte. Mara used to laugh at these ads.")], null, false) },
  { id: "cr1", loc: "district", x: 612, y: 146, kind: "COLLECT", label: "Credit chip", show: () => !G.flags.cr1, use: () => { G.flags.cr1 = 1; G.credits += 15; toast("+15 credits"); coin(); } },
  { id: "pawn", loc: "district", x: 705, y: 102, kind: "EXAMINE", label: "Lucky 9 shutter", show: () => true, use: () => say([E("Lucky 9 Pawn. Closed. A sticker on the shutter: precinct seal, signed KANE.")], null, false) },
  { id: "flyer", loc: "district", x: 868, y: 146, kind: "COLLECT", label: "Wet flyer", show: () => !has("flyer"), use: () => say([E("A soaked flyer. REMEMBER BETTER. Real feelings, cheap. Someone drew a green grate in the corner.")], () => { give("flyer"); G.flags.knowGrate = 1; }, false) },
  { id: "clinic", loc: "district", x: 1030, y: 100, kind: "EXAMINE", label: "Clinic 24", show: () => true, use: () => say([E(has("badge") ? "Synthetics treated, no questions asked. My badge blinks red at the precinct lock. Not tonight." : "Synthetics treated, no questions asked. Sealed with a precinct lock.")], null, false) },
  { id: "grate", loc: "district", x: 1250, y: 120, kind: "EXAMINE", label: "Green grate", show: () => !G.flags.market, use: () => say([E(G.flags.knowGrate ? "The green grate. Warm air and a melody drift up. This is it." : "A rusted grate, painted green. Warm air and a faint melody drift up through it."), { who: "", text: "The latch is only a twist of wire. Behind it, stairs lead down into amber light." }], () => { G.flags.market = 1; complete(1); G.rev++; }, false) },
  { id: "stairs", loc: "district", x: 1250, y: 120, kind: "ENTER", label: "Stairs down", show: () => !!G.flags.market, use: () => go("market", 52) },
  { id: "up", loc: "market", x: 34, y: 104, kind: "ENTER", label: "Stairs up", show: () => true, use: () => go("district", 1236) },
  { id: "cr2", loc: "market", x: 262, y: 146, kind: "COLLECT", label: "Credit chip", show: () => !G.flags.cr2, use: () => { G.flags.cr2 = 1; G.credits += 10; toast("+10 credits"); coin(); } },
  { id: "pgate", loc: "district", x: 1340, y: 112, kind: "ENTER", label: "Seawall gate", show: () => G.obj >= M1N && !!G.flags.knowLab, use: () => go("pier", 40) },
  { id: "pgate0", loc: "district", x: 1340, y: 112, kind: "EXAMINE", label: "Seawall gate", show: () => !(G.obj >= M1N && G.flags.knowLab), use: () => say([E("The seawall gate. Tidewater Pier is on the other side. Nobody goes out there anymore. Nobody I know, anyway.")], null, false) },
  { id: "pback", loc: "pier", x: 22, y: 112, kind: "ENTER", label: "Kessler Street", show: () => true, use: () => go("district", 1328) },
  { id: "tally", loc: "pier", x: 206, y: 120, kind: "EXAMINE", label: "Tally board", show: () => true, use: () => say([E(G.flags.solTally ? "Two thousand one hundred and ninety marks. Six years. The same six years I've been counting." : "Hundreds of chalk marks in neat bundles of five. Somebody has been counting days for a long time.")], () => { G.flags.tally = 1; }, false) },
  { id: "coolant", loc: "pier", x: 760, y: 150, kind: "EXAMINE", label: "Blue drips", show: () => !G.flags.coolant, use: () => say([E("Blue drops on the boards. Synthetic coolant, still bright. Somebody bled their way along this pier."), E("The trail runs under the planks, toward the pump house.")], () => { G.flags.coolant = 1; G.flags.hatch = 1; G.rev++; }, false) },
  { id: "crates", loc: "pier", x: 872, y: 140, kind: "EXAMINE", label: "AURELION crates", show: () => !has("manifest"), use: () => say([E("AURELION crates, fresh paint, old rain. The manifest is stencilled on the side."), { who: "", text: "M BATCH · 6 UNITS · SERVICE ACCESS = LAB NO. + UNIT NO." }], () => give("manifest"), false) },
  { id: "sign", loc: "pier", x: 1000, y: 92, kind: "EXAMINE", label: "Pump Station 7", show: () => true, use: () => say([E(G.obj === M1N ? "Pump Station 7. Seven. Lab 7. AURELION hid its laboratory in a pump house nobody remembered." : "Pump Station 7. Lab 7 is under my feet.")], () => { G.flags.sign = 1; complete(M1N); }, false) },
  { id: "pdoor", loc: "pier", x: 1032, y: 120, kind: "EXAMINE", label: "Welded door", show: () => true, use: () => say([E("Welded shut, a long time ago. Fresh scratches around the frame though. Somebody else tried.")], () => { G.flags.doorSeen = 1; if (G.obj === M1N) { G.flags.sign = 1; complete(M1N); } }, false) },
  { id: "hatch", loc: "pier", x: 1072, y: 150, kind: "ACCESS", label: "Service hatch", show: () => G.obj > M1N && (!!G.flags.hatch || !!G.flags.codeOk), use: () => { if (G.flags.codeOk) go("lab", 40); else say(keypad(), () => { if (G.flags.codeOk) go("lab", 40); }, false); } },
  { id: "hatch0", loc: "pier", x: 1072, y: 150, kind: "EXAMINE", label: "Boards", show: () => !(G.obj > M1N && (G.flags.hatch || G.flags.codeOk)), use: () => say([E("Loose boards and cold air coming up through them. There's something underneath.")], null, false) },
  { id: "ladder", loc: "lab", x: 30, y: 100, kind: "ENTER", label: "Ladder up", show: () => true, use: () => go("pier", 1064) },
  { id: "pods", loc: "lab", x: 140, y: 110, kind: "EXAMINE", label: "Memory pods", show: () => true, use: () => say([E("Pods M-01 to M-05. Someone is asleep in each one. The same face, five times. I know that face."), E("...Mara.")], () => { G.flags.podsSeen = 1; }, true) },
  { id: "pod6", loc: "lab", x: 218, y: 110, kind: "EXAMINE", label: "Pod M-06", show: () => !has("ribbon"), use: () => say([E("M-06 is open and empty. The seal is torn from the inside."), E("A red ribbon, caught in the hinge.")], () => { give("ribbon"); archCheck(); }, true) },
  { id: "arch", loc: "lab", x: 333, y: 120, kind: "ACCESS", label: "Memory archive", show: () => true, use: () => say(archHub(), archCheck, false) },
  { id: "drawers", loc: "lab", x: 386, y: 120, kind: "EXAMINE", label: "Index drawers", show: () => !has("indexcard"), use: () => say([E("Index drawers. Thousands of cards, alphabetical. V... Voss."), E("VOSS, ELIAS. TEMPLATE E-01. STATUS: ACTIVE. ...Active?")], () => { give("indexcard"); archCheck(); }, true) },
  { id: "reader", loc: "market", x: 636, y: 100, kind: "ACCESS", label: "Memory reader", show: () => has("chip"), use: () => { if (G.obj === 4) startGlitch(); else say([E("The reader hums. I've seen enough for one night.")], null, false); } },
];
const PLATS: Record<LocId, { x0: number; x1: number; y: number }[]> = {
  pier: [{ x0: 852, x1: 892, y: 146 }], lab: [],
  apt: [{ x0: 198, x1: 262, y: 146 }], district: [{ x0: 300, x1: 322, y: 146 }, { x0: 1118, x1: 1162, y: 138 }], market: [{ x0: 470, x1: 500, y: 146 }],
};

function targets(): Target[] {
  const out: Target[] = [];
  for (const s of SPOTS) if (s.loc === G.loc && s.show()) out.push({ id: s.id, x: s.x, y: s.y, kind: s.kind, label: s.label, use: s.use });
  for (const n of G.npcs) if (onNpc(n)) out.push({ id: n.id, x: n.x, y: n.y - n.look.h - 14, kind: "SPEAK", label: n.name, use: () => talkNpc(n), walker: n.speed > 0 });
  return out;
}
function nearest(): Target | null {
  let best: Target | null = null; let bd = 18;
  for (const t of targets()) { const d = Math.abs(t.x - G.px) + (t.walker ? 4 : 0); if (d < bd) { bd = d; best = t; } }
  return best;
}
function talkNpc(n: Npc): void {
  if (G.chat && (G.chat.a === n || G.chat.b === n)) G.chat = null;
  n.wait = 4; n.peek = 0; n.bubbleT = 0; n.dir = G.px > n.x ? 1 : -1;
  const f = TALK[n.id]; if (!f) return;
  const lines = f(n); n.met = true;
  say(lines, n.id === "vale" ? valeDone : null, n.id === "nova" || n.id === "vale");
}
function startGlitch(): void {
  G.scene = "glitch"; G.sceneT = 0; G.dlg = null; setMood("glitch"); G.rev++;
  for (let k = 0; k < 6; k++) setTimeout(() => noiseHit(0.25, 3000, 0.2), k * 400 + Math.random() * 300);
}
function endGlitch(): void {
  G.scene = "play"; G.sceneT = 0; complete(4); G.m2 = true; setMood("market"); G.fade = 1;
  G.banner = { a: "MISSION 002: THE FORGOTTEN ONES", b: OBJ[M1N] ?? "", t: 0 };
  say([E("Lab 7. Dr. Vale. Mara, telling me not to trust the rain."), E("Nova knows this market better than anyone. She'll know where AURELION hides its labs.")], null, false); G.notes.push("The chip showed AURELION labs, Dr. Vale, and Mara in the rain. Mission 002 unlocked."); chime(); saveGame(true); G.rev++;
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
  G.scene = "play"; G.dlg = null; G.loc = "apt"; G.px = 104; G.facing = 1; G.cam = 0; G.zoom = 1; G.ringing = false; G.fade = 0.8; G.flags.called = 1; G.flags.rang = 1; G.lookX = 0;
  G.banner = { a: "MISSION 001", b: "GHOSTS IN THE RAIN", t: 0 }; G.beat = 0; setMood("apt"); chime(); G.rev++;
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
  for (const p of g.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; p.vx *= 0.96; p.l -= dt; }
  if (g.parts.some((p: Part) => p.l <= 0)) g.parts = g.parts.filter((p: Part) => p.l > 0);
  if (Math.random() < dt * 0.03) { g.flash = 1; if (g.scene === "play" || g.scene === "menu") thunder(); }
  g.flash = Math.max(0, g.flash - dt * 2.5);
  if (g.toast) { g.toast.t += dt; if (g.toast.t > 3) { g.toast = null; g.rev++; } }
  if (g.banner) { g.banner.t += dt; if (g.banner.t > 4.5) g.banner = null; }
  if ((g.scene === "menu" || (g.scene === "play" && (g.loc === "district" || g.loc === "pier"))) && Math.random() < dt / 28) siren();
  if (g.scene === "menu") { g.jumpQ = false; g.actQ = false; return; }
  if (g.scene === "cut") {
    const T = g.sceneT;
    const zt = T > 8 && T < 12 ? 1.3 - clamp((T - 8) / 4, 0, 1) * 0.3 : g.dlg ? 1.14 : 1;
    g.zoom = T > 8 && T < 12 ? zt : g.zoom + (zt - g.zoom) * Math.min(1, dt * 2);
    if (T > 11.4 && !g.ringing && !g.flags.rang) { g.ringing = true; g.flags.rang = 1; ring(); }
    if (T > 14.2 && !g.dlg && !g.flags.called) { g.flags.called = 1; g.ringing = false; tone(300, 0.05, "square", 0.05, 0, 0); noiseHit(0.08, 900, 0.1); say(CALL, endCut, true); }
    if (g.dlg) { dlgTick(dt); return; }
    if (g.actQ && T < 11) { g.sceneT = 11; }
    g.actQ = false; g.jumpQ = false; return;
  }
  if (g.scene === "glitch") {
    if (g.sceneT > 12.5 || (g.actQ && g.sceneT > 1.5)) endGlitch();
    g.actQ = false; g.jumpQ = false; return;
  }
  if (g.scene === "vis") {
    if (g.sceneT > 16 || (g.actQ && g.sceneT > 2)) endVision();
    g.actQ = false; g.jumpQ = false; return;
  }
  updPeds(dt); updLife(dt);
  // npcs
  for (const n of g.npcs) {
    if (n.bubbleT > 0) n.bubbleT -= dt;
    if (!onNpc(n)) continue;
    if (n.barkCd > 0) n.barkCd -= dt;
    else if (!g.dlg && !g.chat && n.barks.length > 0 && Math.abs(n.x - g.px) < 56 && n.bubbleT <= 0) { n.bubble = pickR(n.barks); n.bubbleT = 2.6; n.barkCd = 9 + Math.random() * 8; }
    if (n.speed === 0) continue;
    if (n.wait > 0) { n.wait -= dt; continue; }
    n.peek = 0;
    const ox = n.x;
    n.x += n.dir * n.speed * dt;
    for (const s of n.stops) if ((ox - s) * (n.x - s) < 0 && Math.random() < 0.7) { n.wait = 2.5 + Math.random() * 3; n.peek = 1; }
    if (n.x > n.x1) { n.x = n.x1; n.dir = -1; n.wait = 1 + Math.random() * 2; n.peek = 1; }
    if (n.x < n.x0) { n.x = n.x0; n.dir = 1; n.wait = 1 + Math.random() * 2; n.peek = 1; }
    if (n.wait <= 0 && Math.random() < dt * 0.05) { n.wait = 1 + Math.random() * 3; n.peek = 1; }
  }
  if (g.chat) {
    const c = g.chat; c.t += dt;
    if (c.t < 3) { c.a.bubble = c.l[0] ?? ""; c.a.bubbleT = 0.1; } else if (c.t < 6) { c.b.bubble = c.l[1] ?? ""; c.b.bubbleT = 0.1; } else { g.chat = null; g.chatCd = 12; }
  } else {
    g.chatCd -= dt;
    if (g.chatCd <= 0) {
      const w = g.npcs.filter((n: Npc) => onNpc(n) && n.speed > 0);
      for (let i = 0; i < w.length && !g.chat; i++) for (let j = i + 1; j < w.length; j++) {
        const a = w[i]; const b = w[j];
        if (a && b && Math.abs(a.x - b.x) < 18) { a.wait = 6.5; b.wait = 6.5; a.dir = b.x > a.x ? 1 : -1; b.dir = -a.dir; g.chat = { a, b, l: CHATS[Math.floor(Math.random() * CHATS.length)] ?? ["...", "..."], t: 0 }; break; }
      }
      if (!g.chat) g.chatCd = 1;
    }
  }
  g.zoom += ((g.dlg && g.dlg.push ? 1.14 : g.beat !== -1 && g.px > 200 && g.loc === "apt" ? 1.12 : 1) - g.zoom) * Math.min(1, dt * (g.beat !== -1 ? 1.2 : 2.5));
  const LW = LOCW[g.loc];
  g.lookX += (g.facing * 16 - g.lookX) * Math.min(1, dt * 1.6);
  g.cam += (clamp(g.px + g.lookX - W / 2, 0, LW - W) - g.cam) * Math.min(1, dt * 4.5);
  if (g.loc === "district" || g.loc === "pier") {
    if (g.fly) {
      const f = g.fly; f.x += f.dir * f.speed * dt;
      if (!f.snd && f.x > g.cam - 40 && f.x < g.cam + W + 40) { f.snd = true; whoosh(f.dir); }
      if ((f.dir > 0 && f.x > g.cam + W + 170) || (f.dir < 0 && f.x < g.cam - 170)) { g.fly = null; g.flyCd = 7 + Math.random() * 9; }
    } else { g.flyCd -= dt; if (g.flyCd <= 0) { const d = Math.random() < 0.5 ? 1 : -1; g.fly = { x: d > 0 ? g.cam - 130 : g.cam + W + 130, y: 100 + Math.floor(Math.random() * 12), dir: d, speed: 120 + Math.random() * 50, snd: false }; } }
  } else g.fly = null;
  if (g.loc === "apt") { const was = g.sweep; g.sweep -= dt; if (was >= 0 && g.sweep < 0) noiseHit(1.6, 700, 0.05, "bandpass", true); if (g.sweep < -2.2) g.sweep = 7 + Math.random() * 7; }
  g.sndT -= dt;
  if (g.sndT <= 0 && SND) { g.sndT = 0.25; let sv = 0; for (const vx of g.loc === "district" ? [332, 846] : g.loc === "pier" ? [480, 940] : g.loc === "market" ? [600] : []) sv = Math.max(sv, 1 - Math.abs(g.px - vx) / 90); SND.steam.gain.setTargetAtTime(Math.max(0, sv) * 0.14, SND.ctx.currentTime, 0.2); pedAudio(); adTick(0.25); pierAmb(); }
  if (g.scene === "end") { g.actQ = false; g.jumpQ = false; return; }
  const talking = !!g.dlg;
  if (talking) dlgTick(dt);
  const busy = talking || g.fadeTo > 0;
  if (busy) { g.actQ = false; g.jumpQ = false; }
  // opening beat: Elias walks to the window and the camera lingers on the floating ads (tap to skip)
  let bdir: number | null = null;
  if (g.beat >= 0 && g.loc === "apt" && !busy) {
    if (g.actQ || g.jumpQ || g.beat > 12) { g.beat = -1; g.actQ = false; g.jumpQ = false; }
    else {
      g.jumpQ = false; const tx = 212;
      if (g.px < tx - 1) { bdir = 1; g.beat += dt * 0.25; } else { bdir = 0; g.facing = 1; g.beat += dt; if (g.vx === 0 && g.beat > 2.6 && !g.banner) { g.beat = -2; say([E("Every sky in this city is for sale. Tonight it's selling sleep.")], () => { G.beat = -1; }, false); } }
    }
  }
  const dir = busy ? 0 : bdir !== null ? bdir : (g.right ? 1 : 0) - (g.left ? 1 : 0);
  const tv = dir * (g.run ? 104 : 52);
  const turning = dir !== 0 && g.vx * dir < -4;
  const acc = g.grounded ? (dir === 0 ? 720 : turning ? 1100 : 560) : 330;
  g.vx = g.vx < tv ? Math.min(tv, g.vx + acc * dt) : Math.max(tv, g.vx - acc * dt);
  if (dir !== 0) g.facing = dir;
  if (g.jumpQ) g.jbuf = 0.14;
  g.jumpQ = false;
  g.jbuf = Math.max(0, g.jbuf - dt);
  g.coyote = g.grounded ? 0.1 : Math.max(0, g.coyote - dt);
  if (g.jbuf > 0 && g.coyote > 0 && EA.pre <= 0) { EA.pre = PRE; g.coyote = 0; g.jbuf = 0; }
  if (EA.pre > 0) { EA.pre -= dt; if (EA.pre <= 0) { EA.pre = 0; g.vy = -182; g.grounded = false; g.coyote = 0; tone(220, 0.1, "triangle", 0.04, 0, 330); puff(g.px, g.py, 3); EA.hlV -= 5; EA.swayV += 10; EA.dip = 0; EA.dipV = 0; } }
  const wasAir = !g.grounded;
  g.vy += (g.vy < 0 && !g.jumpHeld ? 850 : 560) * dt;
  const prevY = g.py; const fallV = g.vy;
  g.px = clamp(g.px + g.vx * dt, 8, LW - 8);
  if (g.px <= 8 || g.px >= LW - 8) g.vx = 0;
  g.py += g.vy * dt; g.grounded = false;
  if (g.py >= FEET) { g.py = FEET; g.vy = 0; g.grounded = true; }
  else if (g.vy > 0) for (const p of PLATS[g.loc]) if (g.px >= p.x0 && g.px <= p.x1 && prevY <= p.y + 0.01 && g.py >= p.y) { g.py = p.y; g.vy = 0; g.grounded = true; }
  if (wasAir && g.grounded) { g.landT = fallV > 150 ? 0.15 : 0.08; land(); animLand(fallV); if (fallV > 120) puff(g.px, g.py, 5); }
  animTick(dt);
  g.landT = Math.max(0, g.landT - dt); g.actT = Math.max(0, g.actT - dt);
  if (g.loc === "district" && g.obj === 1 && g.px > 1000) complete(1);
  if (g.scene === "play" && g.fadeTo === 0) syncObj(false);
  if (busy) return;
  if (g.loc === "pier" && g.scene === "play" && g.obj >= M1N && !g.flags.kaneRang && g.px > 90) { g.flags.kaneRang = 1; ring(); say(kaneCallLines(), null, true); return; }
  if (g.loc === "pier" && g.scene === "play" && g.obj === M1N && g.px > 950) { say([E("PUMP STATION 7. Seven. AURELION hid Lab 7 in a pump house nobody remembered.")], () => { G.flags.sign = 1; complete(M1N); }, false); return; }
  const n = nearest(); const nid = n ? n.id : "";
  if (nid !== g.near) { g.near = nid; g.rev++; }
  if (g.actQ) {
    g.actQ = false;
    if (n) { g.actT = 0.4; g.actKind = n.kind === "EXAMINE" ? "examine" : "interact"; g.facing = n.x >= g.px ? 1 : -1; blip(); n.use(); }
    else { g.actT = 0.6; g.actKind = "examine"; toast("Nothing to use here."); }
  }
}

// ---------- render ----------
type Caches = { far: HTMLCanvasElement; mid: HTMLCanvasElement; apt: HTMLCanvasElement; dist: HTMLCanvasElement; mkt: HTMLCanvasElement; mktB: HTMLCanvasElement; haze: HTMLCanvasElement; bokD: HTMLCanvasElement; bokM: HTMLCanvasElement; bokA: HTMLCanvasElement; topD: HTMLCanvasElement; topM: HTMLCanvasElement; pier: HTMLCanvasElement; lab: HTMLCanvasElement; bokP: HTMLCanvasElement };
function makeCaches(mk: (w: number, h: number) => HTMLCanvasElement): Caches {
  const cc: Caches = { far: mk(FW, H), mid: mk(MW, H), apt: mk(360, H), dist: mk(1400, H), mkt: mk(900, H), mktB: mk(KW, H), haze: mk(HW, H), bokD: mk(Math.ceil(1400 * 1.3) + 400, 60), bokM: mk(Math.ceil(900 * 1.3) + 400, 30), bokA: mk(Math.ceil(360 * 1.3) + 400, 28), topD: mk(Math.ceil(1400 * 1.2) + 400, 96), topM: mk(Math.ceil(900 * 1.2) + 400, 48), pier: mk(1100, H), lab: mk(520, H), bokP: mk(Math.ceil(1100 * 1.3) + 400, 40) };
  const bk = (e: HTMLCanvasElement, fn: (c: Ctx) => void): void => { const x = e.getContext("2d"); if (x) fn(x); };
  bk(cc.far, bakeFar); bk(cc.mid, bakeMid); bk(cc.apt, bakeApt); bk(cc.dist, bakeDistrict); bk(cc.mkt, bakeMarket); bk(cc.mktB, bakeMarketBack);
  bk(cc.haze, bakeHaze); bk(cc.bokD, (c: Ctx) => bakeBokeh(c, BOK_D, 5)); bk(cc.bokM, (c: Ctx) => bakeBokeh(c, BOK_M, 9)); bk(cc.bokA, (c: Ctx) => bakeBokeh(c, BOK_A, 13)); bk(cc.topD, (c: Ctx) => bakeCanopy(c, 3)); bk(cc.topM, (c: Ctx) => bakeTop(c, 8)); bk(cc.pier, bakePier); bk(cc.lab, bakeLab); bk(cc.bokP, (c: Ctx) => bakeBokeh(c, BOK_P, 17));
  return cc;
}
function tramX(t: number, midX: number): number { const per = W + 700; return ((((t * 16 - midX) % per) + per) % per) - 260; }
const DPROPS: [number, number][] = [[8, 0], [118, 1], [362, 0], [612, 1], [756, 0], [904, 1], [1182, 0], [1376, 1]];
function drawProps(b: Ctx, cam: number): void {
  for (const [px, k] of DPROPS) {
    const x = Math.round(px - cam); if (x < -30 || x > W + 10) continue;
    if (k === 0) { R(b, x, FEET - 9, 11, 9, "#4a3a24"); R(b, x, FEET - 9, 11, 1, "#7a6040"); R(b, x + 5, FEET - 9, 1, 9, "#2a2014"); R(b, x + 3, FEET - 16, 9, 7, "#5a4a2c"); R(b, x + 3, FEET - 16, 9, 1, "#8a7048"); R(b, x + 5, FEET - 14, 4, 2, "#d8c060"); R(b, x + 12, FEET - 6, 8, 6, "#3a2c1c"); R(b, x + 12, FEET - 6, 8, 1, "#6a5434"); }
    else { R(b, x, FEET - 8, 18, 8, "#2a3034"); R(b, x, FEET - 8, 18, 1, "#4a5458"); plant(b, x + 1, FEET - 8, 16, px); }
  }
}
function bigScreen(b: Ctx, x: number, y: number, w: number, h: number, t: number, seed: number): void {
  if (x > W + 4 || x + w < -4) return;
  R(b, x - 1, y - 1, w + 2, h + 2, "#05080c");
  for (let yy = 0; yy < h; yy += 2) { const v = Math.sin(yy * 0.18 + t * 1.3 + seed) * 0.5 + 0.5; R(b, x, y + yy, w, 2, v > 0.66 ? "#1e8a8a" : v > 0.33 ? "#165a6a" : "#0e3a4a"); }
  const fx = Math.round(x + w / 2 + Math.sin(t * 0.4 + seed) * w * 0.2);
  b.globalAlpha = 0.85; R(b, fx - 5, y + Math.round(h * 0.35), 10, h - Math.round(h * 0.35), "#ff6f9a"); R(b, fx - 3, y + Math.round(h * 0.12), 6, 8, "#ffb0c8"); R(b, fx - 4, y + Math.round(h * 0.1), 8, 3, "#3a1a3a"); b.globalAlpha = 1;
  for (let k = 0; k < 3; k++) R(b, x + 3, y + h - 7 + k * 2, Math.round((w - 6) * (0.4 + 0.6 * h1(seed + k + Math.floor(t / 2)))), 1, "#ffe0b0");
  for (let yy = 0; yy < h; yy += 2) R(b, x, y + yy, w, 1, "rgba(0,0,0,0.22)");
  glowRect(b, x, y, w, h, "#3df5d0", 0.35); glow(b, x + w / 2, y + h / 2, w, "255,111,154", 0.18);
}
function drawHauler(b: Ctx, cam: number, t: number): void {
  const X = Math.round(1150 - cam); if (X < -230 || X > W + 120) return;
  const Y = 124 + Math.round(Math.sin(t * 1.3) * 1.5);
  b.save(); b.globalCompositeOperation = "lighter";
  const bg = b.createRadialGradient(X - 36, Y - 4, 2, X - 36, Y - 4, 190); bg.addColorStop(0, "rgba(255,196,110,0.5)"); bg.addColorStop(0.5, "rgba(255,160,70,0.16)"); bg.addColorStop(1, "rgba(255,140,60,0)");
  b.fillStyle = bg; b.beginPath(); b.moveTo(X - 36, Y - 7); b.lineTo(X - 230, Y - 40); b.lineTo(X - 240, FEET + 50); b.lineTo(X - 34, Y + 1); b.closePath(); b.fill();
  b.fillStyle = "rgba(255,210,150,0.5)";
  for (let i = 0; i < 26; i++) { const q = ((t * (1.4 + h1(i) * 0.8) + h1(i * 3.1)) % 1); const rx = X - 40 - h1(i * 7.3) * 150; const ry = Y - 40 + q * 90; if (ry > Y - 30 + (X - 36 - rx) * -0.15 && ry < Y + (X - 36 - rx) * 0.6) b.fillRect(Math.round(rx), Math.round(ry), 1, 4); }
  b.restore();
  glow(b, X - 10, Y - 6, 120, "255,170,80", 0.32);
  R(b, X - 36, Y - 13, 64, 15, "#3a2a14"); R(b, X - 36, Y - 13, 64, 1, "#a87a34"); R(b, X - 36, Y + 1, 64, 1, "#1a1208");
  R(b, X - 30, Y - 22, 26, 9, "#2a1e10"); R(b, X - 28, Y - 21, 16, 6, "#5a8a8a"); R(b, X - 28, Y - 21, 16, 1, "#9ad0c8");
  R(b, X - 22, Y - 24, 18, 2, "#ffb04a"); glowRect(b, X - 22, Y - 24, 18, 2, "#ffb04a", 0.9);
  for (let k = 0; k < 6; k++) R(b, X - 28 + k * 4, Y - 6, 2, 4, "#ffcf60");
  glowRect(b, X - 28, Y - 6, 22, 4, "#ffcf60", 0.7);
  R(b, X - 37, Y - 9, 3, 3, "#fff2c8"); R(b, X - 37, Y - 3, 3, 2, "#ffd890");
  glow(b, X - 36, Y - 7, 22, "255,230,170", 1); glow(b, X - 36, Y - 2, 14, "255,200,120", 0.9);
  R(b, X - 8, Y - 9, 34, 1, "#24180a"); R(b, X + 2, Y - 12, 1, 12, "#24180a"); R(b, X + 26, Y - 11, 1, 7, "#ff4a3a"); glow(b, X + 27, Y - 7, 8, "255,80,60", 0.7);
  for (let k = 0; k < 8; k++) R(b, X + 6 + k * 2, Y - 4 + (k % 2), 1, 1, "#d8a020");
  R(b, X - 28, Y + 2, 12, 2, "#1a1410"); R(b, X + 6, Y + 2, 12, 2, "#1a1410");
  glow(b, X - 22, Y + 6, 12, "255,190,110", 0.8); glow(b, X + 12, Y + 6, 12, "255,190,110", 0.8);
}
function bakeCanopy(c: Ctx, seed: number): void {
  bakeTop(c, seed);
  const w = c.canvas.width;
  for (let k = 0; k < w / 420; k++) {
    const cx = k * 420 + 30 + h1(seed + k * 3) * 120;
    for (let s = 0; s < 7; s++) {
      const hx = Math.round(cx - 50 + s * 22 + h1(seed + s + k) * 10); const len = Math.round(26 + h1(seed + s * 5 + k) * 40);
      R(c, hx, 8, 1, len, "#030605");
      const col = s % 3 === 0 ? "255,190,110" : s % 3 === 1 ? "95,240,216" : "255,111,154";
      R(c, hx - 1, 8 + len, 3, 3, `rgb(${col})`);
      c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.9; c.drawImage(glowSprite(col), hx - 11, len - 3, 24, 24); c.restore();
    }
    for (let i = 0; i < 90; i++) {
      const a = h1(seed + k * 31 + i * 1.7); const bx = cx + (h1(seed + i * 2.3 + k) - 0.35) * 170;
      const by = -8 + h1(seed + i * 4.1 + k) * 46 * Math.max(0.15, 1 - Math.abs(bx - cx - 20) / 110); const r = 4 + a * 9;
      c.fillStyle = a < 0.3 ? "#0b1d14" : a < 0.7 ? "#07140d" : "#040a07"; c.beginPath(); c.arc(bx, by, r, 0, Math.PI * 2); c.fill();
      if (a > 0.78) { c.fillStyle = "rgba(70,190,150,0.4)"; c.fillRect(Math.round(bx - r * 0.5), Math.round(by + r * 0.7), 3, 1); }
    }
    for (let i = 0; i < 4; i++) { const x0 = cx - 40 + i * 30; for (let y = 0; y < 40; y++) R(c, x0 + Math.round(Math.sin(y * 0.2 + i) * 3) + Math.round(y * (i - 1.5) * 0.3), y, 2, 1, "#050a07"); }
  }
}
function waterPlane(b: Ctx, rc: Ctx, buf: HTMLCanvasElement, rbuf: HTMLCanvasElement, cam: number, t: number): void {
  const wl = FEET - YO; const top = wl + 5; const depth = H - top;
  rc.setTransform(1, 0, 0, 1, 0, 0); rc.globalAlpha = 1; rc.globalCompositeOperation = "copy"; rc.drawImage(buf, 0, 0); rc.globalCompositeOperation = "source-over";
  R(b, 0, wl, W, top - wl, "#0b1216"); R(b, 0, wl, W, 1, "#3a5058"); R(b, 0, top - 1, W, 1, "#05080a");
  for (let wx = Math.floor(cam / 24) * 24; wx < cam + W + 24; wx += 24) { const sx = wx - cam; R(b, sx, wl + 2, 2, 1, "#ffcf7a"); glow(b, sx + 1, wl + 2, 6, "255,190,110", 0.45); }
  R(b, 0, top, W, depth, "#03090c");
  for (let y = top; y < H; y++) {
    const d = y - top; const src = wl - 1 - Math.floor(d * 0.85); if (src < 1) break;
    const off = Math.round(Math.sin(y * 0.8 + t * 2.4) * (0.5 + d * 0.04));
    b.globalAlpha = 0.46 - (d / depth) * 0.2; b.drawImage(rbuf, 0, src * SC, W * SC, SC, off, y, W, 1);
  }
  b.save(); b.globalCompositeOperation = "lighter";
  const bands = G.gfx ? 4 : 2;
  for (let k = 0; k < bands; k++) { b.globalAlpha = 0.2 - k * 0.025; b.drawImage(rbuf, 0, (wl - 10 - k * 21) * SC, W * SC, 6 * SC, 0, top + k * 2, W, depth - k * 2); }
  b.restore(); b.globalAlpha = 1;
  const gw = b.createLinearGradient(0, top, 0, H); gw.addColorStop(0, "rgba(4,16,18,0.05)"); gw.addColorStop(1, "rgba(2,8,10,0.4)"); b.fillStyle = gw; b.fillRect(0, top, W, depth);
  for (let i = 0; i < 26; i++) { const x = ((h1(i * 3.3) * (W + 40) - cam * 1.1 + t * 3 * ((i % 3) - 1)) % (W + 40) + W + 40) % (W + 40) - 20; const y = top + 2 + h1(i * 7.7) * (depth - 4); b.globalAlpha = 0.18 + 0.14 * Math.sin(t * 2 + i); R(b, x, y, 3 + (i % 4) * 2, 1, "#9fd8d0"); }
  for (let i = 0; i < 12; i++) { const x = ((h1(i * 5.1) * 1600 - cam * 1.05 + t * 1.5) % (W + 60) + W + 60) % (W + 60) - 30; const y = top + 3 + Math.floor(h1(i * 1.9) * 10); b.globalAlpha = 0.9; R(b, x, y, 5 + (i % 3) * 2, 1, i % 4 === 0 ? "#4a2a40" : "#123222"); R(b, x + 1, y - 1, 3, 1, "#0a1a12"); }
  b.globalAlpha = 1;
  for (let wx = Math.floor(cam / 140) * 140 + 40; wx < cam + W + 20; wx += 140) { const sx = wx - cam; R(b, sx, top, 5, depth, "#04080a"); R(b, sx, top, 1, depth, "#1a2a2e"); }
}
function city(b: Ctx, cc: Caches, farX: number, midX: number, t: number, camC: number, open = false): void {
  const sky = b.createLinearGradient(0, 0, 0, FEET);
  sky.addColorStop(0, "#02060a"); sky.addColorStop(0.5, "#082026"); sky.addColorStop(1, "#164a46");
  b.fillStyle = sky; b.fillRect(0, 0, W, FEET + 1);
  if (G.flash > 0) { b.globalAlpha = G.flash * 0.3; R(b, 0, 0, W, FEET, "#c8f0e8"); b.globalAlpha = 1; }
  glow(b, W * 0.7, 28, 40, "120,220,200", 0.35);
  for (let k = 0; k < 4; k++) { b.globalAlpha = 0.4; R(b, ((k * 97 + t * 3) % (W + 120)) - 60, 18 + k * 11, 70 + k * 10, 3, "#03090c"); b.globalAlpha = 1; }
  if (G.gfx) {
    b.globalAlpha = 0.55; b.drawImage(cc.haze, Math.round(farX * 0.4), 0, W, H, 0, 0, W, H); b.globalAlpha = 1;
    b.save(); b.globalCompositeOperation = "lighter"; b.fillStyle = "#cfefff";
    for (let k = 0; k < 2; k++) { const bx = (k ? 0.78 : 0.22) * W - farX * 0.3; const a = -Math.PI / 2 + Math.sin(t * 0.22 + k * 2.1) * 0.55; b.globalAlpha = 0.06; b.beginPath(); b.moveTo(bx, FEET - 30); b.lineTo(bx + Math.cos(a - 0.05) * 240, FEET - 30 + Math.sin(a - 0.05) * 240); b.lineTo(bx + Math.cos(a + 0.05) * 240, FEET - 30 + Math.sin(a + 0.05) * 240); b.closePath(); b.fill(); }
    b.restore();
  }
  holoKoi(b, t, camC);
  const hz = b.createLinearGradient(0, 40, 0, FEET); hz.addColorStop(0, "rgba(90,150,180,0)"); hz.addColorStop(1, "rgba(120,175,195,0.26)"); b.fillStyle = hz; b.fillRect(0, 40, W, FEET - 40);
  b.drawImage(cc.far, Math.round(farX), 0, W, H, 0, 0, W, H);
  if (open) tower(b, camC, t);
  if (G.gfx) for (let k = 0; k < 2; k++) { const y = 44 + k * 8; const sp = k ? -38 : 52; for (let i = 0; i < 5; i++) { const span = W + 80; const x = ((((h1(i * 3.7 + k) * span + t * sp - camC * 0.2) % span) + span) % span) - 40; b.globalAlpha = 0.5; R(b, Math.round(x), y, 6, 1, k ? "#ff6a6a" : "#fff0c8"); b.globalAlpha = 0.18; R(b, Math.round(x) - (k ? -6 : 14), y, 14, 1, k ? "#ff6a6a" : "#fff0c8"); } b.globalAlpha = 1; }
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
  if (open) { const fog = b.createLinearGradient(0, 70, 0, FEET); fog.addColorStop(0, "rgba(60,160,140,0)"); fog.addColorStop(1, "rgba(60,150,140,0.36)"); b.fillStyle = fog; b.fillRect(0, 70, W, FEET - 70); return; }
  { const span = W + 260; const bx = ((((300 - camC * 0.3) % span) + span) % span) - 200;
    R(b, bx, 98, 190, 3, "#0d2a30"); R(b, bx, 97, 190, 1, "#2a6a6a"); R(b, bx, 92, 190, 1, "#0d2a30"); for (let k = 0; k < 190; k += 16) R(b, bx + k, 92, 1, 6, "#0d2a30");
    for (let i = 0; i < 10; i++) { const q = (((t * (2 + (i % 3)) * (i % 2 ? 1 : -1)) / 190 + h1(i * 2.1)) % 1 + 1) % 1; R(b, bx + q * 190, 92, 1, 5, "#081a1e"); } }
  b.drawImage(cc.mid, Math.round(midX), 0, W, H, 0, 0, W, H);
  midAds(b, midX, t);
  R(b, 0, 66, W, 2, "#0a161c"); for (let x = -(Math.round(midX) % 90); x < W; x += 90) R(b, x, 68, 3, FEET - 68, "#0a141a");
  { const tx = Math.round(tramX(t, midX));
    if (tx > -170 && tx < W + 10) { for (let k = 0; k < 4; k++) { const cx = tx + k * 40; R(b, cx, 56, 38, 10, "#16242c"); R(b, cx, 56, 38, 1, "#3a5866"); for (let w = 0; w < 6; w++) R(b, cx + 3 + w * 6, 59, 4, 3, (k + w) % 5 === 0 ? "#5ff0d8" : "#ffcf7a"); glowRect(b, cx + 2, 58, 34, 5, "#ffcf7a", 0.25); R(b, cx + 18, 53, 1, 3, "#3a4a52"); }
      glow(b, tx + 160, 62, 16, "255,240,200", 0.8); if (h1(Math.floor(t * 9)) > 0.93) glow(b, tx + 98, 53, 8, "180,220,255", 1); } }
  const fog = b.createLinearGradient(0, 70, 0, FEET); fog.addColorStop(0, "rgba(60,160,140,0)"); fog.addColorStop(1, "rgba(60,160,140,0.42)");
  b.fillStyle = fog; b.fillRect(0, 70, W, FEET - 70);
}
function rain(b: Ctx, a: number): void {
  b.fillStyle = `rgba(180,230,220,${0.4 * a})`;
  for (const d of G.drops) for (let k = 0; k < d.l; k++) b.fillRect(Math.round(d.x - 30 + k * 0.22), Math.round(d.y - k), 1, 1);
}
function reflect(b: Ctx, rc: Ctx, buf: HTMLCanvasElement, rbuf: HTMLCanvasElement, a: number, puddles: number[], cam: number): void {
  rc.setTransform(1, 0, 0, 1, 0, 0); rc.clearRect(0, 0, rbuf.width, rbuf.height); rc.drawImage(buf, 0, 0);
  b.save(); b.beginPath(); b.rect(0, FEET + 1, W, H - FEET); b.clip();
  b.globalAlpha = a; b.setTransform(1, 0, 0, -0.25, 0, FEET * 1.25 * SC); b.drawImage(rbuf, 0, 0); b.restore();
  for (const px of puddles) {
    const sx = Math.round(px - cam); const w = 26 + (px % 3) * 8;
    if (sx > W || sx + w < 0) continue;
    const py = px % 2 === 0 ? FEET + 2 : FEET + 11;
    b.save(); b.beginPath(); b.rect(sx + 4, py, w - 8, 1); b.rect(sx, py + 1, w, 3); b.rect(sx + 3, py + 4, w - 6, 1); b.clip();
    R(b, sx, py, w, 5, "#02060a");
    b.globalAlpha = 0.85; b.setTransform(1, 0, 0, -0.25, Math.round(Math.sin(G.t * 1.7 + px) * 0.6) * SC, FEET * 1.25 * SC); b.drawImage(rbuf, 0, 0); b.restore();
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
  const t = G.t;
  for (const n of G.npcs) {
    if (!onNpc(n)) continue;
    const sx = n.x - cam; if (sx < -24 || sx > W + 24) continue;
    const moving = n.speed > 0 && n.wait <= 0;
    const f = n.speed === 0 ? (G.px > n.x ? 1 : -1) : n.wait > 0 && n.peek ? (Math.sin(t * 1.3 + n.x) > 0 ? 1 : -1) : n.dir;
    shade(b, sx, n.y, n.look.h * 0.3, 1);
    const j = figure(b, sx, n.y, n.look, f, npcPose(n, moving, t), G.gfx > 0);
    if (DBG.foot) DBG.foot.push([j.foot, n.y, 0]);
    idleFx(b, n, j, f, t);
  }
}
function idleFx(b: Ctx, n: Npc, j: Joints, f: number, t: number): void {
  const hx = Math.round(j.hx); const hy = Math.round(j.hy); const top = Math.round(j.top);
  if (n.idle === "stir") { R(b, hx, hy - 1, 1, 6, "#9aa4a8"); R(b, hx - 1, hy + 4, 3, 1, "#c8d0d4"); for (let k = 0; k < 3; k++) { const p = (t * 0.6 + k / 3) % 1; b.globalAlpha = 0.25 * (1 - p); R(b, hx + f * 2 + Math.round(Math.sin(t * 2 + k) * 2), hy + 2 - p * 18, 2, 1, "#e8f0f0"); } b.globalAlpha = 1; }
  else if (n.idle === "tinker") { R(b, hx - 1, hy - 1, 3, 2, "#3a4a4a"); if (h1(Math.floor(t * 9) + n.x) > 0.72) { R(b, hx + f, hy - 2, 1, 1, "#fff2a0"); glow(b, hx + f, hy - 2, 6, "255,230,140", 0.8); } }
  else if (n.idle === "doze") { const zp = (t * 0.5) % 1; b.globalAlpha = 1 - zp; ptext(b, "Z", Math.round(j.ex) + 3 + Math.round(zp * 5), top - 6 - Math.round(zp * 10), "#cfe8ff", 1); b.globalAlpha = 1; }
  else if (n.idle === "smoke") { const on = Math.sin(t * 0.8) > 0.4; R(b, hx + f, hy - 1, 1, 1, on ? "#ffb04a" : "#6a3a1a"); if (on) glow(b, hx + f, hy - 1, 4, "255,170,80", 0.7); for (let k = 0; k < 3; k++) { const p = (t * 0.4 + k / 3) % 1; b.globalAlpha = 0.25 * (1 - p); R(b, hx + f + Math.round(Math.sin(t + k * 2) * 2), hy - 3 - p * 14, 2, 1, "#c8d8d8"); } b.globalAlpha = 1; }
  else if (n.idle === "scan" && n.wait > 0) { b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.12; b.fillStyle = "#e8f4ff"; b.beginPath(); b.moveTo(hx, hy); b.lineTo(hx + f * 44, FEET); b.lineTo(hx + f * 16, FEET); b.closePath(); b.fill(); b.restore(); R(b, hx - 1, hy, 2, 1, "#ffffff"); }
  else if (n.idle === "fold") { const fl = Math.sin(t * 2.2) > 0; R(b, hx - 2, hy - 1, 4, fl ? 2 : 1, "#f0ece4"); if (fl) R(b, hx, hy - 2, 1, 1, "#f0ece4"); }
  else if (n.idle === "warm") { glow(b, hx, hy, 6, "255,150,70", 0.35 + 0.15 * h1(Math.floor(t * 10))); }
  else if (n.idle === "wrist" && n.wait > 0) { R(b, hx - 1, hy, 2, 1, "#3df5d0"); glow(b, hx, hy, 5, "61,245,208", 0.6); }
}
// ---------- window holo-ads (apartment view) ----------
const APTAD: string[][] = [["AURELION", "SUNRISE DAILY", "255,176,80"], ["MERIDIAN", "SLEEP DEEPER", "90,232,220"], ["AURELION", "REMEMBER BETTER", "255,96,176"]];
function aptAd(t: number): { i: number; rgb: string; k: number } {
  const p = t / 5; const i = Math.floor(p) % 3; const f = p - Math.floor(p);
  return { i, rgb: APTAD[i]?.[2] ?? "90,232,220", k: Math.min(1, f * 6, (1 - f) * 6) };
}
function windowAds(b: Ctx, wx: number, WY: number, WW: number, WH: number, t: number): void {
  const hi = G.gfx > 0; const ad = aptAd(t);
  b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.05 + 0.08 * ad.k; b.fillStyle = `rgb(${ad.rgb})`; b.fillRect(wx, WY + Math.round(WH * 0.35), WW, WH); b.restore();
  if (hi) {
    // a giant translucent holo-koi swimming slowly between the towers
    const kd = Math.cos(t * 0.11) >= 0 ? 1 : -1; const kx = wx + WW / 2 + Math.sin(t * 0.11) * (WW / 2 - 4) + kd * 12; const ky = WY + 17 + Math.sin(t * 0.45) * 3;
    const fl = h1(Math.floor(t * 7)) > 0.9 ? 0.5 : 1;
    b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.42 * fl;
    for (let i = 0; i < 28; i++) {
      const u = i / 27; const th = u > 0.86 ? Math.round((u - 0.86) * 40) : Math.round(Math.sin(Math.min(1, u * 1.25) * Math.PI) * 5 * (1 - u * 0.4));
      const yy = ky + Math.sin(t * 2.2 - u * 3.2) * u * 3;
      b.fillStyle = u < 0.12 ? "#ffe6d6" : (i + Math.floor(t * 3)) % 7 === 0 ? "#fff4ee" : u > 0.86 ? "#ff6f9a" : "#ff9a62";
      for (let r = -th; r <= th; r += 2) b.fillRect(Math.round(kx - i * kd), Math.round(yy + r), 1, 1);
      if (i === 9) { b.fillRect(Math.round(kx - i * kd), Math.round(yy + th + 1), 2, 3); b.fillRect(Math.round(kx - (i + 1) * kd), Math.round(yy - th - 3), 3, 2); }
    }
    b.fillStyle = "#ffffff"; b.fillRect(Math.round(kx - 3 * kd), Math.round(ky - 1), 1, 1);
    b.restore(); glow(b, kx - 12 * kd, ky, 20, "255,140,100", 0.22 * fl);
    // tiny ad drones with blinking screens
    for (let d = 0; d < 2; d++) {
      const dx = wx + ((t * (5 + d * 3) + d * 47) % (WW + 20)) - 10; const dy = WY + 8 + d * 9 + Math.sin(t * 1.3 + d) * 1.5;
      const a2 = APTAD[(ad.i + d + 1) % 3] ?? []; R(b, dx, dy, 5, 3, "#0a1014"); R(b, dx + 1, dy + 1, 3, 1, `rgb(${a2[2] ?? "90,232,220"})`);
      if (Math.sin(t * 6 + d * 2) > 0.3) R(b, dx + 2, dy - 1, 1, 1, "#ff5a5a");
      glow(b, dx + 2, dy + 2, 5, a2[2] ?? "90,232,220", 0.4);
    }
  }
  // ad blimp with a scrolling screen, drifting across in ~40 s
  const blimp = (ph: number, y: number, j: number, big: boolean): void => {
    const L = big ? 30 : 18; const Hh = big ? 10 : 6; const span = WW + L;
    const x = Math.round(wx + WW - ((t * (big ? 2.2 : 3.4) + ph) % span)); const yy = Math.round(y + Math.sin(t * 0.6 + j) * 1.2);
    if (x > wx + WW + 4 || x + L < wx - 4) return;
    R(b, x + 2, yy, L - 4, Hh, "#0c1418"); R(b, x, yy + 2, L, Hh - 4, "#0c1418"); R(b, x + L, yy + 1, 3, 2, "#0c1418"); R(b, x + L, yy + Hh - 3, 3, 2, "#0c1418");
    R(b, x + 4, yy + Hh, L - 10, 2, "#0a0f12");
    const a2 = APTAD[(ad.i + j) % 3] ?? []; const rgb = a2[2] ?? "90,232,220";
    const sx0 = x + 2; const sy0 = yy + 2; const sw = L - 4; const sh = Hh - 4;
    b.save(); b.beginPath(); b.rect(sx0, sy0, sw, sh); b.clip();
    b.fillStyle = `rgba(${rgb},0.3)`; b.fillRect(sx0, sy0, sw, sh); b.fillStyle = "rgba(255,255,255,0.12)"; b.fillRect(sx0, sy0, sw, 1);
    if (big) { const msg = (a2[0] ?? "") + "  " + (a2[1] ?? "") + "  "; const tw = msg.length * 4; const off = (t * 9) % tw; ptext(b, msg + msg, sx0 - off, sy0 + 1, "#fff4e6", 1); }
    else { for (let k = 0; k < sw; k += 2) if (h1(k + Math.floor(t * 3) * 7 + j) > 0.45) R(b, sx0 + k, sy0 + 1, 1, 1, `rgb(${rgb})`); }
    b.restore();
    if (Math.sin(t * 4 + j) > 0.4) R(b, x + L + 1, yy + 1, 1, 1, "#ff5a5a");
    glow(b, x + L / 2, yy + Hh / 2, L * 0.7, rgb, big ? 0.35 : 0.25);
  };
  blimp(0, WY + 4, 0, true);
  if (hi) { blimp(30, WY + 26, 1, false); blimp(85, WY + 12, 2, false); }
}
function aptSpill(b: Ctx, cam: number, t: number): void {
  if (!G.gfx) return;
  const ad = aptAd(t); const wx = 196 - cam; const a = 0.05 + 0.07 * ad.k;
  b.save(); b.globalCompositeOperation = "lighter";
  const gr = b.createLinearGradient(wx + 40, 96, wx + 10, FEET + 4); gr.addColorStop(0, `rgba(${ad.rgb},${a})`); gr.addColorStop(1, `rgba(${ad.rgb},0)`);
  b.fillStyle = gr; b.beginPath(); b.moveTo(wx, 96); b.lineTo(wx + 80, 96); b.lineTo(wx + 112, FEET + 6); b.lineTo(wx - 70, FEET + 6); b.closePath(); b.fill();
  b.restore();
  glow(b, wx + 40, FEET + 2, 46, ad.rgb, 0.12 * ad.k + 0.04);
}
function drawApt(b: Ctx, cc: Caches, cam: number, seated: boolean): void {
  const t = G.t;
  const wx = 196 - cam; const WY = 96; const WW = 80; const WH = 46;
  b.save(); b.beginPath(); b.rect(wx, WY, WW, WH); b.clip();
  const sky = b.createLinearGradient(0, WY, 0, WY + WH); sky.addColorStop(0, "#03080c"); sky.addColorStop(1, "#1a4a46");
  b.fillStyle = sky; b.fillRect(wx, WY, WW, WH);
  b.drawImage(cc.far, 60 + t * 1.5 % 200, 40, 160, 130, wx - 6, WY - 4, 92, 74);
  b.drawImage(cc.mid, 300, 60, 140, 110, wx - 4, WY + 14, 88, 69);
  windowAds(b, wx, WY, WW, WH, t);
  { const ax = wx + 48; const on = flick(t, 77); R(b, ax, WY + 4, 18, 11, on ? "rgba(255,150,60,0.2)" : "rgba(40,30,20,0.3)"); for (let a = 0; a < 10; a++) { const an = Math.PI + (a / 9) * Math.PI; R(b, ax + 9 + Math.cos(an) * 4, WY + 12 + Math.sin(an) * 4, 1, 1, on ? "#ffb04a" : "#5a3a1a"); } R(b, ax + 3, WY + 12, 12, 1, on ? "#ffd27a" : "#3a2a1a"); if (on) glow(b, ax + 9, WY + 9, 14, "255,170,80", 0.45); }
  for (const c of G.cars) { const x = wx + ((c.x * 0.3 % 100) + 100) % 100 - 10; const y = WY + 3 + c.y * 0.25; R(b, x, y, 4, 1, "#ffd08a"); glow(b, x, y, 3, "255,210,140", 0.6); }
  b.fillStyle = "rgba(180,230,220,0.35)";
  for (let k = 0; k < 30; k++) { const x = wx + h1(k * 1.3) * WW; const y = WY + ((h1(k * 2.1) * WH + t * (40 + h1(k) * 30)) % WH); b.fillRect(Math.round(x), Math.round(y), 1, 2); }
  b.fillStyle = "rgba(200,240,235,0.25)";
  for (let k = 0; k < 8; k++) { const x = wx + h1(k * 7.7) * (WW - 2); const y = WY + ((t * (4 + k) + k * 13) % WH); b.fillRect(Math.round(x), Math.round(y), 1, 2); }
  b.restore();
  b.drawImage(cc.apt, cam, 0, W, H, 0, 0, W, H);
  const adc = aptAd(t);
  b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.05 + 0.04 * adc.k; b.fillStyle = `rgb(${adc.rgb})`;
  b.beginPath(); b.moveTo(wx, 96); b.lineTo(wx + 80, 96); b.lineTo(wx + 104, FEET + 6); b.lineTo(wx - 12, FEET + 6); b.closePath(); b.fill(); b.restore();
  // headlight sweep: a narrow, soft band on the back wall and ceiling only; it fades out above head height and is drawn
  // before any character, so it never washes over Elias
  if (G.sweep < 0) {
    const p = clamp(-G.sweep / 2.2, 0, 1); const bx0 = wx + 100 - p * 280; const pk = Math.sin(p * Math.PI) * (G.gfx ? 0.13 : 0.09);
    b.save(); b.globalCompositeOperation = "lighter";
    const sg = b.createLinearGradient(bx0 - 14, 0, bx0 + 14, 0); sg.addColorStop(0, "rgba(255,226,186,0)"); sg.addColorStop(0.5, "rgba(255,226,186,1)"); sg.addColorStop(1, "rgba(255,226,186,0)");
    b.fillStyle = sg;
    for (let k = 0; k < 12; k++) { const y0 = 18 + k * 8; b.globalAlpha = pk * clamp((114 - y0) / 40, 0, 1); b.fillRect(Math.round(bx0 - 14), y0, 28, 8); }
    b.restore();
  }
  glow(b, 121 - cam, 138, 26, "255,180,100", 0.6);
  if (G.gfx) glow(b, 124 - cam, 140, 30, adc.rgb, 0.1 + 0.1 * adc.k);
  R(b, 118 - cam, 137, 6, 1, "#ffe0a0");
  const sx = 137 - cam;
  for (let k = 0; k < 5; k++) if (h1(k + Math.floor(t * 2)) > 0.25) R(b, sx + 1, 133 + k * 2, 4 + Math.floor(h1(k * 3 + Math.floor(t)) * 13), 1, "#5dff9a");
  glowRect(b, sx, 132, 20, 10, "#5dff9a", 0.25);
  if (!has("photo") && !seated) { R(b, 97 - cam, 142, 3, 4, "#e8e0c8"); R(b, 98 - cam, 143, 1, 2, "#8a6a5a"); if (Math.sin(t * 3) > 0.6) glow(b, 98 - cam, 144, 5, "255,240,200", 0.5); }
  const ringOn = G.ringing && Math.sin(t * 20) > 0;
  if (!(seated && G.dlg)) { R(b, 106 - cam, 144, 5, 2, "#1a1a1e"); R(b, 107 - cam, 144, 2, 1, ringOn ? "#ff5a5a" : "#3a1a1a"); }
  if (ringOn) glow(b, 108 - cam, 144, 9, "255,80,80", 0.7);
  drawChair(b, 92 - cam, FEET);
  if (seated) drawEliasSeated(b, 92 - cam, FEET, t, !G.dlg);
}
function drawDistrictDyn(b: Ctx, cam: number): void {
  const t = G.t; const S = (x: number): number => Math.round(x - cam);
  winLife(b, cam, t, DWINS);
  { const gx = S(1330); if (gx > -40 && gx < W + 10) { R(b, gx, 104, 26, 56, "#1a2224"); R(b, gx, 104, 26, 2, "#3a4a4e"); for (let k = 3; k < 26; k += 4) R(b, gx + k, 108, 1, 52, "#0c1214"); R(b, gx + 2, 96, 22, 8, "#141c1e"); ptext(b, "PIER", gx + 5, 98, G.flags.knowLab ? "#ffd27a" : "#4a6a6a", 1); if (G.flags.knowLab) glow(b, gx + 13, 100, 12, "255,200,120", 0.4); } }
  hangSign(b, S(470), 104, "OPEN", "#ff6f9a", t, 41); hangSign(b, S(1086), 100, "BAR", "#7affc0", t, 43);
  neon(b, "HIRO BOWL", S(183), 85, "#ff8a6a", t, 3, 1);
  neon(b, "PIX REPAIR", S(399), 96, "#5ff0d8", t, 5, 1);
  neon(b, "LUCKY 9", S(677), 99, "#ffb04a", t, 7, 1);
  neon(b, "CLINIC 24", S(959), 94, "#5ff0d8", t, 9, 1);
  holoAd(b, S(64), 52, 64, 30, "eye", t, 31);
  holoAd(b, S(798), 50, 46, 34, "koi", t, 33);
  holoAd(b, S(940), 50, 40, 30, "heart", t, 35);
  holoAd(b, S(1232), 56, 52, 40, "sun", t, 37);
  bigScreen(b, S(700), 46, 36, 44, t, 3); bigScreen(b, S(1096), 50, 40, 40, t, 7); bigScreen(b, S(296), 46, 30, 40, t, 11);
  vneon(b, "HOTEL", S(268), 52, "#5ff0d8", t, 45); vneon(b, "NOODLE", S(1206), 48, "#ffb04a", t, 47);
  vneon(b, "ROOMS", S(484), 48, "#ff6f9a", t, 41);
  vneon(b, "BAR", S(634), 58, "#ffb04a", t, 43);
  const cx = S(1040); const on = flick(t, 21);
  if (on) { R(b, cx - 1, 76, 3, 9, "#5ff0d8"); R(b, cx - 4, 79, 9, 3, "#5ff0d8"); glow(b, cx, 80, 14, "95,240,216", 0.7); }
  const bx = S(496);
  if (bx > -110 && bx < W + 10) {
    b.save(); b.translate(0, 14);
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
    b.restore();
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
  R(b, S(146), 142, 112, 2, "#8a5a36"); R(b, S(146), 142, 112, 1, "#e0a868"); R(b, S(148), 144, 108, 16, "#2a1810");
  for (let k = 0; k < 5; k++) R(b, S(158 + k * 24), 147, 1, 13, "#1e100c");
  for (let k = 0; k < 4; k++) { const ph = (G.t * 8 + k * 7) % 24; b.globalAlpha = 0.3 * (1 - ph / 24); R(b, S(190 + k * 5), 138 - ph, 2, 2, "#e8e0d0"); b.globalAlpha = 1; }
  for (const lx of [150, 254]) { const ly = 105 + Math.round(Math.sin(G.t * 1.5 + lx)); R(b, S(lx) - 2, ly, 5, 7, "#ff5a3a"); glow(b, S(lx), ly + 3, 18, "255,110,60", 0.7); }
}
function drawMarketDyn(b: Ctx, cam: number): void {
  const t = G.t; const S = (x: number): number => Math.round(x - cam);
  neon(b, "TEA", S(178), 80, "#ffb04a", t, 2, 2);
  neon(b, "CHIPS", S(341), 80, "#5ff0d8", t, 4, 2);
  neon(b, "RECALL", S(497), 80, "#ff6f9a", t, 6, 2);
  neon(b, "NOVA", S(755), 78, "#ff5a5a", t, 8, 2);
  holoAd(b, S(248), 36, 46, 30, "moon", t, 51);
  holoAd(b, S(848), 32, 50, 36, "heart", t, 53);
  for (const gx of [330, 585, 690]) {
    const sx = S(gx); if (sx < -40 || sx > W + 40) continue;
    const fl = 0.75 + Math.sin(t * 0.7 + gx) * 0.25;
    b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.1 * fl;
    const gr = b.createLinearGradient(0, 24, 0, FEET); gr.addColorStop(0, "rgba(200,255,240,1)"); gr.addColorStop(1, "rgba(120,220,200,0)");
    b.fillStyle = gr; b.beginPath(); b.moveTo(sx - 5, 24); b.lineTo(sx + 5, 24); b.lineTo(sx + 24, FEET); b.lineTo(sx - 12, FEET); b.closePath(); b.fill(); b.restore();
    R(b, sx - 6, 22, 12, 2, "#2a3a36"); for (let k = 0; k < 4; k++) R(b, sx - 5 + k * 3, 22, 1, 2, "#0a1210");
    for (let k = 0; k < 6; k++) { const p = (t * 0.07 + k / 6 + h1(gx)) % 1; b.globalAlpha = 0.55 * Math.sin(p * Math.PI); R(b, sx - 3 + h1(k + gx) * 18 * p, 26 + p * 128, 1, 1, "#dffff4"); }
    b.globalAlpha = 1;
  }
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
    R(b, S(x), 142, w, 2, "#a87a46"); R(b, S(x), 142, w, 1, "#ffd090"); R(b, S(x) + 2, 144, w - 4, 16, "#3a2414");
    for (let k = 0; k < w; k += 16) R(b, S(x) + k + 4, 146, 1, 14, "#24160c");
  }
}
function render(b: Ctx, rc: Ctx, buf: HTMLCanvasElement, rbuf: HTMLCanvasElement, cc: Caches): void {
  BAKE = 14;
  const g = G; const t = g.t;
  if (g.scene === "menu") { const c = t * 22; city(b, cc, tri(c * 0.15, FW - W - 2), tri(c * 0.45, MW - W - 2), t, c); rain(b, 1); return; }
  if (g.scene === "glitch") { renderGlitch(b, g.sceneT); return; }
  if (g.scene === "vis") { renderVision(b, g.sceneT); return; }
  if (g.scene === "cut" && g.sceneT < 8) {
    if (g.sceneT < 2.5) { R(b, 0, 0, W, H, "#000"); rain(b, 0.5); return; }
    const c = (g.sceneT - 2.5) * 18; city(b, cc, c * 0.15 + 40, c * 0.45 + 120, t, c); rain(b, 1);
    const fadeA = clamp((3.5 - g.sceneT), 0, 1) + clamp((g.sceneT - 7.2) / 0.8, 0, 1);
    if (fadeA > 0) { b.globalAlpha = fadeA; R(b, 0, 0, W, H, "#000"); b.globalAlpha = 1; }
    return;
  }
  const cam = Math.round(g.cam);
  const seated = g.scene === "cut";
  YO = (g.loc === "district" || g.loc === "pier") && (g.scene === "play" || g.scene === "end") ? 44 : 0;
  if (g.loc === "apt") {
    drawApt(b, cc, cam, seated);
    drawNpcs(b, cam);
    if (!seated) drawElias(b, g.px - cam, g.py, g.facing, eliasState(), g.walk, t);
    aptSpill(b, cam, t);
    reflect(b, rc, buf, rbuf, 0.1, [], cam);
    if (seated && g.sceneT < 9) { b.globalAlpha = clamp(1 - (g.sceneT - 8) / 0.9, 0, 1); R(b, 0, 0, W, H, "#000"); b.globalAlpha = 1; }
  } else if (g.loc === "district") {
    b.setTransform(SC, 0, 0, SC, 0, -YO * SC);
    city(b, cc, cam * 0.15, cam * 0.45, t, cam);
    b.drawImage(cc.dist, cam, 0, W, H, 0, 0, W, H);
    if (g.gfx) { const hz = b.createLinearGradient(0, YO, 0, FEET); hz.addColorStop(0, "rgba(70,170,145,0.4)"); hz.addColorStop(0.65, "rgba(50,140,120,0.12)"); hz.addColorStop(1, "rgba(40,110,100,0)"); b.fillStyle = hz; b.fillRect(0, YO, W, FEET - YO); }
    drawDistrictDyn(b, cam);
    drawLife(b, cam, t, false);
    drawProps(b, cam);
    drawHauler(b, cam, t);
    drawPeds(b, cam, 0);
    drawNpcs(b, cam);
    drawDistrictFront(b, cam);
    drawPeds(b, cam, 1);
    drawLife(b, cam, t, true);
    vents(b, cam, [332, 846], t);
    drawFly(b, cam, t);
    for (let k = 0; k < 5; k++) { const x = ((k * 130 - cam * 0.8 + t * (4 + k)) % (W + 160) + W + 160) % (W + 160) - 80; glow(b, x, 120 + (k % 3) * 10, 70, "70,170,150", 0.14); }
    glow(b, g.px - cam, g.py - 12, 18, "255,190,120", 0.16);
    drawElias(b, g.px - cam, g.py, g.facing, eliasState(), g.walk, t);
    drawParts(b, cam);
    b.setTransform(SC, 0, 0, SC, 0, 0);
    waterPlane(b, rc, buf, rbuf, cam, t);
    rain(b, 1);
  } else if (g.loc === "pier") {
    b.setTransform(SC, 0, 0, SC, 0, -YO * SC);
    city(b, cc, cam * 0.12, cam * 0.4, t, cam, true);
    pierBack(b, cam, t);
    b.drawImage(cc.pier, cam, 0, W, H, 0, 0, W, H);
    drawPierDyn(b, cam);
    drawLife(b, cam, t, false);
    drawPeds(b, cam, 0);
    drawNpcs(b, cam);
    drawPierFront(b, cam);
    drawPeds(b, cam, 1);
    drawLife(b, cam, t, true);
    drawFly(b, cam, t);
    glow(b, g.px - cam, g.py - 12, 18, "255,190,120", 0.16);
    drawElias(b, g.px - cam, g.py, g.facing, eliasState(), g.walk, t);
    drawParts(b, cam);
    b.setTransform(SC, 0, 0, SC, 0, 0);
    waterPlane(b, rc, buf, rbuf, cam, t);
    rain(b, 0.85);
  } else if (g.loc === "lab") {
    b.drawImage(cc.lab, cam, 0, W, H, 0, 0, W, H);
    drawLabDyn(b, cam);
    drawNpcs(b, cam);
    glow(b, g.px - cam, g.py - 12, 18, "160,230,220", 0.14);
    drawElias(b, g.px - cam, g.py, g.facing, eliasState(), g.walk, t);
    reflect(b, rc, buf, rbuf, 0.22, [130, 330, 477], cam);
  } else {
    const bg = b.createLinearGradient(0, 0, 0, FEET); bg.addColorStop(0, "#050807"); bg.addColorStop(1, "#14302a");
    b.fillStyle = bg; b.fillRect(0, 0, W, H);
    b.drawImage(cc.mktB, Math.round(cam * 0.6), 0, W, H, 0, 0, W, H);
    b.drawImage(cc.mkt, cam, 0, W, H, 0, 0, W, H);
    drawMarketDyn(b, cam);
    drawLife(b, cam, t, false);
    drawNpcs(b, cam);
    drawMarketFront(b, cam);
    drawPeds(b, cam, 0);
    drawPeds(b, cam, 1);
    drawLife(b, cam, t, true);
    vents(b, cam, [600], t);
    glow(b, g.px - cam, g.py - 12, 18, "255,190,120", 0.18);
    drawElias(b, g.px - cam, g.py, g.facing, eliasState(), g.walk, t);
    reflect(b, rc, buf, rbuf, 0.2, [210, 420, 660], cam);
  }
  if (g.loc !== "district" && g.loc !== "pier") drawParts(b, cam);
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
type Port = { bg: string; skin: string; hair: string; coat: string; eye: string; st: number; ex: string; hs: string; sh: string; rim: string };
const PORTS: Record<string, Port> = {
  ELIAS: { bg: "#1a2a30", skin: "#d6a88c", hair: "#2c1c14", coat: "#1a1f29", eye: "#8ab0c0", st: 0, ex: "collar stubble", hs: "tousle", sh: "#a6a28a", rim: "#ffb466" },
  NOVA: { bg: "#2a1420", skin: "#c89a8a", hair: "#5ff0d8", coat: "#e0e4e4", eye: "#ffb04a", st: 1, ex: "visor", hs: "bob", sh: "#ff6f9a", rim: "#ff6f9a" },
  "UNKNOWN CALLER": { bg: "#101010", skin: "", hair: "", coat: "", eye: "", st: -1, ex: "", hs: "", sh: "", rim: "" },
  TERMINAL: { bg: "#06100c", skin: "", hair: "", coat: "", eye: "", st: -2, ex: "", hs: "", sh: "", rim: "" },
  INES: { bg: "#2a1a2a", skin: "#b08a70", hair: "#d8d8e0", coat: "#5a3a5a", eye: "#3a2a20", st: 2, ex: "shawl wrinkle", hs: "bun", sh: "#8a5a7a", rim: "#ffb04a" },
  DEX: { bg: "#2a1a10", skin: "#c09a80", hair: "#ff8a3d", coat: "#c8621f", eye: "#202020", st: 3, ex: "goggles pack", hs: "spiky", sh: "#2a2a30", rim: "#5ff0d8" },
  BRAM: { bg: "#101a2a", skin: "#c8a088", hair: "#202830", coat: "#2a3a4a", eye: "#202020", st: 5, ex: "cap", hs: "buzz", sh: "#3a4a5a", rim: "#7ac8ff" },
  LULU: { bg: "#2a2410", skin: "#d8a88c", hair: "#e86a8a", coat: "#e8c84a", eye: "#202020", st: 4, ex: "kid", hs: "pig", sh: "#3a5a8a", rim: "#ffd36b" },
  HIRO: { bg: "#2a1810", skin: "#c8a080", hair: "#202020", coat: "#e8e0d0", eye: "#202020", st: 5, ex: "headband", hs: "short", sh: "#d8d0c0", rim: "#ffb04a" },
  PIX: { bg: "#102a2a", skin: "#d0a890", hair: "#7ac8ff", coat: "#2a4a4a", eye: "#202020", st: 3, ex: "glasses", hs: "bob", sh: "#ffd36b", rim: "#3df5d0" },
  OYELO: { bg: "#2a1028", skin: "#8a5a40", hair: "#101010", coat: "#6a2a5a", eye: "#f0e0c0", st: 5, ex: "beard", hs: "bald", sh: "#ffb04a", rim: "#ffb04a" },
  TAM: { bg: "#1a2a1a", skin: "#b88a70", hair: "#909090", coat: "#3a4a3a", eye: "#202020", st: 2, ex: "wrinkle", hs: "short", sh: "#a0a060", rim: "#ffb04a" },
  SOL: { bg: "#1a1a14", skin: "#e0d4cc", hair: "#c8c0b0", coat: "#3a3428", eye: "#5ff0d8", st: 2, ex: "beard wrinkle", hs: "short", sh: "#5a4a3a", rim: "#5ff0d8" },
  JUNO: { bg: "#2a1810", skin: "#a87458", hair: "#1a1010", coat: "#6a3a2a", eye: "#202020", st: 4, ex: "headband", hs: "bun", sh: "#c85a2a", rim: "#ffb04a" },
  WREN: { bg: "#2a1a22", skin: "#e6dcd4", hair: "#2a1a20", coat: "#e8e4dc", eye: "#5ff0d8", st: 1, ex: "", hs: "bob", sh: "#dfe6e6", rim: "#ff6f9a" },
  "DR. VALE": { bg: "#101a24", skin: "#d8b8a0", hair: "#a8a8a8", coat: "#dcdcd4", eye: "#3a4a5a", st: 2, ex: "glasses wrinkle", hs: "bun", sh: "#5a6a7a", rim: "#7ac8ff" },
  KANE: { bg: "#101010", skin: "", hair: "", coat: "", eye: "", st: -1, ex: "", hs: "", sh: "", rim: "" },
  KEYPAD: { bg: "#120606", skin: "", hair: "", coat: "", eye: "", st: -2, ex: "", hs: "", sh: "", rim: "" },
  ARCHIVE: { bg: "#06100c", skin: "", hair: "", coat: "", eye: "", st: -2, ex: "", hs: "", sh: "", rim: "" },
  ROOK: { bg: "#1a1a2a", skin: "#a8a0b0", hair: "#8a6aaa", coat: "#2a2a3a", eye: "#7affc0", st: 0, ex: "headset", hs: "long", sh: "#3a3a50", rim: "#7affc0" },
};
function portrait(c: Ctx, x: number, y: number, s: number, who: string, t: number): void {
  const p = PORTS[who]; if (!p) return;
  const P = (i: number, j: number, w: number, h: number, col: string): void => { c.fillStyle = col; c.fillRect(x + i * s, y + j * s, w * s, h * s); };
  P(0, 0, 12, 12, p.bg);
  if (p.st === -2) { P(2, 2, 8, 7, "#1a2a24"); P(3, 3, 6, 5, "#0a1a12"); P(4, 4, 4, 1, "#5dff9a"); if (Math.sin(t * 6) > 0) P(4, 6, 3, 1, "#5dff9a"); P(5, 9, 2, 1, "#2a3a34"); P(3, 10, 6, 1, "#2a3a34"); return; }
  if (p.st === -1) { for (let k = 0; k < 40; k++) P(Math.floor(h1(k + Math.floor(t * 12)) * 12), Math.floor(h1(k * 3.1 + Math.floor(t * 12)) * 12), 1, 1, "#3a3a3a"); P(4, 3, 4, 5, "#050505"); P(3, 8, 6, 4, "#050505"); return; }
  const u = s / 2;
  const Q = (i: number, j: number, w: number, h: number, col: string): void => { c.fillStyle = col; c.fillRect(x + Math.round(i * u), y + Math.round(j * u), Math.ceil(w * u), Math.ceil(h * u)); };
  const has2 = (k: string): boolean => (" " + p.ex + " ").indexOf(" " + k + " ") >= 0;
  const kid = has2("kid"); const dy = kid ? 2 : 0;
  const skD = mixHex(p.skin, "#2a1830", 0.38); const skH = mixHex(p.skin, "#fff0e0", 0.18); const coD = mixHex(p.coat, "#04060a", 0.45); const coH = mixHex(p.coat, "#c8e0e0", 0.15);
  const hD = mixHex(p.hair, "#000000", 0.35); const hH = mixHex(p.hair, "#ffd0a0", 0.22); const cool = mixHex(p.bg, "#5fd8d0", 0.5);
  // backdrop: neon window, rain streaks
  Q(16, 0, 8, 24, mixHex(p.bg, p.rim, 0.14)); Q(20, 0, 4, 24, mixHex(p.bg, p.rim, 0.26)); Q(0, 0, 3, 24, mixHex(p.bg, "#5fd8d0", 0.12));
  for (let k = 0; k < 7; k++) { const ry = (h1(k * 3.3) * 24 + t * 14 * (1 + h1(k))) % 24; Q(Math.floor(h1(k * 1.7) * 24), ry, 0.5, 2, "rgba(190,235,230,0.25)"); }
  // shoulders + coat
  for (let j = 17 + dy; j < 24; j++) { const hw = 5.5 + (j - 17 - dy) * 1.1; Q(12 - hw, j, hw * 2, 1, p.coat); Q(12 - hw, j, hw * 0.55, 1, coD); Q(12 + hw - 1, j, 1, 1, mixHex(p.coat, p.rim, 0.5)); Q(12 - hw, j, 0.5, 1, cool); }
  for (let j = 17 + dy; j < 24; j++) { const wv = Math.max(0, (23 - j) * 0.7 + 1); Q(12.5 - wv / 2, j, wv, 1, p.sh); Q(12.5 - wv / 2 - 1, j, 1, 1, coH); Q(12.5 + wv / 2, j, 1, 1, coD); }
  if (has2("collar")) { Q(6, 14, 3, 6, p.coat); Q(6, 14, 1, 6, coD); Q(15, 14, 3, 6, coH); Q(17, 15, 1, 5, mixHex(p.coat, p.rim, 0.4)); }
  if (has2("shawl")) for (let j = 16 + dy; j < 21 + dy; j++) Q(5, j, 14, 1, (j % 2 === 0) ? p.sh : mixHex(p.sh, "#000000", 0.25));
  if (has2("pack")) Q(16, 18, 2, 6, "#2a2622");
  // neck
  Q(10, 14 + dy, 4, 4, skD); Q(12, 14 + dy, 2, 3, p.skin);
  // head (3/4 facing right)
  const rows = [[9, 14], [8, 15], [7, 16], [7, 16], [7, 16], [7, 16], [7, 16], [7, 16], [8, 16], [8, 15], [9, 15], [10, 13]];
  rows.forEach((r: number[], k: number) => { const a = r[0] ?? 7; const b2 = r[1] ?? 16; const j = 4 + k + dy; Q(a, j, b2 - a, 1, p.skin); Q(a, j, 2, 1, skD); Q(b2 - 1, j, 1, 1, mixHex(p.skin, p.rim, 0.5)); if (k > 1 && k < 9) Q(a + 2, j, 1, 1, mixHex(p.skin, skD, 0.5)); });
  Q(12, 5 + dy, 3, 1, skH); Q(14, 9 + dy, 1, 1, skH);
  Q(7, 8 + dy, 1, 3, skD); Q(6, 9 + dy, 1, 2, skD);
  const blink = (t % 4.3) < 0.13;
  if (blink) { Q(9, 9 + dy, 2, 1, skD); Q(13, 9 + dy, 2, 1, skD); }
  else { Q(9, 9 + dy, 2, 1, "#e8e0d8"); Q(10, 9 + dy, 1, 1, p.eye); Q(13, 9 + dy, 2, 1, "#e8e0d8"); Q(14, 9 + dy, 1, 1, p.eye); Q(9, 8 + dy, 2, 1, skD); Q(13, 8 + dy, 2, 1, skD); }
  Q(9, 7 + dy, 2, 1, hD); Q(13, 7 + dy, 2, 1, hD);
  Q(13, 10 + dy, 1, 2, skD); Q(14, 11 + dy, 1, 1, skD); Q(12, 12 + dy, 1, 1, skD);
  Q(11, 13 + dy, 3, 1, mixHex(p.skin, "#5a2028", 0.45)); Q(8, 11 + dy, 1, 2, skD);
  if (has2("wrinkle")) { Q(9, 11 + dy, 1, 1, skD); Q(14, 12 + dy, 1, 1, skD); Q(10, 6 + dy, 4, 1, mixHex(p.skin, skD, 0.5)); }
  if (has2("stubble")) { Q(8, 12 + dy, 8, 3, mixHex(p.skin, p.hair, 0.32)); Q(11, 13 + dy, 3, 1, mixHex(p.skin, "#5a2028", 0.45)); }
  if (has2("beard")) { Q(8, 11 + dy, 8, 5, p.hair); Q(9, 15 + dy, 5, 1, p.hair); Q(11, 13 + dy, 3, 1, "#3a1a18"); Q(15, 12 + dy, 1, 2, hH); }
  // hair
  const hs = p.hs;
  if (hs === "long") { Q(5, 4 + dy, 3, 13, p.hair); Q(5, 4 + dy, 1, 13, hD); Q(16, 5 + dy, 2, 9, p.hair); }
  if (hs === "bob") { Q(5, 4 + dy, 3, 10, p.hair); Q(16, 5 + dy, 2, 8, p.hair); Q(5, 13 + dy, 3, 1, hD); }
  if (hs === "pig") { Q(3, 6 + dy, 3, 6, p.hair); Q(19, 6 + dy, 3, 6, p.hair); Q(5, 6 + dy, 1, 2, p.sh); Q(18, 6 + dy, 1, 2, p.sh); }
  if (hs === "bun") { Q(4, 1 + dy, 5, 4, p.hair); Q(5, 1 + dy, 2, 1, hH); }
  if (hs !== "bald") {
    const th = hs === "buzz" ? 1 : 2;
    Q(7, 4 + dy - th, 10, th + 1, p.hair); Q(6, 4 + dy, 2, hs === "buzz" ? 3 : 5, p.hair); Q(8, 4 + dy - th, 5, 1, hH);
    if (hs === "tousle") { Q(8, 1 + dy, 2, 1, p.hair); Q(11, 1 + dy, 3, 1, p.hair); Q(15, 2 + dy, 2, 2, p.hair); Q(13, 5 + dy, 3, 1, p.hair); Q(15, 6 + dy, 1, 1, p.hair); Q(10, 2 + dy, 3, 1, hH); Q(16, 3 + dy, 1, 2, mixHex(p.hair, p.rim, 0.45)); Q(6, 3 + dy, 1, 2, hD); }
    if (hs === "spiky") for (let k = 0; k < 5; k++) Q(7 + k * 2, (k % 2 ? 0 : 1) + dy, 1, 2, p.hair);
    if (hs === "bob" || hs === "long") { Q(12, 5 + dy, 5, 1, p.hair); Q(16, 4 + dy, 1, 3, p.hair); }
    if (hs === "short") Q(16, 4 + dy, 1, 2, p.hair);
  } else { Q(9, 4 + dy, 4, 1, skH); }
  if (has2("cap")) { Q(6, 1 + dy, 12, 4, "#1a2636"); Q(12, 4 + dy, 7, 1, "#101820"); Q(11, 2 + dy, 2, 1, "#d8c84a"); Q(6, 1 + dy, 2, 4, "#101820"); }
  if (has2("goggles")) { Q(7, 4 + dy, 10, 1, "#1a1a1a"); Q(9, 3 + dy, 3, 2, "#3df5d0"); Q(13, 3 + dy, 3, 2, "#3df5d0"); Q(10, 3 + dy, 1, 1, "#c8fff0"); }
  if (has2("headband")) { Q(7, 5 + dy, 10, 1, "#c23a4e"); Q(6, 5 + dy, 1, 3, "#c23a4e"); }
  if (has2("glasses")) { Q(8, 9 + dy, 3, 1, "#7ac8ff"); Q(12, 9 + dy, 3, 1, "#7ac8ff"); Q(11, 9 + dy, 1, 1, "#333344"); }
  if (has2("visor")) { Q(8, 8 + dy, 9, 2, "#ffb04a"); Q(9, 8 + dy, 6, 1, "#ffe0a0"); }
  if (has2("headset")) { Q(6, 8 + dy, 2, 4, "#7affc0"); Q(8, 12 + dy, 3, 1, "#7affc0"); }
  c.globalAlpha = 0.3; Q(15, 4 + dy, 2, 12, p.rim); c.globalAlpha = 0.18; Q(6, 4 + dy, 2, 12, "#5fd8d0"); c.globalAlpha = 1;
}
const SPK: Record<string, string> = { ELIAS: "#9fd8ff", NOVA: "#ff8fb5", "UNKNOWN CALLER": "#c8c8c8", INES: "#e8b0d8", DEX: "#ff9a4d", BRAM: "#9fc0ff", LULU: "#ffd36b", HIRO: "#ffb35c", PIX: "#7ae8ff", OYELO: "#ffcf7a", TAM: "#b8d0a0", ROOK: "#c8a8ff", TERMINAL: "#5dff9a", SOL: "#cfe8d8", JUNO: "#ffb35c", WREN: "#ff9ac0", "DR. VALE": "#9fd0ff", KANE: "#d8d0c0", KEYPAD: "#ff7a6a", ARCHIVE: "#5dff9a" };
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
// camera view into the render buffer; the apartment is framed closer so the room reads at Elias's scale
const APTZ = 1.6;
function calcView(): { sx: number; sy: number; z: number } {
  const g = G; const live = g.scene === "play" || g.scene === "cut";
  const apt = g.loc === "apt" && (g.scene === "play" || (g.scene === "cut" && g.sceneT >= 8));
  const z = (live ? Math.max(1, g.zoom) : 1) * (apt ? APTZ : 1);
  const sw = W / z; const sh = H / z;
  const fx = g.scene === "cut" ? 100 - Math.round(g.cam) : g.px - Math.round(g.cam);
  const sx = clamp(fx - sw / 2, 0, W - sw);
  const sy = apt ? clamp(FEET - sh * 0.84, 0, H - sh) : clamp(FEET - YO - 24 - sh * 0.55, 0, H - sh);
  g.view = { sx, sy, z };
  return g.view;
}
function overlayHi(c: Ctx, cw: number, ch: number, dpr: number, mono: string, inset: number, top: boolean): void {
  const g = G; const cssH = ch / dpr;
  const fsB = Math.round(clamp(cssH * 0.055, 15, 20) * dpr);
  const fsS = Math.round(clamp(cssH * 0.045, 13, 16) * dpr);
  c.textAlign = "left"; c.textBaseline = "alphabetic"; c.shadowBlur = 0;
  const v = g.view; const cam = Math.round(g.cam);
  const toX = (wx: number): number => ((wx - cam - v.sx) * v.z / W) * cw;
  const toY = (wy: number): number => ((wy - YO - v.sy) * v.z / H) * ch;
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
    if (T > 3.2 && T < 7.5) {
      const a = clamp((T - 3.2) / 0.7, 0, 1) * clamp((7.5 - T) / 0.5, 0, 1);
      c.globalAlpha = a; c.textAlign = "center"; c.textBaseline = "middle";
      const s1 = "LOS ANGELES"; const n1 = Math.floor(clamp((T - 3.2) * 8, 0, s1.length));
      c.font = `bold ${Math.round(clamp(cssH * 0.08, 20, 40) * dpr)}px ${mono}`; c.fillStyle = "#fff0d8"; c.shadowColor = "#5ff0d8"; c.shadowBlur = 8 * dpr;
      c.fillText(s1.slice(0, n1), cw / 2, ch * 0.42);
      if (T > 4.6) { c.font = `${fsB}px ${mono}`; c.fillStyle = "#ffb04a"; c.fillText("2049".slice(0, Math.floor((T - 4.6) * 6)), cw / 2, ch * 0.54); }
      c.shadowBlur = 0; c.globalAlpha = 1; c.textAlign = "left";
    }
    if (!g.dlg && T < 11) { c.font = `${fsS}px ${mono}`; c.fillStyle = "rgba(220,240,235,0.7)"; c.textAlign = "right"; c.textBaseline = "bottom"; c.fillText("tap to skip", cw - 10 * dpr, ch - 10 * dpr); c.textAlign = "left"; }
    if (g.ringing && !g.dlg) tag(c, "☎ RING", toX(108), toY(104), fsS, "#ff8a8a", mono);
  }
  if (g.scene === "vis") {
    const T = g.sceneT; const sub = visionText(T);
    c.font = `${fsB}px ${mono}`; const ls = wrapText(c, sub, cw * 0.86); c.textAlign = "center"; c.textBaseline = "middle";
    ls.forEach((ln: string, i: number) => { const y = ch * 0.8 + i * fsB * 1.4; c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(cw * 0.05, y - fsB * 0.75, cw * 0.9, fsB * 1.5); c.fillStyle = "#fff0d8"; c.fillText(ln, cw / 2, y); });
    if (T > 2) { c.font = `${fsS}px ${mono}`; c.fillStyle = "rgba(220,240,235,0.7)"; c.textAlign = "right"; c.textBaseline = "bottom"; c.fillText("tap to continue", cw - 10 * dpr, ch - 10 * dpr); }
    c.textAlign = "left";
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
      const oi = objInfo(); const txt = "» " + oi.text;
      const tw = c.measureText(txt).width; const m = 8 * dpr;
      c.fillStyle = "rgba(2,10,12,0.7)"; c.fillRect(m, m, tw + fsS, fsS * 1.9);
      c.fillStyle = "#ffd8a0"; c.fillText(txt, m + fsS / 2, m + fsS * 0.95);
      const fh = Math.round(fsS * 0.9); c.font = `${fh}px ${mono}`;
      let hintW = 0; const hl = g.near ? [] : wrapText(c, oi.hint, Math.min(cw * 0.62, 420 * dpr));
      let hy = m + fsS * 2.05;
      if (hl.length) {
        const hw = Math.max(...hl.map((l: string) => c.measureText(l).width)) + fsS; hintW = hw;
        c.fillStyle = "rgba(2,10,12,0.55)"; c.fillRect(m, hy, hw, hl.length * fh * 1.3 + fh * 0.5);
        c.fillStyle = "#a8e0d4"; hl.forEach((l: string, i: number) => c.fillText(l, m + fsS / 2, hy + fh * 0.9 + i * fh * 1.3));
        hy += hl.length * fh * 1.3 + fh * 0.7;
      }
      c.font = `${fsS}px ${mono}`;
      const cr = "¤ " + g.credits; const cwd = c.measureText(cr).width;
      c.fillStyle = "rgba(2,10,12,0.65)"; c.fillRect(m, hy, cwd + fsS, fsS * 1.7); c.fillStyle = "#ffd36b"; c.fillText(cr, m + fsS / 2, hy + fsS * 0.85);
      const tgx = objTargetX();
      if (tgx !== null && g.fadeTo === 0) {
        const X = toX(tgx);
        if (X > cw - 24 * dpr || X < 24 * dpr) {
          const right = X > cw / 2; c.globalAlpha = 0.55 + Math.sin(g.t * 5) * 0.35; c.font = `bold ${fsB}px ${mono}`; c.fillStyle = "#ffb04a"; c.textAlign = right ? "right" : "left";
          c.fillText(right ? "▶▶" : "◀◀", right ? cw - 8 * dpr : 8 * dpr, toY(FEET - 30)); c.textAlign = "left"; c.globalAlpha = 1; c.font = `${fsS}px ${mono}`;
        }
      }
      // labels sit above the tallest head nearby and never overlap each other or the HUD
      const hudB = hy + fsS * 1.9; const hudW = Math.max(tw + fsS, cwd + fsS, hintW) + m;
      const placed: number[][] = [];
      if (g.toast) placed.push([0, ch * 0.22 - 2 * dpr, cw, fsS * 2 + 4 * dpr]);
      const headTop = (wx: number, wy: number): number => {
        let tp = wy;
        if (Math.abs(g.px - wx) < 14) tp = Math.min(tp, g.py - 33);
        for (const o of g.npcs) if (o.loc === g.loc && Math.abs(o.x - wx) < 14) tp = Math.min(tp, o.y - o.look.h - 3);
        for (const pd of g.peds) if (pd.loc === g.loc && pd.lane === 1 && Math.abs(pd.x - wx) < 12) tp = Math.min(tp, FEET - pd.look.h - (pd.kind === "umb" || pd.kind === "neon" ? 9 : 3));
        return tp;
      };
      const hit = (r: number[], q: number[]): boolean => (r[0] ?? 0) < (q[0] ?? 0) + (q[2] ?? 0) && (q[0] ?? 0) < (r[0] ?? 0) + (r[2] ?? 0) && (r[1] ?? 0) < (q[1] ?? 0) + (q[3] ?? 0) && (q[1] ?? 0) < (r[1] ?? 0) + (r[3] ?? 0);
      const place = (cx: number, bottom: number, w: number, h: number, must: boolean): number[] | null => {
        const g2 = 3 * dpr; const ys = [bottom - h]; for (const q of placed) { const ny = (q[1] ?? 0) - g2 - h; if (ny < bottom - h) ys.push(ny); }
        const cands: number[][] = [];
        for (const y of ys) for (const dx of [0, -0.55, 0.55, -1.1, 1.1, -1.7, 1.7, -2.4, 2.4]) { const x = clamp(cx - w / 2 + dx * w, 4, cw - w - 4); cands.push([x, Math.max(4, y), (bottom - h - y) + Math.abs(x - (cx - w / 2)) * 0.7]); }
        cands.sort((a2: number[], b2: number[]) => (a2[2] ?? 0) - (b2[2] ?? 0));
        const ok = (x: number, y: number): boolean => !(x < hudW && y < hudB) && !placed.some((q: number[]) => hit([x, y, w, h], [(q[0] ?? 0) - g2, (q[1] ?? 0) - g2, (q[2] ?? 0) + g2 * 2, (q[3] ?? 0) + g2 * 2]));
        const fit = cands.find((k2: number[]) => (must || Math.abs((k2[0] ?? 0) + w / 2 - cx) <= w * 0.75) && ok(k2[0] ?? 0, k2[1] ?? 0)); if (!fit && !must) return null;
        const best = fit ?? cands[0] ?? [cx - w / 2, bottom - h];
        const out = [best[0] ?? 0, best[1] ?? 0, w, h]; placed.push(out); return out;
      };
      const n = nearest();
      if (n && g.fadeTo === 0) {
        const lab = n.id === "window" ? "Look · Window" : n.kind === "ACCESS" ? (n.label ? "Access " + n.label.toLowerCase() : "Access terminal") : (KL[n.kind] + (n.label ? " · " + n.label : ""));
        c.font = `bold ${fsS}px ${mono}`; const lw2 = c.measureText(lab).width + fsS * 1.2; const lh = fsS * 1.8;
        const bob = Math.sin(g.t * 4) * 1.5 * dpr;
        const wy = n.kind === "SPEAK" ? headTop(n.x, n.y + 10) : Math.min(n.y, headTop(n.x, n.y));
        const r = place(toX(n.x), toY(wy) - 4 * dpr + bob, lw2, lh, true) ?? [0, 0];
        tag(c, lab, (r[0] ?? 0) + lw2 / 2, r[1] ?? 0, fsS, "#ffb04a", mono);
      }
      const talkers = g.npcs.filter((o: Npc) => o.loc === g.loc && o.bubbleT > 0 && !!o.bubble).sort((a2: Npc, b2: Npc) => Math.abs(a2.x - g.px) - Math.abs(b2.x - g.px));
      for (const np of talkers) {
        c.font = `${fsS}px ${mono}`; const nh = fsS * 1.1;
        let ls: string[] = []; let bw = 0; let bh = 0; let r: number[] | null = null;
        for (const ww of [130, 230]) {
          ls = wrapText(c, np.bubble, ww * dpr); bw = Math.max(...ls.map((l: string) => c.measureText(l).width)) + fsS;
          bh = ls.length * fsS * 1.3 + fsS * 0.6;
          r = place(toX(np.x), toY(headTop(np.x, np.y - np.look.h - 3)) - 4 * dpr, bw, bh + nh, false); if (r) break;
        }
        if (!r) continue;
        const bx = r[0] ?? 0; const by = (r[1] ?? 0) + nh;
        c.fillStyle = "rgba(240,236,224,0.92)"; c.fillRect(bx, by, bw, bh);
        c.fillStyle = "#101418"; c.textBaseline = "top"; ls.forEach((l: string, i: number) => c.fillText(l, bx + fsS / 2, by + fsS * 0.3 + i * fsS * 1.3));
        c.font = `bold ${Math.round(fsS * 0.8)}px ${mono}`; c.fillStyle = "rgba(4,10,14,0.82)"; c.fillRect(bx, by - nh, c.measureText(np.name).width + fsS * 0.6, nh); c.fillStyle = "#e8e0d0"; c.fillText(np.name, bx + fsS * 0.3, by - nh + fsS * 0.1);
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
    c.font = `${fsS}px ${mono}`; c.fillStyle = "#9ff0d8"; c.fillText(g.flags.m2done ? "MISSION 002 COMPLETE · MISSION 003 UNLOCKED" : "MISSION 001 COMPLETE · MISSION 002 UNLOCKED", cw / 2, ch * 0.3);
    if (g.flags.m2done) { c.fillStyle = "#ffd27a"; c.fillText("Next: A CITY WITHOUT SUNLIGHT", cw / 2, ch * 0.3 + fsS * 1.8); }
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
    const mk2 = (w: number, h: number): HTMLCanvasElement => { const e = document.createElement("canvas"); e.width = w; e.height = h; return e; };
    const cc: Caches = makeCaches(mk2);
    const fgc = mk(W); const bl0 = mk2(160, 90); const bl1 = mk2(80, 45); const bl2 = mk2(80, 45); const bl3 = mk2(20, 12);
    const b = buf.getContext("2d"); const rc = rbuf.getContext("2d");
    if (!ctx || !b || !rc) return;
    const fx2 = fgc.getContext("2d"); const bx0 = bl0.getContext("2d"); const bx1 = bl1.getContext("2d"); const bx2 = bl2.getContext("2d"); const bx3 = bl3.getContext("2d");
    const grain = mk2(96, 96); const gctx = grain.getContext("2d");
    if (gctx) { const id = gctx.createImageData(96, 96); for (let i = 0; i < id.data.length; i += 4) { const v = Math.floor(Math.random() * 255); id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 255; } gctx.putImageData(id, 0, 0); }
    const grainPat = ctx.createPattern(grain, "repeat");
    let raf = 0; let last = performance.now(); let seen = -1; let ovNow = false;
    const loop = (now: number): void => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      const vv = window.visualViewport;
      const vh = vv ? vv.height : window.innerHeight; const vw = vv ? vv.width : window.innerWidth;
      const coarse = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
      const isOv = vw > vh && vh < 600 && (coarse || vh < 480);
      const avail = Math.max(240, wrap.clientWidth);
      let dw = 0; let dh = 0; let lw = 320;
      if (isOv) { dh = Math.max(170, Math.floor(vh - 10)); dw = Math.floor(Math.min(avail, dh * 16 / 9)); dh = Math.floor(dw * 9 / 16); }
      else if (avail < 560) { lw = 240; dw = Math.floor(avail); dh = Math.floor(dw * 3 / 4); }
      else { dw = Math.floor(Math.min(avail, Math.max(480, vh * 0.66 * 16 / 9))); dh = Math.floor(dw * 9 / 16); }
      const sc2 = G.gfx ? 2 : 1;
      if (lw !== W || sc2 !== SC || buf.width !== lw * sc2) { W = lw; SC = sc2; PG = 1 / sc2; buf.width = W * SC; buf.height = H * SC; rbuf.width = W * SC; rbuf.height = H * SC; fgc.width = W; b.imageSmoothingEnabled = false; rc.imageSmoothingEnabled = false; }
      if (isOv !== ovNow) { ovNow = isOv; setOv(isOv); }
      const dpr = Math.min(G.gfx ? 3 : 2, window.devicePixelRatio || 1);
      const pw = Math.floor(dw * dpr); const ph = Math.floor(dh * dpr);
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; cv.style.width = dw + "px"; cv.style.height = dh + "px"; }
      update(dt);
      b.setTransform(SC, 0, 0, SC, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = "source-over";
      render(b, rc, buf, rbuf, cc);
      const { sx, sy, z } = calcView(); const sw = W / z; const sh = H / z;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf, sx * SC, sy * SC, sw * SC, sh * SC, 0, 0, cv.width, cv.height);
      if (G.gfx && bx0 && bx1 && bx2 && bx3) {
        bx0.globalCompositeOperation = "copy"; bx0.imageSmoothingEnabled = true; bx0.drawImage(buf, sx * SC, sy * SC, sw * SC, sh * SC, 0, 0, 160, 90);
        bx1.globalCompositeOperation = "copy"; bx1.imageSmoothingEnabled = true; bx1.drawImage(bl0, 0, 0, 80, 45);
        bx2.globalCompositeOperation = "copy"; bx2.drawImage(bl1, 0, 0); bx2.globalCompositeOperation = "multiply"; for (let k = 0; k < BLOOM.n; k++) bx2.drawImage(bl1, 0, 0);
        bx3.globalCompositeOperation = "copy"; bx3.imageSmoothingEnabled = true; bx3.drawImage(bl2, 0, 0, 20, 12);
        ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = BLOOM.a0; ctx.drawImage(bl2, 0, 0, cv.width, cv.height);
        ctx.globalAlpha = BLOOM.a1; ctx.drawImage(bl3, 0, 0, cv.width, cv.height);
        ctx.restore();
      }
      const inWorld = G.scene === "play" || G.scene === "end" || (G.scene === "cut" && G.sceneT >= 8);
      if (inWorld && fx2) { drawFg(fx2, cc); ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(fgc, sx, sy, sw, sh, 0, 0, cv.width, cv.height); ctx.restore(); }
      if (G.gfx && grainPat) {
        const gs = Math.max(1, Math.round(dpr)); const ox = Math.floor(Math.random() * 96); const oy = Math.floor(Math.random() * 96);
        ctx.save(); ctx.globalAlpha = 0.09; ctx.globalCompositeOperation = "overlay"; ctx.setTransform(gs, 0, 0, gs, -ox * gs, -oy * gs); ctx.fillStyle = grainPat; ctx.fillRect(ox, oy, cv.width / gs + 1, cv.height / gs + 1); ctx.restore();
      }
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
      if (G.scene !== "play" && G.scene !== "cut") { if ((k === "e" || k === "E" || k === "Enter" || k === " ") && (G.scene === "glitch" || G.scene === "vis")) G.actQ = true; return; }
      if (k === "Escape") { G.panel = G.panel === "none" ? "pause" : "none"; G.rev++; return; }
      if (k === "Tab") { G.panel = G.panel === "bag" ? "none" : "bag"; G.rev++; return; }
      if (k === "j" || k === "J") { G.panel = G.panel === "journal" ? "none" : "journal"; G.rev++; return; }
      if (G.panel !== "none") return;
      if (k === "ArrowLeft" || k === "a" || k === "A") { KEYS.left = true; syncDir(); }
      if (k === "ArrowRight" || k === "d" || k === "D") { KEYS.right = true; syncDir(); }
      if (k === "Shift") { G.run = true; G.rev++; }
      if (k === " " || k === "ArrowUp" || k === "w" || k === "W") { if (!e.repeat) G.jumpQ = true; G.jumpHeld = true; }
      if ((k === "e" || k === "E" || k === "Enter") && !e.repeat) G.actQ = true;
      const d = G.dlg; const ln = d ? d.lines[d.i] : undefined;
      if (d && d.waiting && ln && ln.choices && k >= "1" && k <= "9") choose(Number(k) - 1);
    };
    const ku = (e: KeyboardEvent): void => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") { KEYS.left = false; syncDir(); }
      if (k === "ArrowRight" || k === "d" || k === "D") { KEYS.right = false; syncDir(); }
      if (k === " " || k === "ArrowUp" || k === "w" || k === "W") G.jumpHeld = false;
      if (k === "Shift") { G.run = false; G.rev++; }
    };
    const bl = (): void => { KEYS.left = false; KEYS.right = false; PADS.clear(); JUMP_ID = -1; G.jumpHeld = false; syncDir(); };
    const pu = (e: Event): void => { const id = (e as unknown as { pointerId?: number }).pointerId ?? -1; if (PADS.delete(id)) syncDir(); if (id === JUMP_ID) { JUMP_ID = -1; G.jumpHeld = false; } };
    const vis = (): void => { if (document.hidden) bl(); };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); window.addEventListener("blur", bl);
    window.addEventListener("pointerup", pu); window.addEventListener("pointercancel", pu); document.addEventListener("visibilitychange", vis);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("blur", bl); window.removeEventListener("pointerup", pu); window.removeEventListener("pointercancel", pu); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const noCtx = (e: MouseEvent<HTMLElement>): void => { e.preventDefault(); };
  const tapCanvas = (e: PointerEvent<HTMLCanvasElement>): void => { e.preventDefault(); audioInit(); if ((g.scene === "play" && g.dlg) || g.scene === "cut" || g.scene === "glitch" || g.scene === "vis") g.actQ = true; };
  const noSel: CSSProperties = { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "none", WebkitTapHighlightColor: "transparent" };
  const big: CSSProperties = { ...noSel, minWidth: 72, height: 64, padding: "0 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.border.default}`, background: theme.bg.elevated, color: theme.text.primary, fontFamily: theme.font.mono, fontSize: 17, fontWeight: theme.weight.semibold, cursor: "pointer", opacity: ov ? 0.82 : 1 };
  const small: CSSProperties = { ...noSel, minHeight: 46, padding: "0 12px", borderRadius: theme.radius.md, border: `1px solid ${theme.border.default}`, background: theme.bg.elevated, color: theme.text.primary, fontFamily: theme.font.mono, fontSize: 13, cursor: "pointer", opacity: ov ? 0.85 : 1 };
  const active: CSSProperties = { background: theme.fill.accent, color: theme.text.onColor, border: `1px solid ${theme.fill.accent}` };
  const wide: CSSProperties = { ...small, width: "100%", minHeight: 52, fontSize: 15, marginTop: 8, textAlign: "left", opacity: 1 };
  const dis: CSSProperties = { opacity: 0.4, cursor: "default" };

  const padSet = (e: PointerEvent<HTMLDivElement>, down: boolean): void => {
    const id = e.nativeEvent.pointerId;
    if (!down) { if (PADS.delete(id)) { syncDir(); bump(); } return; }
    const r = e.currentTarget.getBoundingClientRect();
    const side: "left" | "right" = e.clientX < r.left + r.width / 2 ? "left" : "right";
    if (PADS.get(id) !== side) { PADS.set(id, side); syncDir(); bump(); }
  };
  const dpad = (
    <div key="dpad" role="group" aria-label="Walk left or right" onContextMenu={noCtx}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => { e.preventDefault(); audioInit(); try { e.currentTarget.setPointerCapture(e.nativeEvent.pointerId); } catch { /* ignore */ } padSet(e, true); }}
      onPointerMove={(e: PointerEvent<HTMLDivElement>) => { if (PADS.has(e.nativeEvent.pointerId)) padSet(e, true); }}
      onPointerUp={(e: PointerEvent<HTMLDivElement>) => padSet(e, false)}
      onPointerCancel={(e: PointerEvent<HTMLDivElement>) => padSet(e, false)}
      style={{ ...noSel, display: "flex", borderRadius: theme.radius.lg, border: `1px solid ${theme.border.default}`, overflow: "hidden", opacity: ov ? 0.82 : 1, cursor: "pointer" }}>
      {(["left", "right"] as const).map((s: "left" | "right") => (
        <div key={s} style={{ width: 80, height: 64, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontFamily: theme.font.mono, background: g[s] ? theme.fill.accent : theme.bg.elevated, color: g[s] ? theme.text.onColor : theme.text.primary, borderLeft: s === "right" ? `1px solid ${theme.border.default}` : "none" }}>{s === "left" ? "◀" : "▶"}</div>
      ))}
    </div>
  );
  const nearT = g.scene === "play" && !g.dlg ? nearest() : null;
  const actLabel = g.dlg ? "NEXT" : nearT ? nearT.kind : "ACT";
  const actBtn = (
    <button key="act" style={{ ...big, minWidth: 104, fontSize: 15, ...(g.dlg || nearT ? active : {}) }} onContextMenu={noCtx}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => { e.preventDefault(); audioInit(); if (g.panel === "none") g.actQ = true; }}>{actLabel}</button>
  );
  const jumpBtn = (
    <button key="jump" style={big} onContextMenu={noCtx}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => { e.preventDefault(); audioInit(); if (g.panel === "none") { if (g.dlg) g.actQ = true; else { g.jumpQ = true; g.jumpHeld = true; JUMP_ID = e.nativeEvent.pointerId; } } }}
      onPointerUp={() => { g.jumpHeld = false; JUMP_ID = -1; }} onPointerCancel={() => { g.jumpHeld = false; JUMP_ID = -1; }}>JUMP</button>
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
  ) : g.scene === "vis" ? (
    <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}><button style={big} onClick={() => { endVision(); bump(); }}>SKIP ▸▸</button></div>
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
  const volRow = (label: string, key: "music" | "sfx" | "amb") => (
    <div style={{ ...rowS, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 120px" }}>{label}</div>
      <button style={{ ...small, minWidth: 52, fontSize: 20 }} onClick={() => { g[key] = Math.max(0, Math.round((g[key] - 0.1) * 10) / 10); applyVol(); saveSettings(); blip(); bump(); }}>−</button>
      <div style={{ width: 90, height: 10, borderRadius: 5, background: theme.fill.secondary, overflow: "hidden" }}><div style={{ width: `${g[key] * 100}%`, height: "100%", background: theme.fill.accent }} /></div>
      <button style={{ ...small, minWidth: 52, fontSize: 20 }} onClick={() => { g[key] = Math.min(1, Math.round((g[key] + 0.1) * 10) / 10); applyVol(); saveSettings(); blip(); bump(); }}>+</button>
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
        {open && id === "valelog" && <button style={{ ...wide, ...active }} onClick={() => { g.panel = "none"; say(valeLog(), null, true); bump(); }}>▶ PLAY MEMO</button>}
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
            <div style={sub}>{g.obj < OBJ.length ? (g.obj >= M1N ? "Mission 002 · " : "") + "Objective: " + (OBJ[g.obj] ?? "") + ". " + objInfo().hint : "Mission 002 complete. Mission 003: A City Without Sunlight is next."}</div>
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
            {volRow("Ambience (rain, city)", "amb")}
            <div style={rowS}>
              <div style={{ marginBottom: 6 }}>Graphics</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Low", "High"].map((l: string, i: number) => (
                  <button key={l} style={{ ...small, flex: "1 1 80px", ...(g.gfx === i ? active : {}) }} onClick={() => { g.gfx = i; saveSettings(); blip(); bump(); }}>{l}</button>
                ))}
              </div>
              <div style={{ ...sub, marginTop: 6 }}>Low turns off bloom, bokeh, haze and film grain for smoother play on older phones.</div>
            </div>
            <div style={rowS}>
              <div style={{ marginBottom: 6 }}>Text speed</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Slow", "Normal", "Fast"].map((l: string, i: number) => (
                  <button key={l} style={{ ...small, flex: "1 1 80px", ...(g.textSpeed === i ? active : {}) }} onClick={() => { g.textSpeed = i; saveSettings(); blip(); bump(); }}>{l}</button>
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
            <div style={rowS}><div style={sub}>Playable: Mission 001, Ghosts in the Rain, and Mission 002, The Forgotten Ones.</div></div>
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
              const unlocked = mi === 0 || (mi === 1 && g.m2) || (mi === 2 && !!g.flags.m2done);
              return (
                <div key={m} style={rowS}>
                  <div style={{ fontWeight: theme.weight.semibold, color: unlocked ? theme.text.primary : theme.text.tertiary }}>{(unlocked ? "MISSION " : "🔒 MISSION ") + m}</div>
                  {(mi === 0 || (mi === 1 && g.m2)) && OBJ.slice(mi === 0 ? 0 : M1N, mi === 0 ? M1N : OBJ.length).map((o: string, k: number) => { const oi = k + (mi === 0 ? 0 : M1N); return (
                    <div key={o} style={{ ...sub, color: oi === g.obj ? theme.text.primary : theme.text.secondary }}>{(oi < g.obj ? "✓ " : oi === g.obj ? "▸ " : "· ") + (k + 1) + ". " + o}</div>
                  ); })}
                  {((mi === 0 && g.obj < M1N) || (mi === 1 && g.m2 && g.obj >= M1N && g.obj < OBJ.length)) && <div style={{ ...sub, marginTop: 4, fontStyle: "italic" }}>Next: {objInfo().hint}</div>}
                  {mi === 1 && g.m2 && g.obj >= OBJ.length && <div style={sub}>Complete.</div>}
                  {mi === 1 && g.m2 && <button style={wide} onClick={() => { blip(); startM2(); bump(); }}>{g.obj >= M1N ? "↺ REPLAY MISSION 002" : "▸ PLAY MISSION 002"}</button>}
                  {mi === 2 && g.flags.m2done && <div style={sub}>Unlocked. Coming in the next chapter.</div>}
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
      <div style={{ display: "flex", gap: 8 }}>{dpad}</div>
      <div style={{ display: "flex", gap: 8 }}>{jumpBtn}{actBtn}</div>
    </div>
  );
  const rootS: CSSProperties = { ...noSel, touchAction: "manipulation", position: "relative", background: theme.bg.base, color: theme.text.primary, fontFamily: theme.font.family, paddingTop: ov ? "max(4px, env(safe-area-inset-top))" : 10, paddingBottom: "max(" + (ov ? 4 : 10) + "px, env(safe-area-inset-bottom))", paddingLeft: "max(" + (ov ? 4 : 10) + "px, env(safe-area-inset-left))", paddingRight: "max(" + (ov ? 4 : 10) + "px, env(safe-area-inset-right))", boxSizing: "border-box", width: "100%", minHeight: 420 };
  const below = g.scene === "menu" ? menuBtns : sceneBtns ? sceneBtns : choiceBtns ? choiceBtns : moveRow;

  return (
    <div onContextMenu={noCtx} onPointerDown={() => audioInit()} onPointerUp={() => audioInit()} onClick={() => audioInit()} style={rootS}>
      {!ov && playing && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>{sysBtns}</div>}
      <div ref={wrapRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", lineHeight: 0 }}>
          <canvas ref={canvasRef} onPointerDown={tapCanvas} onContextMenu={noCtx} style={{ ...noSel, display: "block", imageRendering: "pixelated", borderRadius: theme.radius.md, border: `1px solid ${theme.border.default}`, cursor: "pointer" }} />
          {ov && playing && !g.dlg && <div style={{ position: "absolute", top: 6, right: "max(6px, env(safe-area-inset-right))", display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: "62%", lineHeight: "normal" }}>{sysBtns}</div>}
          {ov && (
            <div style={{ position: "absolute", left: "max(8px, env(safe-area-inset-left))", right: "max(8px, env(safe-area-inset-right))", bottom: "max(8px, env(safe-area-inset-bottom))", display: "flex", justifyContent: g.scene === "menu" ? "flex-end" : "space-between", lineHeight: "normal" }}>
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
