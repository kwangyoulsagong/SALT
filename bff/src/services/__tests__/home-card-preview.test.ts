import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appAICoachService } from "../app-ai-coach.service";
import { appHomeService, HOME_PREVIEW_TIMEOUT_MS, kstMonth } from "../app-home.service";
import { appPortfolioService } from "../app-portfolio.service";
import { backendApi } from "../backend-api.service";
import { HOME_CARD_TIMEOUT_MS, toHouseholdPreview, toInvestPreview, toSavingsPreview } from "../home-card.viewmodel";

/** 홈 카드 미리보기(`FE-REQ-048` FR-12 · `BFF-REQ-046` FR-12) — 서버 값 그대로 · 실패는 미리보기만 */

const goal = (title: string, status: string, ratio: number, percent: number) => ({
  title,
  status,
  progressRatio: ratio,
  progressPercent: percent,
});

describe("toSavingsPreview", () => {
  it("진행 중 목표만, 서버 순서 그대로 앞에서 3개 — 퍼센트는 서버 값(소수 한 자리)", () => {
    const preview = toSavingsPreview([
      goal("끝난 목표", "completed", 1, 100),
      goal("여행", "active", 0.72, 72),
      goal("멈춘 목표", "paused", 0.1, 10),
      goal("비상금", "active", 0.384, 38.4),
      goal("차", "active", 0.05, 5),
      goal("넷째", "active", 0.9, 90),
    ]);
    assert.deepEqual(preview, {
      kind: "progress",
      label: "진행 중인 목표 진척",
      items: [
        { label: "여행", ratio: 0.72, value: "72.0%" },
        { label: "비상금", ratio: 0.384, value: "38.4%" },
        { label: "차", ratio: 0.05, value: "5.0%" },
      ],
    });
  });

  it("진행 중이 없거나 모양이 틀리면 null", () => {
    assert.equal(toSavingsPreview([goal("끝", "completed", 1, 100)]), null);
    assert.equal(toSavingsPreview({} as never), null);
    assert.equal(toSavingsPreview([{ status: "active" } as never]), null);
  });
});

describe("toHouseholdPreview", () => {
  const day = (state: string, spent: number) => ({ state, spent });

  it("날마다 쓴 돈 — 오지 않은 날(future)은 null, 안 쓴 날은 0 그대로", () => {
    const preview = toHouseholdPreview({
      month: "2026-11",
      calendar: { days: [day("spent", 12000), day("no_spend", 0), day("blank", 0), day("future", 0)] },
    });
    assert.deepEqual(preview, { kind: "bars", label: "이번 달 날마다 쓴 돈", values: [12000, 0, 0, null], caption: "11월 날마다 쓴 돈" });
  });

  it("쓴 날이 하루도 없거나 모양이 틀리면 null(빈 막대를 그리지 않는다)", () => {
    assert.equal(toHouseholdPreview({ month: "2026-11", calendar: { days: [day("no_spend", 0), day("future", 0)] } }), null);
    assert.equal(toHouseholdPreview({ month: "2026-11" } as never), null);
  });
});

describe("toInvestPreview", () => {
  const flow = (values: number[], periodReturnPct: number | null) => ({ points: values.map((valueKrw) => ({ valueKrw })), periodReturnPct });

  it("손익률을 보여도 되는 사람 — 기간 수익률을 부호 글자와 함께", () => {
    assert.deepEqual(toInvestPreview(flow([100, 110, 105], 5), true), {
      kind: "trend",
      label: "최근 1개월 보유 평가 흐름",
      points: [100, 110, 105],
      caption: "최근 1개월 +5.0%",
    });
    assert.equal(toInvestPreview(flow([100, 90], -10), true)?.caption, "최근 1개월 -10.0%");
  });

  it("매입가 숨김이거나 수익률이 없으면 기간 이름만 — 숫자 0건", () => {
    assert.equal(toInvestPreview(flow([100, 110], 10), false)?.caption, "최근 1개월");
    assert.equal(toInvestPreview(flow([100, 110], null), true)?.caption, "최근 1개월");
  });

  it("점이 둘 미만이거나 모양이 틀리면 null", () => {
    assert.equal(toInvestPreview(flow([100], 0), true), null);
    assert.equal(toInvestPreview({} as never, true), null);
  });
});

describe("kstMonth", () => {
  it("한국 시간으로 달을 가른다 — UTC 말일 15시 = 한국 다음 달 1일", () => {
    assert.equal(kstMonth(new Date("2026-11-30T14:59:59Z")), "2026-11");
    assert.equal(kstMonth(new Date("2026-11-30T15:00:00Z")), "2026-12");
  });
});

