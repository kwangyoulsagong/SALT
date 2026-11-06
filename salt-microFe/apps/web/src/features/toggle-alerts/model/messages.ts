import { NotificationDomain } from "@/entities/notification";

/**
 * 도메인별 알림 문구(`FE-REQ-055` FR-6). 언제 오는지는 서버가 정한 것과 같다 — 코치 판단 변화 · 목표 도달 · 고정비 오름
 * (`SRV-REQ-048` FR-5). 켜라고 권하지 않는다 — 고르는 칸이다.
 */
export const TOGGLE_ALERTS_MESSAGES = {
  heading: "알림",
  description: "받고 싶은 알림만 켜요. 처음엔 모두 꺼져 있어요",
  domains: {
    [NotificationDomain.Invest]: {
      label: "투자",
      hint: "코치 판단이 바뀌면 알려요",
    },
    [NotificationDomain.Savings]: {
      label: "저축",
      hint: "저축 목표에 닿으면 알려요",
    },
    [NotificationDomain.Household]: {
      label: "가계부",
      hint: "고정비가 지난번보다 오르면 알려요",
    },
  },
  failed: "저장하지 못했어요. 잠시 뒤 다시 바꿔 주세요",
  unavailable: "알림 설정을 불러오지 못해 지금은 바꿀 수 없어요",
} as const;
