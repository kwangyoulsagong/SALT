import { describe, expect, it } from "vitest";

import type { KrScheduleKind } from "../market/krStock";
import { EVENT_KIND_LABELS, EVENT_KIND_SHORT_LABELS, type MacroEventKind } from "./macroEvents";

/** 종류 이름 누락 0 — 서버 · BFF 가 주는 종류 코드마다 이름이 있다(`FE-REQ-046` FR-8) */
describe("EVENT_KIND_LABELS", () => {
  const all: MacroEventKind[] = ["fomc", "cpi", "jobs", "kr_bok_rate", "kr_cpi", "kr_trade", "kr_quad_expiry"];
  const schedule: KrScheduleKind[] = ["kr_bok_rate", "kr_cpi", "kr_trade", "kr_quad_expiry"];

  it("모든 종류에 빈 이름이 없다", () => {
    for (const kind of all) expect(EVENT_KIND_LABELS[kind]?.trim()).toBeTruthy();
    expect(Object.keys(EVENT_KIND_LABELS).sort()).toEqual([...all].sort());
  });

  it("국내 일정 줄의 종류는 카드와 같은 이름을 쓴다", () => {
    for (const kind of schedule) expect(EVENT_KIND_LABELS[kind]).toBe(EVENT_KIND_LABELS[kind as MacroEventKind]);
  });

  it("지역 표시 옆 이름엔 지역 말이 없다 — 국내 · 미국이 겹쳐 보이지 않는다", () => {
    for (const kind of all) expect(EVENT_KIND_SHORT_LABELS[kind]).not.toMatch(/^(미국|국내)/);
  });

  it("확신 · 판정 표현이 없다(공통 수용 기준 4)", () => {
    for (const label of Object.values(EVENT_KIND_LABELS)) expect(label).not.toMatch(/호재|악재|확실|무조건|보장/);
  });
});
