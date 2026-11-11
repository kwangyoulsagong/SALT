import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * **소유자 판정은 전망만 가른다**(`ADR-011` · `SRV-REQ-056`).
 *
 * 2026-11-10 전까지 국내 시세 · 판단 · 미러 · 복기 · 해설이 소유자 목록(`FORECAST_OWNER_EMAILS`)으로 막혀 있었다 — 시세는
 * 누구에게나 같은 값이라 읽는 사람 판정은 라우터의 `marketReaderMiddleware` 한 곳으로 옮기고, 소유자 목록은 전망(확률 · 구간,
 * `ADR-003` 소유자 전용)에만 남겼다. 규칙을 문서에 적기만 하면 새 유스케이스가 "국내는 소유자만"을 다시 들고 들어온다 — 여기서 센다.
 *
 * 허용 자리:
 * - `GetSymbolForecast` · `GetSymbolEvents` · `GetSymbolPositioning` — 전망 읽기(접근 판정)
 * - ~~`explainRouting` — 해설 LLM 을 로컬 CLI 로 보낼지~~ 2026-11-11 뺐다 — 해설이 배치 하나라 사람으로 고르지 않는다(`SRV-REQ-053` FR-3)
 * 테스트 파일은 세지 않는다(판정 함수 자체를 재는 곳이 있다).
 */
const SRC = path.resolve(__dirname, "../../..");
const SELF = path.resolve(__filename);

const ALLOWED_OWNER_CALLS = [
  "coach/application/GetSymbolForecast.ts",
  "coach/application/GetSymbolEvents.ts",
  "coach/application/GetSymbolPositioning.ts",
];

const files = (dir: string, withTests: boolean): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === "node_modules" || (!withTests && name === "__tests__")) return [];
    return statSync(full).isDirectory() ? files(full, withTests) : name.endsWith(".ts") ? [full] : [];
  });

const relative = (file: string) => path.relative(SRC, file).split(path.sep).join("/");

describe("소유자 판정 범위 — 전망만(ADR-011)", () => {
  it("isForecastOwner( 를 부르는 곳은 전망 읽기 셋뿐", () => {
    const callers = files(SRC, false)
      .filter((file) => /\bisForecastOwner\(/.test(readFileSync(file, "utf8")))
      .map(relative)
      .sort();
    assert.deepEqual(callers, [...ALLOWED_OWNER_CALLS].sort());
  });

  it("국내 소유자 판정(isKrStockViewer)은 src 어디에도 없다 — 테스트 포함", () => {
    const found = files(SRC, true)
      .filter((file) => file !== SELF && readFileSync(file, "utf8").includes("isKrStockViewer"))
      .map(relative);
    assert.deepEqual(found, []);
  });

  it("탐색이 실제로 파일을 읽는다 — 빈 목록으로 통과하지 않게", () => {
    assert.ok(files(SRC, false).length > 100);
  });
});
