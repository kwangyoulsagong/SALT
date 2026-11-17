/**
 * `/investments` 요약 띠 문구 (F010 · `FE-REQ-040` FR-13 · `FE-REQ-042` FR-13).
 *
 * 투자 화면은 시세가 본업이라 코치 카드 본문을 펼치지 않는다(2026-09-29 — 목표 비중 카드 876px 가 한 화면보다 길어
 * 시세 표가 1890px 에서 시작했다). 여기는 칸 이름 · 한 줄 값 · 이동 라벨만. 위험 한 줄 문장은 엔티티(`RISK_MESSAGES.summary`)가 갖는다.
 * 명령형 · 확신 표현 0 — 숫자와 "리포트에서 봐요"뿐이다. 목표 비중 칸은 2026-11-17 뺐다(F017 v4 순서 6 · `FE-REQ-064` FR-12)
 */
export const JUDGMENT_OVERVIEW_MESSAGES = {
  regionLabel: "위험 · 판정 성적 요약",
  krRegionLabel: "위험 · 국내 주식 판정 성적 요약",
  risk: {
    label: "위험에 노출된 돈",
    linkLabel: "코치 리포트에서 리스크 예산 · 내 기준 보기",
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
