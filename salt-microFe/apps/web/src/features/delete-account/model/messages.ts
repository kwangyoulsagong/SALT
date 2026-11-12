/**
 * 계정 지우기 문구(`FE-REQ-055` FR-5 · FEATURE-015 FR-3 "삭제 범위 표시"). 범위 줄은 서버가 지우는 서비스와 같은 묶음이다
 * (`BFF` `MY_DATA_SERVICES` + 계정). 지운 행 수는 서버가 센 값을 그대로 보인다.
 */
export const DELETE_ACCOUNT_MESSAGES = {
  heading: "계정 지우기",
  description: "계정과 모든 기록을 지워요. 되돌릴 수 없어요. 먼저 내려받아 두면 기록을 갖고 있을 수 있어요",
  scopeLabel: "지워지는 것",
  scope: [
    "저축 — 목표 · 적립 · 실물 단위",
    "가계부 — 지출 · 감정 · 급여 · 예산 · 반복 · 챌린지 · 사람 장부",
    "투자 — 거래 · 보유 · 관심 종목 · 코치 기록 · 계획",
    "금융 팁 — 퀴즈 답 · 닫은 팁",
    "알림 — 받은 알림 · 설정",
    "계정 — 이메일 · 별명 · 홈 설정",
  ],
  passwordLabel: "비밀번호",
  passwordPlaceholder: "비밀번호를 다시 입력해 주세요",
  action: "계정 지우기",
  pending: "지우는 중",
  done: (total: number) => `기록 ${total.toLocaleString("ko-KR")}개와 계정을 지웠어요`,
  goHome: "처음 화면으로",
  errors: {
    REAUTH_FAILED: "비밀번호가 맞지 않아요",
    PASSWORD_REQUIRED: "비밀번호를 입력해 주세요",
    ACCOUNT_DELETE_INCOMPLETE: "일부만 지워졌어요. 다시 누르면 남은 기록을 마저 지워요",
    tooMany: "여러 번 틀렸어요. 10분 뒤 다시 해 주세요",
    other: "지우지 못했어요. 잠시 뒤 다시 해 주세요",
  },
} as const;
