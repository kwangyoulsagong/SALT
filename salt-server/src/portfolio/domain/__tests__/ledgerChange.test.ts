import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyLedgerChange,
  assertNotOversold,
  compareLedger,
  InsufficientQuantityError,
  lowestRunningQuantity,
  previewLedgerChange,
  type LedgerEntry,
} from "..";

/**
 * 불변식(F006 G절 2단계 · `DB-REQ-022` FR-71 · 73): 변경 뒤 원장을 거래일 순서로 걸었을 때 어느 시점에도 보유가 음수가 아니다.
 * 옛 검사(지금 보유 ≥ 매도 수량)가 통과시킨 경우들이 아래 거절 행이다.
 */

const day = (d: number) => new Date(Date.UTC(2026, 10, d));
const entry = (id: string, side: "buy" | "sell", quantity: number, price: number, d: number, fee = 0): LedgerEntry => ({
  id,
  transactionType: side,
  quantity,
  price,
  totalAmount: quantity * price,
  fee,
  transactionDate: day(d),
});

/** 1일 10주 @100 매수 → 5일 4주 @150 매도 → 10일 2주 @200 매수 */
const ledger = [entry("a", "buy", 10, 100, 1), entry("b", "sell", 4, 150, 5), entry("c", "buy", 2, 200, 10)];

const rejects = (fn: () => unknown) => assert.throws(fn, InsufficientQuantityError);

describe("원장 순서", () => {
  it("거래일 → 같은 시각이면 매수 먼저 → id", () => {
    const sameTime = [entry("z", "sell", 1, 1, 3), entry("y", "buy", 1, 1, 3), entry("x", "buy", 1, 1, 1)];
    assert.deepEqual([...sameTime].sort(compareLedger).map((e) => e.id), ["x", "y", "z"]);
  });

  it("같은 날 사고 판 기록은 '사기 전에 팔았다'가 아니다", () => {
    const sameDay = [entry("s", "sell", 3, 120, 7), entry("b", "buy", 3, 100, 7)].sort(compareLedger);
    assert.equal(lowestRunningQuantity(sameDay).toNumber(), 0);
  });
});

describe("과매도 경계 — 받는 것 · 거절하는 것", () => {
  const cases: Array<{ name: string; change: Parameters<typeof applyLedgerChange>[1]; ok: boolean }> = [
    { name: "지금 보유(8) 전부 매도", change: { kind: "create", entry: { transactionType: "sell", quantity: 8, price: 1, fee: 0, transactionDate: day(20) } }, ok: true },
    { name: "지금 보유보다 1 많이 매도", change: { kind: "create", entry: { transactionType: "sell", quantity: 9, price: 1, fee: 0, transactionDate: day(20) } }, ok: false },
    // 옛 검사는 지금 보유(8)만 봐서 통과시켰다 — 3일엔 10주뿐이고 5일 매도 4주가 뒤에 있다
    { name: "과거 날짜 매도 7 — 지금 보유 8 안이지만 5일 매도 뒤 음수", change: { kind: "create", entry: { transactionType: "sell", quantity: 7, price: 1, fee: 0, transactionDate: day(3) } }, ok: false },
    { name: "과거 날짜 매도 6 — 그 뒤 매도까지 정확히 0", change: { kind: "create", entry: { transactionType: "sell", quantity: 6, price: 1, fee: 0, transactionDate: day(3) } }, ok: true },
    { name: "첫 매수보다 앞선 매도", change: { kind: "create", entry: { transactionType: "sell", quantity: 1, price: 1, fee: 0, transactionDate: day(0) } }, ok: false },
    { name: "첫 매수 수량을 4로 줄임(매도 4 와 같음)", change: { kind: "update", id: "a", patch: { quantity: 4 } }, ok: true },
    { name: "첫 매수 수량을 3으로 줄임", change: { kind: "update", id: "a", patch: { quantity: 3 } }, ok: false },
    { name: "매도 날짜를 첫 매수 앞으로 옮김", change: { kind: "update", id: "b", patch: { transactionDate: day(0) } }, ok: false },
    { name: "매도 수량을 12로 — 10일 매수를 지나도 음수 구간이 있다", change: { kind: "update", id: "b", patch: { quantity: 12 } }, ok: false },
    { name: "첫 매수 삭제", change: { kind: "delete", id: "a" }, ok: false },
    { name: "뒤 매수 삭제", change: { kind: "delete", id: "c" }, ok: true },
    { name: "매도 삭제", change: { kind: "delete", id: "b" }, ok: true },
  ];

  for (const { name, change, ok } of cases) {
    it(`${ok ? "받는다" : "거절"} — ${name}`, () => {
      const run = () => previewLedgerChange(ledger, change);
      if (ok) assert.ok(run());
      else rejects(run);
    });
  }

  it("수정 · 삭제할 id 가 원장에 없으면 null(호출부가 404)", () => {
    assert.equal(previewLedgerChange(ledger, { kind: "delete", id: "nope" }), null);
    assert.equal(previewLedgerChange(ledger, { kind: "update", id: "nope", patch: { quantity: 1 } }), null);
  });
});

