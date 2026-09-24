/**
 * 판단 표본 시드 — **로컬에서 판단 게이트를 열기 위한 개발 도구**다.
 *
 * ```bash
 * npm run judgments:seed              # 기본 5종목
 * npm run judgments:seed -- BTC ETH   # 종목 지정
 * ```
 *
 * ## 왜 필요한가
 *
 * 판단 블록은 표본 20건 미만이면 렌더하지 않는다(`MIN_JUDGMENT_SAMPLE`). 표본은 10분
 * 워커가 관찰 기간(단타 24시간 · 장기 30일)마다 한 건씩 쌓으므로 **새 DB 에서는 단타 20일 ·
 * 장기 1년 반**이 지나야 게이트가 열린다. 그동안 LLM 해설 · 성적표 · 리포트의 렌더 경로를
 * 로컬에서 한 번도 밟을 수 없다(`reports/checklists/SRV-REQ-025.md` 미검증 항목).
 *
 * ## 지어낸 숫자를 어디까지 지어내는가
 *
 * 진입가 · 수익률은 **고정 수열**이다(무작위가 아니라 다시 돌려도 같은 표가 나온다).
 * 그러나 **적중 · 실패 판정은 지어내지 않는다** — `judgeOutcome` 을 그대로 부른다.
 * 판정 규칙이 바뀌면 시드도 같이 바뀌어야 하고, 규칙을 두 곳에 적으면 시드가 거짓이 된다.
 *
 * 운영에서는 돌지 않는다(`NODE_ENV=production` 이면 거부). 시드 행은 `sample_origin = 'synthetic'` 이라
 * **실측 성적에 세지 않는다**(C06 · `DB-REQ-017` FR-60). 게이트를 여는 것까지 보려면 서버를
 * `JUDGMENT_COUNT_SYNTHETIC=true` 로 띄운다(운영에서는 기동이 막힌다). 끝나면 `judgments:seed:clear` 로 지운다.
 *
 * 레이어: `scripts/**` 는 `composition.ts` 처럼 레이어 밖이다. 판정 전 행을 만드는 것이
 * 아니라 **판정까지 끝난 행**을 넣기 때문에 Port(`SymbolJudgmentStore`)로는 표현되지 않는다 —
 * 그 Port 에 "평가된 스냅샷을 통째로 넣기"를 더하면 운영 코드에 시드용 문이 생긴다.
 */
import { Prisma } from "@prisma/client";

import {
  JUDGMENT_HORIZON_MS,
  judgeOutcome,
  judgmentSignalType,
  MIN_JUDGMENT_SAMPLE,
  type CoachMode,
  type ModeDecisionAction,
  type SampleOrigin,
} from "../src/coach/domain";
import prisma from "../src/shared/infrastructure/prisma";

const DEFAULT_SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "ADA"];
const MODES: CoachMode[] = ["scalp", "long_term"];
const ACTIONS: ModeDecisionAction[] = [
  "review_short_opportunity",
  "review_accumulation",
  "wait",
  "avoid",
];

/**
 * 종목 · 모드마다 만들 표본 수. 판단 4종을 돌려 쓰므로 종목당 그룹별 `/4` 건이 되고,
 * 기본 5종목이면 그룹당 30건 — 20건 게이트를 넘고 `lowSample` 도 벗는다.
 */
const PER_SYMBOL_MODE = 24;

/**
 * 수익률 수열. 분포 구간 6개에 고르게 걸치고 `wait` 의 적중 폭(단타 2% · 장기 10%)
 * 안팎을 모두 지나가게 골랐다 — 한쪽 결과만 나오면 게이트의 "실패사례 없음" 에 걸린다.
 */
const RETURNS = [
  -0.28, -0.14, -0.06, -0.015, 0.008, 0.035, 0.09, 0.17, 0.24, -0.21, -0.11,
  -0.03, 0.012, 0.05, 0.12, 0.22,
];

const ENTRY_PRICE = 100;

/**
 * 기준 시각을 **UTC 자정으로 내린다.** `new Date()` 를 쓰면 실행마다 `judgedAt` 이 달라져
 * `(symbol, mode, judgedAt)` 유니크가 중복을 못 잡고 돌릴 때마다 표본이 늘어난다.
 */
const ANCHOR = new Date(new Date().setUTCHours(0, 0, 0, 0));

/** 화면에 보이는 근거 문장 앞 표식. 출처 구분은 컬럼(`sampleOrigin`)이 한다 — 이건 눈으로 알아보는 용도다. */
const SEED_MARK = "seed:";

const ORIGIN: SampleOrigin = "synthetic";

/** 합성 행만 지운다. 예전엔 `reasons` 문자열을 훑었다 — 이제 출처 컬럼이 있다(C06). */
const clearSeeded = async () => {
  const { count: deleted } = await prisma.symbolJudgmentSnapshot.deleteMany({
    where: { sampleOrigin: ORIGIN },
  });
  console.log(JSON.stringify({ deleted }));
};

const main = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("판단 표본 시드는 운영에서 돌리지 않는다");
  }

  const args = process.argv.slice(2);
  if (args.includes("--clear")) return clearSeeded();

  const symbols = args.length
    ? args.map((symbol) => symbol.toUpperCase())
    : DEFAULT_SYMBOLS;

  const rows = symbols.flatMap((symbol, symbolIndex) =>
    MODES.flatMap((mode) =>
      Array.from({ length: PER_SYMBOL_MODE }, (_, index) => {
        const action = ACTIONS[index % ACTIONS.length];
        const returnRate =
          RETURNS[(index + symbolIndex * 3) % RETURNS.length];
        // 관찰 기간마다 한 건 — 워커가 쌓는 간격과 같다(표본 독립성, B39).
        const judgedAt = new Date(
          ANCHOR.getTime() - (index + 1) * JUDGMENT_HORIZON_MS[mode]
        );

        return {
          symbol,
          mode,
          action,
          signalType: judgmentSignalType(mode, action),
          score: 50 + Math.round(returnRate * 100),
          reasons: [`${SEED_MARK}${mode}:${action}`],
          entryPrice: new Prisma.Decimal(ENTRY_PRICE),
          judgedAt,
          sampleOrigin: ORIGIN,
          exitPrice: new Prisma.Decimal(ENTRY_PRICE * (1 + returnRate)),
          returnRate: new Prisma.Decimal(returnRate.toFixed(6)),
          outcome: judgeOutcome(mode, action, returnRate),
          evaluatedAt: new Date(
            judgedAt.getTime() + JUDGMENT_HORIZON_MS[mode]
          ),
        };
      })
    )
  );

  // `(symbol, mode, judgedAt)` 유니크 + 자정 앵커 — 같은 날 다시 돌리면 0건이 들어간다.
  const { count } = await prisma.symbolJudgmentSnapshot.createMany({
    data: rows,
    skipDuplicates: true,
  });

  const perGroup = await prisma.symbolJudgmentSnapshot.groupBy({
    by: ["signalType"],
    where: { outcome: { not: null }, sampleOrigin: ORIGIN },
    _count: { _all: true },
  });

  console.log(
    JSON.stringify(
      {
        symbols,
        inserted: count,
        skipped: rows.length - count,
        groups: perGroup
          .map((group) => ({
            signalType: group.signalType,
            synthetic: group._count._all,
            // 서버가 JUDGMENT_COUNT_SYNTHETIC=true 일 때만 이 수가 게이트에 들어간다
            gateOpenWithSyntheticFlag: group._count._all >= MIN_JUDGMENT_SAMPLE,
          }))
          .sort((a, b) => a.signalType.localeCompare(b.signalType)),
      },
      null,
      2
    )
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
