import { describe, expect, it } from "vitest";

import { formatAlertTime } from "./formatAlertTime";

/** 서버 HTML(첫 쪽)과 브라우저가 같은 글자 — 서울 시각 고정(`ssr.md`). 실행 환경 타임존과 무관해야 한다 */
describe("formatAlertTime", () => {
  it("UTC 시각을 서울 날짜 · 시각으로 — 자정을 넘기면 다음 날", () => {
    expect(formatAlertTime("2026-11-18T08:05:00.000Z")).toBe("11월 18일 17:05");
    expect(formatAlertTime("2026-11-18T15:30:00.000Z")).toBe("11월 19일 00:30");
  });

  it("틀린 값은 빈 글자", () => {
    expect(formatAlertTime("not-a-date")).toBe("");
  });
});
