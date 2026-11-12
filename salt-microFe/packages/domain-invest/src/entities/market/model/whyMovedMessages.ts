import type { MoveFactKind } from "@repo/core/whyMoved";

/**
 * "왜 움직였나" 카드 문구(F016 단계 C · `FE-REQ-063` FR-1 · FR-7). **인과 단정 · 앞날 · 매매 지시 0** — "때문에 · 원인은 · 덕분에 ·
 * 사세요 · 오를 거예요" 같은 말을 쓰지 않는다. 몫은 나눗셈 결과이고 사실은 같은 날 있었던 일일 뿐이다(`ADR-009`). 해요체
 */
export const WHY_MOVED_MESSAGES = {
  /** 제목 — 방향은 서버 등락 부호. 0 이면 나눠 보기 */
  title: { up: "왜 올랐을까", down: "왜 떨어졌을까", flat: "오늘 등락 나눠 보기" },
  /** 카드 조건이 아닌 날 — 접힌 한 줄(상세의 "오늘 등락 나눠 보기") */
  collapsed: "오늘 등락 나눠 보기",
  today: (total: string) => `오늘 ${total}`,
  usual: (rate: string) => `평소 하루 변동 ±${rate}`,
  /** 몫이 원인이 아니라는 것을 카드 안에 한 번 */
  caption: "오늘 등락을 시장 · 업종 흐름과 종목만의 움직임으로 나눈 숫자예요. 원인을 뜻하지는 않아요.",
  parts: {
    /** 시장 기준(`marketIndex`) → 이름. 모르는 기준은 일반 라벨 */
    market: { "0001": "코스피 흐름", "1001": "코스닥 흐름", "KRW-BTC": "비트코인 흐름" } as Record<string, string>,
    marketFallback: "시장 흐름",
    sector: (name: string | null) => (name ? `${name} 업종 흐름` : "업종 흐름"),
    idio: "이 종목만의 움직임",
  },
  /** 분해 방법 — 회귀가 아닐 때만 한 줄 */
  method: {
    market_adjusted: "지수와 똑같이 움직인다고 놓고 나눈 단순 계산이에요.",
    benchmark: "비트코인은 시장 흐름의 기준이라 나누지 않았어요.",
  },
  splitTableLabel: "오늘 등락 나눠 보기 표",
  partHeader: "구분",
  valueHeader: "몫",

  /** ③ 한 줄(F016 단계 D) — AI 표시 문구는 `ADR-009` §3 그대로(설명 3종 게이트의 셋째) */
  summary: {
    aiLabel: "AI 가 같은 날 소식으로 정리했어요 — 원인을 단정하지 않아요",
    pending: "같은 날 소식을 정리하는 중이에요",
    citationLabel: (n: number, title: string) => `출처 ${n}: ${title}`,
    headingSr: "한 줄 정리",
  },

  factsHeading: "같은 날 있었던 일",
  factsEmpty: "오늘 이 종목에 걸린 소식은 아직 없어요.",
  kind: {
    news: "시황",
    disclosure: "공시",
    vi: "VI",
    market_action: "시장 조치",
    halt: "정지",
    warning: "경보",
    flow: "수급",
    crypto_news: "기사",
    crypto_warning: "경보",
  } satisfies Record<MoveFactKind, string>,
  /** 원천 하나를 못 읽었다 — 그 줄만 */
  unavailable: (label: string) => `${label} 소식을 불러오지 못했어요.`,
  source: { KRX: "거래소", UPBIT: "업비트" } as Record<string, string>,

  /** 사건 코드 → 문장(사실만) */
  event: {
    vi: (kind: string, count: number) =>
      `변동성 완화장치(VI) 발동${kind === "static" ? " · 정적" : kind === "dynamic" ? " · 동적" : ""} · 오늘 ${count}번째`,
    viPrice: (price: string) => `발동가 ${price}원`,
    circuitBreaker: (stage: string) => `서킷브레이커 ${stage}단계 발동 — 시장 전체 매매 정지`,
    sidecar: (down: boolean) => `사이드카 발동 — 프로그램 ${down ? "매도" : "매수"} 호가 5분 정지`,
    halt: { paused: "매매 일시 정지", halted: "거래 정지" } as Record<string, string>,
    state: {
      caution: "투자주의 종목",
      warning: "투자경고 종목",
      danger: "투자위험 종목",
      attention: "투자유의 종목",
      administrative: "관리종목",
      liquidation: "정리매매 중",
      overheat: "단기과열 종목",
    } as Record<string, string>,
    program: (amount: string) => `프로그램 순매수 ${amount}(오늘 누적)`,
    cryptoWarning: "거래소 유의 종목 지정",
    cryptoCaution: (label: string) => `거래소 주의 표시 · ${label}`,
    unknown: "기타 사건",
  },

  /** 우측 프리뷰 한 줄 블록(카드가 서는 날만) — 제목은 물음표로 끝난다(답이 아니라 나눠 본 숫자) */
  preview: {
    title: { up: "왜 올랐을까?", down: "왜 떨어졌을까?", flat: "오늘 등락 나눠 보기" },
    /** 가장 큰 몫 둘 — "코스피 흐름 −5.40%p · 이 종목만의 움직임 −1.19%p" */
    joiner: " · ",
    more: "자세히 보기",
    moreLabel: (name: string) => `${name} 오늘 등락 나눠 보기 자세히`,
  },
  /** 시장 표 행 — 카드가 서는 날. 누르면 상세 카드로 */
  rowChip: "왜?",
  rowChipLabel: (name: string) => `${name} 오늘 등락 나눠 보기`,
} as const;
