import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

/**
 * 파비콘 · 앱 아이콘이 토큰과 같은지 (`FE-REQ-051` FR-4).
 *
 * 아이콘은 `pnpm brand:icons` 가 `@repo/tokens`(`BRAND_MARK` · `colors.brand.mark`)에서 굽는 정적 파일이라, 토큰만 바꾸고
 * 다시 굽지 않으면 화면 로고와 탭 · 홈 화면 아이콘이 조용히 갈라진다. 이 테스트가 `--check` 를 대신 돌린다.
 */
describe("브랜드 아이콘", () => {
  it("zone 5 의 icon.svg · apple-icon.png · favicon.ico 와 문서 사본이 토큰으로 다시 구운 것과 같다", () => {
    const run = spawnSync(process.execPath, ["scripts/generate-brand-icons.mjs", "--check"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(run.stderr + run.stdout, "토큰을 바꿨다면 `pnpm brand:icons` 로 다시 굽는다").not.toMatch(/다르다|differ/i);
    expect(run.status).toBe(0);
  }, 30_000);
});
