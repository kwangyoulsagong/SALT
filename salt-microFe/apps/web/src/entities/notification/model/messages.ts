import { COACH_MODE_LABEL, GOAL_TEMPLATE_LABEL, HOUSEHOLD_CATEGORY_LABEL, labelOf } from "@repo/core/labels";

/**
 * 알림 문구 — 서버 `messageCode` + 코드 인자만 받아 **여기서만** 문장이 된다(`BFF-REQ-027` FR-29 · `FE-REQ-031` FR-93).
 * 매핑이 없는 코드는 줄을 그리지 않는다(원문 코드를 화면에 내지 않는다). 이름표는 `@repo/core/labels` 한 벌.
 *
 * 문장 규칙 — 사실만: 무엇이 바뀌었나 + 어디서 보나. 재촉 · 칭찬 · 명령형 매매 지시 0(마스터 인덱스 §6-4).
 * 금액 · 가격 0 — 인자에 없다(BFF · 서버가 두 번 거른다).
 */
export interface AlertText {
  title: string;
  /** "무엇을 확인하라" 한 줄(`FE-REQ-030` FR-110) — 누르면 가는 화면 */
  hint: string;
}

type Params = Readonly<Record<string, string>>;

const ALERT_TEXT: Readonly<Record<string, (p: Params, symbol: string | null) => AlertText | null>> = {
  "coach.decision_changed": (p, symbol) => {
    // 종목이 없는 옛 행도 그린다 — BFF 가 코치 리포트(`invest.coach`)로 보낸다. 줄을 버리면 안 읽음 수와 목록이 어긋난다(2026-11-18 실화면)
    const code = symbol ?? p.symbol ?? null;
    const mode = labelOf(COACH_MODE_LABEL, p.mode);
    const subject = [code ?? "코치", mode].filter(Boolean).join(" ");
    return {
      title: `${subject} 판단이 바뀌었어요`,
      hint: code ? "종목 화면에서 바뀐 판단과 근거를 볼 수 있어요" : "코치 리포트에서 볼 수 있어요",
    };
  },
  "savings.goal_reached": (p) => {
    const template = labelOf(GOAL_TEMPLATE_LABEL, p.template);
    return {
      title: template && p.template !== "other" ? `${template} 목표 금액에 닿았어요` : "저축 목표 금액에 닿았어요",
      hint: "저축 목표에서 볼 수 있어요",
    };
  },
  "household.fixed_cost_increased": (p) => {
    // 내 분류(`u_…`)는 이름이 서버 값이라 여기서 모른다 — 분류 없이 말한다
    const category = labelOf(HOUSEHOLD_CATEGORY_LABEL, p.category);
    return {
      title: category && p.category !== "other" ? `${category} 고정비가 지난번보다 올랐어요` : "고정비가 지난번보다 올랐어요",
      hint: "가계부 고정비 칸에서 볼 수 있어요",
    };
  },
};

/** 모르는 코드는 null — 자기 키만 본다(`toString` 같은 프로토타입 이름이 함수로 잡히지 않게, `@repo/core/labels` `labelOf` 와 같은 규칙) */
export const alertTextOf = (messageCode: string, params: Params, symbol: string | null): AlertText | null =>
  Object.prototype.hasOwnProperty.call(ALERT_TEXT, messageCode) ? (ALERT_TEXT[messageCode]?.(params, symbol) ?? null) : null;

export const ALERT_MESSAGES = {
  unreadDot: "안 읽음",
} as const;
