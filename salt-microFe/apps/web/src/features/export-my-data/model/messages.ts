/** 내 데이터 내려받기 문구(`FE-REQ-055` FR-5). 무엇이 담기는지는 파일 안 README 가 서버 기준으로 적는다 */
export const EXPORT_MY_DATA_MESSAGES = {
  heading: "내 데이터 내려받기",
  description: "저축 · 가계부 · 투자 · 알림 · 계정 기록을 한 파일(zip)로 받아요. CSV 라 표 프로그램에서 열 수 있어요. 파일은 서버에 남기지 않아요",
  action: "내려받기",
  pending: "모으는 중",
  done: "파일을 받았어요",
  failed: "일부 기록을 읽지 못해 멈췄어요. 잠시 뒤 다시 받아 주세요",
} as const;
