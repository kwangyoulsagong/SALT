#!/usr/bin/env node
/**
 * 로고 · 파비콘 · 앱 아이콘 생성 (`FE-REQ-051` FR-3 · FR-4).
 *
 * 모양(`BRAND_MARK`)과 색(`tokens.colors.brand.mark` · 글자 1단색)은 `@repo/tokens` 한 곳에 있다. 정적 파일은 그 값을 손으로
 * 옮기지 않고 이 스크립트가 만든다 — 토큰을 바꾸면 다시 돌린다. `--check` 는 디스크와 다르면 실패한다(검증용).
 *
 * 만드는 것
 * - zone 앱 5개 `app/icon.svg`(단색 물방울 — 브라우저 탭은 SVG 를 먼저 고르고 16 에서 블러가 뭉개진다) · `app/apple-icon.png`(180, 흰 바탕 · 입체 물방울 + 물결 · 여백 20%) · `app/favicon.ico`(16 단색 + 32 입체)
 *   — Next 파일 규칙이라 `<link rel="icon">` 은 Next 가 단다. 내용이 같아 zone 마다 주소 해시도 같다
 * - `docs/design-system/brand/` 의 SVG 3종(입체 심볼 · 글자 로고 · 어두운 바탕용) — 사람이 보는 사본
 *
 * 실행: `pnpm brand:icons` · 검사: `pnpm brand:icons --check`
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

// 토큰은 TS 원본이다 — 디자인 시스템 패키지의 vite 가 가진 esbuild 로 메모리에서 한 번 묶어 읽는다(새 의존성 없음)
const requireFromUi = createRequire(path.join(root, "packages/ui/package.json"));
const esbuild = createRequire(requireFromUi.resolve("vite/package.json"))("esbuild");
const bundled = await esbuild.build({
  entryPoints: [path.join(root, "packages/tokens/src/index.ts")],
  bundle: true,
  format: "esm",
  write: false,
  platform: "neutral",
});
const { tokens, BRAND_MARK: M } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);

// PNG 는 Next 가 가진 sharp 로 굽는다(새 의존성 없음)
const requireFromNext = createRequire(createRequire(path.join(root, "apps/web/package.json")).resolve("next/package.json"));
const sharp = requireFromNext("sharp");

const C = tokens.colors.brand.mark;
const INK = tokens.colors.text.primary;
const WHITE = tokens.colors.background.white;

// 정적 파일은 문서 하나에 심볼 하나라 고정 id 로 충분하다(컴포넌트는 인스턴스마다 useId)
const flatDrop = (fill) => `  <path d="${M.drop}" fill="${fill}"/>`;
const depthDrop = ({ ripples = true } = {}) => {
  const [l0, l1] = M.faceLeftX, [r0, r1] = M.faceRightX, g = M.glow, sh = M.shade, fl = M.foldLine;
  return [
    "  <defs>",
    `    <linearGradient id="l" x1="${l0}" x2="${l1}" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.mid}"/><stop offset="1" stop-color="${C.light}"/></linearGradient>`,
    `    <linearGradient id="r" x1="${r0}" x2="${r1}" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.shadow}"/><stop offset="1" stop-color="${C.mid}"/></linearGradient>`,
    `    <linearGradient id="w" x1="0" x2="0" y1="${M.ripples.cy - 12}" y2="${M.ripples.cy + 12}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.light}"/><stop offset="1" stop-color="${C.deep}"/></linearGradient>`,
    `    <filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${g.blur}"/></filter>`,
    `    <filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${fl.blur}"/></filter>`,
    `    <filter id="g" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="${M.ripples.contact.blur}"/></filter>`,
    `    <clipPath id="c"><path d="${M.drop}"/></clipPath>`,
    `    <clipPath id="cl"><path d="${M.foldLeft}"/></clipPath>`,
    `    <clipPath id="cr"><path d="${M.foldRight}"/></clipPath>`,
    "  </defs>",
    ...(ripples ? M.ripples.rings : []).map((r) => `  <ellipse cx="100" cy="${M.ripples.cy}" rx="${r.rx}" ry="${r.ry}" fill="none" stroke="url(#w)" stroke-width="${r.width}" opacity="${r.opacity}"/>`),
    ...(ripples ? [`  <ellipse cx="100" cy="${M.ripples.cy - 1}" rx="${M.ripples.contact.rx}" ry="${M.ripples.contact.ry}" fill="${C.deep}" opacity="${M.ripples.contact.opacity}" filter="url(#g)"/>`] : []),
    '  <g clip-path="url(#c)">',
    `    <path d="${M.foldLeft}" fill="url(#l)"/>`,
    `    <path d="${M.foldRight}" fill="url(#r)"/>`,
    `    <g clip-path="url(#cl)"><ellipse cx="${g.cx}" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}" fill="${C.hi}" opacity="${g.opacity}" filter="url(#b)"/></g>`,
    `    <g clip-path="url(#cr)"><ellipse cx="${sh.cx}" cy="${sh.cy}" rx="${sh.rx}" ry="${sh.ry}" fill="${C.shadow}" opacity="${sh.opacity}" filter="url(#b)"/></g>`,
    `    <path d="${M.fold}" fill="none" stroke="${C.hi}" stroke-width="${fl.width}" opacity="${fl.opacity}" filter="url(#s)"/>`,
    "  </g>",
  ].join("\n");
};

const svgDoc = (viewBox, width, height, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}" role="img" aria-label="SALT">\n${body}\n</svg>\n`;
/** 단색 물방울(16px 파비콘) — 입체가 뭉개지는 크기 */
const symbolSvg = (fill = C.flat) => svgDoc(M.symbolViewBox.dropOnly, 32, 32, flatDrop(fill));
/** 입체 물방울(icon.svg · 32px) — 물결 없음 */
const depthDropSvg = () => svgDoc(M.symbolViewBox.dropOnly, 32, 32, depthDrop({ ripples: false }));
/** 입체 + 물결(앱 아이콘 · 문서 사본) */
const depthSvg = () => svgDoc(M.symbolViewBox.withRipples, 200, 200, depthDrop());
/** 글자 로고 — 입체 물방울 + "Salt" */
const logoSvg = (theme) => {
  const L = M.lockup, ink = theme === "dark" ? tokens.colors.text.white : INK;
  return svgDoc(`0 0 ${L.fullWidth} ${L.height}`, L.fullWidth, L.height, [
    `  <svg x="${L.drop.x}" y="${L.drop.y}" width="${L.drop.width}" height="${L.drop.height}" viewBox="${L.drop.viewBox}">\n${depthDrop({ ripples: false })}\n  </svg>`,
    `  <g transform="translate(${L.wordmarkX} 0)" fill="${ink}">`,
    ...M.wordmark.map((d) => `    <path d="${d}"/>`),
    "  </g>",
  ].join("\n"));
};

