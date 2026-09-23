/**
 * 재생성 문구 (`FE-REQ-026` H · FR-73~76).
 *
 * 쿨다운은 **오류가 아니다**(FR-76) — 남은 시간만 말한다. 완료 · 실패 · 지연은 한 번만 알린다
 * (`FE-REQ-029` FR-51 — 폴링 중 2초마다 낭독하지 않는다).
 */
export const REGENERATE_COACH_MESSAGES = {
  button: "다시 만들기",
  cooldown: (minutes: number, seconds: number) =>
    minutes > 0
      ? `${minutes}분 ${seconds}초 뒤에 다시 만들 수 있어요`
      : `${seconds}초 뒤에 다시 만들 수 있어요`,
  generating: "새 리포트를 만들고 있어요",
  done: "새 리포트를 불러왔어요.",
  failed: "새 리포트를 만들지 못했어요. 지금 보이는 건 이전 리포트예요.",
  timeout: "만드는 데 시간이 걸리고 있어요. 잠시 뒤 다시 열어 주세요.",
  requestFailed: "요청을 보내지 못했어요. 잠시 뒤 다시 눌러 주세요.",
} as const;
