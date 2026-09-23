/**
 * 재생성 문구 (`FE-REQ-026` H · FR-73~76).
 *
 * 쿨다운은 **오류가 아니다**(FR-76) — 남은 시간만 말한다. 완료 · 실패 · 지연은 한 번만 알린다
 * (`FE-REQ-029` FR-51 — 폴링 중 2초마다 낭독하지 않는다).
 */
export const REGENERATE_COACH_MESSAGES = {
  button: "새로 생성",
  cooldown: (minutes: number, seconds: number) =>
    minutes > 0
      ? `${minutes}분 ${seconds}초 뒤 다시 생성할 수 있습니다`
      : `${seconds}초 뒤 다시 생성할 수 있습니다`,
  generating: "새 리포트를 만드는 중입니다",
  done: "새 리포트를 불러왔습니다.",
  failed: "새 리포트를 만들지 못했습니다. 지금 보이는 것은 이전 리포트입니다.",
  timeout: "생성이 길어지고 있습니다. 잠시 뒤 화면을 다시 열어 주세요.",
  requestFailed: "생성 요청을 보내지 못했습니다. 잠시 후 다시 눌러 주세요.",
} as const;
