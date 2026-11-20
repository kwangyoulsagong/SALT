/**
 * 내게 맞춘 팁 문구(`FE-REQ-060` FR-10) — 사실만. 왜 골랐는지는 맥락 이름까지(트리거 문장은 글이 말한다). 권유 · 재촉 0
 */
export const TIPS_FOR_ME_MESSAGES = {
  title: "내게 맞춘 팁",
  because: { savings: "내 저축 목표에 맞춰 골랐어요", household: "내 가계부에 맞춰 골랐어요" },
  empty: "지금은 내 저축 목표 · 가계부에 맞춘 글이 없어요",
  signedOut: "로그인하면 내 저축 목표 · 가계부에 맞는 글을 골라 보여 드려요",
  failed: "맞춘 글을 불러오지 못했어요",
  retry: "다시 불러오기",
  loading: "내게 맞춘 팁을 불러오는 중",
} as const;