describe("이미 음수인 옛 원장 — 더 나빠지지만 않으면 받는다", () => {
  // 옛 검사가 통과시킨 과거 날짜 매도: 1일 매도 5 → 3일 매수 5 (가장 낮은 지점 −5)
  const broken = [entry("s", "sell", 5, 100, 1), entry("b", "buy", 5, 90, 3)];

  it("상관없는 새 매수는 받는다", () => {
    assert.doesNotThrow(() => assertNotOversold(broken, applyLedgerChange(broken, { kind: "create", entry: { transactionType: "buy", quantity: 1, price: 1, fee: 0, transactionDate: day(9) } })!));
  });

  it("문제 매도를 지우는 수정은 받는다", () => {
    assert.ok(previewLedgerChange(broken, { kind: "delete", id: "s" }));
  });

  it("음수를 더 깊게 만드는 매도는 거절", () => {
    rejects(() => previewLedgerChange(broken, { kind: "create", entry: { transactionType: "sell", quantity: 1, price: 1, fee: 0, transactionDate: day(2) } }));
  });
});

describe("미리보기 값 — 저장과 같은 FIFO", () => {
  it("새 매수: 전 8주 · 평단 (6×100 + 2×200)/8 = 125 → 후 10주", () => {
    const preview = previewLedgerChange(ledger, {
      kind: "create",
      entry: { transactionType: "buy", quantity: 2, price: 150, fee: 0, transactionDate: day(20) },
    })!;
    assert.deepEqual(preview.before, { quantity: 8, averageBuyPrice: 125, totalInvested: 1_000 });
    assert.deepEqual(preview.after, { quantity: 10, averageBuyPrice: 130, totalInvested: 1_300 });
  });

  it("전량 매도 뒤는 0 — 보유 행이 지워지는 상태", () => {
    const preview = previewLedgerChange(ledger, {
      kind: "create",
      entry: { transactionType: "sell", quantity: 8, price: 300, fee: 0, transactionDate: day(20) },
    })!;
    assert.deepEqual(preview.after, { quantity: 0, averageBuyPrice: 0, totalInvested: 0 });
  });

  it("수정에서 수량 · 단가를 안 바꾸면 저장된 총액 · 수수료를 그대로 쓴다", () => {
    const withFee = [entry("a", "buy", 10, 100, 1, 50)];
    const preview = previewLedgerChange(withFee, { kind: "update", id: "a", patch: { transactionDate: day(2) } })!;
    assert.deepEqual(preview.before, preview.after);
    assert.equal(preview.after.totalInvested, 1_050);
  });

  it("입력 원장 순서가 섞여 와도 같은 답(정렬은 함수가 한다)", () => {
    const change = { kind: "delete" as const, id: "c" };
    assert.deepEqual(previewLedgerChange([...ledger].reverse(), change), previewLedgerChange(ledger, change));
  });
});
