import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toNewsTagVM } from "../news-tag.viewmodel";
import { toKrNewsVM } from "../kr-stock.viewmodel";
import { toNewsPreviewViewModels } from "../news.viewmodel";

/** F017 단계 6 — 측정 태그(BFF-REQ-052 FR-5): 서버 값을 옮기기만 · 모르는 라벨 · 깨진 모양이면 태그 없이 행만 */

const tag = {
  eventKind: "contract",
  eventKindText: "수주 · 공급계약",
  label: "up_usually",
  reaction: { days: 1, sample: 120, upRate: 0.55, mean: 0.004, baseUpRate: 0.447 },
  reaction5d: { days: 5, sample: 110, upRate: null, mean: null, baseUpRate: 0.438 },
  preMove5d: 0.031,
  asOf: "2026-11-12T07:00:00.000Z",
  preregKey: "news-reaction@1",
};

describe("toNewsTagVM — 허용 · 거절 경계", () => {
  it("아는 라벨 넷은 옮긴다 · asOf · preregKey 는 화면 계약에 싣지 않는다", () => {
    for (const label of ["up_usually", "down_usually", "mixed", "few"]) {
      const vm = toNewsTagVM({ ...tag, label });
      assert.equal(vm?.label, label);
    }
    assert.deepEqual(Object.keys(toNewsTagVM(tag)!).sort(), ["eventKind", "eventKindText", "label", "preMove5d", "reaction", "reaction5d"]);
  });

  it("모르는 라벨 · 종류 없음 · 1일 반응 없음 · 표본 음수 → null", () => {
    const bad: unknown[] = [
      null,
      "x",
      { ...tag, label: "good_news" },
      { ...tag, eventKind: "" },
      { ...tag, eventKindText: undefined },
      { ...tag, reaction: null },
      { ...tag, reaction: { ...tag.reaction, sample: -1 } },
    ];
    for (const b of bad) assert.equal(toNewsTagVM(b), null, JSON.stringify(b));
  });

  it("숫자가 아닌 칸은 null(0 으로 채우지 않는다) · 5일이 깨지면 5일만 null", () => {
    const vm = toNewsTagVM({ ...tag, preMove5d: "3%", reaction5d: "x", reaction: { ...tag.reaction, upRate: Number.NaN } });
    assert.equal(vm?.preMove5d, null);
    assert.equal(vm?.reaction5d, null);
    assert.equal(vm?.reaction.upRate, null);
  });
});

describe("소비처 — 국내 소식 · 코인 종목 뉴스 행에 tag", () => {
  it("국내: tag 를 옮기고 · 옛 서버(칸 없음)면 null", () => {
    const item = { id: "1", kind: "disclosure", provider: "공시", title: "t", publishedAt: "2026-11-12T00:00:00Z", related: [] };
    const vm = toKrNewsVM({ code: "005930", date: "2026-11-12", items: [{ ...item, tag }, item] });
    assert.equal(vm.items[0]!.tag?.eventKind, "contract");
    assert.equal(vm.items[1]!.tag, null);
  });

  it("코인: tag 를 옮기고 · 옛 서버면 null", () => {
    const a = { id: "a", title: "t", source: "s", url: "u", publishedAt: "2026-11-12T00:00:00Z" };
    const vms = toNewsPreviewViewModels([{ ...a, tag }, a]);
    assert.equal(vms[0]!.tag?.label, "up_usually");
    assert.equal(vms[1]!.tag, null);
  });
});
