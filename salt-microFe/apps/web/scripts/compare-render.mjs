#!/usr/bin/env node
/**
 * 이관 전/후 렌더 결과 대조 (`FE-REQ-009` FR-36 · 수용 기준).
 *
 * ## 왜 픽셀이 아니라 DOM 인가
 *
 * FSD 이관은 **파일을 옮긴다.** vanilla-extract 의 클래스 이름은 파일 경로에서
 * 나오므로(`Goals_Wrapper__1a2b` → `GoalRow_Wrapper__3c4d`) 픽셀은 같아도 HTML 은 다르다.
 * 반대로 그래프 애니메이션·blink·원격 이미지 때문에 **픽셀 대조는 타이밍에 흔들린다.**
 *
 * 그래서 **클래스 이름을 지운 DOM 과 텍스트**를 대조한다. "렌더 결과가 같다"의 실제 정의다.
 * 스크린샷은 사람이 보기 위해 따로 남긴다.
 *
 * ```bash
 * # 터미널 1 — 이관 후
 * pnpm --filter web dev
 * # 터미널 2 — 이관 전 (main 워크트리)
 * cd <worktree>/salt-microFe/apps/web && pnpm exec next dev --port 3100
 * # 터미널 3
 * node apps/web/scripts/compare-render.mjs
 * ```
 */

import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const AFTER = process.env.AFTER_ORIGIN || "http://localhost:3000";
const BEFORE = process.env.BEFORE_ORIGIN || "http://localhost:3100";
const OUT = process.env.OUT_DIR || "/tmp/fe-req-009-render";

/**
 * `volatile` 은 **실시간 시세가 흐르는 화면**이다. 두 번 찍으면 값과 행 순서가 다르다 —
 * 이관과 무관한 차이다. 그래서 텍스트·속성을 지우고 **엘리먼트 트리 모양**만 대조한다.
 * 값 자체가 같은지는 MSW 로 고정된 `/home`·`/goals/addgoals` 가 본다.
 */
const ROUTES = [
  { path: "/" },
  { path: "/home" },
  { path: "/investments", volatile: true },
  { path: "/goals/addgoals" },
];
const VIEWPORTS = [
  { height: 812, name: "375", width: 375 },
  { height: 844, name: "390", width: 390 },
  { height: 900, name: "1440", width: 1440 },
];

/**
 * 렌더 결과가 아닌 것을 지운다.
 *
 * | 지우는 것 | 왜 |
 * |---|---|
 * | `<script>` 블록 전체 | RSC 페이로드에 **모듈 경로가 그대로 들어간다** — 파일을 옮기는 것이 이 REQ 다 |
 * | `class` 속성 | vanilla-extract 해시는 파일 경로에서 나온다 |
 * | `style` 속성 | 애니메이션 중간값이 잡힌다 |
 * | `?v=`·`&v=` 쿼리 | dev 서버 빌드 타임스탬프 |
 * | `srcset` | Next 이미지 최적화 URL 에 빌드 해시가 들어간다 |
 *
 * 남는 것이 **사람이 보는 결과**다.
 */
const normalize = (html) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(/\sclass="[^"]*"/g, "")
    .replace(/\sstyle="[^"]*"/g, "")
    .replace(/(\ssrcset?=")[^"]*(")/gi, "$1<img>$2")
    .replace(/[?&]v=\d+/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** 텍스트와 속성을 지우고 엘리먼트 트리 모양만 남긴다 (실시간 화면용). */
const skeleton = (html) =>
  html
    .replace(/<([a-z0-9-]+)[^>]*>/gi, "<$1>")
    .replace(/>[^<]*</g, "><");

/**
 * dev 서버는 **첫 요청에 라우트를 컴파일**하고 MSW 는 서비스 워커가 붙은 뒤부터 응답한다.
 * 워밍업 없이 찍으면 한쪽만 `Loading...` 이 잡혀 "다르다"가 나온다 — 구조가 아니라 타이밍이다.
 */
const warmUp = async (browser, origin) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const { path } of ROUTES) {
    await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  }
  await context.close();
};

const capture = async (browser, origin, route, viewport) => {
  const context = await browser.newContext({
    viewport: { height: viewport.height, width: viewport.width },
  });
  const page = await context.newPage();
  // `networkidle` 은 쓰지 않는다 — 실시간 구독이 붙은 화면에서 끝나지 않는다.
  await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
  await page
    .waitForFunction(() => !document.body.innerText.includes("Loading..."), {
      timeout: 15000,
    })
    .catch(() => {});
  // 그래프 transition(1s)과 blink(2s)가 끝난 뒤를 본다.
  await page.waitForTimeout(2500);
  const html = await page.evaluate(() => document.body.outerHTML);
  const text = await page.evaluate(() => document.body.innerText);
  const png = await page.screenshot({ fullPage: true });
  await context.close();
  return { html: normalize(html), png, text };
};

const main = async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const failures = [];

  await warmUp(browser, BEFORE);
  await warmUp(browser, AFTER);

  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      const label = `${route.path.replace(/\//g, "_") || "_root"}@${viewport.name}`;
      const before = await capture(browser, BEFORE, route.path, viewport);
      const after = await capture(browser, AFTER, route.path, viewport);

      await writeFile(`${OUT}/before${label}.png`, before.png);
      await writeFile(`${OUT}/after${label}.png`, after.png);

      const same = route.volatile
        ? skeleton(before.html) === skeleton(after.html)
        : before.html === after.html && before.text === after.text;
      if (!same) {
        failures.push(label);
        const dump = route.volatile ? skeleton : (html) => html;
        await writeFile(`${OUT}/before${label}.html`, dump(before.html));
        await writeFile(`${OUT}/after${label}.html`, dump(after.html));
        console.error(`✗ ${label} — DOM 이 다르다. ${OUT}/*${label}.html 대조`);
      } else {
        console.log(`✓ ${label}`);
      }
    }
  }

  await browser.close();

  if (failures.length > 0) {
    console.error(`\n다른 화면 ${failures.length}건: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log(`\n전부 동일 — ${ROUTES.length}경로 × ${VIEWPORTS.length}뷰포트`);
  console.log(`스크린샷: ${OUT}`);
};

main();
