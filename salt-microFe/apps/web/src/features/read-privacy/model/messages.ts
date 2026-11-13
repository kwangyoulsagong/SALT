/**
 * 저장하는 것 · AI 로 가는 것 문구(`FE-REQ-055` FR-7 · FEATURE-015 FR-5 "민감 정보 분류 · LLM 전송 필드 공개").
 * **무엇을 저장하는지 · AI 에 무엇이 가는지의 내용은 서버**(표 주석 · AI 입력 목록) → BFF 가 준다 — 여기는 서비스 이름 · 등급 이름 · 상태 문구만.
 * 모르는 서비스 키는 그리지 않는다(지워지는 범위 패널과 같은 규칙).
 */
export const PRIVACY_MESSAGES = {
  heading: "저장하는 것 · AI 로 가는 것",
  description: "SALT 가 서비스마다 저장하는 기록과 AI 에 보내는 정보예요",
  aiHeading: "AI 로 가는 것",
  aiNone: "내 기록은 AI 로 보내지 않아요. AI 해설은 모두에게 같은 시장 정보로만 만들어요",
  aiPersonal: "아래 정보 중 내 기록이 AI 로 가요",
  aiUnavailable: "AI 로 가는 정보를 불러오지 못했어요",
  storedHeading: "저장하는 것",
  services: {
    investment: "투자",
    household: "가계부",
    savings: "저축",
    content: "금융 팁",
    notification: "알림",
    identity: "계정",
  } as Record<string, string>,
  grades: {
    sensitive: "민감",
    financial: "금액",
    record: "기록",
    unknown: "등급 미정",
  },
  serviceUnavailable: "불러오지 못했어요",
  loading: "저장하는 것을 불러오는 중",
  failed: "불러오지 못했어요. 잠시 뒤 다시 열어 주세요",
} as const;
