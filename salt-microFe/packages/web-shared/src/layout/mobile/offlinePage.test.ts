import { describe, expect, it } from "vitest";

import { OFFLINE_DB, OFFLINE_SCREENS, offlineStampText } from "@repo/core/mobile";

import { OFFLINE_STAMP_SOURCE, offlineHtml } from "./offlinePage";

const inlineScript = (html: string): string => {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("인라인 스크립트가 없다");
  return match[1]!;
};

describe("오프라인 한 장 — 한 벌 그리기 스크립트(`FE-REQ-073` FR-2)", () => {
  const html = offlineHtml();

  it("스크립트가 문법상 살아 있다(빌드가 못 잡는 문자열 코드)", () => {
    expect(() => new Function(inlineScript(html))).not.toThrow();
  });

  it("앱과 같은 DB 이름 · 판 · 저장소 · 화면 경로를 쓴다", () => {
    const script = inlineScript(html);
    expect(script).toContain(JSON.stringify(OFFLINE_DB));
    for (const path of Object.values(OFFLINE_SCREENS)) expect(script).toContain(JSON.stringify(path));
  });

  it("저장 글자는 textContent 로만 — innerHTML · document.write 0", () => {
    const script = inlineScript(html);
    expect(script).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  });

  it("스크립트 안에 `</` 가 없다 — 설정 글자가 스크립트를 끊지 않는다", () => {
    expect(inlineScript(html)).not.toContain("</");
  });

  it("한 벌이 없을 때의 원래 한 장(제목 · 다시 시도)을 서버 HTML 에 그대로 둔다", () => {
    expect(html).toContain('<main id="m-offline"><h1>');
    expect(html).toContain("location.reload()");
  });
});

describe("인라인 시각 글자 = `offlineStampText`", () => {
  const stamp = new Function(`return (${OFFLINE_STAMP_SOURCE});`)() as (at: number, now: number) => string;
  const at = Date.UTC(2026, 10, 21, 5, 5); // 서울 14:05
  it.each([
    ["같은 서울 날", Date.UTC(2026, 10, 21, 14, 0)],
    ["서울 날짜가 바뀜", Date.UTC(2026, 10, 21, 15, 30)],
    ["며칠 뒤", Date.UTC(2026, 10, 25, 1, 0)],
    ["자정 직전 저장", Date.UTC(2026, 10, 21, 14, 59)],
  ])("%s", (_, now) => {
    expect(stamp(at, now)).toBe(offlineStampText(at, now));
  });
});
