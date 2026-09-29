/**
 * `/investments` 요약 띠 문구 (F010 · `FE-REQ-040` FR-13 · `FE-REQ-042` FR-13).
 *
 * 투자 화면은 시세가 본업이라 코치 카드 본문을 펼치지 않는다(2026-09-29 — 목표 비중 카드 876px 가 한 화면보다 길어
 * 시세 표가 1890px 에서 시작했다). 여기는 칸 이름 · 한 줄 값 · 이동 라벨만. 목표 비중 고지 한 줄은 엔티티
 * (`TARGET_WEIGHT_MESSAGES.summary`)가 갖는다. 명령형 · 확신 표현 0 — 숫자와 "리포트에서 봐요"뿐이다.
 */
export const JUDGMENT_OVERVIEW_MESSAGES = {
  regionLabel: "이번 주 목표 비중 · 위험 · 판정 성적 요약",
  targetWeight: {
    label: "이번 주 목표 비중",
    linkLabel: "코치 리포트에서 이번 주 목표 비중 · 근거 · 과거 기록 보기",
    unavailable: "지금은 불러올 수 없어요",
    blocked: "과거 기록을 함께 보일 수 없어 비중을 보이지 않아요",
  },
  risk: {
    label: "위험에 노출된 돈",
    linkLabel: "코치 리포트에서 리스크 예산 · 내 기준 보기",
    drawdownUsed: (rate: string) => `이번 달 손실 예산 ${rate} 사용`,
    drawdownExceeded: (rate: string) => `이번 달 손실 예산 ${rate} — 넘었어요`,
    budgetNotSet: "손실 기준을 아직 정하지 않았어요",
    insufficient: "계산할 데이터가 아직 모자라요",
    top: (symbol: string, weight: string) => `가장 큰 비중 ${symbol} ${weight}`,
    beta: (sum: string) => `BTC 와 같이 움직이는 정도 ${sum}`,
    noteFallback: "넘어도 아무것도 막지 않아요",
    unavailable: "지금은 불러올 수 없어요",
  },
  scoreboard: {
    label: "판정 성적표",
    linkLabel: "코치 리포트에서 판정 성적표 · 빗나간 판정 보기",
    scored: (sample: number, kinds: number) => `채점된 판단 ${sample}건 · 신호 ${kinds}종`,
    empty: "아직 채점 표본이 적어요",
    note: "관찰 기간이 끝난 판단만 채점해요",
    unavailable: "지금은 불러올 수 없어요",
  },
} as const;
