import { inflateSync } from "node:zlib";

/**
 * PNG → RGBA(8비트) — 로고 선명도 판정용(F011 FR-47). 의존성을 늘리지 않으려고 직접 푼다: 로고 이미지가 쓰는 범위만
 * (비트 깊이 8 · 비인터레이스 · 색 형식 0 회색 · 2 RGB · 3 팔레트(+tRNS) · 4 회색+알파 · 6 RGBA). 그 밖은 던진다 —
 * 판정 쪽이 "판정 못 함"으로 받는다(화면 로고를 지우지 않는다)
 */
export interface DecodedPng {
  width: number;
  height: number;
  rgba: Uint8Array;
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

export const decodePng = (buf: Buffer): DecodedPng => {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("PNG 아님");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let palette: Buffer | null = null;
  let transparency: Buffer | null = null;
  const idat: Buffer[] = [];

  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("latin1", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      colorType = data[9]!;
      const interlace = data[12];
      if (bitDepth !== 8 || interlace !== 0 || CHANNELS[colorType] === undefined) {
        throw new Error(`지원하지 않는 PNG(깊이 ${bitDepth} · 색 ${colorType} · 인터레이스 ${interlace})`);
      }
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") transparency = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  if (width === 0 || height === 0 || idat.length === 0) throw new Error("PNG 이미지 데이터 없음");

  const channels = CHANNELS[colorType]!;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length < (stride + 1) * height) throw new Error("PNG 데이터가 짧다");

  // 행 필터를 되돌린다(0 없음 · 1 Sub · 2 Up · 3 Average · 4 Paeth)
  const pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[row + x - channels]! : 0;
      const up = y > 0 ? pixels[row - stride + x]! : 0;
      const upLeft = y > 0 && x >= channels ? pixels[row - stride + x - channels]! : 0;
      const value = raw[src + x]!;
      const predicted =
        filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? (left + up) >> 1 : paeth(left, up, upLeft);
      pixels[row + x] = (value + predicted) & 0xff;
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = i * channels;
    const o = i * 4;
    if (colorType === 6) {
      rgba.set(pixels.subarray(p, p + 4), o);
    } else if (colorType === 2) {
      rgba.set(pixels.subarray(p, p + 3), o);
      rgba[o + 3] = 255;
    } else if (colorType === 0 || colorType === 4) {
      rgba[o] = rgba[o + 1] = rgba[o + 2] = pixels[p]!;
      rgba[o + 3] = colorType === 4 ? pixels[p + 1]! : 255;
    } else {
      const index = pixels[p]!;
      if (!palette || index * 3 + 2 >= palette.length) throw new Error("PNG 팔레트 범위 밖");
      rgba[o] = palette[index * 3]!;
      rgba[o + 1] = palette[index * 3 + 1]!;
      rgba[o + 2] = palette[index * 3 + 2]!;
      rgba[o + 3] = transparency && index < transparency.length ? transparency[index]! : 255;
    }
  }
  return { width, height, rgba };
};