const png = (source, size, base = 32) => sharp(Buffer.from(source), { density: 72 * (size / base) * 2 }).resize(size, size).png().toBuffer();

/** 앱 아이콘 — 흰 바탕, 입체 물방울 + 물결이 가운데 60%(여백 20%씩) */
const appleIcon = async () => {
  const size = 180;
  const inner = Math.round(size * 0.6);
  const symbol = await png(depthSvg(), inner, 200);
  const offset = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: symbol, top: offset, left: offset }])
    .png()
    .toBuffer();
};

/** ICO — PNG 를 그대로 담는 항목 둘(16 단색 · 32 입체) */
const ico = (entries) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dir = entries.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...dir, ...entries.map(({ data }) => data)]);
};

// zone 목록은 레지스트리 한 곳(`merge-zone-static.mjs` 와 같다) — zone 이 늘면 아이콘도 따라 생긴다
const { ZONES, ZONE_IDS } = createRequire(import.meta.url)("../packages/core/src/zones/registry.cjs");
const ZONE_APPS = ZONE_IDS.map((id) => ZONES[id].app);

const files = new Map();
// 브라우저 탭(16 · 32)은 SVG 를 ICO 보다 먼저 고른다 — 블러가 뭉개지는 크기라 icon.svg 는 단색(FR-5). 입체는 앱 아이콘(180)과 ICO 32
const iconSvg = symbolSvg();
const apple = await appleIcon();
const favicon = ico([
  { size: 16, data: await png(symbolSvg(), 16) },
  { size: 32, data: await png(depthDropSvg(), 32) },
]);
for (const app of ZONE_APPS) {
  files.set(`apps/${app}/app/icon.svg`, Buffer.from(iconSvg));
  files.set(`apps/${app}/app/apple-icon.png`, apple);
  files.set(`apps/${app}/app/favicon.ico`, favicon);
}
files.set("docs/design-system/brand/salt-symbol.svg", Buffer.from(depthSvg()));
files.set("docs/design-system/brand/salt-logo.svg", Buffer.from(logoSvg("light")));
files.set("docs/design-system/brand/salt-logo-dark.svg", Buffer.from(logoSvg("dark")));

// sharp 의 PNG 는 같은 입력이면 같은 바이트다 — --check 는 바이트로 비교한다
const stale = [];
for (const [relative, data] of files) {
  const target = path.join(root, relative);
  const current = await readFile(target).catch(() => null);
  if (current && current.equals(data)) continue;
  if (check) stale.push(relative);
  else await writeFile(target, data);
}

if (check && stale.length > 0) {
  console.error(`브랜드 아이콘이 토큰과 다르다 — pnpm brand:icons 로 다시 만든다:\n  ${stale.join("\n  ")}`);
  process.exit(1);
}
console.log(check ? `브랜드 아이콘 ${files.size}개 — 토큰과 같다` : `브랜드 아이콘 ${files.size}개를 썼다`);