describe("AppHomeService.getHome — 미리보기", () => {
  afterEach(() => mock.restoreAll());

  const envelope = (data: unknown) => ({ data: { success: true, data } }) as never;
  const summary = (items: unknown[]) =>
    mock.method(appPortfolioService, "getSummary", async () => ({ items, totalKrw: 1000, fxRateUsed: null, fxBasisCode: null, namesDegraded: false }) as never);

  const server = (overrides: Record<string, () => unknown> = {}) =>
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      const path = url.split("?")[0];
      if (overrides[path]) return overrides[path]();
      if (path === "/savings/home-card") return envelope({ totalGoals: 1, activeGoals: 1, totalSaved: 500, nearest: { title: "여행", progressPercent: 50 } });
      if (path === "/savings/goals") return envelope([goal("여행", "active", 0.5, 50)]);
      if (path === "/household/home-card") return envelope({ spent: 1000, count: 1, remaining: null, landing: null });
      if (path.startsWith("/household/month/")) return envelope({ month: "2026-11", calendar: { days: [{ state: "spent", spent: 1000 }] } });
      if (path === "/portfolio/position/flow") return envelope({ points: [{ date: "a", valueKrw: 1 }, { date: "b", valueKrw: 2 }], periodReturnPct: 3 });
      if (path === "/portfolio/stats") return envelope({ profitRate: 1 });
      return envelope({});
    });

  it("세 카드 모두 미리보기를 싣는다 — 저축은 진척 막대가 있으니 같은 진척 한 줄(note)을 또 쓰지 않는다", async () => {
    mock.method(appAICoachService, "getProfile", async () => ({ hidePurchasePrice: false }) as never);
    server();
    summary([{}]);
    const vm = await appHomeService.getHome("t");
    const by = (d: string) => vm.cards.find((c) => c.domain === d)!;
    assert.equal(by("savings").preview?.kind, "progress");
    assert.equal(by("savings").note, null);
    assert.equal(by("household").preview?.kind, "bars");
    assert.deepEqual(by("invest").preview, { kind: "trend", label: "최근 1개월 보유 평가 흐름", points: [1, 2], caption: "최근 1개월 +3.0%" });
  });

  it("미리보기 원천이 실패해도 카드는 ok — 미리보기만 null, 저축은 진척 한 줄로 돌아간다", async () => {
    mock.method(appAICoachService, "getProfile", async () => ({ hidePurchasePrice: true }) as never);
    const fail = () => {
      throw new Error("503");
    };
    server({ "/savings/goals": fail, "/portfolio/position/flow": fail });
    summary([{}]);
    const vm = await appHomeService.getHome("t");
    const savings = vm.cards.find((c) => c.domain === "savings")!;
    assert.equal(savings.state, "ok");
    assert.equal(savings.preview, null);
    assert.equal(savings.note, "여행 50.0%");
    const invest = vm.cards.find((c) => c.domain === "invest")!;
    assert.equal(invest.state, "ok");
    assert.equal(invest.preview, null);
  });

  it("미리보기가 예산을 넘으면 그것만 빠지고 카드는 카드 예산 안에 ok", async () => {
    assert.ok(HOME_PREVIEW_TIMEOUT_MS < HOME_CARD_TIMEOUT_MS);
    mock.method(appAICoachService, "getProfile", async () => ({ hidePurchasePrice: true }) as never);
    const slow = () => new Promise((resolve) => setTimeout(() => resolve(envelope({ month: "2026-11", calendar: { days: [] } })), HOME_CARD_TIMEOUT_MS + 200));
    server({ "/household/month/2026-11": slow, "/household/month/2026-12": slow });
    summary([]);
    const started = Date.now();
    const vm = await appHomeService.getHome("t");
    const household = vm.cards.find((c) => c.domain === "household")!;
    assert.equal(household.state, "ok");
    assert.equal(household.preview, null);
    assert.ok(Date.now() - started < HOME_CARD_TIMEOUT_MS);
  });

  it("비어 있는 카드(empty)는 미리보기를 싣지 않는다", async () => {
    mock.method(appAICoachService, "getProfile", async () => ({ hidePurchasePrice: true }) as never);
    server({ "/savings/home-card": () => envelope({ totalGoals: 0 }) });
    summary([]);
    const vm = await appHomeService.getHome("t");
    assert.equal(vm.cards.find((c) => c.domain === "savings")!.preview, null);
    assert.equal(vm.cards.find((c) => c.domain === "invest")!.preview, null);
  });

  it("비어 있는 카드는 카드 전체가 첫 행동으로 간다(이름 · 행선지는 BFF) — 값이 있는 카드는 action 없음", async () => {
    mock.method(appAICoachService, "getProfile", async () => ({ hidePurchasePrice: true }) as never);
    server({
      "/savings/home-card": () => envelope({ totalGoals: 0 }),
      "/household/home-card": () => envelope({ spent: 0, count: 0, remaining: null, landing: null }),
    });
    summary([]);
    const vm = await appHomeService.getHome("t");
    assert.deepEqual(
      vm.cards.map((c) => [c.domain, c.state, c.href, c.action]),
      [
        ["savings", "empty", "/goals/new", "첫 목표 만들기"],
        ["household", "empty", "/household/new", "첫 지출 적기"],
        ["invest", "empty", "/portfolio", "보유 기록하러 가기"],
      ],
    );
    server();
    summary([{}]);
    const full = await appHomeService.getHome("t");
    assert.ok(full.cards.every((c) => c.action === null));
  });
});
